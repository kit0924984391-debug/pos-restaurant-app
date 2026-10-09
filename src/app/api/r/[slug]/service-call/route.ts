import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ calls: [] });
    }

    const tables = await prisma.table.findMany({
      where: {
        storeId: store.id,
        currentSessionId: { contains: 'serviceCall' },
      },
      select: {
        tableNo: true,
        name: true,
        currentSessionId: true,
      },
      orderBy: { tableNo: 'asc' },
    });

    const calls: any[] = [];
    tables.forEach((t) => {
      if (t.currentSessionId) {
        try {
          const parsed = JSON.parse(t.currentSessionId);
          if (parsed && parsed.serviceCall) {
            calls.push(parsed.serviceCall);
          }
        } catch (e) {}
      }
    });

    return NextResponse.json({ success: true, calls });
  } catch (error: any) {
    console.error('Error fetching service calls:', error);
    return NextResponse.json({ calls: [] });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้านี้' }, { status: 404 });
    }

    const body = await request.json();

    // Dismiss service call(s)
    if (body.action === 'DISMISS' || body.action === 'DISMISS_ALL') {
      if (body.tableNo) {
        await prisma.table.updateMany({
          where: {
            storeId: store.id,
            tableNo: Number(body.tableNo),
          },
          data: { currentSessionId: null },
        });
      } else {
        await prisma.table.updateMany({
          where: {
            storeId: store.id,
            currentSessionId: { contains: 'serviceCall' },
          },
          data: { currentSessionId: null },
        });
      }
      return NextResponse.json({ success: true, message: 'รับทราบเรียบร้อยแล้ว' });
    }

    // Customer initiating service call
    const { tableNo, tableName, requestType, note } = body;
    const targetTableNo = Number(tableNo) || 1;
    const effectiveReqType = requestType || 'เรียกพนักงาน';

    // Idempotent duplicate check: if table called within 20s with same requestType, return existing call without duplicate chime
    const existingTable = await prisma.table.findUnique({
      where: {
        storeId_tableNo: {
          storeId: store.id,
          tableNo: targetTableNo,
        },
      },
      select: { currentSessionId: true },
    });

    if (existingTable?.currentSessionId) {
      try {
        const parsed = JSON.parse(existingTable.currentSessionId);
        if (parsed && parsed.serviceCall) {
          const prevCall = parsed.serviceCall;
          const timeSince = Date.now() - (prevCall.timestamp || 0);
          if (timeSince < 20000 && prevCall.requestType === effectiveReqType) {
            return NextResponse.json({
              success: true,
              isDuplicate: true,
              message: 'แจ้งพนักงานเรียบร้อยแล้ว พนักงานกำลังมาให้บริการครับ',
              call: prevCall,
            });
          }
        }
      } catch (e) {}
    }

    const callPayload = {
      id: `call_${Date.now()}_${targetTableNo || 'table'}`,
      tableNo: targetTableNo,
      tableName: tableName || (tableNo ? `โต๊ะ ${tableNo}` : 'โต๊ะอาหาร'),
      requestType: effectiveReqType,
      note: note || '',
      timestamp: Date.now(),
    };

    // 1. Persist in database on table's currentSessionId for serverless resilience
    await prisma.table.upsert({
      where: {
        storeId_tableNo: {
          storeId: store.id,
          tableNo: targetTableNo,
        },
      },
      update: {
        currentSessionId: JSON.stringify({
          serviceCall: callPayload,
        }),
      },
      create: {
        storeId: store.id,
        tableNo: targetTableNo,
        name: tableName || `โต๊ะ ${targetTableNo}`,
        currentSessionId: JSON.stringify({
          serviceCall: callPayload,
        }),
      },
    });

    // 2. Broadcast event to store SSE subscribers (for local & instant realtime)
    broadcastEvent('SERVICE_CALLED', callPayload, store.id);

    return NextResponse.json({
      success: true,
      message: 'แจ้งพนักงานเรียบร้อยแล้ว พนักงานกำลังมาให้บริการครับ',
      call: callPayload,
    });
  } catch (error: any) {
    console.error('Error handling service call:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเรียกพนักงาน' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tableNo = searchParams.get('tableNo');

    if (tableNo) {
      await prisma.table.updateMany({
        where: {
          storeId: store.id,
          tableNo: Number(tableNo),
        },
        data: { currentSessionId: null },
      });
    } else {
      await prisma.table.updateMany({
        where: {
          storeId: store.id,
          currentSessionId: { contains: 'serviceCall' },
        },
        data: { currentSessionId: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting service call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
