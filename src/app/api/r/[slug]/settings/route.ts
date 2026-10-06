import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { requireStoreAccess } from '@/lib/auth';

import { testGoogleDriveWebhook } from '@/lib/google-drive-storage';

export const dynamic = 'force-dynamic';

const DEFAULT_SERVICE_CALL_ITEMS = [
  { id: 'srv-1', icon: '🌶️', label: 'ขอน้ำปลาพริก / พริกน้ำส้ม / เครื่องปรุง', active: true },
  { id: 'srv-2', icon: '🧊', label: 'ขอเติมน้ำแข็ง / น้ำดื่ม', active: true },
  { id: 'srv-3', icon: '🥢', label: 'ขอช้อนส้อม / ตะเกียบ / จานแบ่ง', active: true },
  { id: 'srv-4', icon: '🧻', label: 'ขอกระดาษทิชชู่', active: true },
  { id: 'srv-5', icon: '💵', label: 'เรียกเช็คบิล (ชำระด้วยเงินสด)', active: true },
  { id: 'srv-6', icon: '❓', label: 'สอบถามพนักงาน / ความช่วยเหลืออื่นๆ', active: true },
];

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    let sessionUser: any = null;
    try {
      const access = await requireStoreAccess(params.slug);
      sessionUser = access.user;
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized: Staff access required' }, { status: 401 });
    }

    const isOwner = sessionUser?.role === 'STORE_OWNER' || sessionUser?.role === 'SUPER_ADMIN';

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      include: {
        plan: true,
      },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    let parsedServiceItems = DEFAULT_SERVICE_CALL_ITEMS;
    if (store.serviceCallItems) {
      try {
        const parsed = JSON.parse(store.serviceCallItems);
        if (Array.isArray(parsed)) {
          parsedServiceItems = parsed;
        }
      } catch (e) {
        parsedServiceItems = DEFAULT_SERVICE_CALL_ITEMS;
      }
    }

    // Payment-critical secrets are only shown to the store owner (or platform
    // admin); staff must not be able to read/redirect payment configuration.
    const maskIfStaff = (value: string) => (isOwner ? value : value ? '••••••••' : '');

    return NextResponse.json({
      id: store.id,
      slug: store.slug,
      storeName: store.name,
      promptPayId: store.promptPayId,
      promptPayName: store.promptPayName,
      address: store.address,
      phone: store.phone,
      receiptFooter: store.receiptFooter,
      tableCount: store.tableCount,
      status: store.status,
      trialEndsAt: store.trialEndsAt,
      subscriptionEnd: store.subscriptionEnd,
      plan: store.plan,
      linemanGp: store.linemanGp ?? 30,
      grabGp: store.grabGp ?? 30,
      shopeeGp: store.shopeeGp ?? 30,
      robinhoodGp: store.robinhoodGp ?? 20,
      deliveryWebhookSecret: maskIfStaff(store.deliveryWebhookSecret || ''),
      slipAutoCheckout: store.slipAutoCheckout ?? false,
      slipProvider: store.slipProvider ?? 'HYBRID',
      slipApiKey: maskIfStaff(store.slipApiKey || ''),
      slipBranchId: store.slipBranchId || '',
      bankWebhookKey: isOwner ? store.bankWebhookKey || (await ensureStoreBankKey(store.id)) : '••••••••',
      bankAutoCheckout: store.bankAutoCheckout ?? true,
      googleDriveFolderId: store.googleDriveFolderId || '',
      googleDriveWebhookUrl: maskIfStaff(store.googleDriveWebhookUrl || ''),
      serviceCallItems: parsedServiceItems,
      autoPrintKitchenTicket: store.autoPrintKitchenTicket ?? false,
      printerPaperWidth: store.printerPaperWidth || '80mm',
      enableAiUpsell: store.enableAiUpsell ?? true,
      _isOwner: isOwner,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    let sessionUser: any = null;
    try {
      const access = await requireStoreAccess(params.slug);
      sessionUser = access.user;
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized: Staff access required' }, { status: 401 });
    }

    const isOwner = sessionUser?.role === 'STORE_OWNER' || sessionUser?.role === 'SUPER_ADMIN';

    const body = await request.json();
    const {
      storeName,
      promptPayId,
      promptPayName,
      address,
      phone,
      receiptFooter,
      tableCount,
      linemanGp,
      grabGp,
      shopeeGp,
      robinhoodGp,
      deliveryWebhookSecret,
      slipAutoCheckout,
      slipProvider,
      slipApiKey,
      slipBranchId,
      bankWebhookKey,
      bankAutoCheckout,
      regenerateBankKey,
      googleDriveFolderId,
      googleDriveWebhookUrl,
      testGoogleDrive,
      serviceCallItems,
      autoPrintKitchenTicket,
      printerPaperWidth,
      enableAiUpsell,
    } = body;

    // Payment-critical settings are owner-only: staff changing the PromptPay
    // number, slip provider keys or webhook secrets could redirect payments.
    const OWNER_ONLY_FIELDS: Array<[string, any]> = [
      ['promptPayId', promptPayId],
      ['promptPayName', promptPayName],
      ['deliveryWebhookSecret', deliveryWebhookSecret],
      ['slipApiKey', slipApiKey],
      ['slipBranchId', slipBranchId],
      ['bankWebhookKey', bankWebhookKey],
      ['regenerateBankKey', regenerateBankKey],
      ['googleDriveFolderId', googleDriveFolderId],
      ['googleDriveWebhookUrl', googleDriveWebhookUrl],
      ['testGoogleDrive', testGoogleDrive],
    ];
    if (!isOwner) {
      const attempted = OWNER_ONLY_FIELDS.filter(([, v]) => v !== undefined).map(([k]) => k);
      if (attempted.length > 0) {
        return NextResponse.json(
          { error: 'เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขการตั้งค่าการรับเงินได้' },
          { status: 403 }
        );
      }
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    // ทดสอบการเชื่อมต่อ Google Drive Webhook
    if (testGoogleDrive) {
      let targetUrl = googleDriveWebhookUrl || store.googleDriveWebhookUrl;
      const targetFolder = googleDriveFolderId || store.googleDriveFolderId;

      // ระบบแก้ไขอัตโนมัติหากพบ URL เก่าที่ถูกลบไปแล้ว (ส่งผล 404)
      const isDeadUrl = targetUrl && (targetUrl.includes('zsxxYWIcg') || targetUrl.includes('AKfycbrzsxx'));
      if (isDeadUrl) {
        targetUrl = 'https://script.google.com/macros/s/AKfycbw3SHPGQN2z4op26gJ2IAHTA3RVxakKlZK9Lj6IrTaES85XcmjyCLV0gdCnD1Xv4AFM/exec';
        await prisma.store.update({
          where: { id: store.id },
          data: { googleDriveWebhookUrl: targetUrl },
        }).catch(() => {});
      }

      const testResult = await testGoogleDriveWebhook(targetUrl, targetFolder);
      return NextResponse.json({
        ...testResult,
        correctedUrl: isDeadUrl ? targetUrl : undefined,
      });
    }

    let effectiveBankKey = store.bankWebhookKey;
    if (regenerateBankKey) {
      effectiveBankKey = generateRandomBankKey();
    } else if (bankWebhookKey !== undefined) {
      effectiveBankKey = bankWebhookKey;
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        name: storeName !== undefined ? storeName : store.name,
        promptPayId: promptPayId !== undefined ? promptPayId : store.promptPayId,
        promptPayName: promptPayName !== undefined ? promptPayName : store.promptPayName,
        address: address !== undefined ? address : store.address,
        phone: phone !== undefined ? phone : store.phone,
        receiptFooter: receiptFooter !== undefined ? receiptFooter : store.receiptFooter,
        tableCount: tableCount ? parseInt(tableCount) : store.tableCount,
        linemanGp: linemanGp !== undefined ? parseFloat(linemanGp) : store.linemanGp,
        grabGp: grabGp !== undefined ? parseFloat(grabGp) : store.grabGp,
        shopeeGp: shopeeGp !== undefined ? parseFloat(shopeeGp) : store.shopeeGp,
        robinhoodGp: robinhoodGp !== undefined ? parseFloat(robinhoodGp) : store.robinhoodGp,
        deliveryWebhookSecret: deliveryWebhookSecret !== undefined ? deliveryWebhookSecret : store.deliveryWebhookSecret,
        slipAutoCheckout: slipAutoCheckout !== undefined ? Boolean(slipAutoCheckout) : store.slipAutoCheckout,
        slipProvider: slipProvider !== undefined ? slipProvider : store.slipProvider,
        slipApiKey: slipApiKey !== undefined ? slipApiKey : store.slipApiKey,
        slipBranchId: slipBranchId !== undefined ? slipBranchId : store.slipBranchId,
        bankWebhookKey: effectiveBankKey,
        bankAutoCheckout: bankAutoCheckout !== undefined ? Boolean(bankAutoCheckout) : store.bankAutoCheckout,
        googleDriveFolderId: googleDriveFolderId !== undefined ? (googleDriveFolderId ? googleDriveFolderId.trim() : null) : store.googleDriveFolderId,
        googleDriveWebhookUrl: googleDriveWebhookUrl !== undefined ? (googleDriveWebhookUrl ? googleDriveWebhookUrl.trim() : null) : store.googleDriveWebhookUrl,
        serviceCallItems: serviceCallItems !== undefined 
          ? (typeof serviceCallItems === 'string' ? serviceCallItems : JSON.stringify(serviceCallItems)) 
          : store.serviceCallItems,
        autoPrintKitchenTicket: autoPrintKitchenTicket !== undefined ? Boolean(autoPrintKitchenTicket) : store.autoPrintKitchenTicket,
        printerPaperWidth: printerPaperWidth !== undefined ? String(printerPaperWidth) : store.printerPaperWidth,
        enableAiUpsell: enableAiUpsell !== undefined ? Boolean(enableAiUpsell) : store.enableAiUpsell,
      },
      include: { plan: true },
    });

    broadcastEvent('TABLE_UPDATED', { action: 'settings_update' }, store.id);

    let parsedServiceItems = DEFAULT_SERVICE_CALL_ITEMS;
    if (updated.serviceCallItems) {
      try {
        const parsed = JSON.parse(updated.serviceCallItems);
        if (Array.isArray(parsed)) {
          parsedServiceItems = parsed;
        }
      } catch (e) {
        parsedServiceItems = DEFAULT_SERVICE_CALL_ITEMS;
      }
    }

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      storeName: updated.name,
      promptPayId: updated.promptPayId,
      promptPayName: updated.promptPayName,
      address: updated.address,
      phone: updated.phone,
      receiptFooter: updated.receiptFooter,
      tableCount: updated.tableCount,
      status: updated.status,
      trialEndsAt: updated.trialEndsAt,
      subscriptionEnd: updated.subscriptionEnd,
      plan: updated.plan,
      linemanGp: updated.linemanGp,
      grabGp: updated.grabGp,
      shopeeGp: updated.shopeeGp,
      robinhoodGp: updated.robinhoodGp,
      deliveryWebhookSecret: updated.deliveryWebhookSecret,
      slipAutoCheckout: updated.slipAutoCheckout,
      slipProvider: updated.slipProvider,
      slipApiKey: updated.slipApiKey,
      slipBranchId: updated.slipBranchId,
      bankWebhookKey: updated.bankWebhookKey,
      bankAutoCheckout: updated.bankAutoCheckout,
      googleDriveFolderId: updated.googleDriveFolderId || '',
      googleDriveWebhookUrl: updated.googleDriveWebhookUrl || '',
      serviceCallItems: parsedServiceItems,
      autoPrintKitchenTicket: updated.autoPrintKitchenTicket,
      printerPaperWidth: updated.printerPaperWidth,
      enableAiUpsell: updated.enableAiUpsell ?? true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateRandomBankKey(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

async function ensureStoreBankKey(storeId: string): Promise<string> {
  const newKey = generateRandomBankKey();
  await prisma.store.update({
    where: { id: storeId },
    data: { bankWebhookKey: newKey },
  }).catch(() => {});
  return newKey;
}

