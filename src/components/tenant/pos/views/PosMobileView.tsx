'use client';

import React from 'react';
import {
  Banknote,
  Camera,
  ArrowRightLeft,
  Plus,
  X,
  Printer,
  Volume2,
  VolumeX,
  BellRing,
  ShoppingBag,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { PosTerminalController } from '../usePosTerminalController';

export default function PosMobileView({
  controller,
}: {
  controller: PosTerminalController;
}) {
  const {
    slug,
    tables,
    store,
    statusFilter,
    setStatusFilter,
    deliveryOrders,
    selectedTable,
    setSelectedTable,
    setIsCashierOrderOpen,
    setIsMoveModalOpen,
    setIsAddTableModalOpen,
    activeServiceCalls,
    voiceEnabled,
    isAudioUnlocked,
    unlockAudio,
    toggleVoice,
    filteredTables,
    totalOccupied,
    totalAvailable,
    handleOpenDeliveryModal,
    handleUpdateDeliveryStatus,
    handleClearAllDeliveries,
    handleOpenCheckoutForTable,
    handlePrintBillForTable,
    handleAcknowledgeServiceCall,
  } = controller;

  return (
    <div className="w-full px-2.5 py-2.5 pb-32 space-y-3">
      {/* 🔊 Mobile Audio Unlock Notice */}
      {!isAudioUnlocked && voiceEnabled && (
        <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white p-2.5 flex items-center justify-between shadow-md">
          <div
            onClick={unlockAudio}
            className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-base flex-shrink-0">
              🔊
            </div>
            <div className="min-w-0 truncate">
              <h4 className="text-xs font-black truncate">แตะ 1 ครั้งเพื่อเปิดเสียงพูดเงินเข้า</h4>
              <p className="text-[10px] text-white/90 truncate">
                เพื่อให้ระบบอ่านเสียงเงินเข้าภาษาไทยอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={unlockAudio}
            className="ml-2 px-2.5 py-1 text-[11px] rounded-lg bg-white text-orange-700 font-black shadow-xs flex-shrink-0 active:scale-95"
          >
            เปิดเสียง
          </button>
        </div>
      )}

      {/* Mobile Top Header: Store Info & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <h1 className="font-black text-slate-900 text-base tracking-tight truncate">
              ผังโต๊ะ
            </h1>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 flex-shrink-0">
              {tables.length} โต๊ะ
            </span>
          </div>

          {/* Quick Header Buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              type="button"
              onClick={toggleVoice}
              className={`p-1.5 rounded-lg border flex items-center justify-center active:scale-90 transition-all ${
                voiceEnabled
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title={voiceEnabled ? 'เสียงเปิด' : 'เสียงปิด'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleOpenDeliveryModal('LINEMAN')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center space-x-1 active:scale-90 shadow-2xs"
            >
              <span>🛵</span>
              <span>เดลิเวอรี</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddTableModalOpen(true)}
              className="p-1.5 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center active:scale-90 shadow-2xs"
              title="เพิ่มโต๊ะ"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Counts */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
          <span className="truncate">
            ทานอยู่: <b className="text-orange-600 font-extrabold">{totalOccupied}</b> • ว่าง:{' '}
            <b className="text-emerald-600 font-extrabold">{totalAvailable}</b>
          </span>
          <span className="text-[10px] text-slate-400 truncate">
            {store?.storeName || store?.name || slug}
          </span>
        </div>

        {/* Filter Pills (Thumb-friendly horizontal swipe) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'OCCUPIED', label: `กำลังทาน (${totalOccupied})`, activeClass: 'bg-orange-500 text-white' },
            { id: 'AVAILABLE', label: `ว่าง (${totalAvailable})`, activeClass: 'bg-emerald-500 text-white' },
            { id: 'DELIVERY', label: `🛵 เดลิเวอรี (${deliveryOrders.length})`, activeClass: 'bg-emerald-700 text-white' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`py-1.5 px-3 rounded-xl text-xs font-black whitespace-nowrap active:scale-95 transition-all select-none ${
                statusFilter === f.id
                  ? f.activeClass || 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 active:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Hub View (Mobile: Stacked 1 Column) */}
      {statusFilter === 'DELIVERY' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-slate-900">
              🛵 ออเดอร์เดลิเวอรี ({deliveryOrders.length})
            </h2>
            {deliveryOrders.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllDeliveries}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] active:scale-95"
              >
                เคลียร์ทั้งหมด
              </button>
            )}
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-xs">
              <div className="text-3xl">🛵</div>
              <h3 className="text-sm font-black text-slate-900">ไม่มีออเดอร์เดลิเวอรีค้างอยู่</h3>
              <p className="text-[11px] text-slate-400">ออเดอร์จาก LINE MAN, GrabFood จะขึ้นที่นี่</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {deliveryOrders.map((order) => {
                const isLineman = order.orderChannel === 'LINEMAN';
                const isGrab = order.orderChannel === 'GRAB';
                const isShopee = order.orderChannel === 'SHOPEE_FOOD';
                const isPending = order.status === 'PENDING';
                const isCooking = order.status === 'COOKING';
                const isReady = order.status === 'READY';
                const isServed = order.status === 'SERVED';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    <div
                      className={`px-3 py-2 text-white flex items-center justify-between ${
                        isLineman
                          ? 'bg-[#06C755]'
                          : isGrab
                          ? 'bg-[#00B14F]'
                          : isShopee
                          ? 'bg-[#EE4D2D]'
                          : 'bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black">
                          #{order.deliveryOrderId || order.id.slice(-4)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 font-bold">
                          {isLineman ? 'LINE MAN' : isGrab ? 'Grab' : isShopee ? 'Shopee' : 'เดลิเวอรี'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-white/90">
                        {formatTime(order.createdAt)} น.
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      {order.riderName && (
                        <div className="text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span className="font-bold truncate">👤 {order.riderName}</span>
                          {order.riderPhone && (
                            <a href={`tel:${order.riderPhone}`} className="text-emerald-600 font-bold text-[10px]">
                              📞 โทร
                            </a>
                          )}
                        </div>
                      )}

                      <div className="text-xs space-y-1">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-slate-700">
                            <span className="truncate">{item.quantity}x {item.menuItem?.name || item.name}</span>
                            <span className="font-bold shrink-0 ml-1">฿{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Status Buttons */}
                      <div className="pt-1 flex gap-1.5">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                            className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-black text-xs active:scale-95"
                          >
                            🍳 เริ่มปรุง
                          </button>
                        )}
                        {isCooking && (
                          <button
                            type="button"
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'READY')}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs active:scale-95"
                          >
                            🔔 พร้อมส่ง
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateDeliveryStatus(order.id, 'COMPLETED')}
                          className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-black text-xs active:scale-95"
                        >
                          🛵 ไรเดอร์รับแล้ว
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tables Grid (Mobile: 2 Columns Compact) */}
      {statusFilter !== 'DELIVERY' && (
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {filteredTables.map((table) => {
            const isOccupied = table.status === 'OCCUPIED' || table.activeOrdersCount > 0;
            const isSelected = selectedTable?.id === table.id || selectedTable?.tableNo === table.tableNo;
            const tableKey = String(table.tableNo || table.id);

            return (
              <div
                key={tableKey}
                onClick={() => setSelectedTable(table)}
                className={`p-2.5 rounded-2xl border transition-all duration-75 active:scale-[0.98] select-none flex flex-col justify-between min-h-[105px] relative ${
                  isSelected
                    ? 'ring-3 ring-orange-500/40 border-orange-500 bg-white shadow-md'
                    : isOccupied
                    ? 'bg-gradient-to-br from-white to-orange-50/50 border-orange-200/90 shadow-2xs'
                    : 'bg-white border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Top Row: Table No & Status */}
                <div className="flex items-center justify-between gap-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    isOccupied ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {table.tableNo || table.id}
                  </div>

                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isOccupied ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {isOccupied ? `${table.totalItems || 0} จาน` : 'ว่าง'}
                  </span>
                </div>

                {/* Table Name */}
                <div className="mt-1">
                  <span className="text-xs font-black text-slate-900 block truncate leading-tight">
                    {table.name}
                  </span>

                  {table.hasPendingSlip && (
                    <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white animate-pulse">
                      <Camera className="w-2.5 h-2.5" />
                      <span>สลิปเข้า</span>
                    </span>
                  )}
                </div>

                {/* Service Call Alert Badge if ringing */}
                {activeServiceCalls[tableKey] && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcknowledgeServiceCall(tableKey);
                    }}
                    className="mt-1.5 p-1 rounded-lg bg-amber-500 text-white text-[10px] font-black flex items-center justify-between gap-1 animate-pulse"
                  >
                    <span className="truncate">🔔 {activeServiceCalls[tableKey].requestType}</span>
                    <span className="text-[9px] bg-white text-amber-900 px-1 rounded">✓</span>
                  </div>
                )}

                {/* Bottom Row Action Button */}
                <div className="mt-2 pt-1.5 border-t border-slate-100/90 flex items-center justify-between">
                  {isOccupied ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCheckoutForTable(table);
                      }}
                      className={`w-full py-1 px-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 shadow-2xs ${
                        table.hasPendingSlip
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                      }`}
                    >
                      {table.hasPendingSlip ? <Camera className="w-2.5 h-2.5" /> : <Banknote className="w-2.5 h-2.5" />}
                      <span>฿{(table.totalAmount || 0).toLocaleString()}</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between text-orange-600 text-[11px] font-bold">
                      <span>สั่งอาหาร</span>
                      <span>→</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Table Drawer (Mobile: Fixed above bottom navigation at bottom-16) */}
      {selectedTable && (
        <div className="fixed inset-x-0 bottom-16 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 shadow-2xl border-t border-slate-800 animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {selectedTable.tableNo || selectedTable.id}
              </div>
              <div className="min-w-0 truncate">
                <h3 className="text-xs font-black truncate">{selectedTable.name}</h3>
                <p className="text-[10px] text-slate-400 truncate">
                  {selectedTable.activeOrdersCount > 0
                    ? `${selectedTable.totalItems} รายการ • ฿${(selectedTable.totalAmount || 0).toLocaleString()}`
                    : 'ยังไม่มีออเดอร์'}
                </p>
              </div>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCashierOrderOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500 text-white font-black text-xs active:scale-90 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>สั่ง</span>
              </button>

              {selectedTable.activeOrdersCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePrintBillForTable(selectedTable)}
                    className="p-1.5 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 active:scale-90"
                    title="พิมพ์บิล"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCheckoutForTable(selectedTable)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs active:scale-90 flex items-center space-x-1 shadow-sm"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>เช็คบิล</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
