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
  Trash2,
  Loader2,
  Sparkles,
  BarChart3,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { THAI_BANKS } from '@/lib/bank-constants';

export default function PlatformAdminStoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Extend Modal State
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [extending, setExtending] = useState(false);

  // Delete Store Modal State (2-step verification + 30-day grace period)
  const [storeToDelete, setStoreToDelete] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [inputStoreName, setInputStoreName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Cancel Delete / Restore State
  const [restoringStoreId, setRestoringStoreId] = useState<string | null>(null);

  // Send Store Security Edit Link State
  const [securityModalStore, setSecurityModalStore] = useState<any>(null);
  const [targetOwnerEmail, setTargetOwnerEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [sendLinkSuccess, setSendLinkSuccess] = useState<string | null>(null);
  const [sendLinkError, setSendLinkError] = useState<string | null>(null);
  const [devLinkUrl, setDevLinkUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleOpenSecurityModal = (store: any) => {
    const owner = store.users?.find((u: any) => u.role === 'STORE_OWNER') || store.users?.[0];
    const ownerEmail = owner?.email && !owner.email.endsWith('@ordeopos.com') ? owner.email : '';
    setSecurityModalStore(store);
    setTargetOwnerEmail(ownerEmail || (store as any).email || '');
    setSendingLink(false);
    setSendLinkSuccess(null);
    setSendLinkError(null);
    setDevLinkUrl(null);
    setCopiedLink(false);
  };

  const handleSendSecurityEditLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityModalStore) return;
    setSendingLink(true);
    setSendLinkError(null);
    setSendLinkSuccess(null);

    try {
      const res = await fetch(`/api/platform-admin/stores/${securityModalStore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_SECURITY_EDIT_LINK',
          ownerEmail: targetOwnerEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งลิงก์แก้ไขข้อมูลได้');
      }
      setSendLinkSuccess(data.message || 'ส่งลิงก์ไปยังอีเมลเรียบร้อยแล้ว');
      if (data.devLink) {
        setDevLinkUrl(data.devLink);
      }
      fetchStores();
    } catch (err: any) {
      setSendLinkError(err.message);
    } finally {
      setSendingLink(false);
    }
  };

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

  // Open 2-Step Deletion Modal
  const handleOpenDeleteModal = (store: any) => {
    setStoreToDelete(store);
    setDeleteStep(1);
    setInputStoreName('');
    setAdminPassword('');
    setShowPassword(false);
    setDeleteError('');
  };

  const handleCloseDeleteModal = () => {
    setStoreToDelete(null);
    setDeleteStep(1);
    setInputStoreName('');
    setAdminPassword('');
    setDeleteError('');
  };

  // Submit Deletion
  const handleConfirmDeleteStore = async () => {
    if (!storeToDelete || !adminPassword) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/platform-admin/stores/${storeToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: inputStoreName.trim(),
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการขอลบร้านค้า');
      }

      handleCloseDeleteModal();
      fetchStores();
    } catch (err: any) {
      setDeleteError(err.message || 'เกิดข้อผิดพลาดในการขอลบร้านค้า');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Cancel Deletion / Restore Store
  const handleCancelDelete = async (store: any) => {
    if (!confirm(`คุณต้องการยกเลิกการลบร้าน "${store.name}" และคืนสถานะร้านค้ากลับมาเปิดใช้งานทันทีใช่หรือไม่?`)) {
      return;
    }

    try {
      setRestoringStoreId(store.id);
      const res = await fetch(`/api/platform-admin/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL_DELETE' }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ไม่สามารถยกเลิกการลบได้');
      } else {
        fetchStores();
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setRestoringStoreId(null);
    }
  };

  const getStatusBadge = (status: string, end: string, scheduledDeleteAt?: string) => {
    if (status === 'PENDING_DELETE') {
      const daysLeft = scheduledDeleteAt
        ? Math.max(0, Math.ceil((new Date(scheduledDeleteAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30;
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-400 shrink-0" />
            รอการลบ (เหลืออีก {daysLeft} วัน)
          </span>
          {scheduledDeleteAt && (
            <span className="text-[10px] text-slate-400 block font-mono">
              ครบกำหนด: {new Date(scheduledDeleteAt).toLocaleDateString('th-TH')}
            </span>
          )}
        </div>
      );
    }

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
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'ACTIVE', label: 'เปิดใช้งาน' },
            { id: 'TRIAL', label: 'ทดลองใช้' },
            { id: 'SUSPENDED', label: 'ถูกระงับ' },
            { id: 'PENDING_DELETE', label: 'รอการลบ (30 วัน)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === item.id
                  ? 'bg-slate-700 text-white border border-slate-600 shadow-sm'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
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
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        s.status === 'PENDING_DELETE'
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
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
                        {getStatusBadge(s.status, s.subscriptionEnd, s.scheduledDeleteAt)}
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
                        {s.status === 'PENDING_DELETE' ? (
                          <>
                            {/* Cancel Delete / Restore button */}
                            <button
                              onClick={() => handleCancelDelete(s)}
                              disabled={restoringStoreId === s.id}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-[11px] border border-emerald-500/30 transition-all shadow-sm disabled:opacity-50"
                              title="กดยกเลิกการลบ และคืนค่าร้านค้ากลับมาเปิดใช้งานทันที"
                            >
                              {restoringStoreId === s.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              )}
                              <span>ยกเลิกการลบ (คืนค่าร้าน)</span>
                            </button>
                          </>
                        ) : (
                          <>
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

                            {/* Send Security Edit Link button */}
                            <button
                              onClick={() => handleOpenSecurityModal(s)}
                              className="inline-flex items-center px-2 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold text-[11px] border border-orange-500/20 transition-all"
                              title="ส่งลิงก์ให้เจ้าของร้านเปิดอีเมลแก้ไขข้อมูลสำคัญด้วยตนเอง (เบอร์โทร, อีเมล, บัญชีรับเงิน)"
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              <span>ส่งลิงก์แก้ไข</span>
                            </button>

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

                            {/* Delete store button */}
                            <button
                              onClick={() => handleOpenDeleteModal(s)}
                              className="inline-flex items-center p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                              title="ลบบัญชีร้านค้า (กดยืนยัน 2 ขั้นตอน + รหัสผ่าน Super Admin + มีเวลายกเลิก 30 วัน)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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

      {/* 2-Step Safety Modal: Delete Store with 30-day Grace Period */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-rose-500/30 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start space-x-3.5 border-b border-slate-800 pb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                {deleteStep === 1 ? <AlertTriangle className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {deleteStep === 1 ? 'ยืนยันการลบบัญชีร้านค้า' : 'ยืนยันสิทธิ์ด้วยรหัสผ่านสูงสุด'}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-rose-400 border border-rose-500/30">
                    ขั้นตอน {deleteStep} จาก 2
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {deleteStep === 1
                    ? 'ขั้นตอนที่ 1: ตรวจสอบและพิมพ์ชื่อร้านเพื่อยืนยัน'
                    : 'ขั้นตอนที่ 2: กรอกรหัสผ่าน Super Admin เพื่ออนุมัติคำขอลบ'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* 30-Day Policy Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
              <div className="font-extrabold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>มีระยะเวลาผ่อนผัน 30 วัน เพื่อกดยกเลิก</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                เมื่อยืนยัน ระบบจะเปลี่ยนสถานะร้านเป็น <strong>&quot;รอการลบ&quot;</strong> ทันที โดยข้อมูลทั้งหมดจะยังไม่ถูกทำลาย
                ผู้ดูแลระบบสามารถเข้ามากด <strong>&quot;ยกเลิกการลบ (คืนค่าร้าน)&quot;</strong> ได้ตลอดเวลาภายใน 30 วัน
              </p>
            </div>

            {/* Step 1 Content */}
            {deleteStep === 1 && (
              <div className="space-y-4">
                {/* Store Summary Card */}
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold">ร้านที่จะขอลบ:</span>
                    <span className="text-xs font-mono text-orange-400 font-bold">/r/{storeToDelete.slug}</span>
                  </div>
                  <div className="text-sm font-black text-white">{storeToDelete.name}</div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/50 flex space-x-3">
                    <span>🪑 {storeToDelete._count?.tables || 0} โต๊ะ</span>
                    <span>🍲 {storeToDelete._count?.menuItems || 0} เมนู</span>
                    <span>🧾 {storeToDelete._count?.orders || 0} บิล</span>
                  </div>
                </div>

                {/* Name Match Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    พิมพ์ชื่อร้าน <span className="font-mono text-amber-400 font-extrabold px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 select-all">{storeToDelete.name}</span> ให้ตรงกันเพื่อยืนยัน:
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={inputStoreName}
                    onChange={(e) => setInputStoreName(e.target.value)}
                    placeholder="พิมพ์ชื่อร้านที่นี่..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-500"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    {inputStoreName.trim() === storeToDelete.name.trim() ? (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ชื่อร้านถูกต้องตรงกันแล้ว</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {inputStoreName ? 'ชื่อร้านยังไม่ตรงกันทุกตัวอักษร' : 'กรุณากรอกชื่อร้านเพื่อปลดล็อกปุ่มถัดไป'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Modal Footer Step 1 */}
                <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseDeleteModal}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={inputStoreName.trim() !== storeToDelete.name.trim()}
                    onClick={() => {
                      setDeleteError('');
                      setDeleteStep(2);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
                  >
                    <span>ถัดไป (ขั้นตอนที่ 2)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Content */}
            {deleteStep === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <div className="font-extrabold text-sm text-white mb-1">
                    ขั้นตอนสุดท้าย: ยืนยันคำขอลบร้าน &quot;{storeToDelete.name}&quot;
                  </div>
                  <p className="text-[11px] text-slate-400">
                    กรุณากรอกรหัสผ่านบัญชี Super Admin เพื่อตรวจสอบสิทธิ์ความปลอดภัยสูงสุด
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    รหัสผ่านสูงสุด (Super Admin Password):
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน Super Admin..."
                      className="w-full px-4 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Modal Footer Step 2 */}
                <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={deleteLoading}
                    onClick={() => {
                      setDeleteError('');
                      setDeleteStep(1);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ย้อนกลับ</span>
                  </button>
                  <button
                    type="button"
                    disabled={!adminPassword || deleteLoading}
                    onClick={handleConfirmDeleteStore}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-600/25"
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังตรวจสอบ...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ยืนยันเริ่มการลบ (รอ 30 วัน)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Send Security Edit Link to Store Owner */}
      {securityModalStore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-orange-500/30 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ส่งลิงก์แก้ไขข้อมูลสำคัญให้เจ้าของร้าน</h3>
                  <p className="text-xs text-slate-400 font-mono">ร้าน: {securityModalStore.name} (/r/{securityModalStore.slug})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalStore(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Security Policy Alert Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
              <div className="flex items-center space-x-1.5 font-extrabold text-amber-400">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>นโยบายความปลอดภัยและป้องกันการทุจริตบัญชีรับเงิน</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ผู้ดูแลระบบ (Admin) ไม่สามารถแก้ไขเบอร์โทรศัพท์, บัญชีธนาคาร หรือพร้อมเพย์ของร้านค้าได้โดยตรง เพื่อป้องกันการแอบใส่บัญชีตนเอง ระบบจะสร้างลิงก์แก้ไขแบบใช้ครั้งเดียว (อายุ 24 ชม.) ส่งไปยังอีเมลของเจ้าของร้าน เพื่อให้เจ้าของร้านเปิดอีเมลและยืนยันตัวตนด้วย SMS OTP ด้วยตนเอง
              </p>
            </div>

            {/* Current Financial & Security Details (Read-only Preview) */}
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/60 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>ข้อมูลความปลอดภัยปัจจุบันของร้าน</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">🔒 ล็อกห้ามแอดมินแก้ตรง</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">เบอร์โทรร้าน (Login):</span>
                  <span className="font-mono font-bold text-white">{securityModalStore.phone || '-'}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">พร้อมเพย์รับเงิน:</span>
                  <span className="font-mono font-bold text-emerald-400">{securityModalStore.promptPayId || 'ยังไม่ระบุ'}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl col-span-2">
                  <span className="text-slate-400 block text-[10px]">บัญชีธนาคาร:</span>
                  <span className="font-mono font-bold text-sky-400">
                    {securityModalStore.bankName || '-'} {securityModalStore.bankAccountNo || 'ยังไม่ระบุ'}
                    {securityModalStore.bankAccountName ? ` (${securityModalStore.bankAccountName})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors / Success Feedback */}
            {sendLinkError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                ⚠️ {sendLinkError}
              </div>
            )}

            {sendLinkSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-extrabold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{sendLinkSuccess}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  ระบบได้ส่งอีเมลพร้อมลิงก์แก้ไขข้อมูลที่มีอายุ 24 ชั่วโมง และสามารถเปิดใช้งานได้เพียง 1 ครั้งให้เจ้าของร้านแล้ว
                </p>
                {devLinkUrl && (
                  <div className="mt-2 p-2 bg-slate-900/80 rounded-xl border border-emerald-500/30 text-[11px] space-y-1">
                    <div className="text-slate-400 font-bold flex items-center justify-between">
                      <span>ลิงก์แก้ไขข้อมูล (โหมดทดสอบ / Local Dev Link):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(devLinkUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                      </button>
                    </div>
                    <a
                      href={devLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 underline break-all font-mono text-[10px] block hover:text-orange-300"
                    >
                      {devLinkUrl}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Email Dispatch Form */}
            <form onSubmit={handleSendSecurityEditLink} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  อีเมลเจ้าของร้าน (ปลายทางที่จะรับลิงก์แก้ไข) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={targetOwnerEmail}
                    onChange={(e) => setTargetOwnerEmail(e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-orange-500"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * เมื่อกดส่ง ระบบจะส่งอีเมลแจ้งเตือนความปลอดภัยพร้อมปุ่มยืนยันและลิงก์ความปลอดภัยไปยังอีเมลนี้
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSecurityModalStore(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="submit"
                  disabled={sendingLink || !targetOwnerEmail.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50"
                >
                  {sendingLink ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-1" />
                      <span>{sendLinkSuccess ? 'ส่งลิงก์ซ้ำอีกครั้ง' : 'ส่งลิงก์แก้ไขให้เจ้าของร้าน'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
