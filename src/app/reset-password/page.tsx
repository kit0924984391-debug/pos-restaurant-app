'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearch, resetPasswordSearchSchema } from '@/lib/router';
import { Store, Lock, KeyRound, ArrowRight, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const { search } = useSearch(resetPasswordSearchSchema);
  const token = search.token;

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      setTokenError('ไม่พบรหัสโทเค็นสำหรับกู้คืนรหัสผ่าน กรุณาใช้ลิงก์ที่ได้รับจากอีเมล');
      return;
    }

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setTokenValid(false);
          setTokenError(data.error || 'ลิงก์กู้คืนรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
        } else {
          setTokenValid(true);
          setMaskedEmail(data.email || '');
        }
      } catch (err: any) {
        setTokenValid(false);
        setTokenError('เกิดข้อผิดพลาดในการตรวจสอบลิงก์ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setChecking(false);
      }
    };

    checkToken();
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }

      setResetSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
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
          ตั้งรหัสผ่านใหม่
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          กำหนดรหัสผ่านใหม่เพื่อความปลอดภัยในการเข้าใช้งานร้านค้าของคุณ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800">
          {checking ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-xs text-slate-400">กำลังตรวจสอบลิงก์กู้คืนรหัสผ่าน...</p>
            </div>
          ) : !tokenValid ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{tokenError}</p>
              </div>
              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full py-3 px-4 rounded-xl text-white text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 inline-block transition-all"
                >
                  ขอรับลิงก์กู้คืนใหม่อีกครั้ง
                </Link>
              </div>
            </div>
          ) : resetSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">เปลี่ยนรหัสผ่านสำเร็จ!</h3>
                <p className="mt-2 text-xs text-slate-300">
                  รหัสผ่านใหม่ของคุณมีผลทันที กำลังนำทางไปหน้าเข้าสู่ระบบอัตโนมัติ...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-3.5 px-4 rounded-xl text-white text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 inline-block transition-all"
                >
                  เข้าสู่ระบบทันที
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleReset}>
              {maskedEmail && (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                  <span>บัญชีที่กู้คืน:</span>
                  <span className="font-mono font-bold text-orange-400">{maskedEmail}</span>
                </div>
              )}

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) *
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
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกรหัสผ่าน...</span>
                  </>
                ) : (
                  <>
                    <span>บันทึกรหัสผ่านใหม่ &amp; เข้าสู่ระบบ</span>
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
                  <span>ยกเลิกและกลับไปหน้าเข้าสู่ระบบ</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
