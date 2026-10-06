'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X, ChefHat, Clock, Bluetooth, Usb, Zap, CheckCircle2 } from 'lucide-react';
import { formatTime, formatDateTime } from '@/lib/utils';
import { printThermalElement } from '@/lib/thermalPrinter';
import { escPosPrinter } from '@/lib/escposPrinter';

interface KitchenTicketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  store?: any;
}

export default function KitchenTicketPrintModal({
  isOpen,
  onClose,
  order,
  store,
}: KitchenTicketPrintModalProps) {
  if (!isOpen || !order) return null;

  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [directPrinting, setDirectPrinting] = useState<boolean>(false);
  const [printerStatus, setPrinterStatus] = useState(() => escPosPrinter.getStatus());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrinterStatus(escPosPrinter.getStatus());
    }
  }, [isOpen]);

  const handleConnectBluetooth = async () => {
    setFeedbackMsg('กำลังเปิดหน้าต่างเลือก Bluetooth...');
    const res = await escPosPrinter.connectBluetooth();
    setPrinterStatus(escPosPrinter.getStatus());
    if (res.success) {
      setFeedbackMsg(`เชื่อมต่อ ${res.name} สำเร็จ! 🟢`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg(res.error || 'เชื่อมต่อ Bluetooth ไม่สำเร็จ');
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleConnectSerial = async () => {
    setFeedbackMsg('กำลังเปิดหน้าต่างเลือก USB...');
    const res = await escPosPrinter.connectSerial();
    setPrinterStatus(escPosPrinter.getStatus());
    if (res.success) {
      setFeedbackMsg(`เชื่อมต่อ ${res.name} สำเร็จ! 🟢`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg(res.error || 'เชื่อมต่อ USB ไม่สำเร็จ');
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleDirectEscPosPrint = async () => {
    if (directPrinting) return;
    setDirectPrinting(true);
    setFeedbackMsg('กำลังส่งข้อมูลความร้อนไปยังเครื่องพิมพ์ครัว...');
    try {
      const res = await escPosPrinter.printDirectKitchenTicket(order, store, {
        width: (store?.printerPaperWidth as any) || '80mm',
      });
      if (res.success) {
        setFeedbackMsg('พิมพ์สลิปครัวสำเร็จ! ⚡');
        setTimeout(() => setFeedbackMsg(null), 2500);
      } else {
        setFeedbackMsg(res.error || 'พิมพ์ไม่สำเร็จ');
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || 'เกิดข้อผิดพลาดในการพิมพ์ตรง');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setDirectPrinting(false);
    }
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      await printThermalElement('printable-kitchen-ticket', { copies: 1, width: '80mm' });
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
      }, 1500);
    }
  };

  const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);
  const channelLabel =
    order.orderChannel === 'LINEMAN'
      ? '🛵 LINE MAN'
      : order.orderChannel === 'GRAB'
      ? '🛵 GrabFood'
      : order.orderChannel === 'SHOPEE_FOOD'
      ? '🛵 ShopeeFood'
      : order.orderChannel === 'ROBINHOOD'
      ? '🛵 Robinhood'
      : order.orderType === 'TAKEAWAY'
      ? '🛍️ สั่งกลับบ้าน'
      : '🍽️ ทานที่ร้าน';

  const orderTitle = isDelivery
    ? `เดลิเวอรี #${order.deliveryOrderId || order.id.slice(-4)}`
    : order.table?.name || `โต๊ะ ${order.tableNo || '-'}`;

  const items = order.items || [];
  const totalQty = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      {/* Scoped Thermal Slip Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              background: white !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-kitchen-ticket, #printable-kitchen-ticket * {
              visibility: visible !important;
            }
            #printable-kitchen-ticket {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 2mm 3mm !important;
              border: none !important;
              box-shadow: none !important;
              color: black !important;
              background: white !important;
              font-family: monospace, -apple-system, sans-serif !important;
              font-size: 13px !important;
              line-height: 1.3 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `,
        }}
      />

      <div className="bg-white rounded-3xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header (No Print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 no-print">
          <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
            <ChefHat className="w-5 h-5 text-amber-500" />
            <span>ใบสั่งอาหารห้องครัว (KOT)</span>
          </div>
          <button
            type="button"
            data-sound="tap"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 active:scale-90 active:translate-y-0.5 select-none duration-75 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Ticket Body */}
        <div className="p-4 overflow-y-auto bg-slate-100 flex justify-center">
          {/* Printable Ticket */}
          <div
            id="printable-kitchen-ticket"
            className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 w-full font-mono text-xs text-slate-900 leading-relaxed max-w-[80mm]"
          >
            {/* Store & Header */}
            <div className="text-center pb-2 border-b-2 border-dashed border-slate-400">
              <h2 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                {store?.name || store?.storeName || 'ใบสั่งอาหารห้องครัว'}
              </h2>
              <div className="text-[10px] text-slate-600 mt-0.5">
                พิมพ์: {formatDateTime(new Date())}
              </div>
            </div>

            {/* Big Table / Platform Highlight */}
            <div className="py-2.5 text-center border-b-2 border-slate-900 bg-slate-50 my-1 rounded-md">
              <div className="text-xs font-bold text-slate-700">{channelLabel}</div>
              <div className="text-2xl font-black text-slate-950 tracking-wide mt-0.5">
                {orderTitle}
              </div>
              {order.customerName && (
                <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                  ลูกค้า: {order.customerName}
                </div>
              )}
              {order.riderName && (
                <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                  ไรเดอร์: {order.riderName}
                </div>
              )}
            </div>

            {/* Time & Bill Info */}
            <div className="flex justify-between text-[10px] text-slate-600 py-1 border-b border-dashed border-slate-300">
              <span>ออเดอร์: #{order.id?.slice(-6) || 'N/A'}</span>
              <span>สั่งเมื่อ: {formatTime(order.createdAt)}</span>
            </div>

            {/* Order Note */}
            {order.note && (
              <div className="my-2 p-2 bg-rose-50 border border-rose-300 text-rose-900 rounded font-bold text-[11px]">
                ⚠️ หมายเหตุบิล: {order.note}
              </div>
            )}

            {/* Items List */}
            <div className="py-2 space-y-2 border-b-2 border-slate-900">
              <div className="flex justify-between text-[11px] font-black border-b border-slate-300 pb-1">
                <span>รายการอาหาร ({totalQty} จาน)</span>
                <span>จำนวน</span>
              </div>

              {items.map((item: any, idx: number) => {
                let parsedOptions: any[] = [];
                if (item.selectedOptions) {
                  try {
                    parsedOptions = JSON.parse(item.selectedOptions);
                  } catch (e) {}
                }

                return (
                  <div key={idx} className="pt-1.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 font-bold text-sm text-slate-950 leading-snug">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="text-base font-black text-slate-950 px-1.5 py-0.5 bg-slate-200 rounded min-w-[28px] text-center">
                        {item.quantity || 1}
                      </div>
                    </div>

                    {/* Options / Toppings */}
                    {parsedOptions.length > 0 && (
                      <div className="ml-4 mt-0.5 text-[11px] text-slate-700 font-semibold">
                        {parsedOptions.map((opt: any, oIdx: number) => (
                          <div key={oIdx}>• {opt.choice || opt.name}</div>
                        ))}
                      </div>
                    )}

                    {/* Special Note */}
                    {item.specialNote && (
                      <div className="ml-4 mt-0.5 text-[11px] font-black text-rose-700">
                        * {item.specialNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Summary */}
            <div className="pt-2 text-center text-[10px] text-slate-500">
              รวมทั้งสิ้น {totalQty} จาน — ครัวไทยตามสั่ง
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1.5 no-print animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{feedbackMsg}</span>
          </div>
        )}

        {/* ESC/POS Thermal Device Bar */}
        <div className="px-4 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-xs no-print flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600">เครื่องพิมพ์ครัว:</span>
            {printerStatus.connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {printerStatus.name} ({printerStatus.type.toUpperCase()})
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold">ยังไม่เชื่อมต่อ</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {printerStatus.connected ? (
              <button
                type="button"
                onClick={async () => {
                  await escPosPrinter.disconnect();
                  setPrinterStatus(escPosPrinter.getStatus());
                }}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                ตัดการเชื่อมต่อ
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleConnectBluetooth}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-300 text-blue-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="เชื่อมต่อเครื่องพิมพ์พกพาผ่าน Bluetooth"
                >
                  <Bluetooth className="w-3 h-3 text-blue-600" />
                  <span>ต่อ Bluetooth</span>
                </button>
                <button
                  type="button"
                  onClick={handleConnectSerial}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="เชื่อมต่อเครื่องพิมพ์ผ่านสาย USB (Serial)"
                >
                  <Usb className="w-3 h-3 text-emerald-600" />
                  <span>ต่อ USB</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons (No Print) */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 no-print">
          <button
            type="button"
            data-sound="tap"
            onClick={onClose}
            className="sm:w-24 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 transition-all cursor-pointer"
          >
            ปิด
          </button>

          {/* Direct Print Button via Web Bluetooth / USB */}
          {printerStatus.connected && (
            <button
              type="button"
              onClick={handleDirectEscPosPrint}
              disabled={directPrinting}
              className={`flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs shadow-md transition-all duration-75 flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer select-none ring-2 ring-emerald-400/50 ${
                directPrinting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{directPrinting ? 'กำลังส่งพิมพ์ตรง...' : '⚡ พิมพ์ตรงสลิปครัว (ESC/POS)'}</span>
            </button>
          )}

          {/* Standard Print Dialog fallback */}
          <button
            type="button"
            data-sound="tap"
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex-1 py-2.5 rounded-xl ${
              printerStatus.connected
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 text-white ring-2 ring-amber-400/40'
            } font-black text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer ${
              isPrinting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>
              {isPrinting
                ? 'กำลังส่งพิมพ์...'
                : printerStatus.connected
                ? 'พิมพ์ผ่านระบบเบราว์เซอร์'
                : 'พิมพ์สลิปครัว'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
