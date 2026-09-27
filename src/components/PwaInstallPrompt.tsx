'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Check, Share } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Check if previously dismissed in this session
    const dismissedSession = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissedSession) {
      setIsDismissed(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Catch Chrome/Android/Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Catch when app is installed
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Do not show if already in standalone app or dismissed or not installable (and not iOS)
  if (isStandalone || isDismissed || (!isInstallable && !isIos)) {
    return null;
  }

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-bounce-in">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl border border-orange-500/30 shadow-2xl shadow-orange-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-sm text-white tracking-tight truncate">ติดตั้ง Order Pos</h4>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PWA APP
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                ติดตั้งลงเครื่อง ใช้งานเต็มจอ ลื่นไหล ไม่ต้องเปิดเบราว์เซอร์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/25 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              ติดตั้ง
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-white space-y-4 border border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Share className="w-6 h-6" />
            </div>
            <h3 className="font-black text-base">วิธีติดตั้งบน iPhone / iPad</h3>
            <div className="text-left text-xs space-y-2.5 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span>แตะปุ่ม <strong>แชร์ (Share 📤)</strong> ที่แถบเมนูด้านล่างของ Safari</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>เลื่อนลงมาแล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen ➕)"</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span>แตะปุ่ม <strong>"เพิ่ม (Add)"</strong> ที่มุมบนขวา</span>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
