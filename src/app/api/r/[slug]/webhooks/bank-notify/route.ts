import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { parseBankNotificationText } from '@/lib/bank-message-parser';

export const dynamic = 'force-dynamic';

/**
 * GET: ดึงประวัติการแจ้งเตือนเงินเข้าของร้านค้านี้ (30 รายการล่าสุด)
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, bankWebhookKey: true, bankAutoCheckout: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const logs = await prisma.bankNotificationLog.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      bankAutoCheckout: store.bankAutoCheckout,
      hasWebhookKey: Boolean(store.bankWebhookKey),
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching bank notification logs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Webhook รับข้อมูลแจ้งเตือนเงินเข้าจาก LINE / ธนาคาร (ส่งจาก MacroDroid, Notification Forwarder, ฯลฯ)
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get('key');

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        promptPayId: true,
        pointsRate: true,
        bankWebhookKey: true,
        bankAutoCheckout: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้านี้ในระบบ' }, { status: 404 });
    }

    // 1. ตรวจสอบเนื้อหา Body ที่ส่งมา (รองรับทั้ง JSON และ Plain Text)
    let rawText = '';
    let sender = '';
    let title = '';
    let bodyKey = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const json = await request.json();
        rawText = json.text || json.message || json.body || json.content || '';
        sender = json.sender || json.app || json.package || '';
        title = json.title || '';
        bodyKey = json.key || json.secret || '';
      } catch {
        rawText = await request.text();
      }
    } else {
      rawText = await request.text();
    }

    // 2. ตรวจสอบ Security Webhook Key (Fail-Closed)
    const providedKey =
      queryKey ||
      bodyKey ||
      request.headers.get('x-bank-webhook-key') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!store.bankWebhookKey || store.bankWebhookKey.trim() === '') {
      return NextResponse.json(
        { error: 'Unauthorized: ร้านค้ายังไม่ได้กำหนด bankWebhookKey กรุณาตั้งค่าในระบบก่อนเปิดใช้งาน Webhook' },
        { status: 401 }
      );
    }

    if (!providedKey || providedKey.trim() !== store.bankWebhookKey.trim()) {
      return NextResponse.json(
        { error: 'Unauthorized: Webhook Key ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // 2.5 ปฏิเสธการแจ้งเตือนผ่านอีเมลทั้งหมดอย่างเด็ดขาด (ปิดฟังก์ชันอ่านเงินเข้าผ่าน Email)
    const isEmail =
      sender.includes('@') ||
      sender.toLowerCase().includes('mail') ||
      title.toLowerCase().includes('mail') ||
      rawText.toLowerCase().includes('from:') ||
      rawText.toLowerCase().includes('subject:') ||
      request.headers.get('user-agent')?.toLowerCase().includes('google-apps-script');

    if (isEmail) {
      // ตอบกลับ status 200 เพื่อให้ Google Apps Script / Client มาร์กอ่านแล้วและไม่วนกลับมายิงซ้ำ
      // โดยไม่บันทึกข้อมูลใดๆ ลงใน BankNotificationLog เพื่อไม่ให้ฐานข้อมูลบวม
      return NextResponse.json({
        success: false,
        ignored: true,
        channel: 'EMAIL_DISABLED',
        message: 'ระบบปิดการรับข้อมูลเงินเข้าผ่านทางอีเมลแล้ว (กรุณาใช้ Direct Web หรือ MacroDroid แทน)',
      }, { status: 200 });
    }

    // 3. ทำการวิเคราะห์ข้อความแจ้งเตือนด้วย Bank Message Parser
    const parsed = parseBankNotificationText(rawText, title ? `${title} ${sender}` : sender);

    if (!parsed.isValid || !parsed.amount) {
      // ไม่บันทึกขยะหรือรายการที่ไม่ใช่เงินเข้าลงตาราง เพื่อป้องกันฐานข้อมูลบวม
      return NextResponse.json({
        success: false,
        message: parsed.message,
        parsed,
      }, { status: 200 });
    }

    const incomingAmount = parsed.amount;
    const channel = 'NOTIFICATION';

    // 3.1 ป้องกันการส่ง Webhook ซ้ำซ้อน (Replay / Duplicate Webhook Protection ภายใน 12 ชั่วโมง)
    const recentDuplicate = await prisma.bankNotificationLog.findFirst({
      where: {
        storeId: store.id,
        rawText: rawText.slice(0, 500),
        amount: incomingAmount,
        createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
    });

    if (recentDuplicate) {
      return NextResponse.json({
        success: true,
        isDuplicateWebhook: true,
        message: 'ได้รับข้อความแจ้งเตือนนี้แล้ว (ตรวจจับการส่งซ้ำอัตโนมัติ)',
        parsed,
      });
    }

    // ลบ Log เก่าที่เกิน 7 วัน เพื่อป้องกันตาราง BankNotificationLog บวม
    await prisma.bankNotificationLog.deleteMany({
      where: {
        storeId: store.id,
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }).catch(() => {});

    // 4. ดึงรายการออเดอร์และโต๊ะที่ค้างชำระเงินของร้าน
    const activeOrders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
        status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
      },
      include: {
        table: true,
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 5. จัดกลุ่มออเดอร์ตามโต๊ะเพื่อคำนวณยอดเงินที่ตรงกัน
    interface TableCandidate {
      tableNo: number | null;
      tableName: string;
      tableId: string | null;
      orders: typeof activeOrders;
      totalAmount: number;
    }

    const tableMap = new Map<string, TableCandidate>();
    for (const order of activeOrders) {
      const groupKey = order.tableId
        ? `table_${order.tableId}`
        : order.tableNo
        ? `table_no_${order.tableNo}`
        : `order_${order.id}`;
      const existing = tableMap.get(groupKey);
      if (existing) {
        existing.orders.push(order);
        existing.totalAmount += order.netAmount || 0;
      } else {
        tableMap.set(groupKey, {
          tableNo: order.tableNo,
          tableName: order.table?.name || (order.tableNo ? `โต๊ะ ${order.tableNo}` : `ออเดอร์ #${order.id.slice(-4)}`),
          tableId: order.tableId,
          orders: [order],
          totalAmount: order.netAmount || 0,
        });
      }
    }

    // หาแคนดิเดตโต๊ะที่ยอดเงินตรงกัน (ความคลาดเคลื่อนไม่เกิน 1 บาท)
    const matchingCandidates: TableCandidate[] = [];
    for (const candidate of Array.from(tableMap.values())) {
      if (Math.abs(candidate.totalAmount - incomingAmount) <= 1) {
        matchingCandidates.push(candidate);
      }
    }

    // 6. ตัดสินใจดำเนินการตามสถานะการจับคู่
    if (matchingCandidates.length === 1 && store.bankAutoCheckout) {
      // เคสที่ 1: พบโต๊ะเดียวที่ยอดตรงเป๊ะ และเปิดโหมดปิดบิลอัตโนมัติ -> ทำการปิดบิลทันที!
      const matched = matchingCandidates[0];
      const ordersToClose = matched.orders;
      const effectiveSlipRef = `BANK_NOTIFY_${parsed.bank}_${Date.now()}_${ordersToClose[0].id.slice(-4)}`;

      const updatedOrders: any[] = [];
      for (let i = 0; i < ordersToClose.length; i++) {
        const o = ordersToClose[i];
        // Guarded update: bank webhooks are retried, so a duplicate delivery
        // must not close (or award points for) the same order twice.
        let updated: any;
        try {
          updated = await prisma.order.update({
            where: { id: o.id, paymentStatus: { not: 'PAID' } },
            data: {
              paymentMethod: 'PROMPTPAY',
              paymentStatus: 'PAID',
              status: 'COMPLETED',
              slipRef: `${effectiveSlipRef}${ordersToClose.length > 1 ? `_${i + 1}` : ''}`,
              slipAmount: ordersToClose.length === 1 ? incomingAmount : o.netAmount,
              slipVerifiedAt: new Date(),
              slipVerifiedBy: `AUTO_BANK_${parsed.bank}`,
              slipRawData: JSON.stringify(parsed),
              paidAt: new Date(),
              note: o.note ? `${o.note} (โอนผ่าน ${parsed.bankName})` : `ชำระผ่าน ${parsed.bankName}`,
            },
            include: { table: true, items: true },
          });
        } catch (e: any) {
          if (e?.code === 'P2025') {
            // Already paid by a concurrent delivery — skip it entirely.
            continue;
          }
          throw e;
        }
        updatedOrders.push(updated);
      }

      if (updatedOrders.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'ออเดอร์นี้ถูกปิดบิลไปแล้ว (webhook ซ้ำ) — ข้ามการประมวลผล',
          skipped: true,
        });
      }

      // จัดการแต้มสมาชิกสะสม
      const memberPhone = updatedOrders.find((o) => o.memberPhone)?.memberPhone;
      if (memberPhone && store.pointsRate > 0) {
        const totalPaidNet = updatedOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
        const totalRedeemed = updatedOrders.reduce((sum, o) => sum + (o.pointsRedeemed || 0), 0);
        const pointsEarned = Math.floor(totalPaidNet / store.pointsRate);
        const netPointsChange = pointsEarned - totalRedeemed;

        await prisma.customerMember.upsert({
          where: { storeId_phone: { storeId: store.id, phone: memberPhone } },
          update: {
            points: { increment: netPointsChange },
            totalSpent: { increment: totalPaidNet },
            visitCount: { increment: 1 },
          },
          create: {
            storeId: store.id,
            phone: memberPhone,
            name: updatedOrders[0].customerName || 'สมาชิก',
            points: Math.max(0, netPointsChange),
            totalSpent: totalPaidNet,
            visitCount: 1,
          },
        }).catch((err) => console.error('Error updating loyalty member in bank notify:', err));
      }

      // เคลียร์โต๊ะเป็น AVAILABLE หากไม่มีออเดอร์ค้างชำระอื่น
      if (matched.tableId) {
        const remainingCount = await prisma.order.count({
          where: {
            storeId: store.id,
            tableId: matched.tableId,
            id: { notIn: updatedOrders.map((o) => o.id) },
            paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          },
        });

        if (remainingCount === 0) {
          await prisma.table.update({
            where: { id: matched.tableId },
            data: { status: 'AVAILABLE', currentSessionId: null },
          });
          broadcastEvent('TABLE_UPDATED', { tableNo: matched.tableNo, status: 'AVAILABLE' }, store.id);
        }
      }

      // บันทึก Log
      const logRecord = await prisma.bankNotificationLog.create({
        data: {
          storeId: store.id,
          rawText,
          sender: sender || title || parsed.bank,
          bank: parsed.bank,
          amount: incomingAmount,
          account: parsed.account,
          matchedOrderId: updatedOrders[0].id,
          matchedTableNo: matched.tableNo,
          status: 'MATCHED',
        },
      });

      // แจ้งเตือน Realtime ไปยังหน้าจอ POS
      for (const o of updatedOrders) {
        broadcastEvent('PAYMENT_RECEIVED', o, store.id);
        broadcastEvent('ORDER_UPDATED', o, store.id);
      }

      broadcastEvent(
        'BANK_NOTIFY_RECEIVED',
        {
          action: 'AUTO_PAID',
          amount: incomingAmount,
          bank: parsed.bank,
          bankName: parsed.bankName,
          tableNo: matched.tableNo,
          tableName: matched.tableName,
          orderCount: updatedOrders.length,
          orders: updatedOrders,
          logId: logRecord.id,
          channel,
          sender: sender || title || 'แอปธนาคาร / LINE',
          title: title || 'แจ้งเตือนเงินเข้า',
        },
        store.id
      );

      return NextResponse.json({
        success: true,
        action: 'AUTO_PAID',
        message: `ตรวจพบยอดเงิน ฿${incomingAmount} ตรงกับ ${matched.tableName} และปิดบิลสำเร็จเรียบร้อย 🎉`,
        matchedTable: matched.tableName,
        tableNo: matched.tableNo,
        orders: updatedOrders,
        parsed,
      });
    } else if (matchingCandidates.length === 1 && !store.bankAutoCheckout) {
      // เคสที่ 1.5: พบโต๊ะเดียวที่ยอดตรงเป๊ะ แต่ตั้งค่าให้แคชเชียร์กดยืนยันเอง (MANUAL_CONFIRM)
      const matched = matchingCandidates[0];
      const logRecord = await prisma.bankNotificationLog.create({
        data: {
          storeId: store.id,
          rawText,
          sender: sender || title || parsed.bank,
          bank: parsed.bank,
          amount: incomingAmount,
          account: parsed.account,
          status: 'PENDING_CONFIRMATION',
        },
      });

      broadcastEvent(
        'BANK_NOTIFY_RECEIVED',
        {
          action: 'MANUAL_CONFIRM',
          amount: incomingAmount,
          bank: parsed.bank,
          bankName: parsed.bankName,
          tableNo: matched.tableNo,
          tableName: matched.tableName,
          candidates: [
            {
              tableNo: matched.tableNo,
              tableName: matched.tableName,
              tableId: matched.tableId,
              totalAmount: matched.totalAmount,
              orderIds: matched.orders.map((o) => o.id),
            },
          ],
          logId: logRecord.id,
          channel,
          sender: sender || title || 'แอปธนาคาร / LINE',
          title: title || 'แจ้งเตือนเงินเข้า',
        },
        store.id
      );

      return NextResponse.json({
        success: true,
        action: 'MANUAL_CONFIRM',
        message: `ตรวจพบยอดเงิน ฿${incomingAmount} ตรงกับ ${matched.tableName} กรุณายืนยันปิดบิลที่หน้าจอ POS`,
        matchedTable: matched.tableName,
        tableNo: matched.tableNo,
        parsed,
      });
    } else if (matchingCandidates.length > 1) {
      // เคสที่ 2: มียอดตรงกันมากกว่า 1 โต๊ะ (Ambiguous) -> ส่งสัญญาณให้แคชเชียร์เลือก
      const logRecord = await prisma.bankNotificationLog.create({
        data: {
          storeId: store.id,
          rawText,
          sender: sender || title || parsed.bank,
          bank: parsed.bank,
          amount: incomingAmount,
          account: parsed.account,
          status: 'AMBIGUOUS',
        },
      });

      broadcastEvent(
        'BANK_NOTIFY_RECEIVED',
        {
          action: 'AMBIGUOUS_CHOICE',
          amount: incomingAmount,
          bank: parsed.bank,
          bankName: parsed.bankName,
          candidates: matchingCandidates.map((c) => ({
            tableNo: c.tableNo,
            tableName: c.tableName,
            tableId: c.tableId,
            totalAmount: c.totalAmount,
            orderIds: c.orders.map((o) => o.id),
          })),
          logId: logRecord.id,
          channel,
          sender: sender || title || 'แอปธนาคาร / LINE',
          title: title || 'แจ้งเตือนเงินเข้า',
        },
        store.id
      );

      return NextResponse.json({
        success: true,
        action: 'AMBIGUOUS_CHOICE',
        message: `ตรวจพบยอดเงิน ฿${incomingAmount} ตรงกับหลายโต๊ะ กรุณาเลือกโต๊ะบนหน้าจอ POS`,
        candidatesCount: matchingCandidates.length,
        candidates: matchingCandidates.map((c) => ({
          tableNo: c.tableNo,
          tableName: c.tableName,
          amount: c.totalAmount,
        })),
        parsed,
      });
    } else {
      // เคสที่ 3: ไม่พบโต๊ะที่ยอดตรงกันเลย หรือ ปิดบิลอัตโนมัติถูกปิดอยู่
      const logRecord = await prisma.bankNotificationLog.create({
        data: {
          storeId: store.id,
          rawText,
          sender: sender || title || parsed.bank,
          bank: parsed.bank,
          amount: incomingAmount,
          account: parsed.account,
          status: 'UNMATCHED',
        },
      });

      broadcastEvent(
        'BANK_NOTIFY_RECEIVED',
        {
          action: 'UNMATCHED',
          amount: incomingAmount,
          bank: parsed.bank,
          bankName: parsed.bankName,
          rawText: parsed.rawText,
          logId: logRecord.id,
          channel,
          sender: sender || title || 'แอปธนาคาร / LINE',
          title: title || 'แจ้งเตือนเงินเข้า',
        },
        store.id
      );

      return NextResponse.json({
        success: true,
        action: 'UNMATCHED',
        message: `รับแจ้งเตือนเงินเข้า ฿${incomingAmount} (${parsed.bankName}) เรียบร้อยแล้ว แต่ไม่พบโต๊ะที่มียอดตรงกันในขณะนี้`,
        parsed,
      });
    }
  } catch (error: any) {
    console.error('Error in bank notify webhook:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล Webhook' },
      { status: 500 }
    );
  }
}
