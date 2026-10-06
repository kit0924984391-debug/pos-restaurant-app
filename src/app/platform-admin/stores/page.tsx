'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Calendar,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Sparkles,
  BarChart3,
} from 'lucide-react';

export default function PlatformAdminStoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Extend Modal State
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [extending, setExtending] = useState(false);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/platform-admin/stores?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const data = await res.json();
      setStores(data.stores || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStores();
  };

  const handleChangeStatus = async (storeId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/platform-admin/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHANGE_STATUS', status: newStatus }),
      });
      if (res.ok) {
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtendDays = async () => {
    if (!selectedStore) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/platform-admin/stores/${selectedStore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EXTEND_DAYS', daysToAdd }),
      });
      if (res.ok) {
        setSelectedStore(null);
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtending(false);
    }
  };

  const handleDeleteStore = async (store: any) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบร้าน "${store.name}" และข้อมูลทั้งหมดอย่างถาวร?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/platform-admin/stores/${store.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string, end: string) => {
    const isExpired = new Date(end) < new Date();

    if (status === 'SUSPENDED') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Ban className="w-3 h-3 mr-1" />
          ระงับการใช้งาน
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          หมดอายุแล้ว
        </span>
      );
    }
    if (status === 'TRIAL') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Sparkles className="w-3 h-3 mr-1" />
          ทดลองใช้ฟรี (Trial)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        เปิดใช้งาน (Active)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">จัดการร้านค้าสมาชิก</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            อนุมัติ, ขยายวันใช้งาน, เปลี่ยนสถานะ และตรวจสอบร้านค้าทั้งหมดในระบบ
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
        <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อร้าน, slug, เบอร์โทร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            ค้นหา
          </button>
        </form>

        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' && 'ทั้งหมด'}
              {st === 'ACTIVE' && 'เปิดใช้งาน'}
              {st === 'TRIAL' && 'ทดลองใช้'}
              {st === 'SUSPENDED' && 'ถูกระงับ'}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm font-semibold">
            ไม่พบร้านค้าที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">ชื่อร้าน / Slug</th>
                  <th className="py-3.5 px-4">เจ้าของ / อีเมล</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4">แพ็กเกจ / หมดอายุ</th>
                  <th className="py-3.5 px-4">สถิติร้าน</th>
                  <th className="py-3.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stores.map((s) => {
                  const owner = s.users?.[0];
                  const endDate = new Date(s.subscriptionEnd);
                  const isExpired = endDate < new Date();

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-white text-sm">{s.name}</div>
                        <div className="text-[11px] text-orange-400 font-mono mt-0.5">
                          /r/{s.slug}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-200">{owner?.name || '-'}</div>
                        <div className="text-[11px] text-slate-400">{owner?.email || '-'}</div>
                        {s.phone && <div className="text-[10px] text-slate-500">📞 {s.phone}</div>}
                      </td>

                      <td className="py-4 px-4">
                        {getStatusBadge(s.status, s.subscriptionEnd)}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-white block">{s.plan?.name || 'Trial 14 วัน'}</span>
                        <span className={`text-[11px] font-semibold block ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                          {endDate.toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <span className="text-slate-400 block">🪑 {s._count?.tables || 0} โต๊ะ</span>
                          <span className="text-slate-400 block">🍲 {s._count?.menuItems || 0} เมนู</span>
                          <span className="text-emerald-400 font-bold block">🧾 {s._count?.orders || 0} บิล</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Open Store POS link */}
                        <Link
                          href={`/r/${s.slug}/pos`}
                          target="_blank"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-all"
                          title="เปิดหน้าร้าน POS"
                        >
                          <span>เข้าหน้าร้าน</span>
                          <ExternalLink className="w-3 h-3 ml-1 text-orange-400" />
                        </Link>

                        {/* Open Store Reports link */}
                        <Link
                          href={`/r/${s.slug}/admin/reports`}
                          target="_blank"
                          className="inline-flex items-center px-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-[11px] border border-indigo-500/20 transition-all"
                          title="ดูรายงานยอดขายของร้านนี้"
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          <span>รายงาน</span>
                        </Link>

                        {/* Extend Days Button */}
                        <button
                          onClick={() => setSelectedStore(s)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/20 transition-all"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          เพิ่มวัน
                        </button>

                        {/* Toggle Suspend */}
                        {s.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleChangeStatus(s.id, 'ACTIVE')}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-[11px] border border-blue-500/20 transition-all"
                          >
                            เปิดใช้งาน
                          </button>
                        ) : (
                          <button
                            onClick={() => handleChangeStatus(s.id, 'SUSPENDED')}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-[11px] border border-amber-500/20 transition-all"
                            title="ระงับร้านค้าชั่วคราว"
                          >
                            ระงับ
                          </button>
                        )}

                        {/* Delete store */}
                        <button
                          onClick={() => handleDeleteStore(s)}
                          className="inline-flex items-center p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="ลบร้านค้าถาวร"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Extend Days Modal */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-white">
              เพิ่มวันใช้งานให้ร้าน: {selectedStore.name}
            </h3>
            <p className="text-xs text-slate-400">
              วันหมดอายุปัจจุบัน:{' '}
              <span className="font-bold text-amber-400">
                {new Date(selectedStore.subscriptionEnd).toLocaleDateString('th-TH')}
              </span>
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">จำนวนวันที่ต้องการเพิ่ม:</label>
              <div className="grid grid-cols-4 gap-2">
                {[14, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysToAdd(d)}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      daysToAdd === d
                        ? 'bg-orange-500 border-orange-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    +{d} วัน
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 0)}
                className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold"
                placeholder="หรือระบุจำนวนวันเอง"
              />
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={extending}
                onClick={handleExtendDays}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center justify-center space-x-2"
              >
                {extending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>บันทึกเพิ่มวัน</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
