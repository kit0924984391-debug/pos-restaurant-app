import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { cleanDishName } from '@/lib/receiptParser';

export type DeliveryChannel = 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'FOODPANDA' | 'ROBINHOOD' | 'KLIKIT' | 'PRINT_PROXY';

export interface ProcessDeliveryWebhookResult {
  status: number;
  body: Record<string, any>;
}

/**
 * Normalizes incoming delivery platform string from Print Proxy or direct webhooks
 */
export function normalizeDeliveryChannel(rawChannel?: string, orderId?: string): DeliveryChannel {
  if (rawChannel) {
    const s = rawChannel.toUpperCase().trim();
    if (s.includes('GRAB')) return 'GRAB';
    if (s.includes('LINE') || s.includes('WONGNAI')) return 'LINEMAN';
    if (s.includes('SHOPEE')) return 'SHOPEE_FOOD';
    if (s.includes('ROBIN')) return 'ROBINHOOD';
    if (s.includes('PANDA')) return 'FOODPANDA';
    if (s.includes('PROXY') || s.includes('PRINT')) return 'PRINT_PROXY';
    if (s.includes('KLIKIT')) return 'KLIKIT';
  }

  if (orderId) {
    const id = orderId.toUpperCase().trim();
    if (id.startsWith('LM-') || id.startsWith('LINEMAN')) return 'LINEMAN';
    if (id.startsWith('GF-') || id.startsWith('GRAB')) return 'GRAB';
    if (id.startsWith('SF-') || id.startsWith('SHOPEE')) return 'SHOPEE_FOOD';
    if (id.startsWith('RH-') || id.startsWith('ROBINHOOD')) return 'ROBINHOOD';
    if (id.startsWith('FP-') || id.startsWith('FOODPANDA')) return 'FOODPANDA';
  }

  return 'KLIKIT';
}

/**
 * Checks whether payload indicates an order cancellation event from Klikit/Aggregator
 */
export function isCancellationEvent(payload: any): boolean {
  const event = String(
    payload.event || payload.eventType || payload.action || payload.status || payload.orderStatus || ''
  ).toUpperCase();

  if (
    event === 'CANCELLED' ||
    event === 'CANCELED' ||
    event === 'ORDER_CANCELLED' ||
    event === 'ORDER_CANCELED' ||
    event === 'ORDER.CANCELLED' ||
    event === 'ORDER.CANCELED' ||
    event.includes('CANCEL')
  ) {
    return true;
  }

  if (payload.isCancelled === true || payload.is_cancelled === true) {
    return true;
  }

  return false;
}

/**
 * Unified Delivery Processing Engine for Klikit and multi-channel delivery partners
 */
export async function processDeliveryWebhook(
  slug: string,
  payload: any,
  headers?: Headers
): Promise<ProcessDeliveryWebhookResult> {
  try {
    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        linemanGp: true,
        grabGp: true,
        shopeeGp: true,
        robinhoodGp: true,
        deliveryWebhookSecret: true,
      },
    });

    if (!store) {
      return { status: 404, body: { error: 'Store not found' } };
    }

    // Verify webhook signature/secret token if configured on store.
    // When a secret IS configured the header is REQUIRED — a missing header
    // must not silently skip verification (that would let anyone inject fake
    // delivery orders). Stores without a configured secret keep working as
    // before (open webhook).
    if (store.deliveryWebhookSecret && headers) {
      const authHeader =
        headers.get('x-proxy-secret') ||
        headers.get('x-proxy-signature') ||
        headers.get('x-print-signature') ||
        headers.get('x-klikit-signature') ||
        headers.get('x-hub-signature') ||
        headers.get('x-lineman-signature') ||
        headers.get('x-grab-signature') ||
        headers.get('x-webhook-secret') ||
        headers.get('authorization');

      if (!authHeader || !authHeader.includes(store.deliveryWebhookSecret)) {
        return { status: 401, body: { error: 'Unauthorized webhook signature' } };
      }
    }

    // 1. Handle Order Cancellation Event from Klikit
    if (isCancellationEvent(payload)) {
      const deliveryOrderId = String(
        payload.orderId ||
          payload.order_id ||
          payload.orderID ||
          payload.shortOrderNumber ||
          payload.displayId ||
          payload.id ||
          ''
      );

      if (!deliveryOrderId) {
        return { status: 400, body: { error: 'Missing order ID for cancellation' } };
      }

      // Find existing order in the database
      const existingOrder = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          OR: [
            { deliveryOrderId: deliveryOrderId },
            { id: deliveryOrderId },
          ],
          status: { not: 'CANCELLED' },
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: {
                include: {
                  recipes: {
                    include: {
                      ingredient: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!existingOrder) {
        return {
          status: 200,
          body: {
            success: true,
            deliveryOrderId,
            message: 'Order already cancelled or not found',
          },
        };
      }

      // Update Order status to CANCELLED
      const updatedOrder = await prisma.order.update({
        where: { id: existingOrder.id },
        data: { status: 'CANCELLED' },
        include: {
          table: true,
          items: true,
        },
      });

      // Restore BOM recipe ingredient stock
      (async () => {
        try {
          for (const item of existingOrder.items) {
            if (item.menuItem?.recipes && item.menuItem.recipes.length > 0) {
              for (const r of item.menuItem.recipes) {
                const restoreQty = r.quantity * (item.quantity || 1);
                const cost = restoreQty * (r.ingredient?.costPerUnit || 0);

                await prisma.ingredient.update({
                  where: { id: r.ingredientId },
                  data: { currentStock: { increment: restoreQty } },
                });

                await prisma.stockLog.create({
                  data: {
                    storeId: store.id,
                    ingredientId: r.ingredientId,
                    changeQty: restoreQty,
                    reason: 'ADJUST',
                    note: `คืนสต็อกยกเลิกออเดอร์ ${existingOrder.orderChannel} (${deliveryOrderId})`,
                    cost,
                  },
                });
              }
            }
          }
        } catch (err) {
          console.error('Stock restoration error upon delivery cancellation:', err);
        }
      })();

      // Broadcast update to Kitchen KDS and POS
      broadcastEvent('ORDER_UPDATED', updatedOrder, store.id);

      return {
        status: 200,
        body: {
          success: true,
          orderId: updatedOrder.id,
          deliveryOrderId,
          status: 'CANCELLED',
          message: 'Order successfully cancelled and recipe stock restored',
        },
      };
    }

    // 2. Handle New Order Creation from Klikit
    const rawChannel =
      payload.channel ||
      payload.platform ||
      payload.source ||
      payload.provider ||
      payload.orderSource ||
      payload.deliveryPlatform;

    const rawOrderId =
      payload.orderId ||
      payload.order_id ||
      payload.orderID ||
      payload.shortOrderNumber ||
      payload.displayId ||
      payload.id;

    const channel = normalizeDeliveryChannel(rawChannel, rawOrderId);

    const deliveryOrderId =
      rawOrderId ||
      `${channel === 'LINEMAN' ? 'LM' : channel === 'GRAB' ? 'GF' : channel === 'SHOPEE_FOOD' ? 'SF' : 'KL'}-${Date.now().toString().slice(-4)}`;

    const riderName =
      payload.rider?.name ||
      payload.driver?.name ||
      `${channel === 'LINEMAN' ? 'LINE MAN' : channel === 'GRAB' ? 'GrabFood' : channel === 'SHOPEE_FOOD' ? 'ShopeeFood' : channel} Rider`;

    const riderPhone = payload.rider?.phone || payload.driver?.phone || null;

    const customerName =
      payload.customer?.name ||
      payload.consumer?.name ||
      `ลูกค้า ${channel === 'LINEMAN' ? 'LINE MAN' : channel === 'GRAB' ? 'GrabFood' : channel === 'SHOPEE_FOOD' ? 'ShopeeFood' : channel}`;

    const note =
      payload.note ||
      payload.notes ||
      payload.remarks ||
      payload.specialInstructions ||
      payload.instruction ||
      '';

    const rawItems = payload.items || payload.orderItems || payload.order_items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return { status: 400, body: { error: 'No items in order payload' } };
    }

    // Match store menu items to deduct stock via recipe BOM
    const storeMenuItems = await prisma.menuItem.findMany({
      where: { storeId: store.id },
      include: { recipes: { include: { ingredient: true } } },
    });

    let totalAmount = 0;
    const orderItemsData: any[] = [];
    const stockDeductions: { ingredientId: string; qty: number; cost: number }[] = [];
    let totalCost = 0;

    for (const item of rawItems) {
      const itemName = item.name || item.title || 'อาหารตามสั่ง';
      const itemPrice = parseFloat(item.price || item.unit_price || item.unitPrice || 50);
      const quantity = parseInt(item.quantity || item.qty || item.count || 1);
      const itemTotal = itemPrice * quantity;
      totalAmount += itemTotal;

      const cleanName = item.cleanName || cleanDishName(itemName);

      const matchedMenuItem = storeMenuItems.find(
        (m) =>
          m.name.toLowerCase().trim() === itemName.toLowerCase().trim() ||
          m.name.toLowerCase().trim() === cleanName.toLowerCase().trim() ||
          m.id === item.menuItemId ||
          m.id === item.id
      );

      orderItemsData.push({
        menuItemId: matchedMenuItem?.id || null,
        name: itemName,
        price: itemPrice,
        quantity,
        selectedOptions:
          item.options || item.modifiers || item.selectedOptions
            ? JSON.stringify(item.options || item.modifiers || item.selectedOptions)
            : null,
        specialNote: item.instruction || item.specialInstructions || item.special_note || null,
        status: 'PENDING',
      });

      if (matchedMenuItem?.recipes && matchedMenuItem.recipes.length > 0) {
        for (const r of matchedMenuItem.recipes) {
          const deductQty = r.quantity * quantity;
          const cost = deductQty * (r.ingredient?.costPerUnit || 0);
          totalCost += cost;
          stockDeductions.push({ ingredientId: r.ingredientId, qty: deductQty, cost });
        }
      }
    }

    // Determine platform GP percentage
    let gpPercent = 30;
    if (channel === 'LINEMAN') gpPercent = store.linemanGp ?? 30;
    else if (channel === 'GRAB') gpPercent = store.grabGp ?? 30;
    else if (channel === 'SHOPEE_FOOD') gpPercent = store.shopeeGp ?? 30;
    else if (channel === 'ROBINHOOD') gpPercent = store.robinhoodGp ?? 20;

    const gpAmount = (totalAmount * gpPercent) / 100;
    const netRevenue = totalAmount - gpAmount;

    // Create Order in database
    const newOrder = await prisma.order.create({
      data: {
        storeId: store.id,
        tableNo: 0,
        orderType: 'TAKEAWAY',
        orderChannel: channel,
        deliveryOrderId: String(deliveryOrderId),
        riderName,
        riderPhone,
        totalAmount,
        discountAmount: 0,
        netAmount: totalAmount,
        gpPercent,
        gpAmount,
        netRevenue,
        costAmount: totalCost,
        note,
        customerName,
        paymentMethod: 'PROMPTPAY',
        paymentStatus: 'PAID',
        paidAt: new Date(),
        status: 'PENDING',
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Execute Recipe BOM stock deductions
    (async () => {
      try {
        for (const ded of stockDeductions) {
          await prisma.ingredient.update({
            where: { id: ded.ingredientId },
            data: { currentStock: { decrement: ded.qty } },
          });

          await prisma.stockLog.create({
            data: {
              storeId: store.id,
              ingredientId: ded.ingredientId,
              changeQty: -ded.qty,
              reason: 'ORDER',
              note: `ตัดสต็อกออเดอร์ ${channel} (${deliveryOrderId})`,
              cost: ded.cost,
            },
          });
        }
      } catch (err) {
        console.error(`Stock deduction error for ${channel}:`, err);
      }
    })();

    // Broadcast Real-time Event to Kitchen KDS & POS
    broadcastEvent('ORDER_CREATED', newOrder, store.id);

    return {
      status: 200,
      body: {
        success: true,
        orderId: newOrder.id,
        deliveryOrderId: String(deliveryOrderId),
        channel,
        status: 'ACCEPTED',
        totalAmount,
        netRevenue,
        gpAmount,
      },
    };
  } catch (error: any) {
    console.error('Delivery Webhook Error:', error);
    return {
      status: 500,
      body: { error: 'Internal delivery webhook error', details: error?.message },
    };
  }
}
