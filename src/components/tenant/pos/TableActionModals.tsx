'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { playSuccessChime } from '@/lib/sound';

export interface TableActionModalsProps {
  isMoveModalOpen: boolean;
  onCloseMove: () => void;
  isAddTableModalOpen: boolean;
  onCloseAdd: () => void;
  selectedTable: any;
  tables: any[];
  slug: string;
  onSuccess: () => void;
}

export default function TableActionModals({
  isMoveModalOpen,
  onCloseMove,
  isAddTableModalOpen,
  onCloseAdd,
  selectedTable,
  tables,
  slug,
  onSuccess,
}: TableActionModalsProps) {
  const { showSuccess, showError } = useToast();

  // Move table state
  const [targetTableId, setTargetTableId] = useState<number | ''>('');
  const [isMovingTable, setIsMovingTable] = useState(false);

  // Add table state
  const [newTableId, setNewTableId] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const handleMoveTable = async () => {
    if (isMovingTable || !selectedTable || !targetTableId) return;
    setIsMovingTable(true);
    const targetTableNum = targetTableId;
    const sourceTableName = selectedTable.name;

    // 1. Immediate tactile sound, toast & close modal (0ms)
    playSuccessChime();
    showSuccess('ย้ายโต๊ะสำเร็จ 🪑', `ย้ายจาก ${sourceTableName} ไป โต๊ะ ${targetTableNum} เรียบร้อย`);
    onCloseMove();
    setTargetTableId('');
    onSuccess();

    // 2. Background network dispatch
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_TABLE',
          fromTableId: selectedTable.id || selectedTable.tableNo,
          toTableId: targetTableNum,
        }),
      });
      if (!res.ok) {
        showError('ไม่สามารถย้ายโต๊ะได้', 'โต๊ะปลายทางอาจไม่ว่าง');
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถย้ายโต๊ะได้');
      onSuccess();
    } finally {
      setIsMovingTable(false);
    }
  };

  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTable(true);
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_TABLE',
          id: newTableId ? parseInt(newTableId) : undefined,
          name: newTableName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCloseAdd();
        setNewTableId('');
        setNewTableName('');
        onSuccess();
      } else {
        showError('ไม่สามารถเพิ่มโต๊ะได้', data.error || '');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มโต๊ะได้');
    } finally {
      setIsCreatingTable(false);
    }
  };

  return (
    <>
      {/* Move Table Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="font-black text-base text-slate-900">ย้ายจาก {selectedTable?.name} ไปโต๊ะอื่น</h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">เลือกโต๊ะปลายทาง:</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(parseInt(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="">-- เลือกโต๊ะปลายทาง --</option>
                {tables
                  .filter((t) => t.id !== selectedTable?.id && t.tableNo !== selectedTable?.tableNo)
                  .map((t) => (
                    <option key={t.id || t.tableNo} value={t.tableNo || t.id}>
                      {t.name} ({t.status === 'AVAILABLE' ? 'ว่าง' : 'มีลูกค้า'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={onCloseMove}
                data-sound="pop"
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 text-xs font-bold transition-all duration-75 active:scale-90 cursor-pointer select-none"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!targetTableId || isMovingTable}
                onClick={handleMoveTable}
                data-sound="success"
                className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-extrabold shadow-sm transition-all duration-75 active:scale-90 active:translate-y-0.5 disabled:opacity-50 cursor-pointer select-none ring-0 active:ring-2 active:ring-orange-300"
              >
                {isMovingTable ? 'กำลังย้าย...' : 'ยืนยันย้ายโต๊ะ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Table Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="font-black text-base text-slate-900">+ เพิ่มโต๊ะใหม่</h4>
            <form onSubmit={handleCreateNewTable} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมายเลขโต๊ะ (ตัวเลข) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อโต๊ะที่แสดง</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseAdd}
                  data-sound="pop"
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold transition-all duration-75 active:scale-90 cursor-pointer select-none"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTable}
                  data-sound="success"
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-extrabold shadow-md transition-all duration-75 active:scale-90 active:translate-y-0.5 disabled:opacity-50 cursor-pointer select-none ring-0 active:ring-2 active:ring-orange-300"
                >
                  {isCreatingTable ? 'กำลังเพิ่ม...' : 'ยืนยันเพิ่มโต๊ะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
