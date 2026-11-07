'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Split, AlertTriangle, CheckCircle2, QrCode, ChefHat, ShieldCheck, Clock, TrendingUp } from 'lucide-react';

export default function InteractiveComparisonSlider() {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((offsetX / rect.width) * 100);
    setSliderPos(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging || e.buttons === 1) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="space-y-5">
      {/* Quick Switch Presets */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setSliderPos(15)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            sliderPos < 30
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          ❌ ดูฝั่งร้านแบบเดิม (วุ่นวาย)
        </button>
        <button
          onClick={() => setSliderPos(50)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
            sliderPos >= 45 && sliderPos <= 55
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          ⚖️ เปรียบเทียบ 50 / 50
        </button>
        <button
          onClick={() => setSliderPos(85)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            sliderPos > 70
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          ✨ ดูฝั่งใช้ Order POS (อัจฉริยะ)
        </button>
      </div>

      {/* Main Interactive Split Card Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full min-h-[480px] sm:min-h-[430px] h-[480px] sm:h-[430px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl select-none cursor-ew-resize bg-slate-950 touch-none group"
      >
        {/* RIGHT LAYER: New Way (Order POS) */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-4 sm:p-8 md:p-10 flex flex-col justify-between">
          <div className="flex justify-end">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ยุคใหม่: ใช้ Order POS (อัจฉริยะ)</span>
            </span>
          </div>

          <div className="space-y-3 max-w-md ml-auto text-right">
            <h4 className="text-xl sm:text-2xl font-black text-white">
              ร้านเป็นระเบียบ ทันสมัย ไร้ข้อผิดพลาด 100%
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ลูกค้าสแกนสั่งเองจากโต๊ะ ออเดอร์เด้งเข้าครัวพร้อมเสียง AI ขานชื่อโต๊ะภาษาไทย พ่อครัวผัดตามคิว 
              คิดเงินผ่าน Dynamic QR Code เช็คสลิปโอนเงินทันที หมดกังวลสลิปปลอม
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-left pt-2">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px]">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR ประจำโต๊ะ</span>
                </div>
                <div className="text-[11px] text-slate-300">สั่งไวขึ้น 3 เท่า ไม่ต้องรอเด็กเสิร์ฟ</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px]">
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>จอครัวพูดไทย</span>
                </div>
                <div className="text-[11px] text-slate-300">ขานชื่อโต๊ะอัตโนมัติ ผัดไม่พลาดคิว</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 text-xs font-bold pt-1">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>หมุนรอบโต๊ะเร็วขึ้น +18%</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ตรวจจับสลิปซ้ำ 100%</span>
              </span>
            </div>
          </div>
        </div>

        {/* LEFT LAYER: Old Way (Traditional chaotic paper restaurant) - Clipped by Slider */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-red-950/50 via-slate-900 to-slate-950 p-4 sm:p-8 md:p-10 flex flex-col justify-between overflow-hidden border-r-2 border-orange-500 shadow-2xl"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="flex justify-start">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-red-500/20 text-red-300 border border-red-500/40 shadow-lg whitespace-nowrap flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>แบบเดิม: จดกระดาษ ตะโกนสั่ง (วุ่นวาย)</span>
            </span>
          </div>

          <div className="space-y-3 max-w-md text-left whitespace-normal">
            <h4 className="text-xl sm:text-2xl font-black text-white">
              ช่วงเที่ยงวุ่นวาย จดผิด ทำสลับคิว คิดเงินช้า
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              เด็กเสิร์ฟวิ่งวุ่นจดไม่ทัน ลายมือหวัดอ่านไม่ออก ครัวผัดผิดจานต้องทิ้งทำใหม่ ลูกค้ารอนานอารมณ์เสีย 
              และตอนเช็คบิลไม่ได้เช็คสลิปโอนเงินอย่างละเอียด เสี่ยงมิจฉาชีพใช้สลิปปลอม
            </p>

            {/* Pain Points Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-left pt-2">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs space-y-1">
                <div className="text-red-400 font-bold text-[11px]">⚠️ บิลปลิวหาย</div>
                <div className="text-[11px] text-slate-300">ลืมคิดเงินโต๊ะ เสียเงินฟรี</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs space-y-1">
                <div className="text-red-400 font-bold text-[11px]">⏳ เสียเวลารอ</div>
                <div className="text-[11px] text-slate-300">เด็กเสิร์ฟเดินวนจดโต๊ะละ 4 นาที</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold pt-1">
              <span className="px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <span>เสียเวลาเปล่า ~2.5 ชม./วัน</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                วัตถุดิบรั่วไหล ไม่รู้ต้นทุนแท้จริง
              </span>
            </div>
          </div>
        </div>

        {/* Central Draggable Divider Bar */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 via-amber-300 to-orange-500 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Circular Drag Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/60 border-2 border-white text-xs font-black group-hover:scale-110 transition-transform">
            <Split className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          {/* Floating Percentage Indicator Pill */}
          <div className="absolute top-4 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 border border-slate-700 text-[10px] font-black text-amber-300 whitespace-nowrap shadow-lg">
            {sliderPos}% ก่อน vs {100 - sliderPos}% หลัง
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 font-medium">
        👈 <strong className="text-white">แตะหรือลากแท่งแบ่งตรงกลาง</strong> เพื่อเปรียบเทียบความแตกต่างระหว่างร้านแบบเดิม vs เมื่อใช้ Order POS 👉
      </div>
    </div>
  );
}
