import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.boardCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            threads: {
              where: { status: 'VISIBLE' },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('Error fetching board categories:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้', details: error.message },
      { status: 500 }
    );
  }
}
