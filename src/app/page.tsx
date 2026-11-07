'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Store,
  QrCode,
  ChefHat,
  CreditCard,
  LayoutGrid,
  UtensilsCrossed,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  Volume2,
  VolumeX,
  DollarSign,
  TrendingUp,
  Clock,
  Star,
  Layers,
  ChevronDown,
  Printer,
  FileCheck,
  Percent,
  Calculator,
  MessageSquare,
  Play,
  RotateCcw,
  Check,
  HelpCircle,
  Menu,
  X,
  Flame,
  ArrowDown,
  Compass,
  Award,
  Sliders,
  Split,
  Eye,
  BellRing,
  Coffee,
  CheckCheck,
  Box,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playOrderChime, getSharedAudioContext } from '@/lib/sound';
import CelestialTechStack from '@/components/CelestialTechStack';
import ScrollReveal from '@/components/ScrollReveal';
import InteractiveComparisonSlider from '@/components/InteractiveComparisonSlider';
import LiveActivityTicker from '@/components/LiveActivityTicker';
import StickyMobileDock from '@/components/StickyMobileDock';
import HeroPosSandbox from '@/components/HeroPosSandbox';
import AudioAmbienceToggle from '@/components/AudioAmbienceToggle';
import AutoAnimate from '@/components/AutoAnimate';
import Spotlight from '@/components/ui/spotlight';
import ThreePosShowcase from '@/components/ThreePosShowcase';

// -----------------------------------------------------------------------------
// Interactive 3D Tilt Card Component (Mouse Reactive Parallax)
// -----------------------------------------------------------------------------
function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState('');
  const [glowStyle, setGlowStyle] = useState({ opacity: 0, x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`
    );
    setGlowStyle({
      opacity: 0.65,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
    setGlowStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: 'transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.18s ease',
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Specular Mouse-Reactive Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 -z-0"
        style={{
          opacity: glowStyle.opacity,
          background: `radial-gradient(450px circle at ${glowStyle.x}% ${glowStyle.y}%, rgba(249, 115, 22, 0.16), transparent 45%)`,
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between">{children}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Animated Counter Component
// -----------------------------------------------------------------------------
function AnimatedCounter({ end, prefix = '', suffix = '' }: { end: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 1600;
          const stepTime = 20;
          const totalSteps = duration / stepTime;
          const increment = end / totalSteps;

          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, stepTime);
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [end, hasAnimated]);

  return (
    <span ref={elementRef} className="font-black tabular-nums">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Interactive Thermal Receipt Simulator Component (ลูกเล่นจำลองการพิมพ์ใบเสร็จ)
// -----------------------------------------------------------------------------
function ThermalReceiptSimulator() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);

  const triggerThermalPrint = () => {
    setIsPrinting(true);
    setHasPrinted(false);

    // Audio synthesizer for thermal printer buzz
    try {
      const ctx = getSharedAudioContext();
      if (ctx) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.35);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {}

    setTimeout(() => {
      setIsPrinting(false);
      setHasPrinted(true);
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.7 },
          colors: ['#f97316', '#10b981'],
        });
      } catch {}
    }, 600);
  };

  return (
    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4 max-w-sm mx-auto text-left relative overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-white block">จำลองเครื่องพิมพ์ 80mm</span>
            <span className="text-[10px] text-emerald-400 font-bold">Bluetooth • พร้อมพิมพ์</span>
          </div>
        </div>
        <button
          onClick={triggerThermalPrint}
          disabled={isPrinting}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-black text-[11px] shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center space-x-1"
        >
          <span>{isPrinting ? 'กำลังพิมพ์...' : 'กดพิมพ์ใบเสร็จ'}</span>
        </button>
      </div>

      {/* Printer Output Slot */}
      <div className="w-full bg-slate-900 h-2 rounded-full border border-slate-700/80 shadow-inner" />

      {/* Simulated Thermal Paper Roll Sliding Down */}
      <div
        className={`bg-white text-slate-900 p-4 rounded-xl shadow-2xl font-mono text-[11px] space-y-2 transition-all duration-700 transform origin-top ${
          hasPrinted || isPrinting
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-40 -translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="text-center border-b border-dashed border-slate-400 pb-2 space-y-0.5">
          <div className="font-black text-xs uppercase tracking-wider">ร้านตามสั่งป้าป่อง (ORDEO POS)</div>
          <div className="text-[9px] text-slate-600">สาขาหลัก • โทร. 092-498-4391</div>
          <div className="text-[9px] text-slate-500">โต๊ะ: 03 | วันที่: 14/10/2026 12:45</div>
        </div>

        <div className="space-y-1 py-1 border-b border-dashed border-slate-400 text-[10px]">
          <div className="flex justify-between">
            <span>1x ข้าวกะเพราหมูกรอบ</span>
            <span>65.00</span>
          </div>
          <div className="flex justify-between text-slate-600 pl-2">
            <span>+ ไข่ดาวกรอบ</span>
            <span>10.00</span>
          </div>
          <div className="flex justify-between">
            <span>1x ชาเย็นหวานน้อย</span>
            <span>25.00</span>
          </div>
        </div>

        <div className="space-y-0.5 pt-1 text-[11px] font-black">
          <div className="flex justify-between">
            <span>ยอดรวมสุทธิ:</span>
            <span>฿100.00</span>
          </div>
          <div className="flex justify-between text-[10px] text-emerald-700 font-bold">
            <span>ชำระโดย: PromptPay QR</span>
            <span>สำเร็จ</span>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[9px] text-slate-500">
          ขอบคุณที่ใช้บริการค่ะ • Order POS System
        </div>
      </div>
    </div>
  );
}

// (Components InteractiveComparisonSlider, LiveActivityTicker, and StickyMobileDock are imported from @/components/)

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
export default function SaaSModernLandingPage() {
  // 1. Dynamic Plans from Database API
  const [plans, setPlans] = useState<any[]>([]);

  // 2. Interactive Feature Simulator State
  const [activeTab, setActiveTab] = useState<'qr' | 'kds' | 'pos' | 'bom' | 'slip' | '3d'>('qr');
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [kdsStatus, setKdsStatus] = useState<'WAITING' | 'COOKING' | 'SERVED'>('COOKING');
  const [selectedSimTable, setSelectedSimTable] = useState<number>(3);

  // Simulated Dish Customizer in Tab 1
  const [simDishSpice, setSimDishSpice] = useState<'mild' | 'regular' | 'hot'>('regular');
  const [simAddEgg, setSimAddEgg] = useState(true);
  const [simExtraRice, setSimExtraRice] = useState(false);

  // 3. Scrollytelling Journey State
  const [activeStoryStep, setActiveStoryStep] = useState<number>(1);

  // 4. Interactive ROI Calculator States
  const [tableCount, setTableCount] = useState<number>(12);
  const [dailySales, setDailySales] = useState<number>(6500);

  // 5. Mobile Menu & FAQ States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // 5.1 Realtime Scroll Progress Tracking for Instant Swipe Feedback
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 6. Interactive Cursor Tracking for Hero Spotlight
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Track global mouse position for ambient spotlight
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  // 7. Immersive Canvas Particle Animation (Warm Restaurant Embers)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate lightweight warm ember particles
    const particleCount = window.innerWidth < 768 ? 24 : 48;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.5 + 0.15,
      hue: Math.random() > 0.6 ? 24 : 38,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 55%, ${p.opacity})`;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 50%, 0.4)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch plans from platform-admin API (keeps 100% existing logic intact)
  useEffect(() => {
    fetch('/api/platform-admin/plans')
      .then((r) => r.json())
      .then((d) => {
        if (d.plans && Array.isArray(d.plans) && d.plans.length > 0) {
          const visible = d.plans.filter((p: any) => !p.id?.toLowerCase().includes('idempotency'));
          setPlans(visible);
        } else {
          setPlans([
            { id: 'trial', name: 'Trial (ทดลองใช้ฟรี)', price: 0, durationDays: 30, maxTables: 10, description: 'ใช้งานครบทุกฟังก์ชันฟรี 30 วัน' },
            { id: 'monthly', name: 'Basic รายเดือน', price: 99, durationDays: 30, maxTables: 15, description: 'เหมาะสำหรับร้านอาหารตามสั่ง 1-15 โต๊ะ' },
            { id: 'halfyear', name: 'Pro (6 เดือน)', price: 499, durationDays: 180, maxTables: 30, description: 'เฉลี่ยเพียง 83 บ./เดือน คุ้มค่า' },
            { id: 'yearly', name: 'Unlimited รายปี', price: 899, durationDays: 365, maxTables: 99, description: 'เฉลี่ยเพียง 75 บ./เดือน โต๊ะไม่จำกัด' },
          ]);
        }
      })
      .catch(() => {
        setPlans([
          { id: 'trial', name: 'Trial (ทดลองใช้ฟรี)', price: 0, durationDays: 30, maxTables: 10, description: 'ใช้งานครบทุกฟังก์ชันฟรี 30 วัน' },
          { id: 'monthly', name: 'Basic รายเดือน', price: 99, durationDays: 30, maxTables: 15, description: 'เหมาะสำหรับร้านอาหารตามสั่ง 1-15 โต๊ะ' },
          { id: 'halfyear', name: 'Pro (6 เดือน)', price: 499, durationDays: 180, maxTables: 30, description: 'เฉลี่ยเพียง 83 บ./เดือน คุ้มค่า' },
          { id: 'yearly', name: 'Unlimited รายปี', price: 899, durationDays: 365, maxTables: 99, description: 'เฉลี่ยเพียง 75 บ./เดือน โต๊ะไม่จำกัด' },
        ]);
      });
  }, []);

  // ROI Calculations
  const calculatedBenefits = useMemo(() => {
    const hoursSavedPerDay = (tableCount * 0.2).toFixed(1);
    const tableTurnoverIncrease = Math.round(dailySales * 0.18);
    const monthlyExtraRevenue = Math.round(tableTurnoverIncrease * 30);
    const monthlyTimeSavedHours = Math.round(parseFloat(hoursSavedPerDay) * 30);
    return {
      hoursSavedPerDay,
      monthlyExtraRevenue,
      monthlyTimeSavedHours,
    };
  }, [tableCount, dailySales]);

  // Trigger celebration confetti when clicking ROI action
  const handleCalculateCelebration = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#f97316', '#f59e0b', '#10b981'],
      });
    } catch {}
  };

  // Thai Voice Simulation for Kitchen KDS
  const handleSimulateThaiVoice = () => {
    setIsVoicePlaying(true);
    try {
      playOrderChime();
    } catch {}

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = 'มีออเดอร์ใหม่ โต๊ะ 3 ข้าวกะเพราหมูกรอบ ไข่ดาว ไม่ใส่พริก';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.05;
      utterance.onend = () => setIsVoicePlaying(false);
      utterance.onerror = () => setIsVoicePlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsVoicePlaying(false), 2000);
    }
  };

  // Simulated total price for customer ordering tab
  const simCustomizedTotal = useMemo(() => {
    let total = 65;
    if (simAddEgg) total += 10;
    if (simExtraRice) total += 10;
    return total;
  }, [simAddEgg, simExtraRice]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      {/* Skip to Main Content Link (WCAG 2.4.1 Bypass Blocks) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-orange-500 focus:text-white focus:rounded-xl focus:font-black focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      {/* Top Ambient Scroll Progress Bar with Glowing Gradient */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none bg-slate-900/30">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-sky-400 shadow-[0_0_14px_rgba(249,115,22,0.9)] transition-all duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 
        =========================================================================
        IMMERSIVE CANVAS BACKGROUND: Warm Ember Particles (60fps, Zero GPU Lag)
        =========================================================================
      */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-70" />

      {/* Dynamic Cursor Spotlight Radial Lighting */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 hidden md:block"
        style={{
          background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249, 115, 22, 0.05), transparent 60%)`,
        }}
      />

      {/* Ambient Radial Mesh Lights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-orange-500/15 via-amber-500/5 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-0 w-[450px] h-[450px] bg-emerald-600/10 blur-[140px] pointer-events-none -z-10" />

      {/* Live Activity Ticker (Live Social Proof Feed) */}
      <LiveActivityTicker />

      {/* Floating Quick Action Dock (Mobile Dock + Desktop Island) */}
      <StickyMobileDock />

      {/* =========================================================================
          1. HEADER / NAVBAR (Clean Glassmorphism with Rapid Single-Line Navigation)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#070b14]/85 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:scale-105 group-hover:shadow-orange-500/40 transition-all">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="text-lg sm:text-xl font-black text-white tracking-tight">Order POS</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                  Cloud SaaS
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden md:block">
                ระบบจัดการร้านอาหารตามสั่ง & สแกนสั่งที่โต๊ะ
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-5 text-xs font-bold text-slate-300 whitespace-nowrap">
            <a href="#story" className="hover:text-orange-400 transition-colors flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span>เรื่องราว (Journey)</span>
            </a>
            <a href="#compare" className="hover:text-orange-400 transition-colors">
              เปรียบเทียบก่อน-หลัง
            </a>
            <a href="#simulator" className="hover:text-orange-400 transition-colors">
              ทดลองระบบ
            </a>
            <a href="#calculator" className="hover:text-orange-400 transition-colors">
              คำนวณกำไร (ROI)
            </a>
            <a href="#tech-stack" className="hover:text-sky-400 transition-colors flex items-center space-x-1 text-sky-300">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>เทคโนโลยีระดับโลก</span>
            </a>
            <a href="#pricing" className="hover:text-orange-400 transition-colors">
              ราคาแพ็กเกจ
            </a>
            <a href="#faq" className="hover:text-orange-400 transition-colors">
              คำถามที่พบบ่อย
            </a>
            <Link
              href="/board"
              className="hover:text-amber-400 transition-colors flex items-center space-x-1 text-amber-300"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>เว็บบอร์ด & โหวตฟีเจอร์</span>
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            <AudioAmbienceToggle />

            <Link
              href="/board"
              className="inline-flex px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-all items-center space-x-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>โหวตฟีเจอร์</span>
            </Link>

            <Link
              href="/login"
              className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700/80 bg-slate-900/60 transition-all items-center justify-center"
            >
              เข้าสู่ระบบ
            </Link>

            <Link
              href="/register"
              className="hidden md:inline-flex px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all items-center space-x-1"
            >
              <span>ทดลองใช้ฟรี</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Button (Hamburger) - ALWAYS VISIBLE ON MOBILE (< lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 sm:p-2.5 rounded-xl text-slate-200 hover:text-white bg-slate-900 border border-slate-700/80 hover:border-orange-500/50 lg:hidden focus:outline-none flex items-center justify-center flex-shrink-0 shadow-sm active:scale-95 transition-all"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-orange-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-[#0b101b] px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200">
            {/* Quick Action Buttons for Mobile */}
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800/80">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-700 text-center flex items-center justify-center hover:bg-slate-800"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-xs font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-md text-center flex items-center justify-center hover:opacity-95"
              >
                เปิดร้านฟรี 30 วัน 🚀
              </Link>
            </div>
            <a
              href="#story"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 hover:text-orange-400 py-2 border-b border-slate-800/60"
            >
              📖 การเดินทางของ 1 ออเดอร์ (Scrollytelling)
            </a>
            <a
              href="#compare"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 hover:text-orange-400 py-2 border-b border-slate-800/60"
            >
              ↔️ รูดเปรียบเทียบก่อน-หลัง (Comparison)
            </a>
            <a
              href="#simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 hover:text-orange-400 py-2 border-b border-slate-800/60"
            >
              🎮 จำลองทดลองฟังก์ชัน (Simulator)
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 hover:text-orange-400 py-2 border-b border-slate-800/60"
            >
              💰 คำนวณความคุ้มค่า (ROI Calculator)
            </a>
            <a
              href="#tech-stack"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-sky-300 hover:text-sky-400 py-2 border-b border-slate-800/60"
            >
              ⚡ สถาปัตยกรรมระดับโลก (Tech Stack)
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 hover:text-orange-400 py-2 border-b border-slate-800/60"
            >
              🏷️ แพ็กเกจราคา
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 hover:text-orange-400 py-2"
            >
              ❓ คำถามที่พบบ่อย (FAQ)
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between py-1 px-1">
                <span className="text-xs font-bold text-slate-400">เสียงบรรยากาศร้าน (SFX):</span>
                <AudioAmbienceToggle />
              </div>
              <Link
                href="/board"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 text-center"
              >
                💬 ชุมชน & โหวตฟีเจอร์ที่อยากได้
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION (High-Impact Headline & Primary Conversion Anchors)
          ========================================================================= */}
      <section id="main-content" className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#f97316" />
        <ScrollReveal direction="fade" duration={900} className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-extrabold shadow-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>POS เจาะกลุ่มร้านอาหารตามสั่ง & สตรีทฟู้ด • ใช้งานได้บนมือถือทันที</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.25] sm:leading-[1.2] max-w-4xl mx-auto">
            <span>ยกระดับร้านอาหารตามสั่ง</span>{' '}
            <span className="inline-block">สู่ระบบอัจฉริยะ</span> <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent inline-block">
              สแกนสั่งที่โต๊ะ • จอครัวพูดไทย • ตัดสต็อกอัตโนมัติ
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            ไม่ต้องซื้อ iPad หรือเครื่อง POS ราคาแพงหลักหมื่น ใช้มือถือหรือแท็บเล็ตเดิมที่มีได้ทันที <br className="hidden sm:inline" />
            <strong className="text-white font-semibold">จบปัญหาจดออเดอร์ผิด สลิปปลอม และของหมดกะทันหัน</strong> เปิดร้านของคุณได้ใน 1 นาที!
          </p>

          {/* Conversion CTAs */}
          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
            <Link
              href="/register"
              className="group relative z-0 w-full sm:w-auto overflow-hidden px-8 py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-xl shadow-orange-500/35 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
                <span className="size-44 rounded-full bg-[linear-gradient(90deg,#ffedd5_0%,#f97316_50%,#38bdf8_100%)] opacity-0 blur-[22px] transition-all duration-300 group-hover:size-36 group-hover:opacity-100 motion-safe:group-hover:animate-spin" />
              </span>
              <span className="relative z-[2] flex items-center space-x-2">
                <span>🚀 สมัครเปิดร้านฟรี 30 วัน</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <a
              href="#tech-stack"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl text-sm font-extrabold text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/10 group"
            >
              <Sparkles className="w-4 h-4 text-sky-400 group-hover:rotate-12 transition-transform" />
              <span>ดูสถาปัตยกรรมระดับโลก</span>
            </a>

            <a
              href="#compare"
              className="w-full sm:w-auto px-5 py-4 rounded-2xl text-sm font-extrabold text-slate-300 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center space-x-2"
            >
              <Split className="w-4 h-4 text-orange-400" />
              <span>เปรียบเทียบก่อน-หลัง</span>
            </a>
          </div>

          {/* Direct Sandbox Quick Demos (Keeps all existing links working 100%) */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
            <span className="text-slate-400 font-medium">ลองเล่นระบบตัวอย่าง:</span>
            <Link
              href="/r/lung-pa/pos"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all flex items-center space-x-1"
            >
              <span>🖥️ หน้าร้าน (POS)</span>
            </Link>
            <Link
              href="/r/lung-pa/table/1"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30 transition-all flex items-center space-x-1"
            >
              <span>📱 ลูกค้าสแกนสั่ง (โต๊ะ 1)</span>
            </Link>
            <Link
              href="/r/lung-pa/kitchen"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 transition-all flex items-center space-x-1"
            >
              <span>🍳 จอห้องครัว (KDS)</span>
            </Link>
          </div>

          {/* Interactive Hero POS Sandbox (Mini Playable Micro-Demo) */}
          <div className="pt-4 pb-2">
            <ScrollReveal direction="up" delay={120}>
              <HeroPosSandbox />
            </ScrollReveal>
          </div>

          {/* Social Proof Stats Ribbon with Live Animated Counters */}
          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <span className="text-xl sm:text-2xl font-black text-white block">
                <AnimatedCounter end={1250} suffix="+" />
              </span>
              <span className="text-[11px] text-slate-400 font-medium">ร้านอาหารที่เปิดใช้งาน</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <span className="text-xl sm:text-2xl font-black text-orange-400 block">
                <AnimatedCounter end={48} prefix="฿" suffix="M+" />
              </span>
              <span className="text-[11px] text-slate-400 font-medium">ยอดสั่งซื้อผ่านระบบ</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 block">99.99%</span>
              <span className="text-[11px] text-slate-400 font-medium">ความเสถียร (Cloudflare)</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <span className="text-xl sm:text-2xl font-black text-amber-400 block">4.9 / 5 ★</span>
              <span className="text-[11px] text-slate-400 font-medium">คะแนนความพึงพอใจ</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* =========================================================================
          3. INTERACTIVE BEFORE/AFTER SLIDER (สไลเดอร์รูดเปรียบเทียบก่อน-หลัง)
          ========================================================================= */}
      <section id="compare" className="py-16 sm:py-24 bg-gradient-to-b from-[#070b14] via-[#090e1a] to-[#070b14] border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <ScrollReveal direction="up">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-black uppercase tracking-wider">
                <Split className="w-3.5 h-3.5" />
                <span>Interactive Comparison</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ความแตกต่างที่คุณสัมผัสได้ตั้งแต่วันแรก
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                ลองรูดแท่งเปรียบเทียบซ้าย-ขวา เพื่อดูการเปลี่ยนแปลงของบรรยากาศร้านเมื่อนำเทคโนโลยีเข้ามาช่วย
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={160}>
            <InteractiveComparisonSlider />
          </ScrollReveal>
        </div>
      </section>

      {/* =========================================================================
          4. SCROLLYTELLING: "The Journey of an Order" (การเดินทางของ 1 ออเดอร์)
          ========================================================================= */}
      <section id="story" className="py-20 sm:py-28 bg-[#090e1a] border-y border-slate-800/80 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <ScrollReveal direction="up">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 text-xs font-black uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5" />
                <span>Scrollytelling Experience</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                การเดินทางของ 1 ออเดอร์: จากลูกค้าก้าวเข้าร้าน สู่กำไรปิดกะ
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
                ดูการทำงานที่ประสานกันแบบอัตโนมัติในทุกขั้นตอน แตะเลือกแต่ละฉากเพื่อดูการเปลี่ยนผ่านที่ไร้รอยต่อ
              </p>
            </div>
          </ScrollReveal>

          {/* Interactive Story Timeline Controller */}
          <ScrollReveal direction="up" delay={120}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-4xl mx-auto">
              {[
                { step: 1, label: '1. ลูกค้าสแกนโต๊ะ', icon: Smartphone },
                { step: 2, label: '2. จอครัวขานเสียง', icon: ChefHat },
                { step: 3, label: '3. ตัดสต็อกสูตร (BOM)', icon: UtensilsCrossed },
                { step: 4, label: '4. Dynamic PromptPay', icon: CreditCard },
                { step: 5, label: '5. สรุปยอดขาย & กำไร', icon: BarChart3 },
              ].map((s) => {
                const IconComponent = s.icon;
                const isActive = activeStoryStep === s.step;
                return (
                  <button
                    key={s.step}
                    onClick={() => setActiveStoryStep(s.step)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center space-y-1.5 ${
                      isActive
                        ? 'bg-gradient-to-b from-orange-500/20 to-orange-500/5 border-orange-500 text-white font-black shadow-lg shadow-orange-500/20 scale-[1.02]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                    <span className="text-[11px] leading-tight font-extrabold">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Interactive Stage Box */}
          <ScrollReveal direction="up" delay={240}>
            <div className="p-6 sm:p-10 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-2xl relative overflow-hidden min-h-[380px] flex items-center justify-center">
            {/* Story Step 1: Scan */}
            {activeStoryStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-right-4 duration-500 ease-out w-full">
                <div className="space-y-4">
                  <span className="text-xs font-black text-orange-400 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                    ฉากที่ 1 • Contactless Ordering
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    ลูกค้านั่งที่โต๊ะ 3 สแกน QR แล้วเลือกสั่งเอง
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    หมดปัญหาเด็กเสิร์ฟเดินวนรอจดออเดอร์ ลูกค้าเปิดเมนูผ่านเบราว์เซอร์ได้ทันที เลือก "ข้าวกะเพราหมูกรอบ เพิ่มไข่ดาว ไม่ใส่พริก" 
                    ความต้องการถูกบันทึกเป๊ะ 100% ไม่มีผิดเพี้ยน
                  </p>
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ลดเวลาการสั่งอาหารลง 4 นาทีต่อโต๊ะ</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3 max-w-sm mx-auto shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-black text-white">โต๊ะ 3 • ออเดอร์สด</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">
                      กดส่งออเดอร์แล้ว 🚀
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between font-bold">
                      <span>1x ข้าวกะเพราหมูกรอบ</span>
                      <span>฿65</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 pl-3">+ ไข่ดาวกรอบ (+฿10)</div>
                    <div className="text-[11px] text-amber-400 pl-3">⚠️ โน้ต: ไม่ใส่พริก, ขอใบกะเพราเยอะๆ</div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-black text-white">
                    <span>ยอดรวมชั่วคราว:</span>
                    <span className="text-orange-400">฿75.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* Story Step 2: KDS */}
            {activeStoryStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-right-4 duration-500 ease-out w-full">
                <div className="space-y-4">
                  <span className="text-xs font-black text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    ฉากที่ 2 • Real-time Kitchen Voice
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    ออเดอร์เด้งเข้าจอครัว พร้อมเสียงขานภาษาไทย
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    พ่อครัวหน้าเตาไม่ต้องเงยหน้าเพ่งตั๋วกระดาษ ระบบสังเคราะห์เสียงภาษาไทยอ่านชื่อโต๊ะและรายการอาหารทันที:
                    *"มีออเดอร์ใหม่ โต๊ะ 3 ข้าวกะเพราหมูกรอบ ไข่ดาว ไม่ใส่พริก"* พ่อครัวเริ่มผัดได้ทันควัน
                  </p>
                  <button
                    onClick={handleSimulateThaiVoice}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center space-x-2 transition-all"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>🔊 กดทดสอบฟังเสียงขานในครัว</span>
                  </button>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border-2 border-amber-500/40 space-y-3 max-w-sm mx-auto shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-black text-white">ตั๋วครัว KDS #03</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                      กำลังผัด 🍳
                    </span>
                  </div>
                  <div className="text-xs text-white font-black">โต๊ะ 3: กะเพราหมูกรอบ (ไข่ดาว)</div>
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl">
                    คำสั่งพิเศษ: ไม่ใส่พริก
                  </div>
                  <div className="text-[10px] text-slate-400">เวลาที่รอ: 1 นาที 15 วินาที</div>
                </div>
              </div>
            )}

            {/* Story Step 3: BOM Stock */}
            {activeStoryStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-right-4 duration-500 ease-out w-full">
                <div className="space-y-4">
                  <span className="text-xs font-black text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    ฉากที่ 3 • Automatic Recipe BOM
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    เมื่อปรุงเสร็จ สต็อกวัตถุดิบจะถูกหักทันที
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    ระบบ Recipe BOM รู้ว่าจานนี้ต้องใช้หมูกรอบ 100 กรัม, ไข่ไก่ 1 ฟอง, และใบกะเพรา 20 กรัม 
                    สต็อกในคลังจะถูกหักลบอัตโนมัติ ตัดปัญหาวัตถุดิบรั่วไหลหรือของหมดแบบไม่รู้ตัว
                  </p>
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ตัดของเสียและป้องกันของหายได้ถึง 15%</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-2.5 max-w-sm mx-auto shadow-xl text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 font-black text-white">
                    <span>คลังวัตถุดิบ</span>
                    <span className="text-emerald-400">Auto-Deducted</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 flex justify-between items-center">
                    <span>หมูกรอบทอด</span>
                    <span className="text-red-400 font-black">-100 g</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 flex justify-between items-center">
                    <span>ไข่ไก่สด</span>
                    <span className="text-red-400 font-black">-1 ฟอง</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 flex justify-between items-center">
                    <span>ใบกะเพรา</span>
                    <span className="text-red-400 font-black">-20 g</span>
                  </div>
                </div>
              </div>
            )}

            {/* Story Step 4: Settle & Slip */}
            {activeStoryStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-right-4 duration-500 ease-out w-full">
                <div className="space-y-4">
                  <span className="text-xs font-black text-purple-400 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                    ฉากที่ 4 • Dynamic Settle & Verify
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    เช็คบิลด้วย Dynamic PromptPay ยอดเป๊ะ
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    ลูกค้ากดเรียกเช็คบิลจากโต๊ะ แคชเชียร์กดออก QR Code พร้อมเพย์ยอด ฿75.00 ตรงเป๊ะ ลูกค้าไม่ต้องพิมพ์ยอดเอง 
                    ระบบตรวจสอบสลิปและเงินเข้าบัญชีทันทีพร้อมสั่งพิมพ์ใบเสร็จ 80mm
                  </p>
                  <div className="flex items-center space-x-2 text-xs font-bold text-purple-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ป้องกันสลิปปลอมและสลิปใช้ซ้ำ 100%</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-purple-500/30 text-center space-y-3 max-w-sm mx-auto shadow-xl">
                  <div className="w-20 h-20 bg-white p-1.5 rounded-xl mx-auto flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-950" />
                  </div>
                  <div className="text-sm font-black text-white">ยอดชำระ: ฿75.00</div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ได้รับเงินเรียบร้อย • พิมพ์ใบเสร็จสำเร็จ</span>
                  </div>
                </div>
              </div>
            )}

            {/* Story Step 5: Report */}
            {activeStoryStep === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-right-4 duration-500 ease-out w-full">
                <div className="space-y-4">
                  <span className="text-xs font-black text-blue-400 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                    ฉากที่ 5 • Daily Closure & Profit
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    ปิดกะ สรุปยอดขาย & กำไรสุทธิทันใจ
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    สิ้นวันไม่ต้องนั่งบวกเลขในกระดาษ ระบบคำนวณยอดขายรวม แยกเงินสด vs เงินโอน รายงานเมนูขายดี Top 5 
                    และคำนวณต้นทุนวัตถุดิบสุทธิ ส่งข้อมูลตรงถึงมือถือเจ้าของร้านทันที
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs shadow-lg shadow-orange-500/25 items-center space-x-2"
                  >
                    <span>เริ่มเปิดร้านเพื่อรับประสบการณ์นี้</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3 max-w-sm mx-auto shadow-xl text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 font-black text-white">
                    <span>รายงานปิดกะประจำวัน</span>
                    <span className="text-emerald-400">กำไร +38%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ยอดขายรวม:</span>
                    <span className="text-white font-bold">฿8,450</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>จำนวนบิลที่เสิร์ฟ:</span>
                    <span className="text-white font-bold">94 โต๊ะ</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>เมนูขายดีอันดับ 1:</span>
                    <span className="text-orange-400 font-bold">กะเพราหมูกรอบ (42 จาน)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
      </section>

      {/* =========================================================================
          5. INTERACTIVE SIMULATOR (Live Product Showcase with 5 Functional Modes)
          ========================================================================= */}
      <section id="simulator" className="py-16 sm:py-24 bg-gradient-to-b from-[#090e1a] to-[#070b14] border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
          <ScrollReveal direction="up">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Product Tour</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                สัมผัสประสบการณ์ใช้งานจริงของแต่ละหน้าจอ
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                แตะสลับแท็บเพื่อดูความลื่นไหลของระบบที่ออกแบบมาสำหรับร้านอาหารตามสั่งโดยเฉพาะ
              </p>
            </div>
          </ScrollReveal>

          {/* Simulator Navigation Tabs */}
          <ScrollReveal direction="up" delay={120}>
            <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  activeTab === 'qr'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>1. สแกนสั่งที่โต๊ะ</span>
              </button>

              <button
                onClick={() => setActiveTab('kds')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  activeTab === 'kds'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span>2. จอครัวเสียงพูดไทย (KDS)</span>
              </button>

              <button
                onClick={() => setActiveTab('pos')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  activeTab === 'pos'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>3. แคชเชียร์ & ผังโต๊ะ</span>
              </button>

              <button
                onClick={() => setActiveTab('bom')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  activeTab === 'bom'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>4. ตัดสต็อกสูตรอาหาร (BOM)</span>
              </button>

              <button
                onClick={() => setActiveTab('slip')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  activeTab === 'slip'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>5. พิมพ์ใบเสร็จ & ตรวจสลิป</span>
              </button>

              <button
                onClick={() => setActiveTab('3d')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  activeTab === '3d'
                    ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Box className="w-4 h-4 text-cyan-400" />
                <span>6. โมเดล 3D Station</span>
              </button>
            </div>
          </ScrollReveal>

          {/* Interactive Screen Display Box */}
          <ScrollReveal direction="up" delay={220}>
            <div className="p-4 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden min-h-[440px] flex flex-col justify-center">
            {/* TAB 1: QR Ordering Simulation with Interactive Customizer */}
            {activeTab === 'qr' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    โต๊ะ 3 • ลูกค้าสั่งเองผ่านมือถือ
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    ลูกค้าสแกนปุ๊บ สั่งได้ทันที ไม่ต้องรอน้องพนักงาน
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    ลองแตะเปลี่ยนระดับความเผ็ด หรือเพิ่มไข่ดาวในหน้าจอมือถือจำลองทางขวาได้เลย 
                    ระบบจะคำนวณยอดเงินและส่งออเดอร์ตรงเข้าครัวแบบ Realtime
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                    <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">✓ ปรับแต่งออปชันได้</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">✓ อัปเดตราคาแบบสด</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">✓ เรียกเช็คบิลได้จากโต๊ะ</span>
                  </div>
                </div>

                {/* Simulated Phone Mockup with Functional Options */}
                <div className="w-full max-w-sm mx-auto bg-slate-950 p-4 rounded-3xl border-4 border-slate-800 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-white">ร้านป้าป่องอาหารตามสั่ง (โต๊ะ 3)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      ออนไลน์
                    </span>
                  </div>

                  {/* Menu Card */}
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-white">ข้าวกะเพราหมูกรอบ</h4>
                        <span className="text-[11px] text-orange-400 font-extrabold">฿65.00</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 font-bold">
                        ยอดฮิต 🔥
                      </span>
                    </div>

                    {/* Interactive Spice Level Selector */}
                    <div className="space-y-1 text-[11px]">
                      <span className="text-slate-400 font-bold block">เลือกระดับความเผ็ด:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'mild', label: 'เผ็ดน้อย' },
                          { id: 'regular', label: 'เผ็ดปกติ' },
                          { id: 'hot', label: 'เผ็ดมาก 🔥' },
                        ].map((sp) => (
                          <button
                            key={sp.id}
                            onClick={() => setSimDishSpice(sp.id as any)}
                            className={`py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              simDishSpice === sp.id
                                ? 'bg-orange-500 text-white border-orange-400'
                                : 'bg-slate-950 text-slate-300 border-slate-800'
                            }`}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Addons Toggle */}
                    <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400 font-bold block">ท็อปปิ้งเสริม:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSimAddEgg(!simAddEgg)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            simAddEgg
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {simAddEgg ? '✓ ไข่ดาว (+10บ.)' : '+ ไข่ดาว'}
                        </button>
                        <button
                          onClick={() => setSimExtraRice(!simExtraRice)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            simExtraRice
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {simExtraRice ? '✓ เพิ่มข้าว (+10บ.)' : '+ เพิ่มข้าว'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs font-bold text-orange-400">
                    <span>ยอดรวมจานนี้:</span>
                    <span className="text-sm font-black text-white">฿{simCustomizedTotal}.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: KDS Smart Kitchen Simulation */}
            {activeTab === 'kds' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    จอห้องครัว KDS • Web Audio & TTS
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    จอครัวอัจฉริยะ ขานชื่อโต๊ะและเมนูภาษาไทย
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    พ่อครัวไม่ต้องคอยเพ่งอ่านกระดาษแผ่นเล็ก ระบบมีเสียงสังเคราะห์ภาษาไทยอ่านขานโต๊ะและรายการอาหารทันที 
                    แตะ 1 ครั้งเปลี่ยนสถานะเป็นกำลังทำ และแตะอีกครั้งเพื่อส่งต่อให้พนักงานเสิร์ฟ
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleSimulateThaiVoice}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                    >
                      <Volume2 className={`w-4 h-4 ${isVoicePlaying ? 'animate-bounce' : ''}`} />
                      <span>{isVoicePlaying ? 'กำลังขานเสียงภาษาไทย...' : '🔊 กดทดลองฟังเสียงขานออเดอร์ในครัว'}</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Kitchen Ticket Card */}
                <div className="w-full max-w-sm mx-auto bg-slate-950 p-4 rounded-3xl border-2 border-amber-500/40 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/20">
                    <div>
                      <span className="text-xs font-black text-white">ตั๋วครัว #042</span>
                      <span className="text-[10px] text-amber-400 block font-bold">โต๊ะ 3 • สั่งเมื่อ 2 นาทีที่แล้ว</span>
                    </div>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950">
                      {kdsStatus === 'WAITING' ? 'รอทำ' : kdsStatus === 'COOKING' ? 'กำลังผัด 🍳' : 'เสร็จแล้ว ✅'}
                    </span>
                  </div>

                  <div className="space-y-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex justify-between font-extrabold text-white">
                      <span>1x ข้าวกะเพราหมูกรอบ</span>
                      <span className="text-orange-400">พิเศษ</span>
                    </div>
                    <p className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2 py-1 rounded-lg">
                      ⚠️ หมายเหตุ: ไข่ดาวกรอบไข่แดงไม่สุก / ไม่ใส่พริก
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setKdsStatus('COOKING')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        kdsStatus === 'COOKING' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      กำลังปรุง
                    </button>
                    <button
                      onClick={() => setKdsStatus('SERVED')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        kdsStatus === 'SERVED' ? 'bg-emerald-500 text-white font-black' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      เสร็จ/เสิร์ฟ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: POS Terminal & Table Management Simulation */}
            {activeTab === 'pos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    หน้าจอแคชเชียร์ POS & ผังโต๊ะ
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    บริหารจัดการผังโต๊ะ คิดเงิน ย้ายโต๊ะ รวมโต๊ะ สั่งกลับบ้าน
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    หน้าจอแคชเชียร์แบบเรียลไทม์ รองรับทั้งนั่งทานที่ร้าน สั่งกลับบ้าน และออเดอร์เดลิเวอรี 
                    มีปุ่มคำนวณเงินทอนด่วน พิมพ์ใบเสร็จผ่านบลูทูธ และตรวจสอบยอดเงินอัตโนมัติ
                  </p>
                  <div className="flex gap-2 text-xs font-bold">
                    <Link
                      href="/r/lung-pa/pos"
                      target="_blank"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center space-x-1"
                    >
                      <span>เปิดทดลองหน้า POS จริง</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Table Grid Simulator */}
                <div className="w-full max-w-sm mx-auto bg-slate-950 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-white">ผังโต๊ะอาหาร (12 โต๊ะ)</span>
                    <span className="text-[11px] text-slate-400">คลิกเพื่อเลือกโต๊ะ</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((num) => {
                      const isOccupied = num === 2 || num === 3 || num === 5;
                      const isSelected = selectedSimTable === num;
                      return (
                        <button
                          key={num}
                          onClick={() => setSelectedSimTable(num)}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/20 text-white font-black shadow-md'
                              : isOccupied
                              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-bold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs block">โต๊ะ {num}</span>
                          <span className="text-[10px] block opacity-80">
                            {isOccupied ? '฿145 (ทานอยู่)' : 'ว่าง'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 block text-[10px]">โต๊ะที่เลือก:</span>
                      <span className="text-white font-bold">โต๊ะ {selectedSimTable} (ยอดรวม: ฿145)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-orange-500 text-white font-extrabold text-[11px]">
                      คิดเงิน / ปิดบิล
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Recipe BOM Inventory Simulation */}
            {activeTab === 'bom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    สต็อกวัตถุดิบ & สูตรอาหาร (Recipe BOM)
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    ตัดสต็อกวัตถุดิบตามสูตรอาหารอัตโนมัติ ทุกครั้งที่ทำอาหาร
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    หมดปัญหาวัตถุดิบหายโดยไม่ทราบสาเหตุ เมื่อมีออเดอร์ *ข้าวกะเพราหมูกรอบ* 1 จาน ระบบจะตัดหมูกรอบ 100 กรัม, 
                    ไข่ไก่ 1 ฟอง และใบกะเพรา 20 กรัมทันที พร้อมแจ้งเตือนเมื่อของใกล้หมด
                  </p>
                  <div className="flex gap-2 text-xs font-bold">
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-emerald-300 border border-emerald-500/20">
                      ✓ รู้ต้นทุนอาหารเป๊ะ
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-emerald-300 border border-emerald-500/20">
                      ✓ ป้องกันของหาย 100%
                    </span>
                  </div>
                </div>

                {/* Simulated BOM Table */}
                <div className="w-full max-w-sm mx-auto bg-slate-950 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs font-black text-white">
                    <span>สูตร: ข้าวกะเพราหมูกรอบ (1 จาน)</span>
                    <span className="text-emerald-400 font-bold">ตัดสต็อกสด</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">หมูกรอบปรุงสุก</span>
                        <span className="text-[10px] text-slate-400">เหลือ 4,200 กรัม</span>
                      </div>
                      <span className="text-red-400 font-black">-100 กรัม</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">ไข่ไก่เบอร์ 2</span>
                        <span className="text-[10px] text-slate-400">เหลือ 48 ฟอง</span>
                      </div>
                      <span className="text-red-400 font-black">-1 ฟอง</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">ใบกะเพราสด</span>
                        <span className="text-[10px] text-slate-400">เหลือ 850 กรัม</span>
                      </div>
                      <span className="text-red-400 font-black">-20 กรัม</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Thermal Receipt Simulator & Slip Verification */}
            {activeTab === 'slip' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    พิมพ์ใบเสร็จความร้อน & ตรวจสลิปโอน
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    พิมพ์ใบเสร็จ 80mm พร้อม QR Code เช็คบิลฉับไว
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    ลองกดปุ่ม "กดพิมพ์ใบเสร็จ" ด้านขวา เพื่อดูตัวอย่างใบเสร็จไหลออกมาแบบจำลอง 
                    ระบบรองรับเครื่องพิมพ์ Thermal Bluetooth 80mm/58mm และมีระบบตรวจสอบสลิปโอนเงินอัตโนมัติ
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-purple-300 border border-purple-500/20">
                      ✓ รองรับเครื่องพิมพ์บลูทูธ
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-purple-300 border border-purple-500/20">
                      ✓ ตรวจจับสลิปซ้ำ 100%
                    </span>
                  </div>
                </div>

                {/* Simulated Thermal Printer */}
                <ThermalReceiptSimulator />
              </div>
            )}

            {/* TAB 6: 3D Interactive POS Station (Three.js WebGL) */}
            {activeTab === '3d' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    3D Hardware & Dining Simulator (Three.js WebGL)
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    จำลองโต๊ะอาหารและจุดติดตั้ง POS เสมือนจริง 360 องศา
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    ขับเคลื่อนด้วย WebGL และ Three.js สามารถคลิกลากหรือปัดเพื่อหมุนสำรวจโมเดลแท็บเล็ต POS, ป้าย QR สแกนสั่งที่โต๊ะ, และเครื่องพิมพ์ใบเสร็จความร้อนได้อย่างอิสระ
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-cyan-300 border border-cyan-500/20">
                      ✓ WebGL Hardware Acceleration
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-cyan-300 border border-cyan-500/20">
                      ✓ ตอบสนองแบบ Interactive 360°
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/90 rounded-3xl border border-slate-800 p-2 shadow-2xl">
                  <ThreePosShowcase />
                </div>
              </div>
            )}
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* =========================================================================
          6. INTERACTIVE ROI CALCULATOR (Instant Value Projection + Confetti)
          ========================================================================= */}
      <section id="calculator" className="py-16 sm:py-24 bg-[#090e1b] border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          <ScrollReveal direction="up">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-black uppercase">
                <Calculator className="w-3.5 h-3.5" />
                <span>เครื่องคำนวณกำไรและความคุ้มค่า</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                คำนวณผลลัพธ์ที่จะได้สำหรับร้านของคุณ
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                ลองเลื่อนปรับจำนวนโต๊ะและยอดขาย เพื่อดูเวลาที่ประหยัดได้และโอกาสเพิ่มยอดขาย
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={160}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/90 p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Slider 1: Tables */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">จำนวนโต๊ะในร้าน:</span>
                  <span className="text-orange-400 font-extrabold text-sm">{tableCount} โต๊ะ</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="40"
                  step="1"
                  value={tableCount}
                  onChange={(e) => setTableCount(parseInt(e.target.value))}
                  className="w-full accent-orange-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>4 โต๊ะ (ร้านเล็ก)</span>
                  <span>20 โต๊ะ (ขนาดกลาง)</span>
                  <span>40 โต๊ะ (ร้านใหญ่)</span>
                </div>
              </div>

              {/* Slider 2: Daily Sales */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">ยอดขายเฉลี่ยต่อวัน:</span>
                  <span className="text-emerald-400 font-extrabold text-sm">฿{dailySales.toLocaleString()} บาท</span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="35000"
                  step="500"
                  value={dailySales}
                  onChange={(e) => setDailySales(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>฿1,500</span>
                  <span>฿15,000</span>
                  <span>฿35,000</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                💡 <strong className="text-white font-semibold">ข้อเท็จจริง:</strong> ร้านที่ให้ลูกค้าสแกนสั่งเองจะหมุนรอบโต๊ะได้เร็วขึ้นเฉลี่ย 18% 
                เนื่องจากไม่ต้องรอพนักงานเดินนำเมนูและคิดเงินทีละโต๊ะ
              </div>
            </div>

            {/* Right Output Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-orange-500/10 via-slate-950 to-slate-950 p-6 rounded-3xl border border-orange-500/30 space-y-4 text-center">
              <span className="text-xs font-black text-orange-400 uppercase tracking-wider block">
                ผลลัพธ์คาดการณ์ต่อเดือน
              </span>

              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl font-black text-white">
                  +฿{calculatedBenefits.monthlyExtraRevenue.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-400 font-bold block">
                  โอกาสเพิ่มรายได้จากการหมุนรอบโต๊ะเร็วขึ้น
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300 text-left">
                <div className="flex justify-between">
                  <span>ประหยัดเวลาเด็กเสิร์ฟ:</span>
                  <strong className="text-white">~{calculatedBenefits.hoursSavedPerDay} ชม./วัน</strong>
                </div>
                <div className="flex justify-between">
                  <span>เวลาประหยัดรวมต่อเดือน:</span>
                  <strong className="text-white">{calculatedBenefits.monthlyTimeSavedHours} ชั่วโมง</strong>
                </div>
                <div className="flex justify-between">
                  <span>ค่าบริการรายเดือน:</span>
                  <strong className="text-orange-400">เพียง ฿99 – ฿199 / เดือน</strong>
                </div>
              </div>

              <button
                onClick={handleCalculateCelebration}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs block hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
              >
                🎉 ทดสอบพลังการประหยัด (รับสิทธิ์เลย)
              </button>
            </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* =========================================================================
          7. CORE FEATURES BENTO GRID (Deep Real Capabilities)
          ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="space-y-12">
          <ScrollReveal direction="up">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black uppercase">
                <Layers className="w-3.5 h-3.5" />
                <span>ฟังก์ชันครบวงจร</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ฟังก์ชันที่คิดค้นมาเพื่อร้านตามสั่ง & สตรีทฟู้ด
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                ออกแบบทุกปุ่มให้กดง่าย ตัวหนังสือใหญ่ สบายตา และทำงานได้ฉับไวแม้ในช่วงเวลาชั่วโมงเร่งด่วน
              </p>
            </div>
          </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bento 1: QR Table */}
          <ScrollReveal direction="up" delay={0} className="h-full">
            <TiltCard className="h-full p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 hover:border-orange-500/40">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">QR Code สั่งอาหารประจำโต๊ะ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                เปิดผ่านเว็บได้ทันที ไม่ต้องดาวน์โหลดแอปให้หนักเครื่อง ลูกค้าเลือกเมนู ระดับความเผ็ด และท็อปปิ้งได้ละเอียดตามชอบ
              </p>
            </TiltCard>
          </ScrollReveal>

          {/* Bento 2: KDS with Thai Voice */}
          <ScrollReveal direction="up" delay={120} className="h-full">
            <TiltCard className="h-full p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 hover:border-amber-500/40">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">จอครัวเรียลไทม์ + เสียงพูดไทย (TTS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ออเดอร์ใหม่เด้งเข้าครัวทันทีพร้อมเสียงสังเคราะห์ภาษาไทยอ่านขานชื่อโต๊ะ พ่อครัวแตะเปลี่ยนสถานะเริ่มผัดและเสิร์ฟได้สะดวกรวดเร็ว
              </p>
            </TiltCard>
          </ScrollReveal>

          {/* Bento 3: POS Cashier */}
          <ScrollReveal direction="up" delay={240} className="h-full">
            <TiltCard className="h-full p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 hover:border-blue-500/40">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">จัดการผังโต๊ะ ย้ายโต๊ะ รวมโต๊ะ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ผังโต๊ะแสดงสถานะว่างและยอดเงินแบบสดๆ รองรับการย้ายโต๊ะ รวมโต๊ะ หรือสั่งกลับบ้าน (Takeaway) ได้อย่างยืดหยุ่น
              </p>
            </TiltCard>
          </ScrollReveal>

          {/* Bento 4: Recipe BOM */}
          <ScrollReveal direction="up" delay={360} className="h-full">
            <TiltCard className="h-full p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">ตัดสต็อกสูตรอาหารอัตโนมัติ (BOM)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ผูกเมนูกับวัตถุดิบ ตัดน้ำหนักหมูกรอบ ไก่ ไข่ไก่ อัตโนมัติทุกจานที่ปิดบิล รู้ต้นทุนและกำไรที่แท้จริงแบบเรียลไทม์
              </p>
            </TiltCard>
          </ScrollReveal>

          {/* Bento 5: Thermal Printing */}
          <ScrollReveal direction="up" delay={480} className="h-full">
            <TiltCard className="h-full p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 hover:border-purple-500/40">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">พิมพ์ใบเสร็จ Thermal Bluetooth</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                พิมพ์ใบสรุปยอดก่อนจ่าย (Pre-check) และใบเสร็จรับเงินจริง รองรับเครื่องพิมพ์ความร้อนขนาด 58mm และ 80mm ทั้งสายและบลูทูธ
              </p>
            </TiltCard>
          </ScrollReveal>

          {/* Bento 6: Daily Report */}
          <ScrollReveal direction="up" delay={600} className="h-full">
            <TiltCard className="h-full p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 hover:border-teal-500/40">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">รายงานยอดขาย & สรุปปิดกะ</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                สรุปยอดขายเงินสด vs เงินโอน เมนูขายดี Top 5 และช่วงเวลาที่ลูกค้าแน่นร้าน ส่งรายงานตรงถึงเจ้าของร้านทุกวัน
              </p>
            </TiltCard>
          </ScrollReveal>
        </div>
      </div>
      </section>

      {/* =========================================================================
          8. CELESTIAL ARCHITECTURE & TECH STACK (CelestialCode Inspired Showcase)
          ========================================================================= */}
      <CelestialTechStack />

      {/* =========================================================================
          9. PRICING PLANS (Interactive Dynamic Plans with Toggle)
          ========================================================================= */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="space-y-12">
          <ScrollReveal direction="up">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-black uppercase">
                <DollarSign className="w-3.5 h-3.5" />
                <span>แพ็กเกจราคาโปร่งใส (Pricing)</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ค่าบริการคงที่ ไม่หักส่วนแบ่งยอดขาย
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                เลือกแพ็กเกจที่เหมาะกับขนาดร้านของคุณ ยกเลิกได้ตลอดเวลา ไม่มีสัญญาผูกมัด
              </p>
            </div>
          </ScrollReveal>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, idx) => {
              const isFeatured = plan.id === 'yearly' || plan.name?.includes('รายปี') || plan.name?.includes('Unlimited');
              return (
                <ScrollReveal key={plan.id} direction="up" delay={idx * 135} className="h-full">
                  <TiltCard
                    className={`h-full p-7 rounded-3xl bg-slate-900 border flex flex-col justify-between space-y-6 transition-all shadow-xl relative ${
                      isFeatured
                        ? 'border-orange-500 ring-2 ring-orange-500/30 bg-gradient-to-b from-orange-500/5 via-slate-900 to-slate-900'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isFeatured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md uppercase tracking-wider">
                        ⭐ คุ้มค่าที่สุด (ยอดนิยม)
                      </span>
                    )}

                    <div className="space-y-4">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                        {plan.name}
                      </span>

                      <div>
                        <span className="text-3xl sm:text-4xl font-black text-white">
                          {plan.price === 0 ? 'ฟรี 0' : `฿${plan.price.toLocaleString()}`}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          {plan.price === 0 ? 'บาท' : `/ ${plan.durationDays} วัน`}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                        {plan.description || 'ใช้งานครบทุกฟังก์ชันอย่างมีประสิทธิภาพ'}
                      </p>

                      <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>รองรับสูงสุด {plan.maxTables} โต๊ะ</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>QR Code สั่งอาหารประจำโต๊ะ</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>จอครัว Realtime + เสียงขานไทย</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>PromptPay Dynamic QR</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>ระบบตัดสต็อกสูตรอาหาร (BOM)</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/register"
                      className={`w-full py-3.5 rounded-2xl font-black text-xs text-center transition-all shadow-md block ${
                        isFeatured
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 shadow-orange-500/25'
                          : 'bg-slate-800 hover:bg-orange-500 text-white'
                      }`}
                    >
                      {plan.price === 0 ? 'ทดลองใช้ฟรี 30 วัน' : 'เลือกแพ็กเกจนี้'}
                    </Link>
                  </TiltCard>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FAQ (Frequently Asked Questions Accordion)
          ========================================================================= */}
      <section id="faq" className="py-16 sm:py-24 bg-[#090e1a] border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <ScrollReveal direction="up">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-black uppercase">
                <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                <span>คำถามที่พบบ่อย (FAQ)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                มีข้อสงสัยเกี่ยวกับการใช้งาน? เรามีคำตอบ
              </h2>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {[
              {
                q: 'จำเป็นต้องซื้อ iPad หรือเครื่อง POS ใหม่หรือไม่?',
                a: 'ไม่ต้องซื้อเลยครับ! คุณสามารถใช้โทรศัพท์มือถือ สมาร์ทโฟน หรือแท็บเล็ตเครื่องเดิมที่คุณมีอยู่แล้วเปิดใช้งานผ่านเบราว์เซอร์ (Chrome, Safari) ได้ทันที ประหยัดเงินหลักหมื่นบาท',
              },
              {
                q: 'ลูกค้าต้องดาวน์โหลดแอปพลิเคชันเพื่อสั่งอาหารไหม?',
                a: 'ไม่ต้องดาวน์โหลดแอปครับ ลูกค้าเพียงแค่เปิดกล้องมือถือหรือแอป LINE แล้วสแกน QR Code ประจำโต๊ะ เมนูอาหารจะเปิดขึ้นมาให้สั่งได้ทันที สะดวกรวดเร็วมาก',
              },
              {
                q: 'หากอินเทอร์เน็ตที่ร้านช้า ระบบจะยังทำงานได้ไหม?',
                a: 'ระบบถูกสร้างขึ้นบน Cloudflare Global Edge มีขนาดข้อมูลที่เล็กและเบามาก ทำงานได้ลื่นไหลแม้จะใช้เน็ตมือถือ 4G/5G ทั่วไปครับ',
              },
              {
                q: 'ระบบคิดค่าคอมมิชชันหรือหักเปอร์เซ็นต์ยอดขายหรือไม่?',
                a: 'ไม่มีการหักเปอร์เซ็นต์ส่วนแบ่งยอดขายใดๆ ทั้งสิ้น (0% GP) ยอดขายทุกบาทที่ลูกค้าจ่ายเป็นของร้านค้า 100% เต็ม คุณจ่ายเพียงค่าบริการรายเดือนหรือรายปีคงที่เท่านั้น',
              },
              {
                q: 'สามารถทดลองใช้งานฟรีก่อนได้กี่วัน?',
                a: 'คุณสามารถสมัครและทดลองใช้งานฟรีได้ 30 วันเต็ม โดยไม่ต้องกรอกข้อมูลบัตรเครดิต เมื่อครบกำหนดยังคงเลือกได้ว่าจะต่ออายุในราคาเริ่มต้นเพียง 99 บาท/เดือนครับ',
              },
            ].map((faq, idx) => (
              <ScrollReveal key={idx} direction="up" delay={idx * 65}>
                <AutoAnimate
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-xs sm:text-sm font-extrabold text-white hover:text-orange-400 transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        openFaqIndex === idx ? 'rotate-180 text-orange-400' : ''
                      }`}
                    />
                  </button>
                  {openFaqIndex === idx && (
                    <div className="px-4 sm:px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </AutoAnimate>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMMUNITY & FEATURE REQUEST SHOWCASE BANNER
          ========================================================================= */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <ScrollReveal direction="up" className="w-full">
          <div className="p-7 sm:p-9 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="space-y-2.5 text-center md:text-left relative z-10">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>เว็บบอร์ดชุมชน & โหวตฟีเจอร์</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                อยากได้ฟังก์ชันอะไรเพิ่ม? มาร่วมโหวตและเสนอแนะได้เลย!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                เราพัฒนาฟังก์ชันใหม่ตามเสียงโหวตของผู้ใช้งานจริง เข้าไปพูดคุย แลกเปลี่ยนเทคนิคบริหารร้านอาหารตามสั่ง และกดโหวตฟีเจอร์ที่คุณอยากให้มีในระบบได้ทันที
              </p>
            </div>

            <Link
              href="/board"
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all whitespace-nowrap flex items-center space-x-2 relative z-10 flex-shrink-0"
            >
              <span>💬 เข้าสู่เว็บบอร์ด & โหวตฟีเจอร์</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* =========================================================================
          10. FINAL CONVERSION CTA (Sticky Bottom Closure)
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <ScrollReveal direction="zoom" className="w-full">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-2xl shadow-orange-500/25 space-y-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                พร้อมเปลี่ยนร้านตามสั่งของคุณ ให้เป็นร้านอัจฉริยะแล้วหรือยัง?
              </h2>
              <p className="text-xs sm:text-sm text-orange-100 max-w-xl mx-auto">
                เริ่มต้นได้ทันทีวันนี้ ไม่ต้องใช้บัตรเครดิต มีเมนูตัวอย่างพร้อมใช้งานใน 1 นาที
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs sm:text-sm transition-all shadow-xl hover:scale-105"
              >
                🚀 สมัครเปิดร้านฟรี 30 วัน
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black text-xs sm:text-sm backdrop-blur-md transition-all"
              >
                เข้าสู่ระบบร้านค้าเดิม
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* =========================================================================
          11. FOOTER (Multi-Tenant Platform Branding & Legal)
          ========================================================================= */}
      <footer className="mt-auto border-t border-slate-800 bg-[#05080f] py-10 px-4 text-center text-xs text-slate-500 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-400">
          <Link href="/board" className="hover:text-orange-400 transition-colors">
            💬 ชุมชน & โหวตฟีเจอร์
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-orange-400 transition-colors">
            เข้าสู่ระบบ
          </Link>
          <span>•</span>
          <Link href="/register" className="hover:text-orange-400 transition-colors">
            สมัครเปิดร้านใหม่
          </Link>
          <span>•</span>
          <Link href="/r/lung-pa/pos" target="_blank" className="hover:text-orange-400 transition-colors">
            ทดลองใช้งาน Demo POS
          </Link>
        </div>
        <p className="text-[11px] text-slate-600">
          © 2026 Order POS — ระบบบริหารจัดการร้านอาหารตามสั่งแบบ Multi-Tenant สงวนลิขสิทธิ์
        </p>
      </footer>
    </div>
  );
}
