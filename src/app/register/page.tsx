'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, User, Lock, Phone, ArrowRight, Loader2, Sparkles, CheckCircle2, KeyRound, Clock, ShieldCheck, RefreshCw } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [refCode, setRefCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState('');

  // Form Submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Request SMS OTP
  const handleSendOtp = async () => {
    if (!phone || phone.trim().replace(/\D/g, '').length < 9) {
      setError('กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลักก่อนขอรหัส OTP');
      return;
    }

    setOtpSending(true);
    setError('');
    setOtpMessage('');

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'REGISTER' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งรหัส OTP ได้');
      }

      setOtpSent(true);
      setRefCode(data.refCode || '');
      setDevOtp(data.devOtp || null);
      setCountdown(60); // 60s cooldown
      setOtpMessage(data.message || `ส่งรหัส OTP ไปยัง ${phone} เรียบร้อยแล้ว`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  // Form Submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpSent) {
      setError('กรุณากดขอรหัส OTP เพื่อยืนยันเบอร์โทรศัพท์ก่อนสมัคร');
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setError('กรุณากรอกรหัส OTP 6 หลักให้ครบถ้วน');
      return;
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          storeName: storeName.trim(),
          phone: phone.trim(),
          otp: otp.trim(),
          refCode: refCode.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'การสมัครสมาชิกล้มเหลว');
      }

      if (data.user?.storeSlug) {
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

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

        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>สมัครเปิดร้านใหม่ ยืนยันเบอร์โทรผ่าน SMS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            เปิดร้านใหม่กับ Order Pos
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            มีบัญชีร้านค้าแล้ว?{' '}
            <Link href="/login" className="font-bold text-orange-400 hover:text-orange-300 underline underline-offset-4">
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {otpMessage && (
            <div className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{otpMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Store Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อร้านอาหาร (Store Name) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="เช่น กะเพราถาดยายสม / ก๋วยเตี๋ยวเรือรสเด็ด"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อเจ้าของร้าน / ผู้ดูแล (Your Name) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            {/* Mobile Phone Number + Request OTP Button */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                เบอร์โทรศัพท์มือถือ (ใช้สำหรับ Login) *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 font-mono transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || countdown > 0 || !phone.trim()}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:bg-slate-800 disabled:text-slate-500 border border-orange-500/30 disabled:border-slate-700 transition-all flex items-center justify-center space-x-1 shrink-0"
                >
                  {otpSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : countdown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{countdown}s</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{otpSent ? 'ขอ OTP ใหม่' : 'ขอรหัส OTP'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SMS OTP Code Input (Appears when OTP is requested) */}
            {otpSent && (
              <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-orange-500/30 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center space-x-1.5 text-orange-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>กรอกรหัสยืนยัน OTP (6 หลัก)</span>
                  </span>
                  {refCode && (
                    <span className="text-[11px] font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-400 border border-slate-700">
                      Ref: {refCode}
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl font-black py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-amber-400 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"
                />

                {/* Dev Mode Mock OTP Banner */}
                {devOtp && (
                  <div
                    onClick={() => setOtp(devOtp)}
                    className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 text-center cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <span>💡 รหัส OTP ทดสอบ: </span>
                    <strong className="font-mono text-xs underline font-black">{devOtp}</strong>
                    <span className="text-[10px] text-amber-400/80 block">(คลิกที่นี่เพื่อใส่รหัสอัตโนมัติ)</span>
                  </div>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                รหัสผ่านสำหรับเข้าสู่ระบบ (Password) *
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
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ยืนยันรหัสผ่าน (Confirm Password) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !otpSent}
                className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-extrabold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสอบและเปิดร้าน...</span>
                  </>
                ) : (
                  <>
                    <span>ยืนยันเบอร์มือถือ &amp; เปิดร้านใหม่ทันที</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Benefits summary */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>เข้าสู่ระบบง่ายด้วยเบอร์โทรศัพท์มือถือ</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>สร้างโต๊ะ 1-10 พร้อมเมนูตัวอย่างให้อัตโนมัติ</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>ระบบสแกนสั่งที่โต๊ะ + จอครัว Realtime มีเสียงเตือน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
