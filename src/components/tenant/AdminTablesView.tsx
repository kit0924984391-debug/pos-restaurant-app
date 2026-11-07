'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  LayoutGrid,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  QrCode,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  X,
  Printer,
  Utensils,
  Search,
  RotateCcw,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export default function AdminTablesView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const [tables, setTables] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'PAYMENT_PENDING'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Form States
  const [addForm, setAddForm] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [batchCount, setBatchCount] = useState<number>(5);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [selectedQrTable, setSelectedQrTable] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      showSuccess('สำเร็จ ✨', message);
    } else {
      showError('ไม่สำเร็จ', message);
    }
  };

  const fetchData = async () => {
    try {
      const [tablesRes, settingsRes] = await Promise.all([
        fetch(`/api/r/${slug}/tables`),
        fetch(`/api/r/${slug}/settings`),
      ]);

      const [tData, sData] = await Promise.all([
        tablesRes.json().catch(() => []),
        settingsRes.json().catch(() => null),
      ]);

      setTables(Array.isArray(tData) ? tData : []);
      setStore(sData?.error ? null : sData);
    } catch (err) {
      console.error('Error loading tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource(`/api/r/${slug}/stream`);
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'TABLE_UPDATED' || payload.type === 'ORDER_CREATED' || payload.type === 'PAYMENT_RECEIVED') {
              fetchData();
            }
          } catch (e) {}
        };
      }
    } catch (e) {}

    return () => {
      eventSource?.close();
    };
  }, [slug]);

  // Add Single Table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_TABLE',
          id: addForm.id ? parseInt(addForm.id) : undefined,
          name: addForm.name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || 'เพิ่มโต๊ะสำเร็จแล้ว');
        setIsAddModalOpen(false);
        setAddForm({ id: '', name: '' });
        fetchData();
      } else {
        showFeedback('error', data.error || 'ไม่สามารถเพิ่มโต๊ะได้');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Add Tables
  const handleBatchAdd = async (count: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BATCH_CREATE',
          count,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || `เพิ่ม ${count} โต๊ะสำเร็จแล้ว`);
        setIsBatchModalOpen(false);
        fetchData();
      } else {
        showFeedback('error', data.error || 'เพิ่มโต๊ะไม่สำเร็จ');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Table Name
  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/r/${slug}/tables/${editingTable.tableNo || editingTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTable.name.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `แก้ไขชื่อโต๊ะสำเร็จแล้ว`);
        setIsEditModalOpen(false);
        setEditingTable(null);
        fetchData();
      } else {
        showFeedback('error', data.error || 'ไม่สามารถแก้ไขโต๊ะได้');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear / Reset Table
  const handleClearTable = async (table: any) => {
    if (!confirm(`คุณต้องการเคลียร์สถานะ ${table.name} เป็นว่างใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLEAR_TABLE',
          tableId: table.tableNo || table.id,
        }),
      });
      if (res.ok) {
        showFeedback('success', `เคลียร์สถานะ ${table.name} เรียบร้อยแล้ว`);
        fetchData();
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Delete Table
  const handleDeleteTable = async (table: any) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${table.name}?`)) return;
    try {
      const res = await fetch(`/api/r/${slug}/tables/${table.tableNo || table.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || `ลบ ${table.name} เรียบร้อยแล้ว`);
        fetchData();
      } else {
        showFeedback('error', data.error || 'ไม่สามารถลบโต๊ะได้');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Filtered list
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.tableNo || t.id).includes(searchTerm);
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tables, searchTerm, statusFilter]);

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-3.5 sm:space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              จัดการผังโต๊ะอาหาร (Table Management)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-black bg-orange-100 text-orange-700">
              {tables.length} โต๊ะทั้งหมด
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • เพิ่มโต๊ะเดี่ยว, เพิ่มหลายโต๊ะด่วน, แก้ไขชื่อโต๊ะ และพิมพ์ QR Code ประจำโต๊ะ
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            data-sound="pop"
            onClick={() => setIsBatchModalOpen(true)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-800 font-extrabold text-[11px] sm:text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ring-0 active:ring-2 active:ring-slate-300"
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
            <span>+ เพิ่มหลายโต๊ะ</span>
          </button>

          <button
            type="button"
            data-sound="pop"
            onClick={() => {
              const highest = tables.reduce((max, t) => Math.max(max, t.tableNo || t.id || 0), 0);
              setAddForm({ id: String(highest + 1), name: `โต๊ะ ${highest + 1}` });
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold text-[11px] sm:text-xs shadow-md shadow-orange-500/25 flex items-center justify-center space-x-1.5 transition-all cursor-pointer ring-2 ring-orange-400/40"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>+ เพิ่มโต๊ะใหม่</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-2.5 sm:gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm w-full">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อโต๊ะ หรือหมายเลขโต๊ะ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-base sm:text-xs font-semibold focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5 w-full md:w-auto">
          {['ALL', 'AVAILABLE', 'OCCUPIED'].map((st) => (
            <button
              key={st}
              type="button"
              data-sound="pop"
              onClick={() => setStatusFilter(st as any)}
              className={`py-2 px-1.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-75 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none text-center truncate cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' && 'ทั้งหมด'}
              {st === 'AVAILABLE' && 'เฉพาะโต๊ะว่าง'}
              {st === 'OCCUPIED' && 'กำลังทาน'}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'OCCUPIED' || table.activeOrdersCount > 0;
          const tableNo = table.tableNo || table.id;

          return (
            <div
              key={tableNo}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between space-y-3.5 sm:space-y-4 bg-white shadow-sm hover:shadow-md ${
                isOccupied ? 'border-orange-200 ring-1 ring-orange-500/20' : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                    {tableNo}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">{table.name}</h3>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOccupied ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOccupied ? '● กำลังทาน' : '○ โต๊ะว่าง'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    data-sound="tap"
                    onClick={() => {
                      setEditingTable({ ...table });
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 active:translate-y-0.5 select-none duration-75 text-slate-600 transition-all cursor-pointer ring-0 active:ring-2 active:ring-slate-300"
                    title="แก้ไขชื่อโต๊ะ"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-sound="delete"
                    onClick={() => handleDeleteTable(table)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-90 active:translate-y-0.5 select-none duration-75 text-rose-600 transition-all cursor-pointer ring-0 active:ring-2 active:ring-rose-300"
                    title="ลบโต๊ะนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* QR and Table Link Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => {
                    setSelectedQrTable(table);
                    setIsQrModalOpen(true);
                  }}
                  className="font-bold text-orange-600 hover:text-orange-700 active:scale-95 active:translate-y-0.5 select-none duration-75 flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>ดู QR Code</span>
                </button>

                <Link
                  href={`/r/${slug}/table/${tableNo}`}
                  target="_blank"
                  data-sound="tap"
                  className="font-bold text-slate-500 hover:text-slate-900 active:scale-95 active:translate-y-0.5 select-none duration-75 flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <span>จำลองสั่ง</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {isOccupied && (
                  <button
                    type="button"
                    data-sound="delete"
                    onClick={() => handleClearTable(table)}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-600 active:scale-95 active:translate-y-0.5 select-none duration-75 transition-all cursor-pointer"
                    title="เคลียร์สถานะเป็นว่าง"
                  >
                    เคลียร์สถานะ
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Single Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">+ เพิ่มโต๊ะใหม่</h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมายเลขโต๊ะ (ตัวเลข) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={addForm.id}
                  onChange={(e) => setAddForm({ ...addForm, id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อโต๊ะที่แสดง</label>
                <input
                  type="text"
                  placeholder="เช่น โต๊ะ 11, VIP 1, โต๊ะระเบียง 2"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base sm:text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  data-sound="success"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer ring-2 ring-orange-400/40"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโต๊ะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Add Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">+ เพิ่มหลายโต๊ะด่วน</h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">เลือกจำนวนโต๊ะที่ต้องการเพิ่มต่อจากโต๊ะเดิม:</p>

            <div className="grid grid-cols-3 gap-2">
              {[3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-sound="pop"
                  onClick={() => handleBatchAdd(num)}
                  disabled={isSubmitting}
                  className="py-3 rounded-2xl bg-orange-50 hover:bg-orange-100 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 border border-orange-200 text-orange-700 font-extrabold text-sm transition-all cursor-pointer ring-0 active:ring-2 active:ring-orange-300"
                >
                  +{num} โต๊ะ
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {isEditModalOpen && editingTable && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">แก้ไขชื่อ {editingTable.name}</h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditTable} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อโต๊ะที่แสดง *</label>
                  <input
                    type="text"
                    required
                    value={editingTable.name}
                    onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base sm:text-xs"
                  />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  data-sound="tap"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  data-sound="success"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white font-extrabold shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer ring-2 ring-orange-400/40"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Pop-up Modal */}
      {isQrModalOpen && selectedQrTable && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">{selectedQrTable.name}</h3>
              <button
                type="button"
                data-sound="tap"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 active:scale-90 select-none duration-75 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-center">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${slug}/table/${selectedQrTable.tableNo || selectedQrTable.id}`}
                size={180}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              ลูกค้าสแกนเพื่อสั่งอาหารประจำโต๊ะนี้ได้ทันที
            </p>

            <button
              type="button"
              data-sound="tap"
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-90 sm:active:scale-95 active:translate-y-0.5 select-none duration-75 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md ring-2 ring-slate-900/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ QR Code นี้</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
