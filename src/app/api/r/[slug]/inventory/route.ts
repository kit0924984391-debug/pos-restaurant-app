import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);

    const ingredients = await prisma.ingredient.findMany({
      where: { storeId: store.id },
      include: {
        recipes: {
          include: { menuItem: { select: { id: true, name: true, basePrice: true } } },
        },
        stockLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ ingredients });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 401 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const body = await request.json();
    const { action, name, unit, costPerUnit, currentStock, minStockAlert, ingredientId, changeQty, reason, note } = body;

    // Action 1: Stock In / Adjustment
    if (action === 'STOCK_ADJUST' && ingredientId && changeQty) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient || ingredient.storeId !== store.id) {
        return NextResponse.json({ error: 'ไม่พบรายการวัตถุดิบ' }, { status: 404 });
      }

      const newStock = Math.max(0, ingredient.currentStock + Number(changeQty));

      const [updatedIng, log] = await prisma.$transaction([
        prisma.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: newStock },
        }),
        prisma.stockLog.create({
          data: {
            storeId: store.id,
            ingredientId,
            changeQty: Number(changeQty),
            reason: reason || 'STOCK_IN',
            note: note || (Number(changeQty) > 0 ? 'รับเข้าวัตถุดิบ' : 'ปรับลดยอด'),
            cost: Number(changeQty) > 0 ? Number(changeQty) * ingredient.costPerUnit : null,
          },
        }),
      ]);

      return NextResponse.json({ success: true, ingredient: updatedIng, log });
    }

    // Action 2: Create new ingredient
    if (!name || !unit) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและหน่วยนับ' }, { status: 400 });
    }

    const newIng = await prisma.ingredient.create({
      data: {
        storeId: store.id,
        name: name.trim(),
        unit: unit.trim(),
        costPerUnit: Number(costPerUnit) || 0,
        currentStock: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 10,
      },
    });

    if (Number(currentStock) > 0) {
      await prisma.stockLog.create({
        data: {
          storeId: store.id,
          ingredientId: newIng.id,
          changeQty: Number(currentStock),
          reason: 'STOCK_IN',
          note: 'ยอดยกมาเริ่มต้น',
          cost: Number(currentStock) * (Number(costPerUnit) || 0),
        },
      });
    }

    return NextResponse.json({ success: true, ingredient: newIng });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error processing inventory' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const body = await request.json();
    const { id, name, unit, costPerUnit, currentStock, minStockAlert } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ingredient id' }, { status: 400 });
    }

    const existing = await prisma.ingredient.findFirst({
      where: { id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการวัตถุดิบ' }, { status: 404 });
    }

    const newStock = currentStock !== undefined ? Math.max(0, Number(currentStock)) : existing.currentStock;
    const stockDiff = newStock - existing.currentStock;
    const effectiveCostPerUnit = costPerUnit !== undefined ? Number(costPerUnit) : existing.costPerUnit;

    const [updated] = await prisma.$transaction([
      prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          name: name ? name.trim() : existing.name,
          unit: unit ? unit.trim() : existing.unit,
          costPerUnit: effectiveCostPerUnit,
          minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : existing.minStockAlert,
          currentStock: newStock,
        },
      }),
      ...(stockDiff !== 0
        ? [
            prisma.stockLog.create({
              data: {
                storeId: store.id,
                ingredientId: existing.id,
                changeQty: stockDiff,
                reason: 'ADJUST',
                note: 'ปรับยอดสต็อกโดยผู้ดูแล',
                cost: stockDiff > 0 ? stockDiff * effectiveCostPerUnit : null,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, ingredient: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error updating ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const existing = await prisma.ingredient.findFirst({
      where: { id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการวัตถุดิบ' }, { status: 404 });
    }

    await prisma.ingredient.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
