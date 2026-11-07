'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { playSuccessChime, playServiceCallChime, getSharedAudioContext } from '@/lib/sound';

export default function AudioAmbienceToggle({ className = '' }: { className?: string }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('order_pos_landing_sound');
      if (saved === 'true') {
        setSoundEnabled(true);
      }
    } catch {}
  }, []);

  const toggleSound = () => {
    // Unlock Web Audio context on user gesture
    getSharedAudioContext();

    const nextState = !soundEnabled;
    setSoundEnabled(nextState);

    try {
      localStorage.setItem('order_pos_landing_sound', String(nextState));
    } catch {}

    if (nextState) {
      // Play a pleasant chime upon activation
      playSuccessChime();
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  const playSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    getSharedAudioContext();
    playServiceCallChime();
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={toggleSound}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
          soundEnabled
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
            : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
        }`}
        title={soundEnabled ? 'ปิดเสียงบรรยากาศ' : 'เปิดเสียงบรรยากาศ (Web Audio SFX)'}
        aria-label="Toggle Sound"
      >
        {soundEnabled ? (
          <>
            <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">เสียงร้าน: เปิด</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เสียงร้าน: ปิด</span>
          </>
        )}
      </button>

      {/* Floating activation confirmation badge */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-[11px] text-amber-300 whitespace-nowrap shadow-xl animate-in fade-in slide-in-from-top-1">
          🔔 เปิดระบบเสียงสังเคราะห์ Web Audio แล้ว!
        </div>
      )}
    </div>
  );
}
