import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

// Shared table carts memory store: `${storeId}:${tableId}` -> { cart, updatedAt, updatedBy, clientUuid }
const tableCarts = new Map<
  string,
  {
    cart: any[];
    updatedAt: number;
    updatedBy?: string;
    clientUuid?: string;
  }
>();

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

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      select: { id: true, tableNo: true },
    });

    if (!table) return NextResponse.json({ error: 'ไม่พบโต๊ะนี้' }, { status: 404 });

    const key = `${store.id}:${table.tableNo}`;
    const data = tableCarts.get(key) || { cart: [], updatedAt: Date.now() };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      select: { id: true, tableNo: true },
    });

    if (!table) return NextResponse.json({ error: 'ไม่พบโต๊ะนี้' }, { status: 404 });

    const body = await request.json();
    const { cart = [], clientUuid, updatedBy } = body;

    const key = `${store.id}:${table.tableNo}`;
    const payload = {
      cart,
      updatedAt: Date.now(),
      updatedBy: updatedBy || 'เพื่อนที่โต๊ะ',
      clientUuid,
    };

    tableCarts.set(key, payload);

    // Broadcast to all clients connected to this store's stream
    broadcastEvent(
      'TABLE_CART_UPDATED',
      {
        tableId: table.tableNo,
        tableDbId: table.id,
        cart,
        clientUuid,
        updatedBy: payload.updatedBy,
        timestamp: payload.updatedAt,
      },
      store.id
    );

    return NextResponse.json({ success: true, ...payload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      select: { id: true, tableNo: true },
    });

    if (!table) return NextResponse.json({ error: 'ไม่พบโต๊ะนี้' }, { status: 404 });

    const key = `${store.id}:${table.tableNo}`;
    tableCarts.delete(key);

    broadcastEvent(
      'TABLE_CART_UPDATED',
      {
        tableId: table.tableNo,
        tableDbId: table.id,
        cart: [],
        timestamp: Date.now(),
      },
      store.id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
