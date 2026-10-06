'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { Printer, X, Bluetooth, Usb, Zap, CheckCircle2, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { printThermalElement } from '@/lib/thermalPrinter';
import { escPosPrinter } from '@/lib/escposPrinter';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  store?: any;
  autoPrint?: boolean;
}

export default function ReceiptPrintModal({ isOpen, onClose, order, store, autoPrint }: ReceiptPrintModalProps) {
  if (!isOpen || !order) return null;

  const [copies, setCopies] = useState<number>(1);
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
    setFeedbackMsg('กำลังส่งข้อมูลความร้อน ESC/POS...');
    try {
      const res = await escPosPrinter.printDirectReceipt(order, store, {
        copies,
        width: (store?.printerPaperWidth as any) || '80mm',
        openDrawer: true,
      });
      if (res.success) {
        setFeedbackMsg('พิมพ์ตรงสำเร็จเรียบร้อย! ⚡');
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
      await printThermalElement('printable-receipt', { copies, width: '80mm' });
    } finally {
      setIsPrinting(false);
    }
  };

  // Auto trigger print immediately upon opening if requested
  React.useEffect(() => {
    if (isOpen && order && (order.autoPrint || autoPrint)) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, order?.orderId, order?.id]);

  const storeInfo = store || order;
  const items = order.items || (order.orders ? order.orders.flatMap((o: any) => o.items || []) : []);
  const totalAmount = order.totalAmount || 0;
  const discountAmount = order.discountAmount || 0;
  const netAmount = order.netAmount || Math.max(0, totalAmount - discountAmount);

  const isPreCheck =
    order.isPreCheck ||
    order.paymentMethod === 'PENDING' ||
    !order.paidAt ||
    order.paymentStatus === 'UNPAID';

  const promptPayId = storeInfo?.promptPayId || order?.promptPayId || '';
  const promptPayName = storeInfo?.promptPayName || order?.promptPayName || '';

  const promptPayQrPayload = useMemo(() => {
    if (!promptPayId || netAmount <= 0) return '';
    return generatePromptPayPayload(promptPayId, netAmount);
  }, [promptPayId, netAmount]);

  const billNo =
    order.orderId ||
    order.id ||
    `BILL-${order.tableId || order.tableNo || 'POS'}-${new Date().getTime().toString().slice(-4)}`;

  const tenantSlug = storeInfo?.slug || order?.tenantSlug || order?.storeSlug || 'demo';
  const eReceiptPath = order?.id ? `/r/${tenantSlug}/receipt/${order.id}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      {/* Thermal Slip Printer Scoped CSS */}
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
            #printable-receipt, #printable-receipt * {
              visibility: visible !important;
            }
            #printable-receipt {
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
              font-family: monospace, Courier, sans-serif !important;
              font-size: 11px !important;
              line-height: 1.25 !important;
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

      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header (No Print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 no-print">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Printer className="w-5 h-5 text-orange-500" />
            <span>{isPreCheck ? 'ใบแจ้งค่าอาหาร / ใบเช็คบิล' : 'ใบเสร็จรับเงิน'}</span>
          </div>
          <div className="flex items-center space-x-2">
            {eReceiptPath && (
              <a
                href={eReceiptPath}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold inline-flex items-center space-x-1 transition-colors"
                title="เปิดใบเสร็จดิจิทัล E-Receipt"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>E-Receipt</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
          {/* Printable Receipt Paper (Fits 58mm / 80mm Thermal Receipt Printers) */}
          <div
            id="printable-receipt"
            className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-slate-200 w-full font-mono text-xs text-slate-900 leading-relaxed max-w-[80mm]"
          >
            {/* Store Info */}
            <div className="text-center pb-2.5 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-sm tracking-wide text-slate-900">
                {storeInfo?.storeName || storeInfo?.name || 'ร้านอาหารตามสั่ง'}
              </h2>
              {storeInfo?.address && <p className="text-[10px] text-slate-600 mt-0.5">{storeInfo.address}</p>}
              {storeInfo?.phone && <p className="text-[10px] text-slate-600">โทร: {storeInfo.phone}</p>}
            </div>

            {/* Bill Header / Title */}
            <div className="text-center py-2 border-b border-dashed border-slate-300">
              <h3 className="font-black text-xs text-slate-900 uppercase">
                {isPreCheck ? 'ใบแจ้งค่าอาหาร / ใบเช็คบิล' : 'ใบเสร็จรับเงิน'}
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold tracking-wider">
                {isPreCheck ? '(BILL / INVOICE)' : '(RECEIPT / TAX INVOICE ABB)'}
              </p>
            </div>

            {/* Bill Metadata */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขที่บิล:</span>
                <span className="font-bold">{billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">โต๊ะ:</span>
                <span className="font-bold">{order.tableName || `โต๊ะ ${order.tableId || order.tableNo}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่:</span>
                <span>{formatDateTime(order.paidAt || order.createdAt || new Date())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะ:</span>
                <span className="font-bold">
                  {isPreCheck
                    ? 'รอชำระเงิน'
                    : order.paymentMethod === 'PROMPTPAY'
                    ? 'PromptPay QR'
                    : 'เงินสด (Cash)'}
                </span>
              </div>
            </div>

            {/* Member & Loyalty Info (If available) */}
            {(order.customerName || order.memberPhone) && (
              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5 bg-slate-50/70 p-1.5 rounded">
                {order.customerName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ลูกค้า:</span>
                    <span className="font-bold text-slate-800">{order.customerName}</span>
                  </div>
                )}
                {order.memberPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">เบอร์สะสมแต้ม:</span>
                    <span className="font-bold text-slate-800">{order.memberPhone}</span>
                  </div>
                )}
                {order.pointsEarned !== undefined && order.pointsEarned > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>แต้มที่ได้รับบิลนี้:</span>
                    <span>+{order.pointsEarned} แต้ม</span>
                  </div>
                )}
                {order.memberPoints !== undefined && (
                  <div className="flex justify-between text-orange-600 font-bold">
                    <span>คะแนนสะสมคงเหลือ:</span>
                    <span>⭐ {order.memberPoints.toLocaleString()} แต้ม</span>
                  </div>
                )}
              </div>
            )}

            {/* Item List */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-1">
                <span>รายการ</span>
                <span>จำนวนเงิน</span>
              </div>
              {items.map((item: any, idx: number) => {
                let parsedOptions: any[] = [];
                if (item.selectedOptions) {
                  try {
                    parsedOptions =
                      typeof item.selectedOptions === 'string'
                        ? JSON.parse(item.selectedOptions)
                        : item.selectedOptions;
                  } catch (e) {}
                }

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium pr-2">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-bold flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </div>

                    {parsedOptions.length > 0 && (
                      <div className="pl-3 text-[9px] text-slate-500">
                        {parsedOptions.map((opt: any, oIdx: number) => (
                          <span key={oIdx} className="mr-1">
                            +{opt.choice || opt.name}
                            {opt.extra > 0 && `(฿${opt.extra})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.specialNote && (
                      <div className="pl-3 text-[9px] text-amber-700 italic">*{item.specialNote}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pricing Summary */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>รวมเงิน:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>ส่วนลด:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-200 text-slate-900">
                <span>ยอดสุทธิที่ต้องชำระ:</span>
                <span className="text-sm font-black">{formatPrice(netAmount)}</span>
              </div>

              {!isPreCheck && order.paymentMethod === 'CASH' && order.cashReceived && (
                <>
                  <div className="flex justify-between text-[10px] pt-1 text-slate-600">
                    <span>รับเงินสด:</span>
                    <span>{formatPrice(order.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                    <span>เงินทอน:</span>
                    <span>{formatPrice(order.changeAmount || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* PromptPay QR Section for Direct Scan Payment */}
            {promptPayQrPayload && netAmount > 0 && (
              <div className="py-2.5 border-b border-dashed border-slate-300 text-center space-y-1 flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-700">
                  {isPreCheck ? 'สแกน QR เพื่อชำระเงิน' : 'พร้อมเพย์ร้านค้า'}
                </p>
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg inline-block">
                  <QRCodeSVG value={promptPayQrPayload} size={110} />
                </div>
                <p className="text-[9px] text-slate-600 font-bold">
                  {promptPayId} {promptPayName ? `(${promptPayName})` : ''}
                </p>
                <p className="text-[9px] font-black text-slate-800">
                  ยอดชำระ: ฿{netAmount.toLocaleString()}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2.5 text-[10px] text-slate-500 space-y-0.5">
              <p>{storeInfo?.receiptFooter || 'ขอบคุณที่มาอุดหนุนครับ 🙏'}</p>
              <p className="text-[8px] text-slate-400">Powered by Order Pos</p>
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
            <span className="text-[11px] font-bold text-slate-600">เครื่องพิมพ์สลิป:</span>
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

        {/* Print Copy Selector (No Print) */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs no-print">
          <span className="font-semibold text-slate-600">จำนวนสำเนา:</span>
          <div className="flex space-x-1.5">
            <button
              type="button"
              onClick={() => setCopies(1)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                copies === 1
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              1 ใบ (ปกติ)
            </button>
            <button
              type="button"
              onClick={() => setCopies(2)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                copies === 2
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              2 ใบ (ลูกค้า+ร้าน)
            </button>
          </div>
        </div>

        {/* Action Buttons (No Print) */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="sm:w-24 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
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
              <span>
                {directPrinting
                  ? 'กำลังส่งพิมพ์ตรง...'
                  : copies === 2
                  ? 'พิมพ์ตรงบลูทูธ/USB (2 ใบ)'
                  : '⚡ พิมพ์ตรงบลูทูธ/USB (ESC/POS)'}
              </span>
            </button>
          )}

          {/* Standard Print Dialog fallback */}
          <button
            type="button"
            data-sound="pop"
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex-1 py-2.5 rounded-xl ${
              printerStatus.connected
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white ring-2 active:ring-amber-400/50'
            } font-black text-xs shadow-md transition-all duration-75 flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer select-none ${
              isPrinting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>
              {isPrinting
                ? 'กำลังส่งพิมพ์...'
                : printerStatus.connected
                ? 'พิมพ์ผ่านระบบเบราว์เซอร์'
                : copies === 2
                ? 'พิมพ์บิล (2 ใบ)'
                : 'พิมพ์บิล / ใบเสร็จ'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
