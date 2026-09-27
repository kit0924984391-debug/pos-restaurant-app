import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let setting = await prisma.platformSetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      setting = await prisma.platformSetting.create({
        data: {
          id: 'default',
          platformName: 'Order Pos Platform',
          bankName: 'ธนาคารกสิกรไทย (KBANK)',
          bankAccountNo: '123-4-56789-0',
          bankAccountName: 'บจก. ออร์เดียโอ โซลูชั่นส์',
          promptPayId: '0812345678',
          contactLine: '@ordeopos',
          contactPhone: '081-234-5678',
        },
      });
    }

    return NextResponse.json({ setting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { platformName, bankName, bankAccountNo, bankAccountName, promptPayId, contactLine, contactPhone } = body;

    const setting = await prisma.platformSetting.upsert({
      where: { id: 'default' },
      update: {
        platformName,
        bankName,
        bankAccountNo,
        bankAccountName,
        promptPayId,
        contactLine,
        contactPhone,
      },
      create: {
        id: 'default',
        platformName,
        bankName,
        bankAccountNo,
        bankAccountName,
        promptPayId,
        contactLine,
        contactPhone,
      },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
