'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, X, Utensils, ChefHat } from 'lucide-react';

interface ServeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onConfirm: () => void;
}

export default function ServeConfirmModal({
  isOpen,
  onClose,
  order,
  onConfirm,
}: ServeConfirmModalProps) {
  if (!isOpen || !order) return null;

  const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);
  const title = isDelivery
    ? `เดลิเวอรี #${order.deliveryOrderId || order.id.slice(-4)}`
    : order.table?.name || `โต๊ะ ${order.tableNo || '-'}`;

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

  // ตรวจสอบว่ายังมีจานที่ค้างทำอยู่หรือไม่
  const items = order.items || [];
  const pendingItems = items.filter((it: any) => it.status !== 'READY' && it.status !== 'SERVED');
  const pendingCount = pendingItems.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const totalCount = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                {channelLabel}
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                ยืนยันเสิร์ฟ {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            data-sound="tap"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 active:translate-y-0.5 select-none duration-75 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Items Warning (ถ้ายังมีอาหารค้างทำ) */}
        {pendingCount > 0 ? (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
            <div className="flex items-center space-x-2 font-black text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>ยังมีอาหารค้างทำ {pendingCount}/{totalCount} จาน</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              ในบิลยังมีรายการที่ยังไม่ได้กดปรุงเสร็จ คุณต้องการยืนยันเสิร์ฟทั้งหมดทันทีหรือไม่?
            </p>
            <div className="pt-1 border-t border-amber-200/60 text-[11px] font-bold text-amber-900 space-y-0.5">
              {pendingItems.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate">• {it.name}</span>
                  <span className="flex-shrink-0 font-extrabold">x{it.quantity || 1}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold block">ปรุงเสร็จครบทุกจานแล้ว ({totalCount} จาน)</span>
              <span className="text-emerald-700 text-[11px]">พร้อมนำไปเสิร์ฟและเคลียร์บิลออกจากจอ</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            data-sound="tap"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            data-sound="success"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-black text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer ring-2 ring-emerald-400/40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ยืนยันเสิร์ฟทันที</span>
          </button>
        </div>
      </div>
    </div>
  );
}
