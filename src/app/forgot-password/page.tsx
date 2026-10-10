'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Store, Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, Sparkles, Phone } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งลิงก์กู้คืนรหัสผ่านได้');
      }

      setSuccess(true);
      setMaskedEmail(data.maskedEmail || '');
      setMessage(data.message || 'ส่งลิงก์กู้คืนรหัสผ่านเรียบร้อยแล้ว');
      if (data.devLink) {
        setDevLink(data.devLink);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          กู้คืนรหัสผ่านร้านค้า
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          กรอกอีเมลหรือเบอร์มือถือที่ผูกไว้กับร้านค้าเพื่อรับลิงก์ตั้งรหัสผ่านใหม่
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white">
                  ส่งลิงก์กู้คืนรหัสผ่านแล้ว!
                </h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {message}
                </p>
                {maskedEmail && (
                  <p className="mt-2 text-xs font-mono font-bold text-orange-400 bg-slate-800/80 py-1.5 px-3 rounded-xl inline-block">
                    📧 {maskedEmail}
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-[11px] text-slate-400 text-left space-y-1.5">
                <p className="font-semibold text-slate-300">💡 ขั้นตอนถัดไป:</p>
                <p>1. เปิดกล่องข้อความในอีเมลของคุณ (หากไม่พบ ลองตรวจสอบใน Junk/Spam)</p>
                <p>2. กดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่ภายใน <strong>30 นาที</strong></p>
              </div>

              {devLink && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-left">
                  <span className="font-bold block mb-1">🛠️ ลิงก์ทดสอบ (Dev Mode):</span>
                  <a
                    href={devLink}
                    className="text-orange-400 underline break-all font-mono text-[11px] hover:text-orange-300"
                  >
                    {devLink}
                  </a>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl text-white text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 text-center transition-all"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setDevLink(null);
                  }}
                  className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ส่งลิงก์ใหม่อีกครั้ง
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  อีเมล หรือ เบอร์โทรศัพท์มือถือ *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="เช่น somchai@gmail.com หรือ 0812345678"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500 transition-all font-mono"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  ระบบจะค้นหาบัญชีของคุณและส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลที่ลงทะเบียนไว้
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังส่งลิงก์...</span>
                  </>
                ) : (
                  <>
                    <span>ส่งลิงก์กู้คืนรหัสผ่าน</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับไปหน้าเข้าสู่ระบบ</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
