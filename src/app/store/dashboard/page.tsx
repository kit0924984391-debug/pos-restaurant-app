'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  LayoutGrid,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  QrCode,
  Settings,
  CreditCard,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Loader2,
  PackageCheck,
  Tag,
  Receipt,
  TrendingUp,
} from 'lucide-react';

export default function StoreOwnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todayReport, setTodayReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
          if (data.user.store?.slug) {
            fetch(`/api/r/${data.user.store.slug}/reports/daily`)
              .then((r) => r.json())
              .then((rep) => {
                if (!rep.error) setTodayReport(rep);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const store = user?.store;
  const slug = store?.slug || 'lung-pa';
  const subEnd = store?.subscriptionEnd ? new Date(store.subscriptionEnd) : new Date();
  const daysLeft = Math.max(0, Math.ceil((subEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const isTrial = store?.status === 'TRIAL';

  const menuModules = [
    {
      title: 'ผังโต๊ะ & แคชเชียร์ (POS)',
      desc: 'ดูสถานะโต๊ะสด รับออเดอร์ ย้าย/รวมโต๊ะ คิดเงินเงินสด และสร้างพร้อมเพย์ Dynamic QR',
      href: `/r/${slug}/pos`,
      icon: LayoutGrid,
      color: 'from-orange-500 to-amber-500',
    },
    {
      title: 'จอห้องครัว Real-time (KDS)',
      desc: 'ออเดอร์ใหม่เด้งเข้าครัวทันทีพร้อมเสียงกระดิ่งเตือน แยกรายการและเปลี่ยนสถานะ 1-Click',
      href: `/r/${slug}/kitchen`,
      icon: ChefHat,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'จัดการผังโต๊ะอาหาร',
      desc: 'เพิ่มโต๊ะเดี่ยว/เพิ่มหลายโต๊ะด่วน แก้ไขชื่อ เคลียร์สถานะ และดู QR ประจำโต๊ะ',
      href: `/r/${slug}/admin/tables`,
      icon: LayoutGrid,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'จัดการเมนู & ของหมด',
      desc: 'เพิ่ม/แก้ไขรายการอาหาร หมวดหมู่ ท็อปปิ้ง และกดปุ่ม 1-Click ปิดเมนูที่ของหมด',
      href: `/r/${slug}/admin/menu`,
      icon: UtensilsCrossed,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'คลังวัตถุดิบ & สูตรอาหาร (COGS)',
      desc: 'เช็คสต็อกคงเหลือ บันทึกตัดของเสีย และผูกสูตรอาหาร (BOM) คำนวณต้นทุนต่อจานอัตโนมัติ',
      href: `/r/${slug}/admin/inventory`,
      icon: PackageCheck,
      color: 'from-teal-500 to-cyan-500',
    },
    {
      title: 'จัดการโปรโมชั่น & สิทธิพิเศษ',
      desc: 'สร้างส่วนลด ซื้อ 1 แถม 1 บัตรคูปอง และตั้งค่าแต้มสะสม Loyalty Points แลกรางวัล',
      href: `/r/${slug}/admin/promotions`,
      icon: Tag,
      color: 'from-pink-500 to-rose-500',
    },
    {
      title: 'รายงานยอดขาย & วิเคราะห์ธุรกิจ',
      desc: 'สรุปยอดขายประจำวัน ช่วงเวลาขายดี Peak Hour สัดส่วนเงินสด vs พร้อมเพย์ และประวัติบิล',
      href: `/r/${slug}/admin/reports`,
      icon: BarChart3,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      title: 'พิมพ์ป้าย QR Code ตั้งโต๊ะ A4',
      desc: 'พิมพ์แผ่นป้าย QR Code สำหรับทุกโต๊ะในร้านให้ลูกค้าสแกนสั่งจากมือถือ',
      href: `/r/${slug}/admin/qr-codes`,
      icon: QrCode,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'ตั้งค่าร้านค้า & เครื่องพิมพ์บิล',
      desc: 'ตั้งค่าพร้อมเพย์ร้าน สลิปใบเสร็จ เชื่อมต่อเครื่องพิมพ์บลูทูธ/USB และขนาดกระดาษ',
      href: `/r/${slug}/admin/settings`,
      icon: Settings,
      color: 'from-slate-600 to-slate-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black shadow-md shadow-orange-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight block">
                {store?.name || 'ร้านอาหารของฉัน'}
              </span>
              <span className="text-[10px] text-orange-400 font-mono block">
                /r/{slug}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`/r/${slug}/table/1`}
              target="_blank"
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
            >
              <span>ทดลองสั่ง (โต๊ะ 1)</span>
              <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Subscription Status Alert Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold text-white">
                  สถานะแพ็กเกจ: {store?.plan?.name || (isTrial ? 'ทดลองใช้ฟรี (Trial)' : 'Active')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  เหลืออีก {daysLeft} วัน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ใช้งานได้ถึงวันที่ {subEnd.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/store/billing`}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-orange-500/25 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>ต่ออายุสมาชิก / แจ้งชำระเงิน</span>
            </Link>
          </div>
        </div>

        {/* Today Quick Sales Preview Banner */}
        {todayReport && (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-extrabold text-white">ภาพรวมยอดขายวันนี้ (Today's Live Performance)</h3>
              </div>
              <Link
                href={`/r/${slug}/admin/reports`}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1"
              >
                <span>ดูรายงานละเอียด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-400 block">ยอดขายวันนี้</span>
                <span className="text-lg sm:text-xl font-black text-white mt-0.5 block">
                  ฿{(todayReport.totalSales || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                  {todayReport.totalBills || 0} บิลสำเร็จ
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-400 block">กำไรสุทธิ</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 block">
                  ฿{(todayReport.grossProfit || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                  มาร์จิ้น {todayReport.profitMargin || 0}%
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-400 block">ยอดเฉลี่ยต่อบิล</span>
                <span className="text-lg sm:text-xl font-black text-amber-400 mt-0.5 block">
                  ฿{(todayReport.averageBillAmount || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                  {todayReport.averageItemsPerBill || 0} จาน/บิล
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-400 block">ช่องทางชำระ</span>
                <div className="text-[11px] font-extrabold mt-1 space-y-0.5">
                  <span className="text-orange-400 block">QR: ฿{(todayReport.promptPaySales || 0).toLocaleString()}</span>
                  <span className="text-emerald-400 block">สด: ฿{(todayReport.cashSales || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">เมนูระบบงานของร้าน</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {menuModules.map((mod) => {
              const Icon = mod.icon;

              return (
                <Link
                  key={mod.title}
                  href={mod.href}
                  className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/40 hover:bg-slate-900 transition-all duration-300 flex flex-col justify-between group shadow-md"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${mod.color} text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-orange-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-orange-400">
                    <span>เปิดหน้านี้</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
