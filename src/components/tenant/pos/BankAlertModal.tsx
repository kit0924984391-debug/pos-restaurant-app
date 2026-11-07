'use client';

import React from 'react';
import {
  BellRing,
  Camera,
  Globe,
  Mail,
  X,
  Volume2,
  ExternalLink,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import {
  speakThaiVoice,
  speakMoneyReceived,
  speakCustomerNotifyTransfer,
  playSuccessChime,
  speakPaymentConfirmed,
} from '@/lib/sound';
import { useToast } from '@/context/ToastContext';

export interface BankAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  bankAlertQueue: any[];
  activeAlertId: string | null;
  setActiveAlertId: (id: string) => void;
  dismissCurrentAlert: () => void;
  resolveAlertAndNext: (id: string) => void;
  tables: any[];
  store: any;
  slug: string;
  voiceEnabled: boolean;
  setReceiptOrder: (order: any) => void;
  setIsReceiptModalOpen: (open: boolean) => void;
  fetchData: () => void;
}

export default function BankAlertModal({
  isOpen,
  onClose,
  onOpen,
  bankAlertQueue,
  activeAlertId,
  setActiveAlertId,
  dismissCurrentAlert,
  resolveAlertAndNext,
  tables,
  store,
  slug,
  voiceEnabled,
  setReceiptOrder,
  setIsReceiptModalOpen,
  fetchData,
}: BankAlertModalProps) {
  const { showSuccess, showError } = useToast();

  const bankAlertModal =
    bankAlertQueue.find((a) => a.id === activeAlertId) || bankAlertQueue[0] || null;

  return (
    <>
      {isOpen && bankAlertModal && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-scale-up flex flex-col">
            {/* Multi-table Queue Tabs / Pills Bar */}
            {bankAlertQueue.length > 1 && (
              <div className="bg-slate-900 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin flex-1 min-w-0">
                  <span className="text-[11px] font-black text-amber-400 flex-shrink-0 flex items-center gap-1 mr-1">
                    <BellRing className="w-3.5 h-3.5 animate-bounce" />
                    <span>
                      รอตรวจ ({bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id) + 1}/
                      {bankAlertQueue.length}):
                    </span>
                  </span>
                  {bankAlertQueue.map((item) => {
                    const isSelected = item.id === bankAlertModal.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-sound="tap"
                        onClick={() => setActiveAlertId(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-75 active:scale-95 select-none flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white ring-2 ring-white/70 shadow-md scale-105'
                            : 'bg-white/10 text-white/80 hover:bg-white/20 active:bg-white/30 hover:text-white'
                        }`}
                      >
                        <span>{item.tableName || `โต๊ะ ${item.tableNo}`}</span>
                        <span className={isSelected ? 'text-white' : 'text-amber-300 font-extrabold'}>
                          ฿{item.amount?.toLocaleString()}
                        </span>
                        {item.channel === 'SLIP' && <span title="มีสลิปแนบมา">📷</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 pl-1 border-l border-white/10">
                  <button
                    type="button"
                    disabled={bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id) <= 0}
                    data-sound="tap"
                    onClick={() => {
                      const idx = bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id);
                      if (idx > 0) setActiveAlertId(bankAlertQueue[idx - 1].id);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed text-white text-xs font-black transition-all duration-75 active:scale-90 select-none cursor-pointer"
                    title="โต๊ะก่อนหน้า"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    disabled={
                      bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id) >=
                      bankAlertQueue.length - 1
                    }
                    data-sound="tap"
                    onClick={() => {
                      const idx = bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id);
                      if (idx < bankAlertQueue.length - 1) setActiveAlertId(bankAlertQueue[idx + 1].id);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed text-white text-xs font-black transition-all duration-75 active:scale-90 select-none cursor-pointer"
                    title="โต๊ะถัดไป"
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}

            {/* Modal Header with Bank & Channel Badge */}
            <div
              className={`p-5 text-white ${
                bankAlertModal.action === 'AUTO_PAID'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
                  : bankAlertModal.action === 'CUSTOMER_NOTIFY'
                  ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700'
                  : bankAlertModal.action === 'UNMATCHED'
                  ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm">
                    {bankAlertModal.channel === 'SLIP' ? (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>ลูกค้าส่งสลิปโอนเงิน (แนบสลิป)</span>
                      </>
                    ) : bankAlertModal.channel === 'WEB' ? (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>แจ้งเตือนผ่านเว็บตรง (ลูกค้าแจ้งโอน)</span>
                      </>
                    ) : bankAlertModal.channel === 'EMAIL' ? (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>แจ้งเตือนผ่าน Email (Gmail)</span>
                      </>
                    ) : (
                      <>
                        <BellRing className="w-3.5 h-3.5" />
                        <span>แจ้งเตือนเงินเข้าธนาคาร</span>
                      </>
                    )}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/20 text-white/90">
                    {bankAlertModal.channel === 'SLIP'
                      ? 'สลิปโอนเงิน'
                      : bankAlertModal.channel === 'WEB'
                      ? 'พร้อมเพย์ / โอนตรง'
                      : bankAlertModal.bankName || bankAlertModal.bank || 'ธนาคาร'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={dismissCurrentAlert}
                  data-sound="pop"
                  className="p-1 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white transition-all duration-75 active:scale-90 cursor-pointer select-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight">
                    {bankAlertModal.action === 'CUSTOMER_NOTIFY' &&
                      (bankAlertModal.channel === 'SLIP'
                        ? 'ลูกค้าส่งสลิปโอนเงิน 📷'
                        : 'ลูกค้าแจ้งโอนเงินผ่านเว็บ 🔔')}
                    {bankAlertModal.action === 'AUTO_PAID' && 'ตรวจพบเงินเข้า & ปิดบิลสำเร็จ! 🎉'}
                    {bankAlertModal.action === 'MANUAL_CONFIRM' && 'ตรวจพบเงินเข้า ตรงกับโต๊ะอาหาร 🔔'}
                    {bankAlertModal.action === 'AMBIGUOUS_CHOICE' && 'ตรวจพบเงินเข้า ตรงกับหลายโต๊ะ 🔔'}
                    {bankAlertModal.action === 'UNMATCHED' && 'ตรวจพบเงินเข้าบัญชีเรียบร้อย 💵'}
                  </h3>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    {bankAlertModal.action === 'CUSTOMER_NOTIFY' &&
                      (bankAlertModal.channel === 'SLIP'
                        ? 'ลูกค้าแนบสลิปโอนเงินจากที่โต๊ะ กรุณาตรวจสอบยอดและกดยืนยันปิดบิล'
                        : 'ลูกค้ากดแจ้งโอนเงินจากที่โต๊ะ กรุณาตรวจสอบยอดและกดยืนยันปิดบิล')}
                    {bankAlertModal.action === 'AUTO_PAID' && 'ระบบตรวจสอบยอดและเคลียร์โต๊ะให้อัตโนมัติแล้ว'}
                    {bankAlertModal.action === 'MANUAL_CONFIRM' && 'กรุณาตรวจสอบและกดยืนยันตัดยอดเพื่อปิดบิล'}
                    {bankAlertModal.action === 'AMBIGUOUS_CHOICE' && 'มียอดตรงกันหลายโต๊ะ กรุณาเลือกโต๊ะที่ต้องการตัดยอด'}
                    {bankAlertModal.action === 'UNMATCHED' && 'ไม่พบโต๊ะที่มียอดค้างชำระตรงกัน (อาจเป็นเงินโอนนอก)'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                  {bankAlertModal.action === 'AUTO_PAID'
                    ? '💰'
                    : bankAlertModal.channel === 'SLIP'
                    ? '📷'
                    : bankAlertModal.action === 'CUSTOMER_NOTIFY'
                    ? '📱'
                    : '🔔'}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-left">
              {/* Amount Highlight Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">ยอดเงินที่ได้รับ</span>
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">
                    ฿{bankAlertModal.amount?.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => {
                    if (bankAlertModal.action === 'CUSTOMER_NOTIFY') {
                      speakCustomerNotifyTransfer(bankAlertModal.tableNo, bankAlertModal.amount);
                    } else if (bankAlertModal.action === 'AUTO_PAID') {
                      speakMoneyReceived(bankAlertModal.amount, bankAlertModal.tableName);
                    } else if (bankAlertModal.tableName) {
                      const rawTable = String(bankAlertModal.tableName);
                      const target = rawTable.startsWith('โต๊ะ') ? ` ${rawTable}` : ` โต๊ะ ${rawTable}`;
                      speakThaiVoice(
                        `เงินเข้า ${bankAlertModal.amount} บาท${target} ค่ะ`.replace(/\s+/g, ' ').trim()
                      );
                    } else {
                      speakThaiVoice(`เงินเข้า ${bankAlertModal.amount} บาท ค่ะ`.replace(/\s+/g, ' ').trim());
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 text-amber-800 text-xs font-bold cursor-pointer transition-all duration-75 active:scale-90 select-none"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>🔊 ฟังเสียง</span>
                </button>
              </div>

              {/* Case 0: CUSTOMER_NOTIFY */}
              {bankAlertModal.action === 'CUSTOMER_NOTIFY' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">โต๊ะที่แจ้งโอน:</span>
                      <span className="font-black text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-sm">
                        {bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">ยอดที่แจ้งโอน:</span>
                      <span className="font-black text-emerald-700 text-base">
                        ฿{bankAlertModal.amount?.toLocaleString()}
                      </span>
                    </div>

                    {(bankAlertModal.customerName || bankAlertModal.memberPhone) && (
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                        <span className="font-bold text-slate-600">ลูกค้า / สมาชิก:</span>
                        <span className="font-bold text-slate-800 text-right">
                          {bankAlertModal.customerName || 'ลูกค้าทั่วไป'}
                          {bankAlertModal.memberPhone && (
                            <span className="text-slate-500 font-mono text-[11px] ml-1.5">
                              ({bankAlertModal.memberPhone})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {bankAlertModal.slipUrl && (
                      <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>สลิปโอนเงินที่แนบมา:</span>
                          </span>
                          <a
                            href={bankAlertModal.slipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
                          >
                            <span>เปิดดูรูปใหญ่</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-emerald-200 bg-black/5 max-h-48 flex items-center justify-center">
                          <img
                            src={bankAlertModal.slipUrl}
                            alt="สลิปโอนเงิน"
                            className="max-h-48 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(bankAlertModal.slipUrl, '_blank')}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-100 leading-normal">
                      💡 เมื่อตรวจสอบยอดเงินในแอปธนาคารหรือสลิปเรียบร้อยแล้ว กดปุ่มยืนยันด้านล่างเพื่อปิดบิลและเคลียร์โต๊ะทันที
                    </p>
                  </div>

                  <button
                    type="button"
                    data-sound="success"
                    onClick={() => {
                      if (voiceEnabled !== false) {
                        speakPaymentConfirmed(bankAlertModal.tableName);
                      }
                      playSuccessChime();
                      showSuccess(
                        `ปิดบิล ${bankAlertModal.tableName} สำเร็จแล้ว ✅`,
                        `ยอดรับ ฿${bankAlertModal.amount?.toLocaleString()}`
                      );
                      const currentAlertId = bankAlertModal.id;
                      const tableName = bankAlertModal.tableName;
                      const slipUrl = bankAlertModal.slipUrl;
                      const memberPhone = bankAlertModal.memberPhone;
                      const customerName = bankAlertModal.customerName;
                      const channel = bankAlertModal.channel;
                      const tableNo = bankAlertModal.tableNo;
                      const initialOrderIds = bankAlertModal.orderIds || [];

                      resolveAlertAndNext(currentAlertId);
                      fetchData();

                      // Background network execution
                      (async () => {
                        try {
                          let orderIds = initialOrderIds;
                          if (orderIds.length === 0) {
                            const tableRes = await fetch(`/api/r/${slug}/tables/${tableNo}`);
                            const tableData = await tableRes.json();
                            if (tableData?.orders) {
                              orderIds = tableData.orders.map((o: any) => o.id);
                            }
                          }
                          await Promise.all(
                            orderIds.map((oId: string) =>
                              fetch(`/api/r/${slug}/orders/${oId}/pay`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  paymentMethod: 'PROMPTPAY',
                                  slipUrl: slipUrl || undefined,
                                  memberPhone: memberPhone || undefined,
                                  customerName: customerName || undefined,
                                  note: `${tableName} (${channel === 'SLIP' ? 'ลูกค้าส่งสลิป' : 'ลูกค้าแจ้งโอนผ่านเว็บ'})`,
                                }),
                              })
                            )
                          );
                        } catch (e: any) {
                          showError('ไม่สามารถปิดบิลได้', e.message);
                        }
                      })();
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>✅ ยืนยันรับเงิน & ปิดบิล (1 คลิก)</span>
                  </button>

                  <button
                    type="button"
                    data-sound="pop"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    ปิดหน้าต่าง / รอตรวจสอบก่อน
                  </button>
                </div>
              )}

              {/* Case 1: AUTO_PAID */}
              {bankAlertModal.action === 'AUTO_PAID' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">โต๊ะที่ปิดบิล:</span>
                      <span className="font-black text-sm text-emerald-700">
                        {bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`}
                      </span>
                    </div>
                    {bankAlertModal.orderCount && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>จำนวนออเดอร์:</span>
                        <span className="font-bold">{bankAlertModal.orderCount} บิล</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>สถานะโต๊ะ:</span>
                      <span className="font-bold text-emerald-600">ว่าง (AVAILABLE) เคลียร์เรียบร้อย</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {bankAlertModal.orders && bankAlertModal.orders.length > 0 && (
                      <button
                        type="button"
                        data-sound="pop"
                        onClick={() => {
                          setReceiptOrder({
                            storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
                            promptPayName: store?.promptPayName || '',
                            phone: store?.phone || '',
                            address: store?.address || '',
                            receiptFooter: store?.receiptFooter || '',
                            tableId: bankAlertModal.tableNo,
                            tableName: bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`,
                            orders: bankAlertModal.orders,
                            totalAmount: bankAlertModal.amount,
                            discountAmount: 0,
                            netAmount: bankAlertModal.amount,
                            paymentMethod: 'PROMPTPAY',
                            cashReceived: null,
                            changeAmount: 0,
                            paidAt: new Date().toISOString(),
                          });
                          setIsReceiptModalOpen(true);
                          resolveAlertAndNext(bankAlertModal.id);
                        }}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition-all duration-75 active:scale-90 select-none"
                      >
                        <Printer className="w-4 h-4" />
                        <span>🖨️ พิมพ์ใบเสร็จ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      data-sound="success"
                      onClick={() => resolveAlertAndNext(bankAlertModal.id)}
                      className={`py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all duration-75 active:scale-90 select-none ${
                        !bankAlertModal.orders || bankAlertModal.orders.length === 0 ? 'col-span-2' : ''
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>รับทราบ & ปิดหน้าต่าง</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: MANUAL_CONFIRM */}
              {bankAlertModal.action === 'MANUAL_CONFIRM' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <p className="font-bold leading-relaxed">
                      พบยอดค้างชำระของ{' '}
                      <span className="font-black text-amber-800 underline">
                        {bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`}
                      </span>{' '}
                      ตรงกับยอดเงิน ฿{bankAlertModal.amount?.toLocaleString()} พอดี
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      คลิกปุ่มด้านล่างเพื่อยืนยันการรับเงินและปิดบิลโต๊ะนี้:
                    </p>
                  </div>

                  <button
                    type="button"
                    data-sound="success"
                    onClick={() => {
                      if (voiceEnabled !== false) {
                        speakPaymentConfirmed(bankAlertModal.tableName);
                      }
                      playSuccessChime();
                      showSuccess(
                        `ปิดบิล ${bankAlertModal.tableName} สำเร็จแล้ว ✅`,
                        `ยอดรับ ฿${bankAlertModal.amount}`
                      );
                      const currentAlertId = bankAlertModal.id;
                      const tableName = bankAlertModal.tableName;
                      const bankName = bankAlertModal.bankName;
                      const candidate = bankAlertModal.candidates?.[0];
                      const orderIds = candidate?.orderIds || [];

                      resolveAlertAndNext(currentAlertId);
                      fetchData();

                      // Background execution
                      (async () => {
                        try {
                          await Promise.all(
                            orderIds.map((oId: string) =>
                              fetch(`/api/r/${slug}/orders/${oId}/pay`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  paymentMethod: 'PROMPTPAY',
                                  note: `${tableName} (โอนผ่าน ${bankName || 'Email ธนาคาร'})`,
                                }),
                              })
                            )
                          );
                        } catch (e: any) {
                          showError('ไม่สามารถปิดบิลได้', e.message);
                        }
                      })();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/25 cursor-pointer transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✅ ยืนยันตัดยอดปิดบิล ({bankAlertModal.tableName})</span>
                  </button>

                  <button
                    type="button"
                    data-sound="pop"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    ไม่ใช่โต๊ะนี้ / ปิดหน้าต่าง
                  </button>
                </div>
              )}

              {/* Case 3: AMBIGUOUS_CHOICE */}
              {bankAlertModal.action === 'AMBIGUOUS_CHOICE' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    มียอดค้างชำระ ฿{bankAlertModal.amount?.toLocaleString()} ตรงกัน {bankAlertModal.candidates?.length}{' '}
                    โต๊ะ กรุณาเลือกโต๊ะที่ต้องการตัดยอดปิดบิล:
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {bankAlertModal.candidates?.map((c: any) => (
                      <button
                        key={c.tableId || c.tableNo}
                        type="button"
                        data-sound="success"
                        onClick={() => {
                          playSuccessChime();
                          if (voiceEnabled) {
                            speakMoneyReceived(c.totalAmount, c.tableName);
                          }
                          showSuccess(`ปิดบิล ${c.tableName} สำเร็จแล้ว ✅`, `ยอดรับ ฿${c.totalAmount}`);
                          const currentAlertId = bankAlertModal.id;
                          const cTableName = c.tableName;
                          const bName = bankAlertModal.bankName;
                          const cOrderIds = c.orderIds || [];

                          resolveAlertAndNext(currentAlertId);
                          fetchData();

                          // Background execution
                          (async () => {
                            try {
                              await Promise.all(
                                cOrderIds.map((orderId: string) =>
                                  fetch(`/api/r/${slug}/orders/${orderId}/pay`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      paymentMethod: 'PROMPTPAY',
                                      note: `${cTableName} (โอนผ่าน ${bName || 'Email ธนาคาร'})`,
                                    }),
                                  })
                                )
                              );
                            } catch (e: any) {
                              showError('ไม่สามารถปิดบิลได้', e.message);
                            }
                          })();
                        }}
                        className="w-full p-3 rounded-2xl bg-orange-50/80 hover:bg-orange-100/90 active:bg-orange-200/90 border border-orange-200/90 text-left flex items-center justify-between group transition-all duration-75 active:scale-95 active:translate-y-0.5 select-none cursor-pointer"
                      >
                        <div>
                          <span className="font-black text-sm text-slate-900 block">{c.tableName}</span>
                          <span className="text-xs text-slate-500 font-medium">ยอดบิล: ฿{c.totalAmount?.toLocaleString()}</span>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-sm group-hover:scale-105 transition-transform">
                          ตัดยอดโต๊ะนี้ →
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-sound="pop"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    ปิดหน้าต่าง / ไม่ใช่โต๊ะเหล่านี้
                  </button>
                </div>
              )}

              {/* Case 4: UNMATCHED */}
              {bankAlertModal.action === 'UNMATCHED' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1">
                    <p className="font-bold leading-relaxed">
                      ได้รับเงิน ฿{bankAlertModal.amount?.toLocaleString()} เข้าบัญชีเรียบร้อยแล้ว
                    </p>
                    <p className="text-[11px] text-sky-700 leading-normal">
                      ไม่พบโต๊ะที่มียอดค้างชำระตรงกับยอดนี้ (อาจเป็นเงินโอนนอก, ลูกค้าโอนรวมหลายโต๊ะ หรือเงินทิป)
                    </p>
                  </div>

                  {/* Option to settle an existing occupied table if any */}
                  {tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING').length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-500 font-bold block">
                        หรือเลือกโต๊ะที่ต้องการนำยอดนี้ไปตัด:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {tables
                          .filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING')
                          .map((t) => {
                            const tableOrders = t.orders || [];
                            const tableTotal = tableOrders.reduce(
                              (sum: number, o: any) => sum + (o.netAmount || 0),
                              0
                            );
                            return (
                              <button
                                key={t.id}
                                type="button"
                                data-sound="success"
                                onClick={() => {
                                  playSuccessChime();
                                  if (voiceEnabled) {
                                    speakMoneyReceived(bankAlertModal.amount, t.name);
                                  }
                                  showSuccess(`ตัดยอดปิดบิล ${t.name} สำเร็จแล้ว ✅`);
                                  const currentAlertId = bankAlertModal.id;
                                  const tName = t.name;
                                  const bAmount = bankAlertModal.amount;
                                  const tOrders = [...tableOrders];

                                  resolveAlertAndNext(currentAlertId);
                                  fetchData();

                                  // Background execution
                                  (async () => {
                                    try {
                                      await Promise.all(
                                        tOrders.map((o: any) =>
                                          fetch(`/api/r/${slug}/orders/${o.id}/pay`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              paymentMethod: 'PROMPTPAY',
                                              note: `${tName} (ตัดยอดจากเงินโอน ฿${bAmount})`,
                                            }),
                                          })
                                        )
                                      );
                                    } catch (e: any) {
                                      showError('ไม่สามารถปิดบิลได้', e.message);
                                    }
                                  })();
                                }}
                                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-left flex items-center justify-between text-xs cursor-pointer transition-all duration-75 active:scale-95 select-none"
                              >
                                <span className="font-bold text-slate-800">{t.name}</span>
                                <span className="font-bold text-amber-700">
                                  บิล ฿{tableTotal?.toLocaleString()} (กดตัดยอด)
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    data-sound="pop"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-black text-xs transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    รับทราบ & ปิดหน้าต่าง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Floating Action Button: รอตรวจเงินเข้า (เมื่อปิดป๊อปอัพชั่วคราวแต่ยังมีคิวค้างอยู่) */}
      {!isOpen && bankAlertQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-bounce">
          <button
            type="button"
            data-sound="pop"
            onClick={onOpen}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-black text-sm shadow-2xl shadow-orange-500/50 hover:scale-105 active:scale-90 transition-all duration-75 border-2 border-white/40 cursor-pointer select-none"
          >
            <div className="relative">
              <BellRing className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-extrabold border border-white">
                {bankAlertQueue.length}
              </span>
            </div>
            <span>รอตรวจเงินเข้า ({bankAlertQueue.length} โต๊ะ)</span>
          </button>
        </div>
      )}
    </>
  );
}
