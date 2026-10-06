import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate') || dateParam;
    const endDateParam = searchParams.get('endDate') || startDateParam;

    // Calculate day boundaries in Thailand timezone (UTC+7 / Asia/Bangkok)
    const bangkokDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
    const cleanStartDate = startDateParam ? startDateParam.slice(0, 10) : bangkokDateStr;
    const cleanEndDate = endDateParam ? endDateParam.slice(0, 10) : cleanStartDate;

    const startOfPeriod = new Date(`${cleanStartDate}T00:00:00+07:00`);
    const endOfPeriod = new Date(`${cleanEndDate}T23:59:59.999+07:00`);

    const paidOrders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        paymentStatus: 'PAID',
        paidAt: {
          gte: startOfPeriod,
          lte: endOfPeriod,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalSales = paidOrders.reduce((sum, o) => sum + o.netAmount, 0);
    const totalBills = paidOrders.length;
    const totalCost = paidOrders.reduce((sum, o) => sum + (o.costAmount || 0), 0);
    const totalDiscount = paidOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const totalGpDeducted = paidOrders.reduce((sum, o) => sum + (o.gpAmount || 0), 0);
    const netRevenueReceived = totalSales - totalGpDeducted;
    const grossProfit = netRevenueReceived - totalCost;
    const profitMargin = netRevenueReceived > 0 ? Math.round((grossProfit / netRevenueReceived) * 100) : 0;
    const totalPointsEarned = paidOrders.reduce((sum, o) => sum + (o.pointsEarned || 0), 0);
    const totalPointsRedeemed = paidOrders.reduce((sum, o) => sum + (o.pointsRedeemed || 0), 0);

    let cashSales = 0;
    let promptPaySales = 0;

    // Breakdown by Channel
    const channels = {
      DINE_IN: { count: 0, gross: 0, net: 0, gp: 0 },
      TAKEAWAY: { count: 0, gross: 0, net: 0, gp: 0 },
      LINEMAN: { count: 0, gross: 0, net: 0, gp: 0 },
      GRAB: { count: 0, gross: 0, net: 0, gp: 0 },
      SHOPEE_FOOD: { count: 0, gross: 0, net: 0, gp: 0 },
      ROBINHOOD: { count: 0, gross: 0, net: 0, gp: 0 },
    };

    const itemCounts: { [name: string]: { quantity: number; revenue: number } } = {};

    // Grouping for Daily Breakdown
    const dailyMap: {
      [dateKey: string]: {
        date: string;
        sales: number;
        bills: number;
        cost: number;
        profit: number;
        cash: number;
        promptPay: number;
      };
    } = {};

    paidOrders.forEach((order) => {
      const ch = (order.orderChannel || (order.orderType === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN')) as keyof typeof channels;
      if (channels[ch]) {
        channels[ch].count += 1;
        channels[ch].gross += order.totalAmount || order.netAmount;
        channels[ch].gp += order.gpAmount || 0;
        channels[ch].net += order.netRevenue || (order.netAmount - (order.gpAmount || 0));
      }

      if (order.paymentMethod === 'CASH') {
        cashSales += order.netAmount;
      } else {
        promptPaySales += order.netAmount;
      }

      order.items.forEach((item) => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { quantity: 0, revenue: 0 };
        }
        itemCounts[item.name].quantity += item.quantity;
        itemCounts[item.name].revenue += item.price * item.quantity;
      });

      // Daily Breakdown
      const orderDateStr = order.paidAt
        ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(order.paidAt))
        : cleanStartDate;

      if (!dailyMap[orderDateStr]) {
        dailyMap[orderDateStr] = {
          date: orderDateStr,
          sales: 0,
          bills: 0,
          cost: 0,
          profit: 0,
          cash: 0,
          promptPay: 0,
        };
      }

      const day = dailyMap[orderDateStr];
      day.sales += order.netAmount;
      day.bills += 1;
      day.cost += order.costAmount || 0;
      day.profit += (order.netAmount - (order.gpAmount || 0)) - (order.costAmount || 0);

      if (order.paymentMethod === 'CASH') {
        day.cash += order.netAmount;
      } else {
        day.promptPay += order.netAmount;
      }
    });

    const dailyBreakdown = Object.values(dailyMap).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const topSellingItems = Object.entries(itemCounts)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      startDate: cleanStartDate,
      endDate: cleanEndDate,
      date: cleanStartDate === cleanEndDate ? cleanStartDate : `${cleanStartDate} - ${cleanEndDate}`,
      isDateRange: cleanStartDate !== cleanEndDate,
      totalSales,
      totalBills,
      totalCost,
      totalDiscount,
      totalGpDeducted,
      netRevenueReceived,
      grossProfit,
      profitMargin,
      totalPointsEarned,
      totalPointsRedeemed,
      cashSales,
      promptPaySales,
      channelBreakdown: channels,
      dailyBreakdown,
      topSellingItems,
      orders: paidOrders,
    });
  } catch (error: any) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
