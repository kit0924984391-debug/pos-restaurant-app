import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({ where: { slug: params.slug }, select: { id: true } });
    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
            paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          },
          include: { items: true },
        },
      },
    });

    if (!table) return NextResponse.json({ error: 'ไม่พบข้อมูลโต๊ะนี้' }, { status: 404 });
    return NextResponse.json(table);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({ where: { slug: params.slug }, select: { id: true } });
    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const { name, status } = body;
    const tableNo = parseInt(params.id);

    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
    });

    if (!table) return NextResponse.json({ error: 'ไม่พบโต๊ะนี้' }, { status: 404 });

    const updated = await prisma.table.update({
      where: { id: table.id },
      data: {
        name: name !== undefined ? name : table.name,
        status: status !== undefined ? status : table.status,
      },
    });

    broadcastEvent('TABLE_UPDATED', { action: 'update', table: updated }, store.id);
    return NextResponse.json({ success: true, table: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({ where: { slug: params.slug }, select: { id: true } });
    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      include: {
        orders: {
          where: {
            OR: [
              { status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] } },
              { paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] } },
            ],
          },
        },
      },
    });

    if (!table) return NextResponse.json({ error: 'ไม่พบโต๊ะที่ต้องการลบ' }, { status: 404 });

    if (table.orders.length > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบ ${table.name} ได้ เนื่องจากมีออเดอร์ค้างอยู่ กรุณาเช็คบิลหรือเคลียร์ออเดอร์ก่อนลบ` },
        { status: 400 }
      );
    }

    // ปลดความสัมพันธ์ tableId จากออเดอร์ในอดีตที่ปิดบิลแล้ว เพื่อป้องกัน Foreign Key Constraint Error
    await prisma.order.updateMany({
      where: { tableId: table.id },
      data: { tableId: null },
    });

    await prisma.table.delete({ where: { id: table.id } });

    const totalCount = await prisma.table.count({ where: { storeId: store.id } });
    await prisma.store.update({ where: { id: store.id }, data: { tableCount: totalCount } });

    broadcastEvent('TABLE_UPDATED', { action: 'delete', tableNo: table.tableNo }, store.id);
    return NextResponse.json({ success: true, message: `ลบ ${table.name} สำเร็จแล้ว` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
