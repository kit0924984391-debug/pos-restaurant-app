'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Web Audio synthesizer for crisp, instant sound effects without external file dependencies
function playSoundEffect(type: ToastType) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      // Crisp 2-tone chime (e.g. 523Hz -> 659Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);
    } else if (type === 'error') {
      // Low buzz error tone
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'warning') {
      // Attention beep
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      // Info pop
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { ...toast, id };

      playSoundEffect(toast.type);

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Keep at most 4 toasts

      const duration = toast.duration ?? 3500;
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'success', title, message });
    },
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'error', title, message, duration: 4500 });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'warning', title, message });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'info', title, message });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-4 inset-x-3.5 sm:inset-x-auto sm:right-6 sm:top-6 z-[9999] pointer-events-none flex flex-col items-center sm:items-end space-y-2.5 max-w-sm w-full no-print">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              bg: 'bg-slate-900 border-2 border-emerald-500 text-white shadow-2xl shadow-emerald-950/40',
              bgColor: '#0f172a',
              borderColor: '#10b981',
              iconColor: 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40',
              titleColor: 'text-white',
              messageColor: 'text-emerald-300',
              closeColor: 'text-slate-400 hover:text-white hover:bg-slate-800',
            },
            error: {
              icon: AlertCircle,
              bg: 'bg-slate-900 border-2 border-rose-500 text-white shadow-2xl shadow-rose-950/40',
              bgColor: '#0f172a',
              borderColor: '#f43f5e',
              iconColor: 'text-rose-400 bg-rose-500/20 border border-rose-500/40',
              titleColor: 'text-white',
              messageColor: 'text-rose-300',
              closeColor: 'text-slate-400 hover:text-white hover:bg-slate-800',
            },
            warning: {
              icon: AlertTriangle,
              bg: 'bg-slate-900 border-2 border-amber-500 text-white shadow-2xl shadow-amber-950/40',
              bgColor: '#0f172a',
              borderColor: '#f59e0b',
              iconColor: 'text-amber-400 bg-amber-500/20 border border-amber-500/40',
              titleColor: 'text-white',
              messageColor: 'text-amber-300',
              closeColor: 'text-slate-400 hover:text-white hover:bg-slate-800',
            },
            info: {
              icon: Info,
              bg: 'bg-slate-900 border-2 border-orange-500 text-white shadow-2xl shadow-orange-950/40',
              bgColor: '#0f172a',
              borderColor: '#f97316',
              iconColor: 'text-orange-400 bg-orange-500/20 border border-orange-500/40',
              titleColor: 'text-white',
              messageColor: 'text-orange-200',
              closeColor: 'text-slate-400 hover:text-white hover:bg-slate-800',
            },
          }[toast.type];

          const IconComponent = typeConfig.icon;

          return (
            <div
              key={toast.id}
              style={{
                backgroundColor: typeConfig.bgColor,
                borderColor: typeConfig.borderColor,
              }}
              className={`pointer-events-auto w-full p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all duration-300 transform animate-in slide-in-from-top-4 fade-in ${typeConfig.bg}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${typeConfig.iconColor}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h4 className={`font-black text-sm tracking-tight leading-snug truncate ${typeConfig.titleColor}`}>
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className={`text-xs mt-1 leading-relaxed break-words font-bold ${typeConfig.messageColor}`}>
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 cursor-pointer ${typeConfig.closeColor}`}
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}