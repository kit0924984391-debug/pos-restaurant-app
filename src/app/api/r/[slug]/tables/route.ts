import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { getStoreBySlug } from '@/lib/storeCache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await getStoreBySlug(params.slug);

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const tables = await prisma.table.findMany({
      where: { storeId: store.id },
      orderBy: { tableNo: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
            paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          },
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const formattedTables = tables.map((t) => {
      const activeOrders = t.orders || [];
      const totalAmount = activeOrders.reduce((sum, o) => sum + o.netAmount, 0);
      const totalItems = activeOrders.reduce(
        (sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
        0
      );
      const firstOrderAt = activeOrders.length > 0 ? activeOrders[activeOrders.length - 1].createdAt : null;
      const hasPendingSlip = activeOrders.some((o: any) => o.slipUrl || o.paymentStatus === 'PENDING_CONFIRMATION');
      const latestSlipOrder = activeOrders.find((o: any) => o.slipUrl);

      let activeServiceCall = null;
      if (t.currentSessionId) {
        try {
          const parsed = JSON.parse(t.currentSessionId);
          if (parsed && parsed.serviceCall) {
            activeServiceCall = parsed.serviceCall;
          }
        } catch (e) {}
      }

      let currentStatus = t.status;
      // Auto-heal: If table has status OCCUPIED or PAYMENT_PENDING but 0 unpaid orders, revert to AVAILABLE
      if ((currentStatus === 'OCCUPIED' || currentStatus === 'PAYMENT_PENDING') && activeOrders.length === 0) {
        currentStatus = 'AVAILABLE';
        prisma.table.update({
          where: { id: t.id },
          data: { status: 'AVAILABLE', currentSessionId: null },
        }).catch(() => {});
      }

      return {
        id: t.tableNo, // integer table number for compatibility
        tableNo: t.tableNo,
        tableId: t.id,
        name: t.name,
        status: currentStatus,
        activeOrdersCount: activeOrders.length,
        totalItems,
        totalAmount,
        activeOrders,
        firstOrderAt,
        hasPendingSlip,
        latestSlipUrl: latestSlipOrder?.slipUrl || null,
        activeServiceCall,
      };
    });

    return NextResponse.json(formattedTables);
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action;

    // 1. Single Table Creation
    if (action === 'CREATE_TABLE' || (!action && (body.id !== undefined || body.tableNo !== undefined || body.name))) {
      let targetTableNo = parseInt(body.tableNo || body.id);
      const inputName = body.name ? body.name.trim() : '';

      if (isNaN(targetTableNo) && inputName) {
        const numMatch = inputName.match(/\d+/);
        if (numMatch) {
          targetTableNo = parseInt(numMatch[0]);
        }
      }

      if (isNaN(targetTableNo) || targetTableNo <= 0) {
        const highest = await prisma.table.findFirst({
          where: { storeId: store.id },
          orderBy: { tableNo: 'desc' },
        });
        targetTableNo = (highest?.tableNo || 0) + 1;
      }

      const existing = await prisma.table.findUnique({
        where: {
          storeId_tableNo: {
            storeId: store.id,
            tableNo: targetTableNo,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `หมายเลขโต๊ะ ${targetTableNo} มีอยู่ในระบบแล้ว กรุณาใช้หมายเลขอื่น` },
          { status: 400 }
        );
      }

      const finalName = inputName || `โต๊ะ ${targetTableNo}`;

      const newTable = await prisma.table.create({
        data: {
          storeId: store.id,
          tableNo: targetTableNo,
          name: finalName,
          status: 'AVAILABLE',
        },
      });

      const totalCount = await prisma.table.count({ where: { storeId: store.id } });
      await prisma.store.update({
        where: { id: store.id },
        data: { tableCount: totalCount },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'create', table: newTable }, store.id);

      return NextResponse.json({ success: true, table: newTable, message: `เพิ่ม ${finalName} สำเร็จแล้ว` });
    }

    // 2. Batch Create Tables
    if (action === 'BATCH_CREATE') {
      const count = parseInt(body.count) || 1;
      if (count < 1 || count > 50) {
        return NextResponse.json({ error: 'จำนวนโต๊ะที่ต้องการเพิ่มต้องอยู่ระหว่าง 1 - 50 โต๊ะ' }, { status: 400 });
      }

      const existingTables = await prisma.table.findMany({
        where: { storeId: store.id },
        select: { tableNo: true },
      });
      const existingNos = new Set(existingTables.map((t) => t.tableNo));

      const createdTables = [];
      let candidate = 1;
      while (createdTables.length < count) {
        if (!existingNos.has(candidate)) {
          const t = await prisma.table.create({
            data: {
              storeId: store.id,
              tableNo: candidate,
              name: `โต๊ะ ${candidate}`,
              status: 'AVAILABLE',
            },
          });
          createdTables.push(t);
          existingNos.add(candidate);
        }
        candidate++;
      }

      const totalCount = await prisma.table.count({ where: { storeId: store.id } });
      await prisma.store.update({
        where: { id: store.id },
        data: { tableCount: totalCount },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'batch_create', count: createdTables.length }, store.id);

      return NextResponse.json({
        success: true,
        message: `เพิ่ม ${createdTables.length} โต๊ะใหม่เรียบร้อยแล้ว`,
        tables: createdTables,
      });
    }

    // 3. Clear Table Status
    if (action === 'CLEAR_TABLE') {
      const tableNo = parseInt(body.tableId || body.tableNo);
      const table = await prisma.table.findUnique({
        where: {
          storeId_tableNo: {
            storeId: store.id,
            tableNo,
          },
        },
      });

      if (!table) return NextResponse.json({ error: 'ไม่พบโต๊ะนี้' }, { status: 404 });

      await prisma.table.update({
        where: { id: table.id },
        data: { status: 'AVAILABLE', currentSessionId: null },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'clear', tableNo }, store.id);
      return NextResponse.json({ success: true, message: `เคลียร์สถานะ ${table.name} เป็นว่างแล้ว` });
    }

    // 4. Move Table
    if (action === 'MOVE_TABLE') {
      const fromTableNo = parseInt(body.fromTableId || body.fromTableNo);
      const toTableNo = parseInt(body.toTableId || body.toTableNo);

      const [fromTable, toTable] = await Promise.all([
        prisma.table.findUnique({ where: { storeId_tableNo: { storeId: store.id, tableNo: fromTableNo } } }),
        prisma.table.findUnique({ where: { storeId_tableNo: { storeId: store.id, tableNo: toTableNo } } }),
      ]);

      if (!fromTable || !toTable) {
        return NextResponse.json({ error: 'ไม่พบโต๊ะต้นทางหรือปลายทาง' }, { status: 404 });
      }

      await prisma.order.updateMany({
        where: {
          storeId: store.id,
          tableId: fromTable.id,
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
        },
        data: { tableId: toTable.id, tableNo: toTable.tableNo },
      });

      await prisma.table.update({ where: { id: fromTable.id }, data: { status: 'AVAILABLE' } });
      await prisma.table.update({ where: { id: toTable.id }, data: { status: 'OCCUPIED' } });

      broadcastEvent('TABLE_UPDATED', { action: 'move', from: fromTableNo, to: toTableNo }, store.id);
      return NextResponse.json({ success: true, message: `ย้ายจาก ${fromTable.name} ไป ${toTable.name} เรียบร้อยแล้ว` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling tables POST:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
