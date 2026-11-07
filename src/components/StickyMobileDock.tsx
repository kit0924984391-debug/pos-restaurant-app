'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Smartphone, ChefHat, LayoutGrid } from 'lucide-react';

export default function StickyMobileDock() {
  const [showDock, setShowDock] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;

      // Show dock after scrolling past hero (250px)
      if (scrollY > 250) {
        setShowDock(true);
      } else {
        setShowDock(false);
      }

      // Hide dock when near footer to avoid overlapping
      if (scrollY + windowHeight > totalHeight - 350) {
        setIsNearBottom(true);
      } else {
        setIsNearBottom(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showDock || isNearBottom) return null;

  return (
    <>
      {/* 1. Mobile Bottom Floating Dock (Fixed at bottom on small screens with iOS Safe Area) */}
      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-3 z-50 sm:hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-800 shadow-2xl flex items-center justify-between gap-2">
          {/* Status badge */}
          <div className="flex items-center space-x-1.5 pl-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white leading-tight">Order POS</span>
              <span className="text-[9px] text-emerald-400 font-bold leading-tight">Edge &lt;28ms</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5">
            <Link
              href="/r/lung-pa/pos"
              target="_blank"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-bold whitespace-nowrap active:scale-95 transition-transform"
            >
              ⚡ ลอง Demo
            </Link>

            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-500/25 whitespace-nowrap active:scale-95 transition-transform flex items-center space-x-1"
            >
              <span>เปิดร้านฟรี</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Desktop Mac-Style Floating Island (Centered at bottom on larger screens) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 hidden sm:flex items-center space-x-2 p-2 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center space-x-1.5 px-2 text-xs font-bold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono">พร้อมใช้งาน 100%</span>
        </div>
        <div className="w-px h-5 bg-slate-800 mx-1" />
        <Link
          href="/r/lung-pa/table/1"
          target="_blank"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center space-x-1"
        >
          <Smartphone className="w-3.5 h-3.5 text-orange-400" />
          <span>ลองสั่งโต๊ะ 1</span>
        </Link>
        <Link
          href="/r/lung-pa/kitchen"
          target="_blank"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center space-x-1"
        >
          <ChefHat className="w-3.5 h-3.5 text-amber-400" />
          <span>ลองจอครัว</span>
        </Link>
        <Link
          href="/r/lung-pa/pos"
          target="_blank"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center space-x-1"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
          <span>ลองแคชเชียร์</span>
        </Link>
        <div className="w-px h-5 bg-slate-800 mx-1" />
        <Link
          href="/register"
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white text-xs font-black shadow-md shadow-orange-500/20 transition-all"
        >
          เปิดร้านฟรี 30 วัน 🚀
        </Link>
      </div>
    </>
  );
}
