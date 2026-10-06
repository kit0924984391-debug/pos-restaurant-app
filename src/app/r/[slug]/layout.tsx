'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useParams } from 'next/navigation';
import {
  LayoutGrid,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  QrCode,
  Settings,
  Volume2,
  VolumeX,
  Store,
  ExternalLink,
  User,
  Package,
  Gift,
  MoreHorizontal,
  X,
  Columns2,
} from 'lucide-react';
import { playOrderChime } from '@/lib/sound';

const PosTerminal = dynamic(() => import('@/components/tenant/PosTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full flex items-center justify-center p-12 text-slate-400 font-bold text-xs">
      กำลังโหลดจอ POS...
    </div>
  ),
});

const KitchenTerminal = dynamic(() => import('@/components/tenant/KitchenTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full flex items-center justify-center p-12 text-slate-400 font-bold text-xs">
      กำลังโหลดจอครัว KDS...
    </div>
  ),
});

export default function TenantStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = (params?.slug as string) || 'lung-pa';

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_voice_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setSoundEnabled(e.detail.enabled);
      }
    };
    window.addEventListener('pos-voice-changed', handleVoiceChange);
    return () => window.removeEventListener('pos-voice-changed', handleVoiceChange);
  }, []);

  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('pos_split_screen_mode');
      if (saved === 'true') {
        setIsSplitScreen(true);
      }
    } catch (e) {}
  }, []);

  const toggleSplitScreen = () => {
    const nextVal = !isSplitScreen;
    setIsSplitScreen(nextVal);
    try {
      localStorage.setItem('pos_split_screen_mode', nextVal ? 'true' : 'false');
    } catch (e) {}
  };

  useEffect(() => {
    if (pathname?.includes('/table/')) return;

    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setStoreInfo(data);
      })
      .catch(() => {});

    if (typeof document !== 'undefined' && slug) {
      document.cookie = `last_store_slug=${slug}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [slug, pathname]);

  // Close more menu on route change
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  // If the user is on the customer table ordering page (/r/[slug]/table/[id]),
  // DO NOT show any staff/admin navigation bar at all!
  const isCustomerTableRoute = pathname.includes('/table/');
  if (isCustomerTableRoute) {
    return <>{children}</>;
  }

  const primaryMobileNav = [
    { href: `/r/${slug}/pos`, label: 'ผังโต๊ะ POS', icon: LayoutGrid },
    { href: `/r/${slug}/kitchen`, label: 'จอครัว KDS', icon: ChefHat },
    { href: `/r/${slug}/admin/menu`, label: 'เมนูอาหาร', icon: UtensilsCrossed },
    { href: `/r/${slug}/admin/inventory`, label: 'คลังวัตถุดิบ', icon: Package },
  ];

  const allNavItems = [
    { href: `/r/${slug}/pos`, label: 'ผังโต๊ะ & POS', icon: LayoutGrid },
    { href: `/r/${slug}/kitchen`, label: 'ห้องครัว (KDS)', icon: ChefHat },
    { href: `/r/${slug}/admin/tables`, label: 'จัดการโต๊ะ', icon: LayoutGrid },
    { href: `/r/${slug}/admin/menu`, label: 'เมนู & ของหมด', icon: UtensilsCrossed },
    { href: `/r/${slug}/admin/inventory`, label: 'คลังวัตถุดิบ & สูตร', icon: Package },
    { href: `/r/${slug}/admin/promotions`, label: 'สมาชิก & โปรโมชั่น', icon: Gift },
    { href: `/r/${slug}/admin/reports`, label: 'ยอดขาย & ปิดกะ', icon: BarChart3 },
    { href: `/r/${slug}/admin/qr-codes`, label: 'พิมพ์ QR โต๊ะ', icon: QrCode },
    { href: `/r/${slug}/admin/settings`, label: 'ตั้งค่าร้าน', icon: Settings },
  ];

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-orange-500 selection:text-white lg:pb-0 w-full max-w-full overflow-x-hidden"
      style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Top Header */}
      <header
        className="sticky top-0 z-40 glass-header no-print border-b border-slate-200/80 bg-white/90 backdrop-blur-md w-full"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-14 sm:h-18 gap-2 sm:gap-4">
            {/* Store Brand */}
            <Link href={`/r/${slug}/pos`} className="flex items-center space-x-2.5 sm:space-x-3 group flex-shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-slate-900 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Store className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight whitespace-nowrap truncate max-w-[140px] sm:max-w-[220px]">
                  {storeInfo?.storeName || 'ร้านอาหาร'}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-orange-100 text-orange-700 whitespace-nowrap">
                  POS
                </span>
              </div>
            </Link>

            {/* Desktop Navigation (Horizontal Flex with smooth scroll protection) */}
            <nav className="hidden lg:flex items-center space-x-1 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70 text-xs font-bold whitespace-nowrap overflow-x-auto scrollbar-none flex-1 max-w-[1040px] mx-2">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/r/${slug}` && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/60 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                    <span className="text-xs font-extrabold whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Actions & Links */}
            <div className="flex items-center space-x-2 flex-shrink-0 whitespace-nowrap">
              {/* Split Screen Toggle (Desktop / Tablet >= 1024px) */}
              <button
                type="button"
                onClick={toggleSplitScreen}
                title={isSplitScreen ? 'กลับสู่โหมดจอเดี่ยวปกติ' : 'เปิดโหมดแบ่ง 2 จอ (POS + ห้องครัว)'}
                className={`hidden lg:flex items-center space-x-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs transition-all border font-extrabold cursor-pointer shadow-xs ${
                  isSplitScreen
                    ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/25 ring-2 ring-orange-400/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Columns2 className={`w-4 h-4 ${isSplitScreen ? 'text-white' : 'text-orange-500'}`} />
                <span className="text-[11px] whitespace-nowrap">
                  {isSplitScreen ? '2 จอ (POS+ครัว)' : 'แบ่ง 2 จอ'}
                </span>
              </button>

              {/* Sound toggle */}
              <button
                type="button"
                data-sound="tap"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('pos_voice_enabled', next ? 'true' : 'false');
                    localStorage.setItem('pos_audio_unlocked', 'true');
                    window.dispatchEvent(new CustomEvent('pos-voice-changed', { detail: { enabled: next } }));
                  }
                  if (next) playOrderChime();
                }}
                title={soundEnabled ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือน'}
                className={`p-2 sm:p-2.5 rounded-xl text-xs transition-all border flex-shrink-0 flex items-center space-x-1.5 duration-75 active:scale-95 cursor-pointer select-none ${
                  soundEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 font-bold'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
              </button>

              {/* Owner Hub link */}
              <Link
                href="/store/dashboard"
                className="px-3 py-2 sm:py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-all flex items-center space-x-1.5 font-extrabold text-xs shadow-sm"
                title="แดชบอร์ดเจ้าของร้าน"
              >
                <User className="w-4 h-4 text-orange-600" />
                <span className="text-[11px] hidden sm:inline">แดชบอร์ด</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
        {isMounted && isSplitScreen ? (
          <div className="hidden lg:flex flex-row w-full h-[calc(100vh-68px)] overflow-hidden bg-slate-100 divide-x divide-slate-200">
            {/* Left Pane: POS Terminal */}
            <div className="w-1/2 h-full overflow-y-auto bg-white flex flex-col relative scrollbar-thin">
              <div className="sticky top-0 z-20 bg-slate-900 text-white px-3 py-1.5 text-[11px] font-black flex items-center justify-between shadow-xs">
                <span className="flex items-center space-x-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-orange-400" />
                  <span>จอฝั่งซ้าย: ผังโต๊ะ & POS แคชเชียร์</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">รับออเดอร์ / คิดเงิน</span>
              </div>
              <div className="flex-1">
                <PosTerminal slug={slug} isSplitView={true} />
              </div>
            </div>

            {/* Right Pane: Kitchen Terminal */}
            <div className="w-1/2 h-full overflow-y-auto bg-slate-50 flex flex-col relative scrollbar-thin">
              <div className="sticky top-0 z-20 bg-amber-600 text-white px-3 py-1.5 text-[11px] font-black flex items-center justify-between shadow-xs">
                <span className="flex items-center space-x-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-amber-200" />
                  <span>จอฝั่งขวา: ห้องครัว KDS (สถานะ 4 จังหวะ)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-amber-100 font-medium">ตั๋วเข้าครัวแบบเรียลไทม์</span>
                  <button
                    type="button"
                    onClick={toggleSplitScreen}
                    title="ปิดโหมดแบ่ง 2 จอ กลับสู่จอเดี่ยว"
                    className="p-0.5 rounded hover:bg-amber-700 text-amber-100 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <KitchenTerminal slug={slug} isSplitView={true} />
              </div>
            </div>
          </div>
        ) : null}

        {/* Normal Single View (Shown when not in split mode, or on mobile screen) */}
        <div className={isMounted && isSplitScreen ? 'lg:hidden flex-1 flex flex-col' : 'flex-1 flex flex-col'}>
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (5 equal columns) */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl py-1 px-2 grid grid-cols-5 gap-1 no-print"
        style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))' }}
      >
        {primaryMobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== `/r/${slug}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all w-full ${
                isActive
                  ? 'text-orange-600 font-black'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-orange-100' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu Button (Column 5) */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all w-full ${
            isMoreMenuOpen ? 'text-orange-600 font-black' : 'text-slate-500 font-semibold'
          }`}
        >
          <div className="p-1.5 rounded-xl hover:bg-slate-100">
            <MoreHorizontal className="w-5 h-5 text-slate-500" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">เพิ่มเติม</span>
        </button>
      </div>

      {/* Mobile Slide-up Drawer for Extra Menus */}
      {isMoreMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex-1"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-orange-500" />
                <span className="font-extrabold text-slate-900 text-sm">เมนูทั้งหมดของร้าน</span>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={`flex items-center space-x-2.5 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md shadow-orange-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100 font-semibold'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-xs truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/store/dashboard"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md"
              >
                <User className="w-4 h-4 text-orange-400" />
                <span>แดชบอร์ดเจ้าของร้าน (Store Hub)</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
