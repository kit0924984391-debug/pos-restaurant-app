import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await getCurrentUser();

    // Increment viewsCount atomically
    const thread = await prisma.boardThread.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            store: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: { where: { status: 'VISIBLE' } },
          },
        },
        ...(session?.id
          ? {
              reactions: {
                where: { userId: session.id },
                select: { id: true, type: true },
              },
            }
          : {}),
      },
    });

    if (!thread || thread.status === 'HIDDEN') {
      return NextResponse.json(
        { error: 'ไม่พบกระทู้นี้ หรือกระทู้อาจถูกลบ/ซ่อนไปแล้ว' },
        { status: 404 }
      );
    }

    // Fetch comments for this thread (top-level and replies)
    const comments = await prisma.boardComment.findMany({
      where: {
        threadId: id,
        status: 'VISIBLE',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            store: { select: { name: true, slug: true } },
          },
        },
        _count: {
          select: { reactions: true },
        },
        ...(session?.id
          ? {
              reactions: {
                where: { userId: session.id },
                select: { id: true, type: true },
              },
            }
          : {}),
      },
    });

    const formattedComments = comments.map((c: any) => ({
      id: c.id,
      parentId: c.parentId,
      body: c.body,
      createdAt: c.createdAt,
      author: {
        id: c.user.id,
        name: c.user.name,
        role: c.user.role,
        storeName: c.user.store?.name || null,
        storeSlug: c.user.store?.slug || null,
      },
      reactionsCount: c._count.reactions,
      hasReacted: Boolean(c.reactions && c.reactions.length > 0),
    }));

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        body: thread.body,
        isPinned: thread.isPinned,
        isLocked: thread.isLocked,
        status: thread.status,
        featureStatus: thread.featureStatus,
        viewsCount: thread.viewsCount,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        category: thread.category,
        author: {
          id: thread.user.id,
          name: thread.user.name,
          role: thread.user.role,
          storeName: thread.user.store?.name || null,
          storeSlug: thread.user.store?.slug || null,
        },
        reactionsCount: thread._count.reactions,
        commentsCount: thread._count.comments,
        hasReacted: Boolean(thread.reactions && thread.reactions.length > 0),
      },
      comments: formattedComments,
      currentUser: session
        ? {
            id: session.id,
            name: session.name,
            role: session.role,
            storeName: session.storeName,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching thread detail:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
        { status: 401 }
      );
    }

    const { id } = params;
    const thread = await prisma.boardThread.findUnique({
      where: { id },
    });

    if (!thread) {
      return NextResponse.json({ error: 'ไม่พบกระทู้' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    const isAuthor = thread.userId === session.id;
    const isAdmin = session.role === 'SUPER_ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์แก้ไขกระทู้นี้' },
        { status: 403 }
      );
    }

    // Author can update title and body (if not locked)
    if (isAuthor) {
      if (thread.isLocked && !isAdmin) {
        return NextResponse.json(
          { error: 'กระทู้นี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้' },
          { status: 403 }
        );
      }
      if (body.title) updateData.title = body.title.trim();
      if (body.body) updateData.body = body.body.trim();
    }

    // Admin can update pin, lock, status, and featureStatus
    if (isAdmin) {
      if (typeof body.isPinned === 'boolean') updateData.isPinned = body.isPinned;
      if (typeof body.isLocked === 'boolean') updateData.isLocked = body.isLocked;
      if (body.status && ['VISIBLE', 'HIDDEN', 'PENDING_REVIEW'].includes(body.status)) {
        updateData.status = body.status;
      }
      if (
        body.featureStatus !== undefined &&
        [null, 'UNDER_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'].includes(body.featureStatus)
      ) {
        updateData.featureStatus = body.featureStatus;
      }
    }

    const updatedThread = await prisma.boardThread.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, thread: updatedThread });
  } catch (error: any) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตกระทู้', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
        { status: 401 }
      );
    }

    const { id } = params;
    const thread = await prisma.boardThread.findUnique({
      where: { id },
    });

    if (!thread) {
      return NextResponse.json({ error: 'ไม่พบกระทู้' }, { status: 404 });
    }

    const isAuthor = thread.userId === session.id;
    const isAdmin = session.role === 'SUPER_ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ลบกระทู้นี้' },
        { status: 403 }
      );
    }

    // Soft delete by setting status to HIDDEN
    await prisma.boardThread.update({
      where: { id },
      data: { status: 'HIDDEN' },
    });

    return NextResponse.json({ success: true, message: 'ลบกระทู้สำเร็จ' });
  } catch (error: any) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบกระทู้', details: error.message },
      { status: 500 }
    );
  }
}
