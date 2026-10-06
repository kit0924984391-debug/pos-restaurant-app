import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const amount = Number(searchParams.get('amount')) || 0;

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Validate a specific coupon code for checkout
    if (code) {
      const cleanCode = code.toUpperCase().trim();
      const promo = await prisma.promotion.findUnique({
        where: {
          storeId_code: {
            storeId: store.id,
            code: cleanCode,
          },
        },
      });

      if (!promo || !promo.isActive) {
        return NextResponse.json({ error: 'โค้ดส่วนลดไม่ถูกต้อง หรือหมดอายุแล้ว' }, { status: 400 });
      }

      if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
        return NextResponse.json({ error: 'โค้ดส่วนลดหมดอายุแล้ว' }, { status: 400 });
      }

      if (amount < promo.minSpend) {
        return NextResponse.json(
          { error: `ยอดสั่งซื้อขั้นต่ำต้องครบ ฿${promo.minSpend} (ยอดปัจจุบัน ฿${amount})` },
          { status: 400 }
        );
      }

      let discount = 0;
      if (promo.discountType === 'PERCENT') {
        discount = (amount * promo.discountValue) / 100;
      } else {
        discount = Math.min(amount, promo.discountValue);
      }

      return NextResponse.json({
        valid: true,
        promo: {
          code: promo.code,
          title: promo.title,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          calculatedDiscount: Math.round(discount),
        },
      });
    }

    // List all promotions for store admin
    const promotions = await prisma.promotion.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ promotions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const body = await request.json();
    const { code, title, discountType, discountValue, minSpend, expiryDate } = body;

    if (!code || !title || !discountValue) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลโค้ดและมูลค่าส่วนลดให้ครบถ้วน' }, { status: 400 });
    }

    const promo = await prisma.promotion.upsert({
      where: {
        storeId_code: {
          storeId: store.id,
          code: code.toUpperCase().trim(),
        },
      },
      update: {
        title: title.trim(),
        discountType: discountType || 'FIXED',
        discountValue: Number(discountValue),
        minSpend: Number(minSpend) || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      create: {
        storeId: store.id,
        code: code.toUpperCase().trim(),
        title: title.trim(),
        discountType: discountType || 'FIXED',
        discountValue: Number(discountValue),
        minSpend: Number(minSpend) || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, promotion: promo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { store } = await requireStoreAccess(params.slug);
    const body = await request.json();
    const { id, code, title, discountType, discountValue, minSpend, expiryDate, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing promotion id' }, { status: 400 });
    }

    const existing = await prisma.promotion.findFirst({
      where: { id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // If updating code, ensure it's not duplicate with another promotion
    if (code && code.toUpperCase().trim() !== existing.code) {
      const duplicate = await prisma.promotion.findFirst({
        where: {
          storeId: store.id,
          code: code.toUpperCase().trim(),
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'รหัสคูปองนี้มีอยู่แล้วในระบบ' }, { status: 400 });
      }
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase().trim() }),
        ...(title !== undefined && { title: title.trim() }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(minSpend !== undefined && { minSpend: Number(minSpend) || 0 }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, promotion: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    await prisma.promotion.delete({
      where: { id, storeId: store.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
