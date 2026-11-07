'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  PlusCircle,
  LogIn,
  LogOut,
  Store,
  ArrowLeft,
  Search,
  User,
  ShieldCheck,
} from 'lucide-react';
import AuthModal from '@/components/board/AuthModal';

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  async function fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data?.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Board Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 w-full">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Community Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <Link
              href="/"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="กลับหน้าหลักเว็บ Order Pos"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link href="/board" className="flex items-center space-x-2 sm:space-x-2.5 group min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="text-sm sm:text-lg font-black text-white tracking-tight truncate">
                    <span className="hidden sm:inline">Order Pos Board</span>
                    <span className="sm:hidden">Order POS</span>
                  </span>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                    Community &amp; Feedback
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium truncate hidden md:block">
                  กระดานสนทนา &amp; ข้อเสนอแนะฟีเจอร์สำหรับร้านอาหาร
                </span>
              </div>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <Link
              href="/board/new"
              className="py-1.5 sm:py-2.5 px-2.5 sm:px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">ตั้งกระทู้ใหม่</span>
              <span className="sm:hidden">ตั้งกระทู้</span>
            </Link>

            {currentUser ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1 border-l border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-orange-400 truncate max-w-[120px]">
                    {currentUser.store?.name || (currentUser.role === 'SUPER_ADMIN' ? 'ผู้ดูแลระบบ' : 'สมาชิก')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-500/20 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                title="เข้าสู่ระบบ"
                className="py-1.5 sm:py-2.5 px-2.5 sm:px-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-orange-400" />
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Board Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Board Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <p>© 2026 Order Pos Community Board. ร่วมสร้างและพัฒนาเพื่อร้านอาหารตามสั่งไทยทุกร้าน</p>
      </footer>

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => setCurrentUser(u)}
      />
    </div>
  );
}
