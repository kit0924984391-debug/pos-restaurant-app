'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ChefHat,
  Smartphone,
  CheckCircle2,
  Printer,
  RotateCcw,
  ArrowRight,
  Flame,
  Check,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playOrderChime } from '@/lib/sound';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  spiceDefault: 'mild' | 'med' | 'hot';
}

const MENU_OPTIONS: MenuItem[] = [
  { id: '1', name: 'ข้าวกะเพราหมูกรอบ', price: 65, icon: '🍲', spiceDefault: 'med' },
  { id: '2', name: 'ข้าวผัดคะน้าหมูกรอบ', price: 65, icon: '🍳', spiceDefault: 'mild' },
  { id: '3', name: 'ผัดซีอิ๊วเส้นใหญ่หมู', price: 60, icon: '🍜', spiceDefault: 'mild' },
];

export default function HeroPosSandbox() {
  const [selectedDish, setSelectedDish] = useState<MenuItem>(MENU_OPTIONS[0]);
  const [spiceLevel, setSpiceLevel] = useState<'mild' | 'med' | 'hot'>('med');
  const [addFriedEgg, setAddFriedEgg] = useState(true);
  const [orderState, setOrderState] = useState<'idle' | 'sending' | 'kitchen' | 'served'>('idle');

  const totalPrice = selectedDish.price + (addFriedEgg ? 10 : 0);

  const handleSendOrder = () => {
    // Play Web Audio chime
    try {
      playOrderChime();
    } catch {}

    setOrderState('sending');

    setTimeout(() => {
      setOrderState('kitchen');
    }, 600);

    setTimeout(() => {
      setOrderState('served');
      // Fire confetti celebration
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f97316', '#10b981', '#38bdf8'],
        });
      } catch {}
    }, 1400);
  };

  const handleReset = () => {
    setOrderState('idle');
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl bg-slate-950/90 border border-slate-800 shadow-2xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-xl text-left space-y-5">
      {/* Top Header Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xs">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Interactive POS Sandbox</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ลองกดเล่นได้ทันที
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              สัมผัสการสั่งอาหารและการส่งต่อออเดอร์ของระบบ Order POS ใน 3 วินาที
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>โต๊ะ 1 (จำลอง)</span>
          </span>
        </div>
      </div>

      {orderState === 'idle' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Step 1: Select Dish */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-300 block">1. เลือกเมนูทดสอบ:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {MENU_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedDish(item)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedDish.id === item.id
                      ? 'bg-orange-500/15 border-orange-500 text-white shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="text-xs font-bold leading-tight">{item.name}</div>
                      <div className="text-[10px] text-slate-400">฿{item.price}</div>
                    </div>
                  </div>
                  {selectedDish.id === item.id && (
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Customization Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Spice Level */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">2. ระดับความเผ็ด:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mild', label: 'เผ็ดน้อย 🌶️' },
                  { id: 'med', label: 'ปานกลาง 🌶️🌶️' },
                  { id: 'hot', label: 'จัดจ้าน 🌶️🌶️🌶️' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpiceLevel(s.id as any)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center border transition-all ${
                      spiceLevel === s.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topping Option */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">3. ท็อปปิ้งเสริม:</span>
              <button
                onClick={() => setAddFriedEgg(!addFriedEgg)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  addFriedEgg
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>🍳 เพิ่มไข่ดาวกรอบ (+฿10)</span>
                <span className="text-[10px] font-black uppercase">
                  {addFriedEgg ? '✓ เลือกแล้ว' : '+ เพิ่ม'}
                </span>
              </button>
            </div>
          </div>

          {/* Action Send Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
            <div>
              <span className="text-xs text-slate-400 block">ยอดรวมทั้งสิ้น:</span>
              <span className="text-xl font-black text-white">฿{totalPrice}.00</span>
            </div>

            <button
              onClick={handleSendOrder}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span>🚀 กดส่งออเดอร์จำลองเข้าครัว</span>
              <Zap className="w-4 h-4 text-amber-200" />
            </button>
          </div>
        </div>
      )}

      {/* Sending & In-Kitchen State */}
      {(orderState === 'sending' || orderState === 'kitchen') && (
        <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/30 animate-pulse">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-black text-white">
              {orderState === 'sending' ? 'กำลังส่งข้อมูลเข้าสู่ห้องครัว...' : '🍳 จอครัวกำลังรับออเดอร์ พร้อมเสียงสังเคราะห์ภาษาไทย!'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              ระบบส่งออเดอร์ตรงผ่าน Cloudflare Global Edge ใช้เวลา &lt;28ms พร้อมขานชื่อโต๊ะให้พ่อครัวเริ่มปรุงทันที
            </p>
          </div>
        </div>
      )}

      {/* Served & Completed Output State */}
      {orderState === 'served' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-400">
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-black block text-white">
                  ออเดอร์ส่งถึงครัวเรียบร้อย! ตัดสต็อกอัตโนมัติแล้ว
                </span>
                <span className="text-[11px] text-emerald-400">
                  {selectedDish.name} {addFriedEgg ? '+ ไข่ดาวกรอบ' : ''} (เผ็ด: {spiceLevel === 'hot' ? 'จัดจ้าน' : spiceLevel === 'mild' ? 'เผ็ดน้อย' : 'ปานกลาง'})
                </span>
              </div>
            </div>
            <span className="text-sm font-black text-white font-mono">฿{totalPrice}</span>
          </div>

          {/* Real-time automated system actions completed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">1. หน้าจอครัว (KDS):</span>
              <strong className="text-white text-[11px]">ขานเสียงไทย + ขึ้นตั๋ว #01</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">2. ตัดสต็อก BOM:</span>
              <strong className="text-emerald-400 text-[11px]">หักวัตถุดิบอัตโนมัติ</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">3. ผังโต๊ะแคชเชียร์:</span>
              <strong className="text-sky-400 text-[11px]">โต๊ะ 1 สถานะ: ทานอยู่</strong>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center justify-center space-x-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ลองสั่งเมนูอื่นใหม่</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/r/lung-pa/pos"
                target="_blank"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all text-center"
              >
                ดูหน้า POS จริง
              </Link>
              <Link
                href="/register"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs shadow-md shadow-orange-500/20 hover:scale-105 transition-all text-center"
              >
                เปิดร้านจริงฟรี 30 วัน 🚀
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
