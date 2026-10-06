import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนรายงานเนื้อหา' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { threadId, commentId, reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผลในการรายงาน' },
        { status: 400 }
      );
    }

    const report = await prisma.boardReport.create({
      data: {
        reporterId: session.id,
        threadId: threadId || null,
        commentId: commentId || null,
        reason: reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบอย่างเร็วที่สุด',
      reportId: report.id,
    });
  } catch (error: any) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งรายงาน', details: error.message },
      { status: 500 }
    );
  }
}
