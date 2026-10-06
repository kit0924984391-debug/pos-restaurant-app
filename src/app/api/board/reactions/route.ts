import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนโหวตหรือถูกใจ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { threadId, commentId, type = 'UPVOTE' } = body;

    if (!threadId && !commentId) {
      return NextResponse.json(
        { error: 'ต้องระบุ threadId หรือ commentId' },
        { status: 400 }
      );
    }

    // Check if reaction already exists
    const existing = await prisma.boardReaction.findFirst({
      where: {
        userId: session.id,
        threadId: threadId || null,
        commentId: commentId || null,
        type,
      },
    });

    let hasReacted = false;
    if (existing) {
      // Remove reaction (toggle off)
      await prisma.boardReaction.delete({
        where: { id: existing.id },
      });
      hasReacted = false;
    } else {
      // Create reaction
      await prisma.boardReaction.create({
        data: {
          userId: session.id,
          threadId: threadId || null,
          commentId: commentId || null,
          type,
        },
      });
      hasReacted = true;
    }

    // Return new count
    const count = await prisma.boardReaction.count({
      where: {
        threadId: threadId || null,
        commentId: commentId || null,
      },
    });

    return NextResponse.json({
      success: true,
      hasReacted,
      reactionsCount: count,
    });
  } catch (error: any) {
    console.error('Error toggling reaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกการโหวต', details: error.message },
      { status: 500 }
    );
  }
}
