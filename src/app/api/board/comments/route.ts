import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { threadId, parentId, body: commentBody } = body;

    if (!threadId || !commentBody || !commentBody.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อความความคิดเห็น' },
        { status: 400 }
      );
    }

    // Verify thread exists and not locked
    const thread = await prisma.boardThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.status === 'HIDDEN') {
      return NextResponse.json(
        { error: 'ไม่พบกระทู้ที่ต้องการตอบ' },
        { status: 404 }
      );
    }

    if (thread.isLocked && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'กระทู้นี้ถูกล็อกแล้ว ไม่สามารถแสดงความคิดเห็นเพิ่มเติมได้' },
        { status: 403 }
      );
    }

    // If parentId provided, verify it belongs to this thread
    if (parentId) {
      const parent = await prisma.boardComment.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.threadId !== threadId) {
        return NextResponse.json(
          { error: 'ไม่พบคอมเมนต์ต้นทางที่ต้องการตอบกลับ' },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.boardComment.create({
      data: {
        threadId,
        parentId: parentId || null,
        userId: session.id,
        body: commentBody.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            store: { select: { name: true, slug: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        createdAt: comment.createdAt,
        author: {
          id: comment.user.id,
          name: comment.user.name,
          role: comment.user.role,
          storeName: comment.user.store?.name || null,
          storeSlug: comment.user.store?.slug || null,
        },
        reactionsCount: 0,
        hasReacted: false,
      },
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งความคิดเห็น', details: error.message },
      { status: 500 }
    );
  }
}
