import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { formatImageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const { categoryId, name, description, basePrice, imageUrl, isAvailable, options } = body;

    const existing = await prisma.menuItem.findFirst({
      where: { id: params.id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบเมนูอาหาร' }, { status: 404 });
    }

    // Update options if provided
    if (options !== undefined && Array.isArray(options)) {
      await prisma.menuOptionGroup.deleteMany({
        where: { menuItemId: params.id },
      });

      for (const group of options) {
        if (!group.title || !group.title.trim()) continue;
        const validChoices = (group.choices || [])
          .filter((c: any) => c.name && c.name.trim())
          .map((choice: any) => ({
            name: choice.name.trim(),
            extraPrice: parseFloat(choice.extraPrice) || 0,
          }));

        await prisma.menuOptionGroup.create({
          data: {
            menuItemId: params.id,
            title: group.title.trim(),
            isRequired: Boolean(group.isRequired),
            isMulti: Boolean(group.isMulti),
            choices: {
              create: validChoices,
            },
          },
        });
      }
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        ...(categoryId && { categoryId }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(imageUrl !== undefined && { imageUrl: formatImageUrl(imageUrl) || null }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: {
        options: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent('MENU_UPDATED', { action: 'update', item: updatedItem }, store.id);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
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

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const existing = await prisma.menuItem.findFirst({
      where: { id: params.id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบเมนูอาหาร' }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id: params.id },
    });

    broadcastEvent('MENU_UPDATED', { action: 'delete', id: params.id }, store.id);

    return NextResponse.json({ success: true, message: 'ลบเมนูเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}