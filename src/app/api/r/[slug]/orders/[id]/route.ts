import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        table: true,
        items: true,
      },
    });

    if (!order || order.storeId !== store.id) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์ในร้านค้านี้' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        table: true,
        items: true,
      },
    });

    if (!existingOrder || existingOrder.storeId !== store.id) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์ในร้านค้านี้' }, { status: 404 });
    }

    const body = await request.json();
    const { status, itemId, itemStatus } = body;

    // Update single item status
    if (itemId && itemStatus) {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { status: itemStatus },
      });
    }

    // Update entire order status
    let updateData: any = {};
    if (status) {
      updateData.status = status;

      // Mass item update only when NOT targeting a single item
      if (!itemId) {
        if (status === 'SERVED' || status === 'COMPLETED') {
          await prisma.orderItem.updateMany({
            where: { orderId: params.id },
            data: { status: 'SERVED' },
          });
        } else if (status === 'READY') {
          await prisma.orderItem.updateMany({
            where: {
              orderId: params.id,
              status: { not: 'SERVED' },
            },
            data: { status: 'READY' },
          });
        } else if (status === 'COOKING') {
          await prisma.orderItem.updateMany({
            where: {
              orderId: params.id,
              status: { in: ['PENDING', 'READY'] },
            },
            data: { status: 'COOKING' },
          });
        } else if (status === 'PENDING') {
          await prisma.orderItem.updateMany({
            where: {
              orderId: params.id,
              status: { in: ['COOKING', 'READY'] },
            },
            data: { status: 'PENDING' },
          });
        }
      }

      if (status === 'SERVED' || status === 'COMPLETED') {
        // Bug #5: If delivery order is served/completed, ensure it is marked as PAID and has paidAt timestamp so it appears in daily sales reports
        const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(existingOrder.orderChannel);
        if (isDelivery) {
          if (existingOrder.paymentStatus !== 'PAID') {
            updateData.paymentStatus = 'PAID';
          }
          if (!existingOrder.paidAt) {
            updateData.paidAt = new Date();
          }
          if (!existingOrder.paymentMethod) {
            updateData.paymentMethod = 'DELIVERY_APP';
          }
        }
      } else if (status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
        // Bug #12: Restock ingredients and release table when order is cancelled
        await prisma.orderItem.updateMany({
          where: { orderId: params.id },
          data: { status: 'CANCELLED' },
        });

        const menuItemIds = existingOrder.items.map((i) => i.menuItemId).filter(Boolean) as string[];
        if (menuItemIds.length > 0) {
          const recipes = await prisma.menuItemRecipe.findMany({
            where: { menuItemId: { in: menuItemIds } },
            include: { ingredient: true },
          });

          for (const item of existingOrder.items) {
            const itemRecipes = recipes.filter((r) => r.menuItemId === item.menuItemId);
            for (const r of itemRecipes) {
              const returnQty = r.quantity * (item.quantity || 1);
              await prisma.ingredient.update({
                where: { id: r.ingredientId },
                data: { currentStock: { increment: returnQty } },
              });

              await prisma.stockLog.create({
                data: {
                  storeId: store.id,
                  ingredientId: r.ingredientId,
                  changeQty: returnQty,
                  reason: 'CANCEL_RESTOCK',
                  note: `คืนสต็อกยกเลิกออเดอร์ (#${existingOrder.id.slice(-4)})`,
                  cost: returnQty * (r.ingredient?.costPerUnit || 0),
                },
              });
            }
          }
        }

        // Release table if no other active unpaid orders exist
        if (existingOrder.tableId) {
          const remainingOrders = await prisma.order.count({
            where: {
              storeId: store.id,
              tableId: existingOrder.tableId,
              id: { not: existingOrder.id },
              status: { notIn: ['CANCELLED', 'COMPLETED'] },
              paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
            },
          });

          if (remainingOrders === 0) {
            await prisma.table.update({
              where: { id: existingOrder.tableId },
              data: {
                status: 'AVAILABLE',
                currentSessionId: null,
              },
            });
            broadcastEvent('TABLE_UPDATED', { tableNo: existingOrder.tableNo, status: 'AVAILABLE' }, store.id);
          }
        }
      }
    } else if (itemId && itemStatus) {
      const currentItems = await prisma.orderItem.findMany({
        where: { orderId: params.id },
      });
      if (currentItems.length > 0) {
        const allServed = currentItems.every((it) => it.status === 'SERVED');
        const allReady = currentItems.every((it) => it.status === 'READY' || it.status === 'SERVED');
        const anyCookingOrReady = currentItems.some((it) => it.status === 'COOKING' || it.status === 'READY');

        if (allServed) {
          updateData.status = 'SERVED';
        } else if (allReady) {
          updateData.status = 'READY';
        } else if (anyCookingOrReady && existingOrder.status === 'PENDING') {
          updateData.status = 'COOKING';
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        table: true,
        items: true,
      },
    });

    broadcastEvent('ORDER_UPDATED', updatedOrder, store.id);

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}
