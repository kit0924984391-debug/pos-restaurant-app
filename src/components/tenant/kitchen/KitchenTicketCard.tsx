'use client';

import React from 'react';
import {
  Clock,
  Printer,
  Utensils,
  BellRing,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { KitchenOrder, matchItemStation } from '@/hooks/useKitchenOrders';

interface KitchenTicketCardProps {
  order: KitchenOrder;
  onUpdateItemStatus: (orderId: string, itemId: string, newStatus: string) => void;
  onOpenPrintModal: (order: KitchenOrder) => void;
  onOpenServeModal?: (order: KitchenOrder) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: string) => void;
}

export default function KitchenTicketCard({
  order,
  onUpdateItemStatus,
  onOpenPrintModal,
  onOpenServeModal,
  onUpdateOrderStatus,
}: KitchenTicketCardProps) {
  const isPending = order.status === 'PENDING';
  const isCooking = order.status === 'COOKING';
  const isReady = order.status === 'READY';
  const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);

  // Progress Bar Calculation
  const totalItems = order.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 0;
  const servedCount =
    order.items?.reduce((sum: number, it: any) => {
      if (it.status === 'SERVED') return sum + (it.quantity || 1);
      return sum;
    }, 0) || 0;
  const readyCount =
    order.items?.reduce((sum: number, it: any) => {
      if (it.status === 'READY') return sum + (it.quantity || 1);
      return sum;
    }, 0) || 0;
  const progressPercent = totalItems > 0 ? Math.round(((servedCount + readyCount) / totalItems) * 100) : 0;
  const hasPending = order.items?.some((it: any) => it.status === 'PENDING' || !it.status);
  const hasCooking = order.items?.some((it: any) => it.status === 'COOKING');
  const allReadyOrServed = totalItems > 0 && order.items?.every((it: any) => it.status === 'READY' || it.status === 'SERVED');

  // Channel Theme
  let headerBg = isPending ? 'bg-rose-600' : isCooking ? 'bg-amber-600' : 'bg-emerald-600';
  let platformBadge = 'ทานที่ร้าน';
  let platformBadgeBg = 'bg-black/20';

  if (order.orderChannel === 'LINEMAN') {
    headerBg = 'bg-[#06C755]';
    platformBadge = '🛵 LINE MAN';
    platformBadgeBg = 'bg-black/30';
  } else if (order.orderChannel === 'GRAB') {
    headerBg = 'bg-[#00B14F]';
    platformBadge = '🛵 GrabFood';
    platformBadgeBg = 'bg-black/30';
  } else if (order.orderChannel === 'SHOPEE_FOOD') {
    headerBg = 'bg-[#EE4D2D]';
    platformBadge = '🛵 ShopeeFood';
    platformBadgeBg = 'bg-black/30';
  } else if (order.orderChannel === 'ROBINHOOD') {
    headerBg = 'bg-[#802882]';
    platformBadge = '🛵 Robinhood';
    platformBadgeBg = 'bg-black/30';
  } else if (order.orderType === 'TAKEAWAY') {
    platformBadge = '🛍️ กลับบ้าน';
  }

  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
  const isUrgent = elapsedMin >= 15 && order.status !== 'READY';
  const isWarning = elapsedMin >= 10 && elapsedMin < 15 && order.status !== 'READY';

  return (
    <div
      className={`rounded-3xl border shadow-sm flex flex-col justify-between overflow-hidden bg-white transition-all duration-200 ${
        isDelivery
          ? 'border-emerald-300 ring-2 ring-emerald-500/30'
          : isPending
          ? 'border-rose-300 ring-2 ring-rose-500/20'
          : isCooking
          ? 'border-amber-300 ring-2 ring-amber-500/20'
          : 'border-emerald-300 ring-2 ring-emerald-500/20'
      }`}
    >
      {/* Ticket Header */}
      <div className={`p-4 text-white flex items-center justify-between ${headerBg}`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-black">
              {isDelivery
                ? `#${order.deliveryOrderId || order.id.slice(-4)}`
                : order.table?.name || `โต๊ะ ${order.tableNo}`}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${platformBadgeBg}`}>
              {platformBadge}
            </span>
          </div>
          {isDelivery && (
            <span className="text-[10px] text-white/90 block mt-0.5">
              👤 {order.riderName ? `ไรเดอร์: ${order.riderName}` : order.customerName || 'เดลิเวอรี'}
            </span>
          )}
        </div>

        <div className="text-right flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold block opacity-95">{formatTime(order.createdAt)}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black mt-1 shadow-xs ${
                isUrgent
                  ? 'bg-rose-500 text-white animate-pulse ring-2 ring-white/60'
                  : isWarning
                  ? 'bg-amber-300 text-slate-950 font-black'
                  : 'bg-black/25 text-white/95'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{isUrgent ? `🔥 รอ ${elapsedMin} น.` : isWarning ? `⚠️ ${elapsedMin} น.` : `${elapsedMin} น.`}</span>
            </span>
          </div>

          {/* Print Kitchen Ticket Button */}
          <button
            type="button"
            data-sound="tap"
            onClick={() => onOpenPrintModal(order)}
            title="พิมพ์ใบสั่งอาหารห้องครัว (KOT)"
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 active:scale-90 active:translate-y-0.5 text-white shadow-2xs transition-all duration-75 select-none cursor-pointer flex items-center justify-center border border-white/30 backdrop-blur-xs ring-0 active:ring-2 active:ring-white/40"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Item Progress Bar */}
      <div className="bg-slate-50/95 border-b border-slate-100 px-4 py-1.5 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center space-x-1.5 font-bold text-slate-600">
          <Utensils className="w-3.5 h-3.5 text-amber-600" />
          <span>
            เสิร์ฟแล้ว {servedCount}/{totalItems} จาน
            {readyCount > 0 && (
              <span className="text-emerald-600 font-extrabold ml-1.5">• พร้อมเสิร์ฟ {readyCount} จาน</span>
            )}
          </span>
        </div>
        <span
          className={`font-black ${
            servedCount === totalItems && totalItems > 0
              ? 'text-emerald-600'
              : readyCount > 0
              ? 'text-teal-600'
              : 'text-amber-600'
          }`}
        >
          {progressPercent}%
        </span>
      </div>
      <div className="w-full bg-slate-200 h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            servedCount === totalItems && totalItems > 0
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : readyCount > 0
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Ticket Items */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
        {order.note && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            ⚠️ {order.note}
          </div>
        )}

        <div className="space-y-2">
          {order.items?.map((item: any, idx: number) => {
            let parsedOptions: any[] = [];
            if (item.selectedOptions) {
              try {
                parsedOptions = JSON.parse(item.selectedOptions);
              } catch (e) {}
            }

            const itemIndex = idx + 1;
            const isItemServed = item.status === 'SERVED';
            const isItemReady = item.status === 'READY';
            const isItemCooking = item.status === 'COOKING';

            return (
              <div
                key={item.id || idx}
                className={`p-2.5 rounded-xl border transition-all duration-200 ${
                  isItemCooking
                    ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/80 shadow-xs'
                    : isItemReady
                    ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/80 shadow-xs'
                    : isItemServed
                    ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* Dish Sequence Number */}
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                          isItemCooking
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : isItemReady
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : isItemServed
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}
                      >
                        #{itemIndex}
                      </span>

                      {/* Quantity */}
                      <span
                        className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 transition-colors ${
                          isItemServed
                            ? 'bg-slate-300 text-slate-700'
                            : isItemReady
                            ? 'bg-emerald-600 text-white'
                            : isItemCooking
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        {item.quantity}
                      </span>

                      {/* Dish Name */}
                      <span
                        className={`font-extrabold text-sm transition-all ${
                          isItemServed
                            ? 'line-through text-slate-400 font-medium'
                            : isItemCooking
                            ? 'text-amber-950 font-black'
                            : isItemReady
                            ? 'text-emerald-950 font-black'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.name}
                      </span>

                      {/* Station Badge */}
                      {(() => {
                        const st = matchItemStation(item.name, item.category?.name);
                        if (st === 'WOK') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                              🍳 ผัด/ทอด
                            </span>
                          );
                        }
                        if (st === 'SOUP') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                              🍲 ต้ม/แกง
                            </span>
                          );
                        }
                        if (st === 'BEVERAGE') {
                          return (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              🥤 น้ำ
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* Status Indicator Badges */}
                      {isItemCooking && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          <Flame className="w-3 h-3 text-amber-600" />
                          กำลังปรุง
                        </span>
                      )}
                      {isItemReady && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
                          <BellRing className="w-3 h-3 text-emerald-600" />
                          พร้อมเสิร์ฟ
                        </span>
                      )}
                      {isItemServed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          ✓ เสิร์ฟแล้ว
                        </span>
                      )}
                    </div>

                    {/* Options */}
                    {parsedOptions.length > 0 && (
                      <div className="mt-1.5 pl-6 flex flex-wrap gap-1">
                        {parsedOptions.map((opt: any, oIdx: number) => (
                          <span
                            key={oIdx}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isItemServed
                                ? 'bg-slate-100 text-slate-400 line-through'
                                : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                            }`}
                          >
                            {opt.group ? `${opt.group}: ` : ''}
                            {opt.choice || opt.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Special Note */}
                    {item.specialNote && (
                      <div
                        className={`mt-1.5 pl-6 text-[11px] font-bold flex items-center gap-1 ${
                          isItemServed ? 'text-slate-400 line-through' : 'text-amber-700'
                        }`}
                      >
                        <span>💬 {item.specialNote}</span>
                      </div>
                    )}
                  </div>

                  {/* 4-State dish button */}
                  <button
                    type="button"
                    data-sound={isItemReady ? 'success' : isItemCooking ? 'success' : 'pop'}
                    onClick={() => {
                      const nextStatus =
                        item.status === 'PENDING' || !item.status
                          ? 'COOKING'
                          : item.status === 'COOKING'
                          ? 'READY'
                          : item.status === 'READY'
                          ? 'SERVED'
                          : 'PENDING';
                      onUpdateItemStatus(order.id, item.id, nextStatus);
                    }}
                    title={
                      isItemServed
                        ? 'คลิกเพื่อย้อนกลับเป็นรอทำ'
                        : isItemReady
                        ? 'คลิกเมื่อยกไปเสิร์ฟที่โต๊ะแล้ว'
                        : isItemCooking
                        ? 'คลิกเมื่อปรุงเสร็จพร้อมเสิร์ฟ'
                        : 'คลิกเพื่อเริ่มปรุงจานนี้'
                    }
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black border active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none transition-all duration-75 cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      isItemServed
                        ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 active:ring-2 active:ring-slate-300'
                        : isItemReady
                        ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs ring-2 ring-emerald-400/50'
                        : isItemCooking
                        ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-xs ring-2 ring-amber-400/50'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 active:ring-2 active:ring-slate-300'
                    }`}
                  >
                    {isItemServed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เสิร์ฟแล้ว</span>
                      </>
                    ) : isItemReady ? (
                      <>
                        <BellRing className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>พร้อมเสิร์ฟ</span>
                      </>
                    ) : isItemCooking ? (
                      <>
                        <Flame className="w-3.5 h-3.5 text-white animate-pulse" />
                        <span>กำลังปรุง</span>
                      </>
                    ) : (
                      <span>รอทำ</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Bulk Ticket Actions Footer */}
      {(onOpenServeModal || onUpdateOrderStatus) && (
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          {allReadyOrServed ? (
            <button
              type="button"
              data-sound="success"
              onClick={() => onOpenServeModal?.(order)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ring-2 ring-emerald-400/40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>เสิร์ฟครบทุกจาน (เคลียร์บิล)</span>
            </button>
          ) : hasCooking && !hasPending ? (
            <button
              type="button"
              data-sound="success"
              onClick={() => onUpdateOrderStatus?.(order.id, 'READY')}
              className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ring-2 ring-teal-400/40"
            >
              <BellRing className="w-4 h-4" />
              <span>ปรุงเสร็จทั้งหมด (พร้อมเสิร์ฟ)</span>
            </button>
          ) : hasPending ? (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                data-sound="pop"
                onClick={() => onUpdateOrderStatus?.(order.id, 'COOKING')}
                className="flex-1 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ring-2 ring-amber-400/40"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>เริ่มทำทั้งหมด</span>
              </button>
              <button
                type="button"
                data-sound="success"
                onClick={() => onOpenServeModal?.(order)}
                title="ยืนยันเสิร์ฟทันที"
                className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span>เสิร์ฟทั้งบิล</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-sound="success"
              onClick={() => onOpenServeModal?.(order)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ยืนยันเสิร์ฟบิลนี้</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
