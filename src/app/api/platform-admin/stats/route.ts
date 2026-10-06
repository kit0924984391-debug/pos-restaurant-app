import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();

    const now = new Date();

    // Today's boundaries in Thailand timezone
    const bkkTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);
    const startOfToday = new Date(`${bkkTodayStr}T00:00:00+07:00`);

    const totalStores = await prisma.store.count();
    const activeStores = await prisma.store.count({ where: { status: 'ACTIVE' } });
    const trialStores = await prisma.store.count({ where: { status: 'TRIAL' } });
    const pendingStores = await prisma.subscriptionHistory.count({ where: { status: 'PENDING' } });
    const totalUsers = await prisma.user.count();
    const totalOrders = await prisma.order.count();
    const subscriptions = await prisma.subscriptionHistory.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    const totalRevenue = subscriptions._sum.amount || 0;

    // Today platform activity
    const todayOrdersCount = await prisma.order.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const todayPaidOrders = await prisma.order.aggregate({
      where: {
        paymentStatus: 'PAID',
        paidAt: { gte: startOfToday },
      },
      _sum: { netAmount: true },
    });
    const todayGrossSales = todayPaidOrders._sum.netAmount || 0;

    // 5 Most Recent Stores
    const recentStores = await prisma.store.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        users: {
          select: { name: true, email: true },
          take: 1,
        },
        _count: {
          select: { orders: true, tables: true, menuItems: true },
        },
      },
    });

    return NextResponse.json({
      totalStores,
      activeStores,
      trialStores,
      pendingStores,
      totalUsers,
      totalOrders,
      totalRevenue,
      todayOrdersCount,
      todayGrossSales,
      recentStores,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message.includes('FORBIDDEN') ? 403 : 401 }
    );
  }
}
