'use client';

import React, { useState, useMemo } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { printThermalElement } from '@/lib/thermalPrinter';

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
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex space-x-2.5 no-print">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            data-sound="pop"
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black text-xs shadow-md transition-all duration-75 flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer select-none ring-0 active:ring-2 active:ring-amber-400/50 ${
              isPrinting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>
              {isPrinting ? 'กำลังส่งพิมพ์...' : copies === 2 ? 'พิมพ์บิล (2 ใบ)' : 'พิมพ์บิล / ใบเสร็จ'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
