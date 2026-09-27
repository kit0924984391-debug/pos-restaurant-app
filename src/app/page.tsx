'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  ChefHat,
  Smartphone,
  UtensilsCrossed,
  BarChart3,
  QrCode,
  Settings,
  Store,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Users,
  Activity,
  Receipt,
  Flame,
  ShieldCheck,
  Zap,
  MessageSquare,
} from 'lucide-react';

export default function HomePage() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/platform-admin/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* SaaS Navigation */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 w-full">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group flex-shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-xl font-black text-white tracking-tight whitespace-nowrap">Order Pos</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider whitespace-nowrap">
                  SaaS Multi-Tenant
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden md:block">
                ระบบจัดการร้านอาหารตามสั่ง &amp; สแกนสั่งที่โต๊ะ
              </span>
            </div>
          </Link>

          {/* Action Buttons (Equal Height & Single Line) */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            <Link
              href="/board"
              className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-orange-500/30 transition-all whitespace-nowrap flex items-center space-x-1.5 h-9 sm:h-10"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>ชุมชน &amp; โหวตฟีเจอร์</span>
            </Link>

            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-900 border border-slate-700/80 bg-slate-900/60 transition-all whitespace-nowrap flex items-center justify-center h-9 sm:h-10"
            >
              เข้าสู่ระบบ
            </Link>

            <Link
              href="/register"
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-1 whitespace-nowrap h-9 sm:h-10"
            >
              <span>ทดลองใช้ฟรี</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-16 sm:pb-20 px-3.5 sm:px-6 lg:px-8">
        {/* Glow Circles */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[700px] h-[350px] sm:h-[700px] bg-orange-500/15 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-indigo-500/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-4 sm:space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] sm:text-xs font-extrabold max-w-full text-center leading-normal">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <span className="truncate sm:whitespace-normal">ระบบ POS ร้านอาหารตามสั่งที่ดีที่สุด • รองรับหลายร้าน</span>
          </div>

          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight">
            ยกระดับร้านอาหารตามสั่ง <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              สแกนสั่งที่โต๊ะ • จอครัว Realtime • คิดเงินพร้อมเพย์
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-400 leading-relaxed">
            เปิดร้านของคุณเองได้ใน 1 นาที! มีระบบผังโต๊ะสด, จอห้องครัวมีเสียงเตือน, ตรวจของหมดแบบ 1-Click และรายงานยอดขายปิดกะครบวงจร
          </p>

          {/* Action CTAs */}
          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3.5 w-full max-w-md sm:max-w-none mx-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:scale-[1.02] shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>🚀 สมัครเปิดร้านใหม่ ทดลองใช้ฟรี</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/r/lung-pa/pos"
              target="_blank"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center space-x-2"
            >
              <span>🖥️ ทดลองใช้งานหน้าร้านตัวอย่าง (Demo POS)</span>
            </Link>

            <Link
              href="/r/lung-pa/table/1"
              target="_blank"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold text-orange-400 bg-slate-900 hover:bg-slate-800 border border-orange-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>📱 จำลองลูกค้าสแกนสั่ง (โต๊ะ 1)</span>
            </Link>

            <Link
              href="/board"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>💬 ชุมชน &amp; โหวตฟีเจอร์</span>
            </Link>
          </div>

          {/* Highlights Badge Bar */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ไม่ต้องติดตั้งแอป ใช้งานผ่านเบราว์เซอร์ได้ทันที</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>แยกฐานข้อมูลร้านชัดเจน ปลอดภัยสูง</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>รองรับ PromptPay Dynamic QR ทุกธนาคาร</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              ครบทุกฟังก์ชันที่ร้านอาหารตามสั่งต้องการ
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              ออกแบบมาเพื่อความรวดเร็ว ใช้งานง่ายทั้งบนมือถือ แท็บเล็ต และคอมพิวเตอร์หน้าร้าน
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">ลูกค้าสแกนสั่งที่โต๊ะ (QR Ordering)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ลูกค้าสแกน QR Code ประจำโต๊ะเพื่อดูเมนู เลือกความเผ็ด ท็อปปิ้งไข่ดาว และติดตามสถานะอาหารได้สดๆ ไม่ต้องกวักมือเรียกพนักงาน
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">จอห้องครัว Real-time (KDS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ตั๋วออเดอร์ใหม่เด้งเข้าจอห้องครัวทันทีพร้อมเสียงกระดิ่งเตือน พ่อครัวกดเปลี่ยนสถานะ กำลังปรุง และ ปรุงเสร็จ ได้ด้วย 1-Click
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">คิดเงินพร้อมเพย์ Dynamic QR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                สร้าง QR Code พร้อมเพย์ตามยอดบิลของแต่ละโต๊ะอัตโนมัติ ลูกค้าสแกนจ่ายได้ทันที หรือคิดเงินสดพร้อมระบบคำนวณเงินทอน
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">จัดการผังโต๊ะ ย้ายโต๊ะ รวมโต๊ะ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ผังโต๊ะแสดงสถานะว่าง/มีลูกค้าสดๆ เพิ่มโต๊ะได้ไม่จำกัด รองรับการย้ายโต๊ะและรวมโต๊ะได้อย่างรวดเร็ว
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">สวิตช์ 1-Click "ของหมด"</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                วัตถุดิบหมดเมื่อไหร่ กดสวิตช์ปิดเมนูได้ทันทีจากมือถือ ระบบจะปิดไม่ให้ลูกค้าสั่งเมนูนั้นแบบเรียลไทม์ทุกหน้าจอ
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">รายงานยอดขาย &amp; ปิดกะ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                สรุปยอดขายเงินสด vs พร้อมเพย์ เมนูขายดี Top 5 และพิมพ์ใบสรุปปิดกะส่งเจ้าของร้านได้ทุกวัน
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Showcase */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            แพ็กเกจราคาค่าบริการ (Pricing Plans)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            คุ้มค่า ไม่คิดเปอร์เซ็นต์ส่วนแบ่งยอดขาย จ่ายค่าบริการรายเดือน/รายปีคงที่
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-7 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-6 hover:border-orange-500/50 transition-all shadow-xl"
            >
              <div className="space-y-4">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                  {plan.name}
                </span>

                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white">฿{plan.price.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1">/ {plan.durationDays} วัน</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {plan.description || 'ใช้งานครบทุกฟังก์ชัน'}
                </p>

                <div className="space-y-2 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>รองรับสูงสุด {plan.maxTables} โต๊ะ</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>สแกนสั่งที่โต๊ะ &amp; จอครัว Realtime</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>PromptPay Dynamic QR</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register"
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-orange-500 text-white font-extrabold text-xs text-center transition-all shadow-md"
              >
                เริ่มเปิดร้านเลย
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 space-y-3">
        <div className="flex items-center justify-center space-x-4 text-xs font-bold text-slate-400">
          <Link href="/board" className="hover:text-orange-400 transition-colors">
            💬 กระดานสนทนา &amp; โหวตฟีเจอร์
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-orange-400 transition-colors">
            เข้าสู่ระบบ
          </Link>
          <span>•</span>
          <Link href="/register" className="hover:text-orange-400 transition-colors">
            สมัครเปิดร้านใหม่
          </Link>
        </div>
        <p>© 2026 Order Pos — ระบบบริหารจัดการร้านอาหารตามสั่งแบบ Multi-Tenant สงวนลิขสิทธิ์</p>
      </footer>
    </div>
  );
}
