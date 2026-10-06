'use client';

import React from 'react';
import {
  ChefHat,
  CheckCircle2,
  Volume2,
  VolumeX,
  RefreshCw,
  Printer,
} from 'lucide-react';
import KitchenTicketPrintModal from '@/components/KitchenTicketPrintModal';
import ServeConfirmModal from '@/components/ServeConfirmModal';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import KitchenBatchBar from './kitchen/KitchenBatchBar';
import KitchenTicketCard from './kitchen/KitchenTicketCard';
import { offlineSyncEngine } from '@/lib/offlineSync';

export default function KitchenTerminal({
  slug = 'lung-pa',
  isSplitView = false,
}: {
  slug?: string;
  isSplitView?: boolean;
}) {
  const {
    loading,
    filterStatus,
    setFilterStatus,
    stationFilter,
    changeStationFilter,
    stationCounts,
    soundEnabled,
    setSoundEnabled,
    showBatchBar,
    setShowBatchBar,
    confirmingServeOrder,
    setConfirmingServeOrder,
    printingOrder,
    setPrintingOrder,
    fetchOrders,
    updateItemStatus,
    updateOrderStatus,
    confirmServeOrder,
    filteredOrders,
    pendingCount,
    cookingCount,
    readyCount,
    deliveryOrdersCount,
    batchCookingSummary,
    autoPrintEnabled,
    toggleAutoPrint,
    storeSettings,
  } = useKitchenOrders({ slug });

  const [offlineQueueCount, setOfflineQueueCount] = React.useState(0);
  const [isOfflineSyncing, setIsOfflineSyncing] = React.useState(false);

  React.useEffect(() => {
    return offlineSyncEngine.subscribe((count, syncing) => {
      setOfflineQueueCount(count);
      setIsOfflineSyncing(syncing);
    });
  }, []);

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-3.5 sm:space-y-6">
      {/* Top Controls & Status Bar */}
      <div
        className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm w-full transition-all ${
          isSplitView
            ? 'p-2.5 sm:p-3 flex flex-col gap-2'
            : 'p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center space-x-2">
            <h1
              className={`font-black text-slate-900 tracking-tight flex items-center gap-1.5 ${
                isSplitView ? 'text-base' : 'text-xl sm:text-2xl'
              }`}
            >
              <ChefHat className={`text-amber-500 ${isSplitView ? 'w-5 h-5' : 'w-6 h-6'}`} />
              <span>ห้องครัว KDS</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-100 text-amber-900">
              {pendingCount + cookingCount + readyCount} บิลค้าง
            </span>
            {offlineQueueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-sky-100 text-sky-800 flex items-center gap-1 animate-pulse">
                <span>💾 {offlineQueueCount} รอซิงค์</span>
                {isOfflineSyncing && <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-600" />}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto Print Toggle */}
            <button
              type="button"
              data-sound="tap"
              onClick={() => toggleAutoPrint()}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all duration-75 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none cursor-pointer ${
                autoPrintEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs ring-1 ring-emerald-300'
                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
              }`}
              title={
                autoPrintEnabled
                  ? 'พิมพ์ออเดอร์อัตโนมัติ: เปิดอยู่ (คลิกเพื่อปิด)'
                  : 'พิมพ์ออเดอร์อัตโนมัติ: ปิดอยู่ (คลิกเพื่อเปิด)'
              }
            >
              <Printer className={`w-4 h-4 ${autoPrintEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[11px] font-extrabold">
                {autoPrintEnabled ? 'พิมพ์อัตโนมัติ: เปิด' : 'พิมพ์อัตโนมัติ: ปิด'}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              data-sound="tap"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pos_voice_enabled', next ? 'true' : 'false');
                  localStorage.setItem('pos_audio_unlocked', 'true');
                  window.dispatchEvent(new CustomEvent('pos-voice-changed', { detail: { enabled: next } }));
                }
              }}
              className={`p-1.5 rounded-xl border text-xs font-bold flex items-center transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs ring-1 ring-amber-300'
                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'ปิดเสียงกระดิ่ง' : 'เปิดเสียงกระดิ่ง'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Refresh */}
            <button
              type="button"
              data-sound="pop"
              onClick={fetchOrders}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none cursor-pointer"
              title="รีเฟรชออเดอร์"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: 'ACTIVE', label: `ทั้งหมด (${pendingCount + cookingCount + readyCount})` },
            { id: 'PENDING', label: `รอทำ (${pendingCount})`, color: 'bg-rose-500 text-white' },
            { id: 'COOKING', label: `กำลังปรุง (${cookingCount})`, color: 'bg-amber-500 text-white' },
            { id: 'READY', label: `เสร็จ (${readyCount})`, color: 'bg-emerald-500 text-white' },
            {
              id: 'DELIVERY',
              label: `🛵 เดลิเวอรี (${deliveryOrdersCount})`,
              color: 'bg-emerald-700 text-white font-black',
            },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              data-sound="pop"
              onClick={() => setFilterStatus(f.id)}
              className={`py-1.5 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black transition-all duration-75 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none text-center whitespace-nowrap cursor-pointer ${
                filterStatus === f.id
                  ? f.color || 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* KDS Station Routing Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 border-t border-slate-100 flex-wrap sm:flex-nowrap">
          <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-wider pl-1">
            สเตชั่นครัว:
          </span>
          {[
            { id: 'ALL', label: '🍳 ทุกสเตชั่น', count: null },
            { id: 'WOK', label: '🔥 ผัด / ทอด', count: stationCounts.wok },
            { id: 'SOUP', label: '🍲 ต้ม / แกง / ยำ', count: stationCounts.soup },
            { id: 'BEVERAGE', label: '🥤 เครื่องดื่ม', count: stationCounts.beverage },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              data-sound="pop"
              onClick={() => changeStationFilter(st.id as any)}
              className={`py-1 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-extrabold transition-all duration-75 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                stationFilter === st.id
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/40'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{st.label}</span>
              {st.count !== null && st.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    stationFilter === st.id ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {st.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Cooking Aggregator Banner */}
      <KitchenBatchBar
        batchCookingSummary={batchCookingSummary}
        showBatchBar={showBatchBar}
        setShowBatchBar={setShowBatchBar}
        isSplitView={isSplitView}
      />

      {/* Orders Ticket Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">ไม่มีออเดอร์ค้างในครัว 🎉</h3>
          <p className="text-xs text-slate-400">
            ออเดอร์ใหม่จากลูกค้า แคชเชียร์ หรือ LINE MAN / Grab จะปรากฏที่นี่ทันทีแบบเรียลไทม์
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:gap-5 ${
            isSplitView
              ? 'grid-cols-1 xl:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}
        >
          {filteredOrders.map((order) => (
            <KitchenTicketCard
              key={order.id}
              order={order}
              onUpdateItemStatus={updateItemStatus}
              onOpenPrintModal={(ord) => setPrintingOrder(ord)}
              onOpenServeModal={(ord) => setConfirmingServeOrder(ord)}
              onUpdateOrderStatus={updateOrderStatus}
            />
          ))}
        </div>
      )}

      {/* Modal ยืนยันการเสิร์ฟอาหาร */}
      <ServeConfirmModal
        isOpen={!!confirmingServeOrder}
        onClose={() => setConfirmingServeOrder(null)}
        order={confirmingServeOrder}
        onConfirm={() => confirmingServeOrder && confirmServeOrder(confirmingServeOrder.id)}
      />

      {/* Modal พิมพ์ใบสั่งอาหารห้องครัว (KOT) */}
      <KitchenTicketPrintModal
        isOpen={!!printingOrder}
        onClose={() => setPrintingOrder(null)}
        order={printingOrder}
        store={storeSettings}
      />
    </div>
  );
}
