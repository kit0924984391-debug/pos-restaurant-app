import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        promptPayId: true,
        promptPayName: true,
        phone: true,
        address: true,
        receiptFooter: true,
        tableCount: true,
        serviceCallItems: true,
        slipAutoCheckout: true,
        slipProvider: true,
        enableAiUpsell: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

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

    // Return strictly non-sensitive public store details
    return NextResponse.json({
      id: store.id,
      slug: store.slug,
      storeName: store.name,
      promptPayId: store.promptPayId,
      promptPayName: store.promptPayName,
      phone: store.phone,
      address: store.address,
      receiptFooter: store.receiptFooter,
      tableCount: store.tableCount,
      serviceCallItems: parsedServiceItems,
      slipAutoCheckout: store.slipAutoCheckout,
      slipProvider: store.slipProvider,
      enableAiUpsell: store.enableAiUpsell ?? true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
