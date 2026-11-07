'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Smartphone, Star, ShieldCheck, ChefHat, BellRing, Sparkles, X, ArrowUpRight } from 'lucide-react';
import { playButtonTapSound } from '@/lib/sound';

interface ActivityEvent {
  id: string;
  type: 'order' | 'sub' | 'pay' | 'kitchen' | 'call';
  title: string;
  desc: string;
  timeAgo: string;
  badge: string;
  badgeColor: string;
  icon: any;
  link?: string;
}

const LIVE_EVENTS: ActivityEvent[] = [
  {
    id: '1',
    type: 'order',
    title: 'โต๊ะ 4 สแกนสั่งอาหารเอง',
    desc: 'ข้าวกะเพราหมูกรอบ + ไข่ดาวกรอบ (฿75)',
    timeAgo: 'เมื่อ 12 วินาทีที่แล้ว',
    badge: 'ออเดอร์ใหม่',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: Smartphone,
    link: '#simulator',
  },
  {
    id: '2',
    type: 'pay',
    title: 'โต๊ะ 2 ชำระเงินสำเร็จ',
    desc: 'ยอดชำระ ฿210.00 ผ่าน Dynamic PromptPay (สลิปถูกต้อง)',
    timeAgo: 'เมื่อ 45 วินาทีที่แล้ว',
    badge: 'ตรวจสลิปแล้ว',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: ShieldCheck,
    link: '#simulator',
  },
  {
    id: '3',
    type: 'sub',
    title: 'ร้านกะเพราป้าสมศรี (เชียงใหม่)',
    desc: 'เพิ่งสมัครเปิดร้านทดลองใช้ฟรี 30 วัน 🎉',
    timeAgo: 'เมื่อ 1 นาทีที่แล้ว',
    badge: 'สมาชิกร้านใหม่',
    badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    icon: Star,
    link: '/register',
  },
  {
    id: '4',
    type: 'kitchen',
    title: 'จอครัวเตา 1 เสร็จสิ้นออเดอร์',
    desc: 'โต๊ะ 3 ข้าวผัดกะเพราหมูกรอบ (ตั๋ว #52 พร้อมเสิร์ฟ)',
    timeAgo: 'เมื่อ 2 นาทีที่แล้ว',
    badge: 'ครัวปรุงเสร็จ',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: ChefHat,
    link: '#simulator',
  },
  {
    id: '5',
    type: 'call',
    title: 'โต๊ะ 6 กดเรียกพนักงาน',
    desc: 'แจ้งขอน้ำแข็งเพิ่มผ่าน QR ประจำโต๊ะ',
    timeAgo: 'เมื่อ 3 นาทีที่แล้ว',
    badge: 'บริการลูกค้า',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: BellRing,
    link: '#features',
  },
];

export default function LiveActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDismissed || isPaused) return;

    const timer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
        setIsVisible(true);
      }, 450);
    }, 7500);

    return () => clearInterval(timer);
  }, [isDismissed, isPaused]);

  // On mobile (< 640px), only show ticker after scrolling slightly (scrollY > 160)
  // so the initial Hero CTAs are completely clean and unobstructed
  const isMobileInitial = typeof window !== 'undefined' && window.innerWidth < 640 && scrollY < 160;

  if (isDismissed || isMobileInitial) return null;

  const current = LIVE_EVENTS[currentIndex];
  const Icon = current.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`fixed bottom-20 sm:bottom-6 left-4 z-40 max-w-[340px] sm:max-w-[380px] transition-all duration-500 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="p-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-800 shadow-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
        {/* Top live indicator row */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-300">
              ความเคลื่อนไหวสด (LIVE)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${current.badgeColor}`}>
              {current.badge}
            </span>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded-md hover:bg-slate-800 transition-colors"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Event Content */}
        <div className="flex items-center space-x-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs font-black text-white truncate">{current.title}</div>
            <div className="text-[11px] text-slate-400 truncate">{current.desc}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{current.timeAgo}</div>
          </div>

          {current.link && (
            <Link
              href={current.link}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-orange-500 transition-colors flex-shrink-0"
              title="ดูรายละเอียด"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
