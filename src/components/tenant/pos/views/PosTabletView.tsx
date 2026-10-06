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
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { PosTerminalController } from '../usePosTerminalController';

export default function PosTabletView({
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
    <div className="w-full px-4 py-4 pb-28 space-y-4">
      {/* 🔊 Tablet Audio Notice */}
      {!isAudioUnlocked && voiceEnabled && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3 flex items-center justify-between shadow-md">
          <div
            onClick={unlockAudio}
            className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
              🔊
            </div>
            <div className="min-w-0 truncate">
              <h4 className="text-xs sm:text-sm font-black truncate">แตะตรงนี้ 1 ครั้ง เพื่อเปิดระบบเสียงอ่านแจ้งเตือนเงินเข้า</h4>
              <p className="text-[11px] text-white/90 truncate">
                เบราว์เซอร์ต้องการให้สัมผัสหน้าจอ 1 ครั้ง เพื่อเริ่มระบบเสียงพูดภาษาไทยอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={unlockAudio}
            className="ml-3 px-3 py-1.5 text-xs rounded-xl bg-white text-orange-700 font-black shadow-xs flex-shrink-0 active:scale-95"
          >
            เปิดเสียง ⚡
          </button>
        </div>
      )}

      {/* Tablet Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <h1 className="font-black text-slate-900 text-xl tracking-tight">
              ผังโต๊ะ &amp; POS (แท็บเล็ต)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-700">
              {tables.length} โต๊ะ
            </span>
          </div>

          <div className="text-xs text-slate-500">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • ทานอยู่{' '}
            <span className="text-orange-600 font-bold">{totalOccupied}</span> • ว่าง{' '}
            <span className="text-emerald-600 font-bold">{totalAvailable}</span>
          </div>
        </div>

        {/* Filter Pills & Tablet Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'OCCUPIED', label: `กำลังทาน (${totalOccupied})`, activeClass: 'bg-orange-500 text-white shadow-xs' },
              { id: 'AVAILABLE', label: `ว่าง (${totalAvailable})`, activeClass: 'bg-emerald-500 text-white shadow-xs' },
              { id: 'DELIVERY', label: `🛵 เดลิเวอรี (${deliveryOrders.length})`, activeClass: 'bg-emerald-700 text-white shadow-xs font-black' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all active:scale-95 whitespace-nowrap ${
                  statusFilter === f.id
                    ? f.activeClass || 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={toggleVoice}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 active:scale-90 transition-all ${
                voiceEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
              <span>{voiceEnabled ? 'เสียงเงินเข้า' : 'ปิดเสียง'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDeliveryModal('LINEMAN')}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs flex items-center space-x-1.5 active:scale-90"
            >
              <span>🛵</span>
              <span>เดลิเวอรี</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddTableModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xs flex items-center space-x-1.5 active:scale-90"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มโต๊ะ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Hub View (Tablet: 2 Columns) */}
      {statusFilter === 'DELIVERY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>🛵 รายการออเดอร์เดลิเวอรี</span>
              <span className="text-xs font-bold text-slate-500">({deliveryOrders.length} ออเดอร์)</span>
            </h2>
            <div className="flex items-center gap-2">
              {deliveryOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDeliveries}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95"
                >
                  🧹 เคลียร์ทั้งหมด
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenDeliveryModal('LINEMAN')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold active:scale-95"
              >
                + คีย์ออเดอร์
              </button>
            </div>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2.5 shadow-xs">
              <div className="text-4xl">🛵</div>
              <h3 className="text-base font-black text-slate-900">ไม่มีออเดอร์เดลิเวอรีค้างอยู่</h3>
              <p className="text-xs text-slate-400">ออเดอร์จาก LINE MAN, GrabFood จะแสดงที่นี่</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {deliveryOrders.map((order) => {
                const isLineman = order.orderChannel === 'LINEMAN';
                const isGrab = order.orderChannel === 'GRAB';
                const isShopee = order.orderChannel === 'SHOPEE_FOOD';
                const isPending = order.status === 'PENDING';
                const isCooking = order.status === 'COOKING';
                const isReady = order.status === 'READY';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    <div
                      className={`p-3 text-white flex items-center justify-between ${
                        isLineman
                          ? 'bg-[#06C755]'
                          : isGrab
                          ? 'bg-[#00B14F]'
                          : isShopee
                          ? 'bg-[#EE4D2D]'
                          : 'bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black">
                          #{order.deliveryOrderId || order.id.slice(-4)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-black/20 font-bold">
                          {isLineman ? 'LINE MAN' : isGrab ? 'Grab' : isShopee ? 'Shopee' : 'เดลิเวอรี'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white/90">
                        {formatTime(order.createdAt)} น.
                      </span>
                    </div>

                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {order.riderName && (
                          <div className="text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="font-bold truncate">👤 {order.riderName}</span>
                            {order.riderPhone && (
                              <a href={`tel:${order.riderPhone}`} className="text-emerald-600 font-bold text-xs">
                                📞 {order.riderPhone}
                              </a>
                            )}
                          </div>
                        )}

                        <div className="space-y-1 divide-y divide-slate-100 text-xs">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="pt-1 flex justify-between text-slate-700">
                              <span className="truncate">{item.quantity}x {item.menuItem?.name || item.name}</span>
                              <span className="font-bold shrink-0 ml-1">฿{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
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

      {/* Tables Grid (Tablet: 3 Columns) */}
      {statusFilter !== 'DELIVERY' && (
        <div className="grid grid-cols-3 gap-3.5 w-full">
          {filteredTables.map((table) => {
            const isOccupied = table.status === 'OCCUPIED' || table.activeOrdersCount > 0;
            const isSelected = selectedTable?.id === table.id || selectedTable?.tableNo === table.tableNo;
            const tableKey = String(table.tableNo || table.id);

            return (
              <div
                key={tableKey}
                onClick={() => setSelectedTable(table)}
                className={`p-3.5 rounded-2xl border transition-all duration-75 active:scale-[0.98] select-none flex flex-col justify-between min-h-[125px] relative ${
                  isSelected
                    ? 'ring-3 ring-orange-500/40 border-orange-500 bg-white shadow-md'
                    : isOccupied
                    ? 'bg-gradient-to-br from-white to-orange-50/40 border-orange-200/90 shadow-2xs'
                    : 'bg-white border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Header: Table No & Tag */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base ${
                      isOccupied ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {table.tableNo || table.id}
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900 block truncate">
                        {table.name}
                      </span>
                      <span className={`text-[11px] font-bold ${isOccupied ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {isOccupied ? `${table.totalItems || 0} รายการ` : 'โต๊ะว่าง'}
                      </span>
                    </div>
                  </div>

                  {table.hasPendingSlip && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      <Camera className="w-3 h-3" />
                      <span>สลิปเข้า</span>
                    </span>
                  )}
                </div>

                {/* Service Call Alert Badge */}
                {activeServiceCalls[tableKey] && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcknowledgeServiceCall(tableKey);
                    }}
                    className="mt-2 p-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center justify-between gap-1 animate-pulse"
                  >
                    <span className="truncate">🔔 เรียก: {activeServiceCalls[tableKey].requestType}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-amber-900 font-black">รับทราบ ✓</span>
                  </div>
                )}

                {/* Bottom Row Action */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  {isOccupied ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400">ยอดรอชำระ</span>
                        <span className="text-xs font-black text-slate-900">฿{(table.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCheckoutForTable(table);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1 active:scale-95 shadow-2xs ${
                          table.hasPendingSlip
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                        }`}
                      >
                        {table.hasPendingSlip ? <Camera className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        <span>เช็คบิล</span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-orange-600 text-xs font-bold">
                      <span>พร้อมให้บริการ</span>
                      <span>สั่งอาหาร →</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Table Drawer (Tablet: Fixed at bottom) */}
      {selectedTable && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl border-t border-slate-800 animate-in slide-in-from-bottom duration-150">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                {selectedTable.tableNo || selectedTable.id}
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black truncate">{selectedTable.name}</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-orange-400 border border-slate-700">
                    {selectedTable.status === 'OCCUPIED' ? 'กำลังทาน' : 'โต๊ะว่าง'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {selectedTable.activeOrdersCount > 0
                    ? `${selectedTable.totalItems} รายการ • รวม ฿${(selectedTable.totalAmount || 0).toLocaleString()}`
                    : 'ยังไม่มีออเดอร์'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCashierOrderOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-orange-500 text-white font-black text-xs active:scale-90 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ สั่งอาหาร</span>
              </button>

              {selectedTable.activeOrdersCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsMoveModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 active:scale-90 flex items-center space-x-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้าย</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintBillForTable(selectedTable)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-amber-300 font-bold text-xs border border-amber-500/40 active:scale-90 flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์บิล</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCheckoutForTable(selectedTable)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs active:scale-90 flex items-center space-x-1.5 shadow-sm"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>เช็คบิล ฿{(selectedTable.totalAmount || 0).toLocaleString()}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
