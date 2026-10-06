import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { formatImageUrl } from '@/lib/utils';
import { requireStoreAccess } from '@/lib/auth';
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

    const categories = await prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              include: {
                choices: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    try {
      await requireStoreAccess(params.slug);
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized: Staff access required' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();

    // Action 1: Create Category
    if (body.action === 'CREATE_CATEGORY' || body.type === 'category') {
      const { name, icon } = body;
      if (!name) {
        return NextResponse.json({ error: 'กรุณากรอกชื่อหมวดหมู่' }, { status: 400 });
      }
      const count = await prisma.category.count({ where: { storeId: store.id } });
      const newCategory = await prisma.category.create({
        data: {
          storeId: store.id,
          name: name.trim(),
          sortOrder: count + 1,
        },
      });
      broadcastEvent('MENU_UPDATED', { action: 'create_category', category: newCategory }, store.id);
      return NextResponse.json(newCategory);
    }

    // Action 2: Create Menu Item
    const { categoryId, name, description, basePrice, imageUrl, options } = body;

    const newItem = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        categoryId,
        name,
        description,
        basePrice: parseFloat(basePrice),
        imageUrl: formatImageUrl(imageUrl) || null,
        isAvailable: true,
        options: options
          ? {
              create: options.map((group: any) => ({
                title: group.title,
                isRequired: group.isRequired || false,
                isMulti: group.isMulti || false,
                choices: {
                  create: group.choices.map((choice: any) => ({
                    name: choice.name,
                    extraPrice: parseFloat(choice.extraPrice || 0),
                  })),
                },
              })),
            }
          : undefined,
      },
      include: {
        options: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent('MENU_UPDATED', { action: 'create', item: newItem }, store.id);

    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    try {
      await requireStoreAccess(params.slug);
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized: Staff access required' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    if (type === 'category') {
      await prisma.category.deleteMany({
        where: { id, storeId: store.id },
      });
    } else {
      await prisma.menuItem.deleteMany({
        where: { id, storeId: store.id },
      });
    }

    broadcastEvent('MENU_UPDATED', { action: 'delete', id, type }, store.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu/category:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
