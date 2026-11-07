'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User, Store, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogRoot,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  title?: string;
  subtitle?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'เข้าสู่ระบบเพื่อดำเนินการต่อ',
  subtitle = 'โปรดเข้าสู่ระบบเพื่อร่วมตั้งกระทู้ แสดงความคิดเห็น และโหวตฟีเจอร์ที่คุณสนใจ',
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');

        onSuccess(data.user);
        onClose();
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            storeName: storeName || `ร้านของคุณ ${name}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'สมัครสมาชิกไม่สำเร็จ');

        onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-150 animate-fade-in" />
        <DialogPopup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-[92vw] sm:w-full p-6 shadow-2xl text-left text-slate-100 overflow-hidden focus:outline-none">
          {/* Close Button with Base UI DialogClose */}
          <DialogClose
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </DialogClose>

          {/* Header with Base UI DialogTitle and DialogDescription */}
          <div className="mb-5 pr-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 mb-3 border border-orange-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-black text-white">{title}</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">{subtitle}</DialogDescription>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              สมัครเปิดร้านใหม่
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อ-นามสกุล / ชื่อผู้ใช้ *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="เช่น คุณสมชาย ตามสั่ง"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อร้านค้าของคุณ (ไม่ระบุก็ได้)
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="เช่น ครัวลุง-ป้า หน้า ม."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                อีเมล *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                รหัสผ่าน *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
