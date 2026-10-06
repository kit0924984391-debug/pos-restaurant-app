import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import {
  parseBankSlipQr,
  verifyWithSlipOK,
  verifyWithEasySlip,
  ParsedSlipData,
} from '@/lib/slip-verifier';
import { saveSlipImage } from '@/lib/google-drive-storage';
import { requireStoreAccess } from '@/lib/auth';
import { settlePayment } from '@/lib/paymentEngine';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        promptPayId: true,
        pointsRate: true,
        pointValue: true,
        slipAutoCheckout: true,
        slipProvider: true,
        slipApiKey: true,
        slipBranchId: true,
        googleDriveFolderId: true,
        googleDriveWebhookUrl: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const {
      orderId,
      tableId,
      tableNo,
      qrPayload,
      slipImage,
      manualConfirm = false,
      autoCheckout = false,
      note,
      discountAmount = 0,
      memberPhone,
      customerName,
      pointsRedeemed = 0,
      promoCode,
    } = body;

    let isStaffAuthorized = false;
    if (manualConfirm || autoCheckout) {
      try {
        await requireStoreAccess(params.slug);
        isStaffAuthorized = true;
      } catch (authErr) {
        if (manualConfirm) {
          return NextResponse.json(
            { error: 'Unauthorized: Staff access required for manual slip confirmation' },
            { status: 401 }
          );
        }
        isStaffAuthorized = false;
      }
    }

    // ค้นหาออเดอร์
    let order: any = null;
    const parsedTableNo = tableNo !== undefined && tableNo !== null && !isNaN(parseInt(String(tableNo), 10))
      ? parseInt(String(tableNo), 10)
      : undefined;

    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { table: true, items: true },
      });
    } else if (tableId || parsedTableNo !== undefined) {
      order = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          OR: [
            { tableId: tableId ? String(tableId) : undefined },
            { tableNo: parsedTableNo },
          ],
          paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { table: true, items: true },
      });
    }

    if (!order || order.storeId !== store.id) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์ที่ต้องการตรวจสอบ' }, { status: 404 });
    }

    // ป้องกันการชำระเงินซ้ำถ้าออเดอร์ปิดบิลไปแล้ว
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'ออเดอร์นี้ได้รับการชำระเงินเรียบร้อยแล้ว' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีออเดอร์ค้างชำระในโต๊ะนี้ทั้งหมดกี่รายการ (สำหรับโต๊ะที่สั่งอาหารหลายรอบ)
    let tableOrders: any[] = [order];
    if (order.tableId) {
      const activeInTable = await prisma.order.findMany({
        where: {
          storeId: store.id,
          tableId: order.tableId,
          paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
        },
        include: { table: true, items: true },
        orderBy: { createdAt: 'asc' },
      });
      if (activeInTable.length > 0) {
        tableOrders = activeInTable;
      }
    }
    const totalTableAmount = tableOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
    const numericDiscount = Number(discountAmount) || 0;
    const effectiveTableAmount = Math.max(0, totalTableAmount - numericDiscount);
    const effectiveOrderAmount = Math.max(0, order.netAmount - numericDiscount);

    let parsed: ParsedSlipData | null = null;

    // 1. ถอดรหัส Mini-QR จากสลิป
    if (qrPayload && typeof qrPayload === 'string' && qrPayload.trim().length > 5) {
      // ตรวจสอบผ่าน SlipOK หรือ EasySlip ถ้ามี API Key
      if (store.slipApiKey && store.slipProvider === 'SLIPOK') {
        parsed = await verifyWithSlipOK(store.slipApiKey, qrPayload, store.slipBranchId || undefined);
      } else if (store.slipApiKey && store.slipProvider === 'EASYSLIP') {
        parsed = await verifyWithEasySlip(store.slipApiKey, qrPayload);
      }

      // ถ้าไม่มี API Key หรือยิงไม่ผ่าน ให้ใช้ Built-in Local Parser
      if (!parsed) {
        parsed = parseBankSlipQr(qrPayload);
      }
    }

    // 2. ตรวจสอบการใช้สลิปซ้ำ (Anti-Fraud Duplicate Prevention - เช็คทั้ง PAID และ PENDING_CONFIRMATION)
    if (parsed && parsed.slipRef) {
      const currentOrderIds = tableOrders.map((o) => o.id);
      const duplicateOrder = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          slipRef: parsed.slipRef,
          id: { notIn: currentOrderIds },
          paymentStatus: { in: ['PAID', 'PENDING_CONFIRMATION'] },
        },
      });

      if (duplicateOrder) {
        const isPaidDup = duplicateOrder.paymentStatus === 'PAID';
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            error: isPaidDup
              ? `⚠️ สลิปนี้เคยถูกใช้งานและปิดบิลไปแล้วในระบบ (ออเดอร์ #${duplicateOrder.id.slice(-4)}) ไม่อนุญาตให้ใช้ซ้ำเพื่อความปลอดภัย`
              : `⚠️ สลิปนี้มีประวัติถูกส่งเข้าระบบแล้ว (ออเดอร์ #${duplicateOrder.id.slice(-4)}) กำลังรอตรวจสอบ ไม่อนุญาตให้ส่งซ้ำ`,
            parsed,
          },
          { status: 400 }
        );
      }
    }

    // 3. ตรวจสอบบัญชีผู้รับเงิน (ป้องกันสลิปโอนไปบัญชีอื่น/คนอื่น)
    let isReceiverMatch = true;
    if (parsed?.receiverAccount && store.promptPayId) {
      const cleanStorePay = store.promptPayId.replace(/\D/g, '');
      const cleanSlipReceiver = parsed.receiverAccount.replace(/\D/g, '');
      if (cleanStorePay.length >= 4 && cleanSlipReceiver.length >= 4) {
        isReceiverMatch =
          cleanStorePay.endsWith(cleanSlipReceiver) ||
          cleanSlipReceiver.endsWith(cleanStorePay) ||
          cleanStorePay.includes(cleanSlipReceiver) ||
          cleanSlipReceiver.includes(cleanStorePay);

        if (!isReceiverMatch && !manualConfirm) {
          return NextResponse.json(
            {
              success: false,
              isReceiverMismatch: true,
              error: `⚠️ บัญชีผู้รับเงินในสลิป (${parsed.receiverAccount} ${parsed.receiverName || ''}) ไม่ตรงกับเบอร์พร้อมเพย์ของร้าน (${store.promptPayId}) กรุณาตรวจทาน`,
              parsed,
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. ตรวจสอบความถูกต้องของยอดเงิน (เปรียบเทียบกับยอดบิลออเดอร์เดี่ยว หรือ ยอดรวมทั้งโต๊ะ หลังหักส่วนลด)
    let isAmountMismatch = false;
    let isTableSettlement = false;

    if (parsed && parsed.amount !== undefined) {
      const diffSingle = Math.abs(parsed.amount - effectiveOrderAmount);
      const diffTable = Math.abs(parsed.amount - effectiveTableAmount);

      if (diffTable <= 1 && tableOrders.length > 1) {
        // ยอดสลิปตรงกับยอดรวมทุกออเดอร์ของโต๊ะ
        isTableSettlement = true;
      } else if (diffSingle <= 1) {
        // ยอดสลิปตรงกับออเดอร์เดี่ยวนี้
        isTableSettlement = false;
      } else {
        isAmountMismatch = true;
        if (!manualConfirm) {
          const expectedStr =
            tableOrders.length > 1
              ? `฿${effectiveTableAmount.toLocaleString()} (ยอดรวมโต๊ะ${numericDiscount > 0 ? 'หักส่วนลด' : ''}) หรือ ฿${effectiveOrderAmount.toLocaleString()} (ยอดออเดอร์${numericDiscount > 0 ? 'หักส่วนลด' : ''})`
              : `฿${effectiveOrderAmount.toLocaleString()}`;
          return NextResponse.json(
            {
              success: false,
              isAmountMismatch: true,
              slipAmount: parsed.amount,
              netAmount: tableOrders.length > 1 ? effectiveTableAmount : effectiveOrderAmount,
              error: `⚠️ ยอดเงินในสลิป (฿${parsed.amount.toLocaleString()}) ไม่ตรงกับยอดบิลที่ต้องชำระ (${expectedStr})`,
              parsed,
            },
            { status: 400 }
          );
        }
      }
    } else if (tableOrders.length > 1) {
      // ไม่มีข้อมูล amount ในสลิป แต่เป็นการชำระโต๊ะที่มีหลายออเดอร์
      isTableSettlement = true;
    }

    // 5. ตัดสินใจว่าจะปิดบิลอัตโนมัติ หรือ บันทึกรอแคชเชียร์ยืนยัน
    const hasValidAmount = Boolean(
      parsed &&
      typeof parsed.amount === 'number' &&
      !isNaN(parsed.amount) &&
      parsed.amount > 0
    );

    const isAutoCheckoutEligible = Boolean(
      (store.slipAutoCheckout || (isStaffAuthorized && autoCheckout)) &&
      parsed?.isValid &&
      hasValidAmount &&
      !isAmountMismatch &&
      isReceiverMatch
    );

    const shouldAutoClose = Boolean(isStaffAuthorized && manualConfirm) || isAutoCheckoutEligible;

    const effectiveSlipRef =
      parsed?.slipRef || (manualConfirm ? `MANUAL_${Date.now()}_${order.id.slice(-4)}` : null);

    const ordersToProcess = (isTableSettlement && tableOrders.length > 1) ? tableOrders : [order];

    // จัดเก็บรูปภาพสลิปลง Google Drive หรือ Local Folder เพื่อไม่ให้ฐานข้อมูล Supabase บวม
    let uploadedSlipUrl = order.slipUrl || null;
    if (slipImage && typeof slipImage === 'string' && slipImage.trim()) {
      if (slipImage.startsWith('data:image/') || slipImage.length > 500) {
        uploadedSlipUrl = await saveSlipImage(slipImage, {
          slug: params.slug,
          orderId: order.id,
          tableNo: order.tableNo,
          folderId: store.googleDriveFolderId,
          webhookUrl: store.googleDriveWebhookUrl,
        });
      } else {
        uploadedSlipUrl = slipImage;
      }
    }

    if (shouldAutoClose) {
      const settlement = await settlePayment({
        storeId: store.id,
        slug: params.slug,
        orderIds: ordersToProcess.map((o: any) => o.id),
        paymentMethod: 'PROMPTPAY',
        slipUrl: uploadedSlipUrl || undefined,
        slipRef: effectiveSlipRef || undefined,
        slipAmount: ordersToProcess.length === 1 ? (parsed?.amount || effectiveOrderAmount) : undefined,
        slipVerifiedBy: manualConfirm ? 'MANUAL' : 'AUTO',
        slipRawData: parsed ? JSON.stringify(parsed) : null,
        memberPhone,
        customerName,
        pointsRedeemed: Number(pointsRedeemed) || 0,
        promoCode,
        discountAmount: numericDiscount,
        note,
      });

      if (!settlement.success) {
        return NextResponse.json({ error: settlement.error || 'Failed to settle slip payment' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        isPaid: true,
        message: manualConfirm
          ? `บันทึกปิดบิลด้วยสลิปสำเร็จเรียบร้อยแล้ว (${settlement.orders.length} รายการบิล) ✅`
          : `ตรวจสอบสลิปถูกต้อง และปิดบิลให้อัตโนมัติเรียบร้อยแล้ว (${settlement.orders.length} รายการบิล) 🎉`,
        order: settlement.orders[0],
        orders: settlement.orders,
        parsed,
      });
    } else {
      // ยังไม่ปิดบิล: บันทึกรูปสลิปและผลตรวจเป็น PENDING_CONFIRMATION
      const pendingOrders: any[] = [];
      for (const o of ordersToProcess) {
        const pending = await prisma.order.update({
          where: { id: o.id },
          data: {
            paymentMethod: 'PROMPTPAY',
            paymentStatus: 'PENDING_CONFIRMATION',
            memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : o.memberPhone,
            customerName: customerName?.trim() || o.customerName || undefined,
            slipUrl: uploadedSlipUrl || o.slipUrl,
            slipRef: effectiveSlipRef,
            slipAmount: parsed?.amount || null,
            slipRawData: parsed ? JSON.stringify(parsed) : null,
          },
          include: {
            table: true,
            items: true,
          },
        });
        pendingOrders.push(pending);
      }

      const primaryPending = pendingOrders[0];

      // ส่งสัญญาณ SSE แจ้งเตือนหน้าจอ POS ของแคชเชียร์
      broadcastEvent(
        'SLIP_SUBMITTED',
        {
          orderId: primaryPending.id,
          orderIds: pendingOrders.map((o) => o.id),
          tableId: primaryPending.tableId,
          tableNo: primaryPending.tableNo,
          tableName: primaryPending.table?.name || `โต๊ะ ${primaryPending.tableNo}`,
          slipUrl: uploadedSlipUrl || primaryPending.slipUrl,
          amount: parsed?.amount || (isTableSettlement ? totalTableAmount : primaryPending.netAmount),
          memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : primaryPending.memberPhone,
          customerName: customerName?.trim() || primaryPending.customerName,
          parsed,
        },
        store.id
      );

      for (const o of pendingOrders) {
        broadcastEvent('ORDER_UPDATED', o, store.id);
      }

      return NextResponse.json({
        success: true,
        isPaid: false,
        isPendingConfirmation: true,
        message: 'ส่งสลิปเรียบร้อยแล้ว แจ้งเตือนแคชเชียร์เพื่อตรวจสอบแล้ว 🔔',
        order: primaryPending,
        orders: pendingOrders,
        parsed,
      });
    }
  } catch (error: any) {
    console.error('Error verifying slip:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' },
      { status: 500 }
    );
  }
}
