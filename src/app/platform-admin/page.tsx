'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platform-admin/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          ภาพรวมแพลตฟอร์ม (Platform Overview)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          ระบบบริหารจัดการร้านค้าสมาชิก สมาชิกทดลองใช้ และยอดรายได้ค่าบริการ SaaS
        </p>
      </div>

      {/* KPI Cards (Equal Height Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
        <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">ร้านค้าทั้งหมด</span>
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-white">{stats?.totalStores || 0}</span>
              <span className="text-xs text-slate-400 ml-2">ร้าน</span>
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-2.5 text-[11px] pt-2 border-t border-slate-800/60">
            <span className="text-emerald-400 font-bold">{stats?.activeStores || 0} เปิดใช้</span>
            <span className="text-amber-400 font-bold">{stats?.trialStores || 0} ทดลอง</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">รอตรวจสลิปแจ้งโอน</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-400">{stats?.pendingStores || 0}</span>
              <span className="text-xs text-slate-400 ml-2">รายการ</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60">
            <Link
              href="/platform-admin/subscriptions"
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1"
            >
              <span>ไปหน้าตรวจสลิป</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">รายได้ค่าบริการ SaaS</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-400">
                ฿{stats?.totalRevenue ? stats.totalRevenue.toLocaleString() : '0'}
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            ยอดชำระที่อนุมัติแล้วทั้งหมด
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">ยอดขายรวมวันนี้ทุกร้าน</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-white">
                ฿{(stats?.todayGrossSales || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 flex items-center justify-between">
            <span>{stats?.todayOrdersCount || 0} บิลวันนี้</span>
            <span className="text-slate-500">รวม {stats?.totalOrders || 0} บิลสะสม</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Cards (Equal Height Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 auto-rows-fr">
        <Link
          href="/platform-admin/stores"
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-orange-500/50 transition-all group flex flex-col justify-between h-full shadow-lg"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white mt-4 group-hover:text-orange-400 transition-colors">
              จัดการร้านค้าสมาชิก
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ดูรายชื่อร้านทั้งหมด, อนุมัติ, ขยายวันใช้งาน, ระงับร้าน และทดลองเข้าหน้าร้าน
            </p>
          </div>
          <div className="mt-5 text-xs font-bold text-orange-400 flex items-center space-x-1 pt-3 border-t border-slate-800/60">
            <span>เข้าสู่ระบบจัดการ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/platform-admin/subscriptions"
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-all group flex flex-col justify-between h-full shadow-lg"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white mt-4 group-hover:text-amber-400 transition-colors">
              ตรวจสลิปแจ้งชำระเงิน
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ตรวจสอบหลักฐานการโอนเงินของร้านค้า และกดอนุมัติเพื่อเพิ่มวันใช้งานให้อัตโนมัติ
            </p>
          </div>
          <div className="mt-5 text-xs font-bold text-amber-400 flex items-center space-x-1 pt-3 border-t border-slate-800/60">
            <span>ดูสลิปที่รอดำเนินการ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/platform-admin/plans"
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-emerald-500/50 transition-all group flex flex-col justify-between h-full shadow-lg"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white mt-4 group-hover:text-emerald-400 transition-colors">
              ตั้งค่าแพ็กเกจราคา
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              กำหนดราคาแพ็กเกจ (Basic, Pro, Yearly) ระยะเวลา และจำนวนโต๊ะสูงสุดของแต่ละแพ็กเกจ
            </p>
          </div>
          <div className="mt-5 text-xs font-bold text-emerald-400 flex items-center space-x-1 pt-3 border-t border-slate-800/60">
            <span>จัดการแพ็กเกจ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Recent Stores Table */}
      {stats?.recentStores && stats.recentStores.length > 0 && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">ร้านค้าที่ลงทะเบียนล่าสุด</h3>
                <p className="text-xs text-slate-400">ร้านค้าสมาชิกล่าสุดที่เริ่มใช้งานระบบ</p>
              </div>
            </div>

            <Link
              href="/platform-admin/stores"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs flex items-center space-x-1 transition-all"
            >
              <span>ดูทั้งหมด ({stats.totalStores})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="text-slate-400 font-bold border-b border-slate-800/80 bg-slate-800/40">
                <tr>
                  <th className="py-2.5 px-3">ชื่อร้านค้า / Slug</th>
                  <th className="py-2.5 px-3">เจ้าของร้าน</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3">แพ็กเกจ</th>
                  <th className="py-2.5 px-3 text-center">ออเดอร์</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {stats.recentStores.map((s: any) => {
                  const owner = s.users?.[0];
                  const isTrial = s.status === 'TRIAL';
                  const isActive = s.status === 'ACTIVE';

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-white block">{s.name}</span>
                        <span className="text-[10px] text-orange-400 font-mono">/r/{s.slug}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-200 block">{owner?.name || '-'}</span>
                        <span className="text-[10px] text-slate-400">{owner?.email || '-'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isTrial
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isActive ? '✓ Active' : isTrial ? '✨ Trial' : s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-300">{s.plan?.name || 'Standard'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-white">{s._count?.orders || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/r/${s.slug}/pos`}
                          target="_blank"
                          className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-[11px] transition-all"
                          title="เปิด POS หน้าร้าน"
                        >
                          <span>เข้า POS</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
