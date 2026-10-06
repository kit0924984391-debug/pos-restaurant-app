'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Lock, Phone, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, identifier: phone, email: phone, password }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`การเชื่อมต่อเซิร์ฟเวอร์ขัดข้อง (${res.status} ${res.statusText}) กรุณาลองใหม่อีกครั้ง`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      if (data.user.role === 'SUPER_ADMIN') {
        router.push('/platform-admin');
      } else if (data.user.storeSlug) {
        router.push(`/r/${data.user.storeSlug}/pos`);
      } else {
        router.push('/store/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoPhoneOrEmail: string, demoPass: string) => {
    setPhone(demoPhoneOrEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white tracking-tight">Order Pos</span>
              <span className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">Multi-Tenant Platform</span>
            </div>
          </Link>
        </div>

        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-white">
          เข้าสู่ระบบร้านค้า &amp; ผู้ดูแล
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          ยังไม่มีร้านค้า?{' '}
          <Link href="/register" className="font-bold text-orange-400 hover:text-orange-300 underline underline-offset-4">
            สมัครเปิดร้านใหม่ ยืนยันผ่าน SMS ฟรี
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                เบอร์โทรศัพท์มือถือ (Phone Number)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 089-123-4567 หรือ 0812345678"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500 transition-all font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                สามารถใช้เบอร์โทรศัพท์ที่ลงทะเบียนไว้ หรืออีเมลเดิมได้
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบด้วยเบอร์มือถือ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block mb-3 text-center">
              🔑 ทดลองเข้าระบบด้วยร้านค้าตัวอย่าง (Demo Login):
            </span>
            <div>
              <button
                type="button"
                onClick={() => handleDemoLogin('089-123-4567', 'pos1234')}
                className="w-full p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-left border border-slate-700/80 hover:border-emerald-500/50 transition-all flex items-center justify-between px-4"
              >
                <span className="text-xs font-extrabold text-emerald-400 flex items-center space-x-2">
                  <span>👨‍🍳</span>
                  <span>ร้านลุง-ป้า (ร้านค้าตัวอย่าง)</span>
                </span>
                <span className="text-xs text-slate-300 font-mono">📱 089-123-4567</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
