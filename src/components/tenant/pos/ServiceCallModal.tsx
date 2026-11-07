'use client';

import React, { useMemo } from 'react';
import { BellRing, X, Volume2, Clock, Receipt, CheckCircle2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { playServiceCallChime, playSuccessChime, speakServiceCall } from '@/lib/sound';
import { useToast } from '@/context/ToastContext';

export interface ServiceCallItem {
  id: string;
  tableNo: number;
  tableName: string;
  requestType: string;
  note?: string;
  timestamp: number;
}

export type ServiceCallAlertMode = 'BOTH' | 'VOICE_ONLY' | 'CHIME_ONLY' | 'MUTE';

export interface ServiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  serviceCallQueue: ServiceCallItem[];
  activeServiceCallIndex: number;
  setActiveServiceCallIndex: React.Dispatch<React.SetStateAction<number>>;
  dismissServiceCall: (id: string) => void;
  dismissAllServiceCalls: () => void;
  tables: any[];
  onOpenCheckoutForTable: (table: any) => void;
  serviceCallAlertMode: ServiceCallAlertMode;
  updateServiceCallAlertMode: (mode: ServiceCallAlertMode) => void;
}

export default function ServiceCallModal({
  isOpen,
  onClose,
  onOpen,
  serviceCallQueue,
  activeServiceCallIndex,
  setActiveServiceCallIndex,
  dismissServiceCall,
  dismissAllServiceCalls,
  tables,
  onOpenCheckoutForTable,
  serviceCallAlertMode,
  updateServiceCallAlertMode,
}: ServiceCallModalProps) {
  const { showSuccess } = useToast();

  const currentServiceCall = useMemo(() => {
    if (serviceCallQueue.length === 0) return null;
    return serviceCallQueue[activeServiceCallIndex] || serviceCallQueue[0];
  }, [serviceCallQueue, activeServiceCallIndex]);

  return (
    <>
      {isOpen && currentServiceCall && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-amber-500/60 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                    <BellRing className="w-6 h-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-100 block">
                      ลูกค้ากดเรียกพนักงาน 🔔
                    </span>
                    <h3 className="text-xl font-black leading-tight">
                      {currentServiceCall.tableName || `โต๊ะ ${currentServiceCall.tableNo}`}
                    </h3>
                  </div>
                </div>

                {/* Queue count indicator */}
                <div className="flex items-center space-x-1.5">
                  {serviceCallQueue.length > 1 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/25 border border-white/40 text-white shadow-sm">
                      {activeServiceCallIndex + 1} / {serviceCallQueue.length} โต๊ะ
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    data-sound="pop"
                    className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-all duration-75 active:scale-90 cursor-pointer select-none"
                    title="ปิดหน้าต่างชั่วคราว"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Highlight Service Request Box */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <span>สิ่งที่ลูกค้าต้องการ:</span>
                  </span>
                  <div className="text-lg font-black text-slate-900 leading-snug break-words">
                    {currentServiceCall.requestType}
                  </div>
                  {currentServiceCall.note && (
                    <div className="text-xs font-semibold text-slate-600 bg-white/90 p-2 rounded-xl border border-amber-200/80 mt-1">
                      💬 "{currentServiceCall.note}"
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() =>
                    speakServiceCall(
                      currentServiceCall.tableNo,
                      currentServiceCall.requestType,
                      currentServiceCall.note,
                      1.15
                    )
                  }
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer transition-all duration-75 active:scale-90 select-none flex-shrink-0"
                  title="ฟังเสียงพูดซ้ำ"
                >
                  <Volume2 className="w-4 h-4 text-amber-700" />
                  <span>ฟังเสียง</span>
                </button>
              </div>

              {/* Timing info */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>เวลาที่เรียก: {formatTime(new Date(currentServiceCall.timestamp).toISOString())}</span>
                </span>
                <span className="text-[11px] text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-md">
                  กำลังรอพนักงานไปบริการ
                </span>
              </div>

              {/* Navigation buttons if multiple calls */}
              {serviceCallQueue.length > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={activeServiceCallIndex <= 0}
                    data-sound="tap"
                    onClick={() => setActiveServiceCallIndex((i) => Math.max(0, i - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    ← ดูโต๊ะก่อนหน้า
                  </button>
                  <button
                    type="button"
                    disabled={activeServiceCallIndex >= serviceCallQueue.length - 1}
                    data-sound="tap"
                    onClick={() =>
                      setActiveServiceCallIndex((i) => Math.min(serviceCallQueue.length - 1, i + 1))
                    }
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    ดูโต๊ะถัดไป →
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* 💵 Quick Checkout button if customer called for bill */}
                {currentServiceCall.requestType.includes('เช็คบิล') &&
                  (() => {
                    const targetTable = tables.find(
                      (t: any) =>
                        t.id === currentServiceCall.tableNo ||
                        t.id === Number(currentServiceCall.tableNo) ||
                        t.tableNo === currentServiceCall.tableNo ||
                        t.tableNo === Number(currentServiceCall.tableNo) ||
                        t.name === currentServiceCall.tableName ||
                        t.name === `โต๊ะ ${currentServiceCall.tableNo}`
                    );
                    return (
                      <button
                        type="button"
                        data-sound="success"
                        onClick={() => {
                          dismissServiceCall(currentServiceCall.id);
                          onClose();
                          if (targetTable) {
                            onOpenCheckoutForTable(targetTable);
                          } else {
                            showSuccess('รับทราบการเรียกเช็คบิลแล้ว 👍', currentServiceCall.tableName);
                          }
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:to-green-700 active:from-emerald-800 active:to-green-800 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300 animate-pulse"
                      >
                        <Receipt className="w-5 h-5" />
                        <span>
                          💵 เปิดคิดเงิน / ปิดบิล{' '}
                          {currentServiceCall.tableName || `โต๊ะ ${currentServiceCall.tableNo}`}
                          {targetTable?.totalAmount ? ` (฿${targetTable.totalAmount.toLocaleString()})` : ''}
                        </span>
                      </button>
                    );
                  })()}

                <button
                  type="button"
                  data-sound="success"
                  onClick={() => {
                    const cId = currentServiceCall.id;
                    const tName = currentServiceCall.tableName;
                    dismissServiceCall(cId);
                    playSuccessChime();
                    showSuccess('รับทราบการเรียกพนักงานแล้ว 👍', tName);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>✅ รับทราบ / ไปบริการแล้ว</span>
                </button>

                {serviceCallQueue.length > 1 && (
                  <button
                    type="button"
                    data-sound="success"
                    onClick={() => {
                      dismissAllServiceCalls();
                      playSuccessChime();
                      showSuccess('รับทราบทุกโต๊ะเรียบร้อยแล้ว 👍');
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-200 font-bold text-xs transition-all duration-75 active:scale-90 select-none cursor-pointer"
                  >
                    รับทราบทั้งหมด ({serviceCallQueue.length} โต๊ะ)
                  </button>
                )}

                <button
                  type="button"
                  data-sound="pop"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs transition-all duration-75 active:scale-90 select-none cursor-pointer"
                >
                  ปิดหน้าต่างชั่วคราว (ป้ายเตือนยังคงแสดงบนโต๊ะ)
                </button>

                {/* Sound Mode Quick Switcher inside Modal */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5 px-0.5">
                    <span>โหมดเสียงเตือนเรียกพนักงาน:</span>
                    <span className="text-[10px] text-amber-600 font-semibold">เตือนซ้ำทุก 20 วิ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'BOTH', label: 'พูด+กริ่ง', icon: '🔔🗣️' },
                      { id: 'VOICE_ONLY', label: 'เฉพาะพูด', icon: '🗣️' },
                      { id: 'CHIME_ONLY', label: 'เฉพาะกริ่ง', icon: '🔔' },
                      { id: 'MUTE', label: 'ปิดเสียง', icon: '🔇' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        data-sound="tap"
                        onClick={() => {
                          updateServiceCallAlertMode(m.id as ServiceCallAlertMode);
                          if (m.id === 'BOTH') {
                            playServiceCallChime();
                            setTimeout(
                              () =>
                                speakServiceCall(
                                  currentServiceCall.tableNo,
                                  currentServiceCall.requestType,
                                  '',
                                  1.15
                                ),
                              650
                            );
                          } else if (m.id === 'VOICE_ONLY') {
                            speakServiceCall(
                              currentServiceCall.tableNo,
                              currentServiceCall.requestType,
                              '',
                              1.15
                            );
                          } else if (m.id === 'CHIME_ONLY') {
                            playServiceCallChime();
                          }
                        }}
                        className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold flex flex-col items-center justify-center border transition-all duration-75 active:scale-90 select-none cursor-pointer ${
                          serviceCallAlertMode === m.id
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="text-xs">{m.icon}</span>
                        <span className="whitespace-nowrap leading-tight">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Floating Action Button: ลูกค้าเรียกพนักงาน (เมื่อปิดป๊อปอัพชั่วคราวแต่ยังมีค้างอยู่) */}
      {!isOpen && serviceCallQueue.length > 0 && (
        <div className="fixed bottom-20 right-6 z-40 animate-bounce">
          <button
            type="button"
            onClick={onOpen}
            data-sound="pop"
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-sm shadow-2xl shadow-amber-500/50 hover:scale-105 active:scale-90 transition-all duration-75 border-2 border-white/50 cursor-pointer select-none"
          >
            <div className="relative">
              <BellRing className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-extrabold border border-white">
                {serviceCallQueue.length}
              </span>
            </div>
            <span>ลูกค้าเรียกพนักงาน ({serviceCallQueue.length} โต๊ะ)</span>
          </button>
        </div>
      )}
    </>
  );
}
