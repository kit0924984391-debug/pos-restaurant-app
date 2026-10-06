import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();

    const now = new Date();

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

    return NextResponse.json({
      totalStores,
      activeStores,
      trialStores,
      pendingStores,
      totalUsers,
      totalOrders,
      totalRevenue,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message.includes('FORBIDDEN') ? 403 : 401 }
    );
  }
}
