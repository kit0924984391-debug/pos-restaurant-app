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

export default function PosDesktopView({
  controller,
}: {
  controller: PosTerminalController;
}) {
  const {
    slug,
    isSplitView,
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
    <div className={`flex-1 max-w-[1440px] w-full mx-auto px-6 lg:px-8 py-5 pb-20 space-y-5 ${isSplitView ? 'px-3 py-3 space-y-3' : ''}`}>
      {/* 🔊 Desktop Audio Unlock Banner */}
      {!isAudioUnlocked && voiceEnabled && (
        <div
          className={`rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-md shadow-orange-500/20 transition-all ${
            isSplitView ? 'p-2.5' : 'p-4'
          }`}
        >
          <div
            onClick={unlockAudio}
            className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer hover:brightness-105"
          >
            <div className={`${isSplitView ? 'w-8 h-8 text-base rounded-lg' : 'w-10 h-10 text-xl rounded-xl'} bg-white/20 flex items-center justify-center flex-shrink-0`}>
              🔊
            </div>
            <div className="min-w-0 truncate">
              <h4 className={`${isSplitView ? 'text-xs' : 'text-sm'} font-black truncate`}>
                คลิกตรงนี้ 1 ครั้ง เพื่อเปิดระบบเสียงเตือนเงินเข้าภาษาไทย
              </h4>
              {!isSplitView && (
                <p className="text-xs text-white/90 truncate">
                  เบราว์เซอร์ต้องการให้สัมผัสหน้าจอ 1 ครั้ง เพื่อปลดล็อกให้ระบบส่งเสียงพูดภาษาไทยอัตโนมัติเมื่อมีเงินเข้า
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
            <button
              type="button"
              onClick={unlockAudio}
              className={`${isSplitView ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-xs'} rounded-xl bg-white text-orange-700 font-black shadow-sm cursor-pointer hover:bg-orange-50 active:scale-95`}
            >
              เปิดเสียง ⚡
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                unlockAudio();
              }}
              className="p-1.5 rounded-lg bg-black/10 hover:bg-black/25 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="ปิดการแจ้งเตือนนี้"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Table Filters (PC Widescreen Layout) */}
      <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs w-full transition-all ${
        isSplitView ? 'p-3 flex flex-col gap-2' : 'p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-3">
            <h1 className={`font-black text-slate-900 tracking-tight ${isSplitView ? 'text-lg' : 'text-2xl'}`}>
              ผังโต๊ะ &amp; POS
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-700">
              {tables.length} โต๊ะ
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • กำลังทาน{' '}
            <span className="text-orange-600 font-bold">{totalOccupied}</span> • ว่าง{' '}
            <span className="text-emerald-600 font-bold">{totalAvailable}</span>
          </div>
        </div>

        {/* Filter Pills & PC Action Buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'OCCUPIED', label: `กำลังทาน (${totalOccupied})`, activeClass: 'bg-orange-500 text-white shadow-sm' },
              { id: 'AVAILABLE', label: `ว่าง (${totalAvailable})`, activeClass: 'bg-emerald-500 text-white shadow-sm' },
              { id: 'DELIVERY', label: `🛵 เดลิเวอรี (${deliveryOrders.length})`, activeClass: 'bg-emerald-700 text-white shadow-sm font-black' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                data-sound="tap"
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all duration-75 active:scale-95 whitespace-nowrap cursor-pointer select-none ${
                  statusFilter === f.id
                    ? f.activeClass || 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              type="button"
              data-sound="pop"
              onClick={toggleVoice}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center justify-center space-x-2 transition-all duration-75 whitespace-nowrap active:scale-95 cursor-pointer ${
                voiceEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
              title={voiceEnabled ? 'คลิกเพื่อปิดเสียงพูดเงินเข้า' : 'คลิกเพื่อเปิดเสียงพูดเงินเข้า'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
              <span className={isSplitView ? 'hidden' : 'inline'}>{voiceEnabled ? 'เสียงเงินเข้า' : 'ปิดเสียง'}</span>
            </button>

            <button
              onClick={() => handleOpenDeliveryModal('LINEMAN')}
              data-sound="pop"
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs flex items-center space-x-1.5 transition-all duration-75 whitespace-nowrap cursor-pointer active:scale-95 select-none"
              title="รับออเดอร์เดลิเวอรี"
            >
              <span className="text-xs">🛵</span>
              <span>เดลิเวอรี</span>
            </button>

            <button
              onClick={() => setIsAddTableModalOpen(true)}
              data-sound="pop"
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:from-orange-700 text-white shadow-2xs flex items-center space-x-1.5 transition-all duration-75 whitespace-nowrap active:scale-95 cursor-pointer select-none"
              title="เพิ่มโต๊ะใหม่"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>เพิ่มโต๊ะ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Hub View (PC: 3 Columns) */}
      {statusFilter === 'DELIVERY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🛵 รายการออเดอร์เดลิเวอรีที่กำลังดำเนินการ</span>
              <span className="text-xs font-bold text-slate-500">({deliveryOrders.length} ออเดอร์)</span>
            </h2>
            <div className="flex items-center gap-2">
              {deliveryOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDeliveries}
                  data-sound="pop"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer active:scale-95 select-none flex items-center space-x-1"
                >
                  <span>🧹 เคลียร์ทั้งหมด ({deliveryOrders.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenDeliveryModal('LINEMAN')}
                data-sound="pop"
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 shadow-sm cursor-pointer active:scale-95 select-none"
              >
                + คีย์ออเดอร์ LINE MAN / Grab
              </button>
            </div>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                🛵
              </div>
              <h3 className="text-base font-black text-slate-900">ไม่มีออเดอร์เดลิเวอรีค้างอยู่ 🎉</h3>
              <p className="text-xs text-slate-400">
                เมื่อมีออเดอร์เข้ามาจาก LINE MAN, GrabFood หรือคีย์หน้าร้าน จะแสดงที่นี่ทันที
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${isSplitView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    <div
                      className={`p-4 text-white ${
                        isLineman
                          ? 'bg-[#06C755]'
                          : isGrab
                          ? 'bg-[#00B14F]'
                          : isShopee
                          ? 'bg-[#EE4D2D]'
                          : 'bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-xs font-black text-xs">
                          <span className="text-sm">🛵</span>
                          <span>{isLineman ? 'LINE MAN' : isGrab ? 'GrabFood' : isShopee ? 'ShopeeFood' : 'เดลิเวอรี'}</span>
                        </div>
                        <span className="text-xs font-bold text-white/90 bg-black/15 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <span>🕒</span>
                          <span>{formatTime(order.createdAt)} น.</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xl font-black tracking-tight text-white drop-shadow-2xs">
                          #{order.deliveryOrderId || order.id.slice(-4)}
                        </span>
                        <div>
                          {isServed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-white/25 text-white border border-white/30 shadow-2xs">
                              <span>✨</span>
                              <span>เสิร์ฟแล้ว</span>
                            </span>
                          ) : isReady ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'COMPLETED')}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-amber-300 hover:bg-amber-400 text-amber-950 shadow-xs cursor-pointer active:scale-95"
                              title="คลิกเพื่อเคลียร์ออเดอร์เมื่อไรเดอร์รับอาหารแล้ว"
                            >
                              <span>🔔</span>
                              <span>พร้อมส่ง</span>
                            </button>
                          ) : isCooking ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'READY')}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-xs cursor-pointer active:scale-95"
                              title="คลิกเพื่อเปลี่ยนสถานะเป็นพร้อมส่ง"
                            >
                              <span>🍳</span>
                              <span>กำลังปรุง</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95"
                              title="คลิกเพื่อเริ่มปรุง"
                            >
                              <span>⏳</span>
                              <span>รอครัวทำ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {order.riderName && (
                          <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between gap-1">
                            <span className="font-bold truncate flex items-center gap-1.5">
                              <span>👤</span>
                              <span className="truncate">{order.riderName}</span>
                            </span>
                            {order.riderPhone && (
                              <a href={`tel:${order.riderPhone}`} className="text-emerald-600 font-bold hover:underline shrink-0 text-xs">
                                📞 {order.riderPhone}
                              </a>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5 divide-y divide-slate-100">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="pt-1.5 flex justify-between text-xs text-slate-700">
                              <span className="truncate">{item.quantity}x {item.menuItem?.name || item.name}</span>
                              <span className="font-bold shrink-0 ml-2">฿{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">ยอดรวม</span>
                        <span className="text-sm font-black text-slate-900">
                          ฿{(order.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'COMPLETED')}
                        className="w-full h-11 px-3 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <span>🛵</span>
                        <span>ไรเดอร์รับอาหารแล้ว (เคลียร์ออเดอร์)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tables Grid (PC: 4 to 6 Columns) */}
      {statusFilter !== 'DELIVERY' && (
        <div className={`grid gap-4 auto-rows-fr w-full ${
          isSplitView ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
        }`}>
          {filteredTables.map((table) => {
            const isOccupied = (table.activeOrdersCount > 0 || table.status === 'OCCUPIED' || table.status === 'PAYMENT_PENDING') && (table.activeOrdersCount > 0 || (table.totalAmount || 0) > 0);
            const isSelected = selectedTable?.id === table.id || selectedTable?.tableNo === table.tableNo;
            const tableKey = String(table.tableNo || table.id);

            return (
              <div
                key={tableKey}
                onClick={() => setSelectedTable(table)}
                data-sound="tap"
                className={`relative p-4 rounded-3xl border cursor-pointer transition-all duration-75 active:scale-[0.98] select-none flex flex-col justify-between group w-full min-h-[140px] ${
                  isSelected
                    ? 'ring-4 ring-orange-500/30 border-orange-500 shadow-xl bg-white scale-[1.01]'
                    : isOccupied
                    ? 'bg-gradient-to-br from-white to-orange-50/40 border-orange-200/90 shadow-xs hover:shadow-md hover:border-orange-400'
                    : 'bg-white border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                      isOccupied ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {table.tableNo || table.id}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-base font-black text-slate-900 block truncate">{table.name}</span>
                        {table.hasPendingSlip && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse flex-shrink-0">
                            <Camera className="w-2.5 h-2.5" />
                            <span>สลิปเข้า</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOccupied ? 'bg-orange-500 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className={`text-xs font-bold truncate ${isOccupied ? 'text-orange-700' : 'text-emerald-600'}`}>
                          {isOccupied ? `${table.totalItems || 0} รายการ` : 'โต๊ะว่าง'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Call Alert Badge if ringing */}
                {activeServiceCalls[tableKey] && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcknowledgeServiceCall(tableKey);
                    }}
                    data-sound="pop"
                    className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 text-xs font-bold flex items-center justify-between gap-1 animate-pulse hover:bg-amber-500/25 transition-all cursor-pointer shadow-xs"
                    title="คลิกเพื่อรับทราบคำขอ"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <BellRing className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-bounce" />
                      <span className="truncate">เรียก: {activeServiceCalls[tableKey].requestType}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-white font-black hover:bg-amber-600">
                      รับทราบ ✓
                    </span>
                  </div>
                )}

                {/* Bottom Row: Financial stats & Quick checkout */}
                <div className="flex items-center justify-between gap-1.5 pt-3 mt-3 border-t border-slate-100 w-full">
                  {isOccupied ? (
                    <>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">ยอดรอชำระ</span>
                        <span className="text-sm font-black text-slate-900 truncate">฿{(table.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        data-sound="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCheckoutForTable(table);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 ${
                          table.hasPendingSlip
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-400/50 animate-pulse'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                        }`}
                      >
                        {table.hasPendingSlip ? (
                          <>
                            <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>ตรวจสลิป</span>
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>เช็คบิล</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-slate-400 text-xs font-bold">
                      <span>พร้อมให้บริการ</span>
                      <span className="text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs font-black">
                        <span>สั่งอาหาร</span>
                        <span>→</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Table Drawer (PC: Fixed Bottom Panel) */}
      {selectedTable && (
        <div className={`z-40 bg-slate-900 text-white shadow-2xl border-t border-slate-800 backdrop-blur-xl bg-opacity-95 ${
          isSplitView ? 'sticky bottom-0 inset-x-0 p-3' : 'fixed inset-x-0 bottom-0 p-4'
        }`}>
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/30 flex-shrink-0">
                {selectedTable.tableNo || selectedTable.id}
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center space-x-2 truncate">
                  <h3 className="text-base font-black text-white truncate">{selectedTable.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-orange-400 border border-slate-700 flex-shrink-0">
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
                onClick={() => setIsCashierOrderOpen(true)}
                data-sound="pop"
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-sm flex items-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ สั่งอาหาร</span>
              </button>

              {selectedTable.activeOrdersCount > 0 && (
                <>
                  <button
                    onClick={() => setIsMoveModalOpen(true)}
                    data-sound="pop"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center space-x-1 active:scale-95 cursor-pointer"
                    title="ย้ายโต๊ะ"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้าย</span>
                  </button>

                  <button
                    onClick={() => handlePrintBillForTable(selectedTable)}
                    data-sound="pop"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center space-x-1 active:scale-95 cursor-pointer"
                    title="พิมพ์ใบแจ้งค่าอาหาร"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์บิล</span>
                  </button>

                  <button
                    onClick={() => handleOpenCheckoutForTable(selectedTable)}
                    data-sound="success"
                    className={`px-4 py-2 rounded-xl font-black text-xs shadow-md flex items-center space-x-1.5 active:scale-95 cursor-pointer ${
                      selectedTable.hasPendingSlip
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-400/50 animate-pulse'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    }`}
                  >
                    {selectedTable.hasPendingSlip ? (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>ตรวจสลิป ฿{(selectedTable.totalAmount || 0).toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>เช็คบิล ฿{(selectedTable.totalAmount || 0).toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedTable(null)}
                data-sound="pop"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white active:scale-95 cursor-pointer"
                title="ปิดแถบโต๊ะ"
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
