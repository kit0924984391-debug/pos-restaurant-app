'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store,
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  Settings,
  LogOut,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== 'SUPER_ADMIN') {
          router.push('/login');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-sm font-bold text-slate-400">กำลังตรวจสอบสิทธิ์ Super Admin...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/platform-admin', label: 'แดชบอร์ดภาพรวม', icon: LayoutDashboard, exact: true },
    { href: '/platform-admin/stores', label: 'จัดการร้านค้า', icon: Building2 },
    { href: '/platform-admin/subscriptions', label: 'ตรวจสลิปแจ้งโอน', icon: Receipt },
    { href: '/platform-admin/plans', label: 'แพ็กเกจราคา', icon: CreditCard },
    { href: '/platform-admin/settings', label: 'บัญชีรับเงิน & ข้อมูลเว็บ', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header (Visible on < md) */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-black text-white text-sm tracking-tight">SUPER ADMIN</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 h-full border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-white text-sm block">SUPER ADMIN</span>
                    <span className="text-[10px] text-orange-400 font-bold uppercase block">Order Pos Platform</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-white block truncate">{user?.name}</span>
                <span className="text-[10px] text-slate-400 block truncate">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Hidden on < md) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center space-x-3 px-3 py-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">SUPER ADMIN</span>
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">Order Pos Platform</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-white block truncate">{user?.name}</span>
            <span className="text-[10px] text-slate-400 block truncate">{user?.email}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/"
              target="_blank"
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              <span>ดูหน้าเว็บ</span>
              <ExternalLink className="w-3.5 h-3.5" />
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[1440px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
