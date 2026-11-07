import { NextResponse } from 'next/server';
import { checkSingleFieldAvailability, AvailabilityField } from '@/lib/bank-validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Single field check mode: { field: 'phone', value: '0812345678', ... }
    if (body.field && typeof body.field === 'string') {
      const field = body.field as AvailabilityField;
      const value = body.value !== undefined ? String(body.value) : '';
      const phoneForPromptPay = body.phoneForPromptPay ? String(body.phoneForPromptPay) : undefined;
      const bankName = body.bankName ? String(body.bankName) : undefined;
      const excludeStoreId = body.excludeStoreId ? String(body.excludeStoreId) : undefined;

      const result = await checkSingleFieldAvailability(field, value, {
        phoneForPromptPay,
        bankName,
        excludeStoreId,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // 2. Batch check mode: { phone?: string, email?: string, bankAccountNo?: string, promptPayId?: string }
    const results: Record<string, any> = {};
    const fieldsToCheck: AvailabilityField[] = ['phone', 'email', 'bankAccountNo', 'promptPayId'];
    const excludeStoreId = body.excludeStoreId ? String(body.excludeStoreId) : undefined;

    await Promise.all(
      fieldsToCheck.map(async (field) => {
        if (body[field] !== undefined) {
          const val = String(body[field]);
          const res = await checkSingleFieldAvailability(field, val, {
            phoneForPromptPay: body.phone ? String(body.phone) : undefined,
            bankName: body.bankName ? String(body.bankName) : undefined,
            excludeStoreId,
          });
          results[field] = res;
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field') as AvailabilityField;
    const value = searchParams.get('value') || '';
    const phoneForPromptPay = searchParams.get('phoneForPromptPay') || undefined;
    const bankName = searchParams.get('bankName') || undefined;
    const excludeStoreId = searchParams.get('excludeStoreId') || undefined;

    if (!field) {
      return NextResponse.json(
        { error: 'กรุณาระบุ field ที่ต้องการตรวจสอบ (phone, email, bankAccountNo, promptPayId)' },
        { status: 400 }
      );
    }

    const result = await checkSingleFieldAvailability(field, value, {
      phoneForPromptPay,
      bankName,
      excludeStoreId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error checking availability GET:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' },
      { status: 500 }
    );
  }
}
