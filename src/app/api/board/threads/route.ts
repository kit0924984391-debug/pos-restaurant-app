import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const search = searchParams.get('q');
    const sort = searchParams.get('sort') || 'recent'; // 'recent' | 'top' | 'pinned'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15')));
    const skip = (page - 1) * limit;

    const session = await getCurrentUser();

    // Build Prisma where clause
    const where: any = {
      status: 'VISIBLE',
    };

    if (categorySlug && categorySlug !== 'all') {
      where.category = { slug: categorySlug };
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { body: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Determine ordering
    let orderBy: any[] = [{ isPinned: 'desc' }];
    if (sort === 'top') {
      // Order by reaction count: Prisma allows ordering by relations count in recent versions
      orderBy.push({ reactions: { _count: 'desc' } });
      orderBy.push({ createdAt: 'desc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [total, threads] = await Promise.all([
      prisma.boardThread.count({ where }),
      prisma.boardThread.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
              comments: { where: { status: 'VISIBLE' } },
              reactions: true,
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
      }),
    ]);

    const formattedThreads = threads.map((t: any) => ({
      id: t.id,
      title: t.title,
      body: t.body,
      isPinned: t.isPinned,
      isLocked: t.isLocked,
      status: t.status,
      featureStatus: t.featureStatus,
      viewsCount: t.viewsCount,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      category: t.category,
      author: {
        id: t.user.id,
        name: t.user.name,
        role: t.user.role,
        storeName: t.user.store?.name || null,
        storeSlug: t.user.store?.slug || null,
      },
      commentsCount: t._count.comments,
      reactionsCount: t._count.reactions,
      hasReacted: Boolean(t.reactions && t.reactions.length > 0),
    }));

    return NextResponse.json({
      success: true,
      threads: formattedThreads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching board threads:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลกระทู้ได้', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนตั้งกระทู้' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { categoryId, title, body: threadBody } = body;

    if (!categoryId || !title || !threadBody) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (หมวดหมู่, หัวข้อ, เนื้อหา)' },
        { status: 400 }
      );
    }

    if (title.trim().length < 5) {
      return NextResponse.json(
        { error: 'หัวข้อกระทู้ต้องมีความยาวอย่างน้อย 5 ตัวอักษร' },
        { status: 400 }
      );
    }

    if (threadBody.trim().length < 10) {
      return NextResponse.json(
        { error: 'เนื้อหากระทู้ต้องมีความยาวอย่างน้อย 10 ตัวอักษร' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.boardCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'ไม่พบหมวดหมู่ที่เลือก' },
        { status: 404 }
      );
    }

    // Only SUPER_ADMIN can post in announcement
    if (category.slug === 'announcement' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถโพสต์ในหมวดหมู่ประกาศได้' },
        { status: 403 }
      );
    }

    // Rate limit check: Max 3 threads in the last 1 hour per user (except SUPER_ADMIN)
    if (session.role !== 'SUPER_ADMIN') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentThreadsCount = await prisma.boardThread.count({
        where: {
          userId: session.id,
          createdAt: { gte: oneHourAgo },
        },
      });

      if (recentThreadsCount >= 3) {
        return NextResponse.json(
          { error: 'คุณตั้งกระทู้บ่อยเกินไป (จำกัด 3 กระทู้ต่อชั่วโมง) กรุณารอสักครู่แล้วลองใหม่' },
          { status: 429 }
        );
      }
    }

    // Initial feature status for suggestion category
    const initialFeatureStatus = category.slug === 'suggestion' ? 'UNDER_REVIEW' : null;

    const thread = await prisma.boardThread.create({
      data: {
        categoryId,
        userId: session.id,
        title: title.trim(),
        body: threadBody.trim(),
        featureStatus: initialFeatureStatus,
      },
      include: {
        category: true,
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
      thread: {
        id: thread.id,
        title: thread.title,
        body: thread.body,
        category: thread.category,
        featureStatus: thread.featureStatus,
        createdAt: thread.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating board thread:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างกระทู้', details: error.message },
      { status: 500 }
    );
  }
}
