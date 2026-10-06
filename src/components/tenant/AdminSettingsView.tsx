'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Store,
  CreditCard,
  Receipt,
  Loader2,
  ShieldCheck,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import PrintProxySettingsCard from './settings/PrintProxySettingsCard';
import SlipStorageSettingsCard from './settings/SlipStorageSettingsCard';
import BankWebhookSettingsCard from './settings/BankWebhookSettingsCard';
import ServiceCallOptionsCard, {
  ServiceCallOption,
  DEFAULT_SERVICE_ITEMS,
} from './settings/ServiceCallOptionsCard';

export type { ServiceCallOption };
export { DEFAULT_SERVICE_ITEMS };

export default function AdminSettingsView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [lastTestDeliveryOrderId, setLastTestDeliveryOrderId] = useState<string>('');
  const [testingBankWebhook, setTestingBankWebhook] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [testingGoogleDrive, setTestingGoogleDrive] = useState(false);
  const [googleDriveTestResult, setGoogleDriveTestResult] = useState<{
    success: boolean;
    message: string;
    viewUrl?: string;
  } | null>(null);

  const [form, setForm] = useState<{
    storeName: string;
    promptPayId: string;
    promptPayName: string;
    address: string;
    phone: string;
    receiptFooter: string;
    tableCount: number;
    linemanGp: number;
    grabGp: number;
    shopeeGp: number;
    robinhoodGp: number;
    deliveryWebhookSecret: string;
    slipAutoCheckout: boolean;
    slipProvider: string;
    slipApiKey: string;
    slipBranchId: string;
    bankWebhookKey: string;
    bankAutoCheckout: boolean;
    googleDriveFolderId: string;
    googleDriveWebhookUrl: string;
    serviceCallItems: ServiceCallOption[];
    autoPrintKitchenTicket: boolean;
    printerPaperWidth: string;
    enableAiUpsell: boolean;
  }>({
    storeName: '',
    promptPayId: '',
    promptPayName: '',
    address: '',
    phone: '',
    receiptFooter: '',
    tableCount: 10,
    linemanGp: 30,
    grabGp: 30,
    shopeeGp: 30,
    robinhoodGp: 20,
    deliveryWebhookSecret: '',
    slipAutoCheckout: false,
    slipProvider: 'HYBRID',
    slipApiKey: '',
    slipBranchId: '',
    bankWebhookKey: '',
    bankAutoCheckout: true,
    googleDriveFolderId: '',
    googleDriveWebhookUrl: '',
    serviceCallItems: DEFAULT_SERVICE_ITEMS,
    autoPrintKitchenTicket: false,
    printerPaperWidth: '80mm',
    enableAiUpsell: true,
  });

  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }

    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setForm({
            storeName: data.storeName || '',
            promptPayId: data.promptPayId || '',
            promptPayName: data.promptPayName || '',
            address: data.address || '',
            phone: data.phone || '',
            receiptFooter: data.receiptFooter || '',
            tableCount: data.tableCount || 10,
            linemanGp: data.linemanGp ?? 30,
            grabGp: data.grabGp ?? 30,
            shopeeGp: data.shopeeGp ?? 30,
            robinhoodGp: data.robinhoodGp ?? 20,
            deliveryWebhookSecret: data.deliveryWebhookSecret || '',
            slipAutoCheckout: data.slipAutoCheckout ?? false,
            slipProvider: data.slipProvider || 'HYBRID',
            slipApiKey: data.slipApiKey || '',
            slipBranchId: data.slipBranchId || '',
            bankWebhookKey: data.bankWebhookKey || '',
            bankAutoCheckout: data.bankAutoCheckout ?? true,
            googleDriveFolderId: data.googleDriveFolderId || '',
            googleDriveWebhookUrl: data.googleDriveWebhookUrl || '',
            serviceCallItems:
              Array.isArray(data.serviceCallItems) && data.serviceCallItems.length > 0
                ? data.serviceCallItems
                : DEFAULT_SERVICE_ITEMS,
            autoPrintKitchenTicket: data.autoPrintKitchenTicket ?? false,
            printerPaperWidth: data.printerPaperWidth || '80mm',
            enableAiUpsell: data.enableAiUpsell ?? true,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Service call handlers
  const handleAddServiceItem = () => {
    const newItem: ServiceCallOption = {
      id: `srv-${Date.now()}`,
      icon: '🛎️',
      label: 'บริการใหม่',
      active: true,
    };
    setForm((prev) => ({
      ...prev,
      serviceCallItems: [...prev.serviceCallItems, newItem],
    }));
  };

  const handleUpdateServiceItem = (id: string, updates: Partial<ServiceCallOption>) => {
    setForm((prev) => ({
      ...prev,
      serviceCallItems: prev.serviceCallItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const handleDeleteServiceItem = (id: string) => {
    setForm((prev) => ({
      ...prev,
      serviceCallItems: prev.serviceCallItems.filter((item) => item.id !== id),
    }));
  };

  const handleMoveServiceItem = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const items = [...prev.serviceCallItems];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return prev;
      const temp = items[index];
      items[index] = items[targetIndex];
      items[targetIndex] = temp;
      return { ...prev, serviceCallItems: items };
    });
  };

  const handleRestoreDefaultServiceItems = () => {
    setForm((prev) => ({
      ...prev,
      serviceCallItems: DEFAULT_SERVICE_ITEMS,
    }));
    showInfo('โหลดค่าเริ่มต้น 6 รายการแล้ว', 'อย่าลืมกด "บันทึกการตั้งค่าร้าน" ด้านล่าง');
  };

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showSuccess(`คัดลอก ${label} แล้ว 📋`, text);
    }
  };

  const handleTestGoogleDrive = async () => {
    if (!form.googleDriveWebhookUrl) {
      showError('กรุณาระบุ Webhook URL', 'กรุณากรอก Google Apps Script Webhook URL ก่อนกดทดสอบ');
      return;
    }
    setTestingGoogleDrive(true);
    setGoogleDriveTestResult(null);
    try {
      const res = await fetch(`/api/r/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testGoogleDrive: true,
          googleDriveWebhookUrl: form.googleDriveWebhookUrl,
          googleDriveFolderId: form.googleDriveFolderId,
        }),
      });
      const data = await res.json();
      const isSuccess = Boolean(data.success || data.testResult?.success);
      const resultMessage =
        data.message ||
        data.testResult?.message ||
        'เชื่อมต่อ Google Drive สำเร็จ! ไฟล์ทดสอบถูกบันทึกลงไดรฟ์เรียบร้อย';
      const viewUrl = data.data?.viewUrl || data.testResult?.data?.viewUrl || data.viewUrl;

      if (res.ok && isSuccess) {
        if (data.correctedUrl) {
          setForm((prev) => ({ ...prev, googleDriveWebhookUrl: data.correctedUrl }));
        }
        setGoogleDriveTestResult({
          success: true,
          message: resultMessage,
          viewUrl,
        });
        showSuccess('เชื่อมต่อ Google Drive สำเร็จ! 🎉', resultMessage);
      } else {
        const errMsg =
          data.message ||
          data.testResult?.message ||
          data.error ||
          'เชื่อมต่อ Google Drive ไม่สำเร็จ ตรวจสอบ Webhook URL หรือการ Deploy';
        setGoogleDriveTestResult({ success: false, message: errMsg });
        showError('ทดสอบ Google Drive ไม่สำเร็จ', errMsg);
      }
    } catch (e: any) {
      setGoogleDriveTestResult({ success: false, message: e.message });
      showError('เกิดข้อผิดพลาดในการทดสอบ', e.message);
    } finally {
      setTestingGoogleDrive(false);
    }
  };

  const handleRegenerateBankKey = async () => {
    if (!confirm('ต้องการสุ่ม Webhook Key ใหม่ใช่หรือไม่? (หากเปลี่ยน ต้องอัปเดตในแอปมือถือด้วย)')) return;
    setRegeneratingKey(true);
    try {
      const res = await fetch(`/api/r/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateBankKey: true }),
      });
      const data = await res.json();
      if (res.ok && data.bankWebhookKey) {
        setForm((prev) => ({ ...prev, bankWebhookKey: data.bankWebhookKey }));
        showSuccess('สุ่ม Webhook Key ใหม่เรียบร้อยแล้ว 🔑', data.bankWebhookKey);
      }
    } catch (e: any) {
      showError('ไม่สามารถสุ่มคีย์ใหม่ได้', e.message);
    } finally {
      setRegeneratingKey(false);
    }
  };

  const handleTestBankWebhook = async () => {
    setTestingBankWebhook(true);
    try {
      const mockTestAmount = 150;
      const res = await fetch(`/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'SCB Connect',
          text: `เงินเข้าบัญชี x-9999 จำนวน ฿${mockTestAmount}.00 จาก นาย กิตติศักดิ์ เมื่อ ${new Date().toLocaleDateString('th-TH')} ยอดเงินคงเหลือ ฿12,450.00`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('ส่งทดสอบสำเร็จแล้ว 🔔', data.message || `ยอด ฿${mockTestAmount} ถูกส่งเข้า POS แล้ว`);
      } else {
        showInfo('ส่งทดสอบแล้ว (เซิร์ฟเวอร์ตอบกลับ)', data.message || data.error);
      }
    } catch (e: any) {
      showError('เกิดข้อผิดพลาดในการทดสอบ', e.message);
    } finally {
      setTestingBankWebhook(false);
    }
  };

  const handleTestWebhook = async (channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'CANCEL') => {
    setTestingWebhook(true);
    try {
      const endpoint = `/api/r/${slug}/webhooks/delivery/print-proxy`;
      let mockPayload: any;

      if (channel === 'CANCEL') {
        const orderIdToCancel = lastTestDeliveryOrderId || `LM-${Math.floor(1000 + Math.random() * 9000)}`;
        mockPayload = {
          event: 'ORDER_CANCELLED',
          orderId: orderIdToCancel,
          reason: 'ลูกค้ายกเลิกผ่านแอปเดลิเวอรี (Print Proxy)',
          cancelReason: 'Customer requested cancellation via delivery app',
        };
      } else if (channel === 'LINEMAN') {
        const newOrderId = `LM-${Math.floor(1000 + Math.random() * 9000)}`;
        setLastTestDeliveryOrderId(newOrderId);
        mockPayload = {
          channel: 'LINEMAN',
          orderId: newOrderId,
          riderName: 'สมชาย พุ่มพวง (LINE MAN Rider)',
          riderPhone: '0891234567',
          customerName: 'คุณเอกชัย (ลูกค้า LINE MAN)',
          items: [
            { name: '1x [โปรคุ้ม] ข้าวกะเพราหมูกรอบ (ไข่ดาว)', price: 75, quantity: 1, specialNote: 'เผ็ดกลาง ไม่ใส่ชูรส' },
            { name: 'ต้มยำกุ้งน้ำข้น', price: 80, quantity: 1, specialNote: 'ขอเห็ดเยอะๆ' },
          ],
          note: 'ดักจับจากเครื่องพิมพ์บลูทูธ (Wongnai Merchant App)',
        };
      } else if (channel === 'GRAB') {
        const newOrderId = `GF-${Math.floor(1000 + Math.random() * 9000)}`;
        setLastTestDeliveryOrderId(newOrderId);
        mockPayload = {
          channel: 'GRAB',
          orderId: newOrderId,
          riderName: 'วิชัย ใจดี (GrabFood Driver)',
          riderPhone: '0819876543',
          customerName: 'คุณกิตติ (ลูกค้า GrabFood)',
          items: [
            { name: '2x ข้าวผัดหมู', price: 55, quantity: 2, specialNote: 'ขอพริกน้ำปลาเยอะๆ' },
            { name: 'ไข่ดาวสุก', price: 10, quantity: 2 },
          ],
          note: 'ดักจับจากเครื่องพิมพ์บลูทูธ (GrabMerchant App)',
        };
      } else {
        const newOrderId = `SF-${Math.floor(1000 + Math.random() * 9000)}`;
        setLastTestDeliveryOrderId(newOrderId);
        mockPayload = {
          channel: 'SHOPEE_FOOD',
          orderId: newOrderId,
          riderName: 'สุรชัย ว่องไว (ShopeeFood Rider)',
          riderPhone: '0854321098',
          customerName: 'คุณพิมพ์ใจ (ลูกค้า ShopeeFood)',
          items: [
            { name: '1x ข้าวกะเพราหมูกรอบ', price: 65, quantity: 1, specialNote: 'เผ็ดน้อย' },
            { name: 'ไข่เจียวหมูสับ', price: 30, quantity: 1 },
          ],
          note: 'ดักจับจากเครื่องพิมพ์บลูทูธ (Shopee Partner App)',
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(form.deliveryWebhookSecret ? { 'x-proxy-secret': form.deliveryWebhookSecret } : {}),
        },
        body: JSON.stringify(mockPayload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (channel === 'CANCEL') {
          showSuccess('🚫 จำลองลูกค้ายกเลิกออเดอร์สำเร็จ!', `ออเดอร์ ${mockPayload.orderId} ถูกทำเครื่องหมายยกเลิกแล้ว`);
        } else {
          showSuccess(
            `⚡ จำลองส่งสลิป ${channel} สำเร็จ!`,
            `รหัส #${mockPayload.orderId} เด้งเข้า POS และ KDS จอครัวเรียบร้อยแล้ว`
          );
        }
      } else {
        showError('จำลองไม่สำเร็จ', data.error || data.message || 'โปรดตรวจสอบความถูกต้องของระบบ');
      }
    } catch (err: any) {
      showError('เกิดข้อผิดพลาดในการจำลองสลิป', err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/r/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSavedSuccess(true);
        showSuccess('บันทึกการตั้งค่าสำเร็จ ✨', 'ข้อมูลร้านค้าและพร้อมเพย์ได้รับการอัปเดตแล้ว');
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        showError('บันทึกไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/80 shadow-sm w-full">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 flex-shrink-0">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-xl text-slate-900">ตั้งค่าร้านค้า &amp; พร้อมเพย์</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              ร้าน: <span className="font-bold text-slate-800">{form.storeName || slug}</span> • ตั้งค่าข้อมูลร้าน บัญชี PromptPay รับเงิน และข้อความท้ายใบเสร็จ
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200/80 shadow-sm space-y-5 sm:space-y-6 w-full">
        {savedSuccess && (
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว</span>
          </div>
        )}

        {/* Section 1: Store Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Store className="w-4 h-4 text-orange-500" />
            <span>ข้อมูลร้านอาหาร</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">ชื่อร้านอาหาร *</label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">เบอร์โทรศัพท์ร้าน</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">ที่อยู่ร้าน (แสดงในใบเสร็จ)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: PromptPay Receiving Account */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>บัญชีพร้อมเพย์รับเงิน (PromptPay) ของร้าน</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือ Tax ID 13 หลัก) *
              </label>
              <input
                type="text"
                required
                placeholder="0812345678"
                value={form.promptPayId}
                onChange={(e) => setForm({ ...form, promptPayId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ชื่อบัญชีพร้อมเพย์ที่แสดง</label>
              <input
                type="text"
                placeholder="เช่น ร้านตามสั่ง ลุง-ป้า"
                value={form.promptPayName}
                onChange={(e) => setForm({ ...form, promptPayName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Receipt Footer */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Receipt className="w-4 h-4 text-indigo-500" />
            <span>ข้อความท้ายใบเสร็จ (Receipt Footer)</span>
          </h3>

          <div className="text-xs">
            <input
              type="text"
              placeholder="ขอบคุณที่อุดหนุนครับ/ค่ะ โอกาสหน้าเชิญใหม่"
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Section: Thermal Printer & Auto-Print Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>เครื่องพิมพ์ความร้อน &amp; การพิมพ์ออเดอร์อัตโนมัติ (Thermal Printer &amp; Auto-Print)</span>
          </h3>
          <p className="text-xs text-slate-500">
            ตั้งค่าการพิมพ์ใบสั่งอาหารส่งครัว (Kitchen Ticket / KOT) อัตโนมัติเมื่อมีออเดอร์ใหม่เข้าสู่ระบบ
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-900 font-extrabold flex items-center space-x-2 cursor-pointer">
                  <span>พิมพ์ใบสั่งอาหารเข้าครัวอัตโนมัติ</span>
                </label>
                <input
                  type="checkbox"
                  checked={form.autoPrintKitchenTicket}
                  onChange={(e) => setForm({ ...form, autoPrintKitchenTicket: e.target.checked })}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                เมื่อมีออเดอร์ใหม่ (ลูกค้าสแกนสั่ง, แคชเชียร์คีย์ หรือเดลิเวอรี) หน้าจอห้องครัว KDS จะสั่งพิมพ์ใบสั่งอาหารส่งครัวอัตโนมัติทันที
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="block text-slate-900 font-extrabold">ขนาดหน้ากว้างกระดาษความร้อน</label>
              <select
                value={form.printerPaperWidth}
                onChange={(e) => setForm({ ...form, printerPaperWidth: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="80mm">80 มม. (80mm - เครื่องพิมพ์ตั้งโต๊ะมาตรฐาน)</option>
                <option value="58mm">58 มม. (58mm - เครื่องพิมพ์พกพา / ขนาดเล็ก)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                ระบบจะปรับสเกลใบเสร็จและความกว้างของตารางให้พอดีกับกระดาษอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2.5">
            <span className="text-base flex-shrink-0">💡</span>
            <div className="space-y-1">
              <p className="font-extrabold">เคล็ดลับการพิมพ์ทันทีโดยไม่ต้องกดยืนยัน (Silent Auto-Printing):</p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                หากเปิดเบราว์เซอร์ Google Chrome หรือ Microsoft Edge ด้วยพารามิเตอร์ <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold">--kiosk --kiosk-printing</code> เบราว์เซอร์จะสั่งพิมพ์ไปยังเครื่องพิมพ์เริ่มต้นทันทีโดยไม่ต้องคลิกปุ่มพิมพ์ในหน้าต่าง Preview
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Print Proxy & Delivery GP Settings (Modular Component) */}
        <PrintProxySettingsCard
          slug={slug}
          currentOrigin={currentOrigin}
          form={form}
          setForm={setForm}
          handleCopy={handleCopy}
          testingWebhook={testingWebhook}
          handleTestWebhook={handleTestWebhook}
          showInfo={showInfo}
        />

        {/* Section 5: Bank Slip Verification Engine */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>ระบบอ่านและตรวจสอบสลิปโอนเงิน (Bank Slip Verification)</span>
          </h3>
          <p className="text-xs text-slate-500">
            ตั้งค่าระบบอ่านสลิปธนาคาร ป้องกันการใช้สลิปซ้ำ (Anti-Fraud) และกำหนดพฤติกรรมการปิดบิล
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer">
                  <span>⚡ ปิดบิลและเคลียร์โต๊ะอัตโนมัติเมื่อสลิปผ่าน (Auto Checkout)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  หากเปิดใช้งาน: เมื่อระบบตรวจพบว่าสลิปถูกต้อง ยอดเงินตรง และไม่เป็นสลิปซ้ำ จะปิดบิลและเปิดโต๊ะให้อัตโนมัติทันที
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={form.slipAutoCheckout}
                  onChange={(e) => setForm({ ...form, slipAutoCheckout: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  เครื่องมือตรวจสอบสลิป (Verification Engine)
                </label>
                <select
                  value={form.slipProvider}
                  onChange={(e) => setForm({ ...form, slipProvider: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="HYBRID">ระบบไฮบริด (ตรวจในตัวฟรี + API Gateway หากมี Key) (แนะนำ)</option>
                  <option value="INTERNAL">ตรวจด้วยระบบในตัวฟรี (Mini-QR + Anti-Duplicate Hash)</option>
                  <option value="SLIPOK">SlipOK API Gateway (เช็คเงินเข้าบัญชีธนาคารจริง)</option>
                  <option value="EASYSLIP">EasySlip API Gateway</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  ระบบในตัวสามารถอ่าน Mini-QR ตรวจยอดเงิน และบล็อกสลิปซ้ำได้ฟรีโดยไม่มีค่าใช้จ่าย
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  API Key (สำหรับ SlipOK หรือ EasySlip - ถ้ามี)
                </label>
                <input
                  type="password"
                  placeholder="กรอก API Key (เว้นว่างไว้เพื่อใช้ระบบฟรีในตัว)"
                  value={form.slipApiKey}
                  onChange={(e) => setForm({ ...form, slipApiKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {form.slipProvider === 'SLIPOK' && (
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Branch ID (SlipOK - ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    placeholder="รหัสสาขา SlipOK เช่น 12345 (ถ้ามี)"
                    value={form.slipBranchId}
                    onChange={(e) => setForm({ ...form, slipBranchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5.5: Slip Storage Settings Card (Modular Component) */}
        <SlipStorageSettingsCard
          form={form}
          setForm={setForm}
          handleCopy={handleCopy}
          handleTestGoogleDrive={handleTestGoogleDrive}
          testingGoogleDrive={testingGoogleDrive}
          googleDriveTestResult={googleDriveTestResult}
          showSuccess={showSuccess}
        />

        {/* Section 6: Bank Notification Webhook Card (Modular Component) */}
        <BankWebhookSettingsCard
          slug={slug}
          currentOrigin={currentOrigin}
          form={form}
          setForm={setForm}
          handleCopy={handleCopy}
          handleTestBankWebhook={handleTestBankWebhook}
          handleRegenerateBankKey={handleRegenerateBankKey}
          testingBankWebhook={testingBankWebhook}
          regeneratingKey={regeneratingKey}
        />

        {/* Section 7: Service Call Options Card (Modular Component) */}
        <ServiceCallOptionsCard
          items={form.serviceCallItems}
          onAdd={handleAddServiceItem}
          onRestoreDefaults={handleRestoreDefaultServiceItems}
          onMove={handleMoveServiceItem}
          onUpdate={handleUpdateServiceItem}
          onDelete={handleDeleteServiceItem}
        />

        {/* Section 8: AI Smart Upselling */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>ระบบแนะนำเมนูอัจฉริยะ (AI Smart Upselling)</span>
          </h3>
          <p className="text-xs text-slate-500">
            วิเคราะห์เมนูในตะกร้าของลูกค้าเพื่อแนะนำเมนูทานคู่กัน (เช่น ไข่ดาว, ต้มจืด, เครื่องดื่มเย็น) ช่วยเพิ่มยอดขายเฉลี่ยต่อบิล (AOV) โดยอัตโนมัติ
          </p>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <label className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer">
                <span>✨ เปิดใช้งานระบบ AI แนะนำเมนูคู่กัน (Smart Upselling &amp; Cross-selling)</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                • ทำงานอัตโนมัติในเครื่อง (Local Heuristic Engine) 100% ฟรี ไม่ต้องใช้ API Key<br />
                • หากปิดใช้งาน: หน้าสั่งอาหารของลูกค้าจะไม่แสดงแถบเมนูแนะนำในหน้าเลือกอาหารและในตะกร้า
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={form.enableAiUpsell}
                onChange={(e) => setForm({ ...form, enableAiUpsell: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าร้าน'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
