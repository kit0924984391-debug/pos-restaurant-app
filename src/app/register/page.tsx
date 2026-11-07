'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, User, Lock, Phone, Mail, ArrowRight, Loader2, Sparkles, CheckCircle2, KeyRound, Clock, ShieldCheck, RefreshCw, Building2, CreditCard, QrCode, AlertCircle, Check } from 'lucide-react';
import { THAI_BANKS } from '@/lib/bank-constants';

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('KBANK');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [otp, setOtp] = useState('');
  const [refCode, setRefCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // PromptPay State
  const [promptPayType, setPromptPayType] = useState<'SAME_AS_PHONE' | 'CUSTOM'>('SAME_AS_PHONE');
  const [customPromptPayId, setCustomPromptPayId] = useState('');
  const [promptPayName, setPromptPayName] = useState('');

  // Real-time Availability State
  const [phoneStatus, setPhoneStatus] = useState<{ checking: boolean; taken: boolean; valid: boolean; message: string | null }>({
    checking: false,
    taken: false,
    valid: false,
    message: null,
  });
  const [emailStatus, setEmailStatus] = useState<{ checking: boolean; taken: boolean; valid: boolean; message: string | null }>({
    checking: false,
    taken: false,
    valid: false,
    message: null,
  });
  const [bankStatus, setBankStatus] = useState<{ checking: boolean; taken: boolean; valid: boolean; message: string | null }>({
    checking: false,
    taken: false,
    valid: false,
    message: null,
  });
  const [promptPayStatus, setPromptPayStatus] = useState<{ checking: boolean; taken: boolean; valid: boolean; message: string | null }>({
    checking: false,
    taken: false,
    valid: false,
    message: null,
  });

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState('');

  // Form Submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Auto-sync bank account name and promptpay name with owner/store name
  useEffect(() => {
    if (!bankAccountName || bankAccountName === name.slice(0, -1)) {
      setBankAccountName(name);
    }
  }, [name]);

  useEffect(() => {
    if (!promptPayName || promptPayName === storeName.slice(0, -1)) {
      setPromptPayName(storeName || name);
    }
  }, [storeName, name]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 1. Real-time Phone Availability Check (Debounced)
  useEffect(() => {
    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      setPhoneStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    setPhoneStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'phone', value: clean }),
        });
        const data = await res.json();
        if (data.available === false) {
          setPhoneStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
          setIsDuplicate(true);
        } else {
          setPhoneStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setPhoneStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [phone]);

  // 2. Real-time Email Availability Check (Debounced)
  useEffect(() => {
    const cleanMail = email.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.') || cleanMail.endsWith('@') || cleanMail.endsWith('.')) {
      setEmailStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    setEmailStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'email', value: cleanMail }),
        });
        const data = await res.json();
        if (data.available === false) {
          setEmailStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
          setIsDuplicate(true);
        } else {
          setEmailStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setEmailStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [email]);

  // 3. Real-time Bank Account Availability Check (Debounced)
  useEffect(() => {
    const cleanAccount = bankAccountNo.replace(/\D/g, '');
    if (!cleanAccount || cleanAccount.length < 10) {
      setBankStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    setBankStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'bankAccountNo', value: cleanAccount, bankName }),
        });
        const data = await res.json();
        if (data.available === false) {
          setBankStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
          setIsDuplicate(true);
        } else {
          setBankStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setBankStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [bankAccountNo, bankName]);

  // 4. Real-time PromptPay Availability Check (Debounced)
  useEffect(() => {
    const cleanPromptPay = promptPayType === 'SAME_AS_PHONE'
      ? phone.replace(/\D/g, '')
      : customPromptPayId.replace(/\D/g, '');

    if (!cleanPromptPay || cleanPromptPay.length < 10) {
      setPromptPayStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    setPromptPayStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'promptPayId',
            value: cleanPromptPay,
            phoneForPromptPay: phone.replace(/\D/g, ''),
          }),
        });
        const data = await res.json();
        if (data.available === false) {
          setPromptPayStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
          setIsDuplicate(true);
        } else {
          setPromptPayStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setPromptPayStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [promptPayType, customPromptPayId, phone]);

  // Request SMS OTP
  const handleSendOtp = async () => {
    setIsDuplicate(false);
    if (phoneStatus.taken) {
      setError('เบอร์โทรศัพท์นี้มีในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้เบอร์อื่น');
      setIsDuplicate(true);
      return;
    }
    if (bankStatus.taken) {
      setError('เลขที่บัญชีธนาคารนี้มีในระบบแล้ว ไม่สามารถรับสิทธิ์ฟรีซ้ำได้');
      setIsDuplicate(true);
      return;
    }
    if (emailStatus.taken) {
      setError('อีเมลนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น');
      setIsDuplicate(true);
      return;
    }
    if (promptPayStatus.taken) {
      setError('หมายเลขพร้อมเพย์นี้มีในระบบแล้ว ไม่สามารถรับสิทธิ์ฟรีซ้ำได้');
      setIsDuplicate(true);
      return;
    }

    if (!phone || phone.trim().replace(/\D/g, '').length < 9) {
      setError('กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลักก่อนขอรหัส OTP');
      return;
    }

    const cleanAccount = bankAccountNo.replace(/\D/g, '');
    if (!cleanAccount || cleanAccount.length < 10 || cleanAccount.length > 12) {
      setError('กรุณากรอกเลขที่บัญชีธนาคาร 10–12 หลักให้ถูกต้องก่อนขอรหัส OTP');
      return;
    }

    const cleanMail = email.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.')) {
      setError('กรุณากรอกอีเมลที่ถูกต้องสำหรับใช้กู้คืนรหัสผ่านก่อนขอรหัส OTP');
      return;
    }

    const cleanPromptPay = promptPayType === 'SAME_AS_PHONE' ? phone.replace(/\D/g, '') : customPromptPayId.replace(/\D/g, '');

    setOtpSending(true);
    setError('');
    setOtpMessage('');

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          bankAccountNo: cleanAccount,
          email: cleanMail,
          promptPayId: cleanPromptPay,
          purpose: 'REGISTER',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'phone_taken' || data.code === 'bank_taken' || data.code === 'email_taken' || data.code === 'promptpay_taken') {
          setIsDuplicate(true);
        }
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
    setIsDuplicate(false);

    if (phoneStatus.taken || bankStatus.taken || emailStatus.taken || promptPayStatus.taken) {
      setError('ข้อมูลบางรายการมีในระบบแล้ว กรุณาตรวจสอบข้อมูลที่แจ้งเตือนสีแดง');
      setIsDuplicate(true);
      return;
    }

    if (!otpSent) {
      setError('กรุณากดขอรหัส OTP เพื่อยืนยันเบอร์โทรศัพท์ก่อนสมัคร');
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setError('กรุณากรอกรหัส OTP 6 หลักให้ครบถ้วน');
      return;
    }

    const cleanMail = email.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.')) {
      setError('กรุณากรอกอีเมลที่ถูกต้องสำหรับใช้กู้คืนรหัสผ่าน');
      return;
    }

    const cleanAccount = bankAccountNo.replace(/\D/g, '');
    if (!cleanAccount || cleanAccount.length < 10 || cleanAccount.length > 12) {
      setError('กรุณากรอกเลขที่บัญชีธนาคาร 10–12 หลักให้ถูกต้อง');
      return;
    }

    const cleanPromptPay = promptPayType === 'SAME_AS_PHONE' ? phone.replace(/\D/g, '') : customPromptPayId.replace(/\D/g, '');
    if (promptPayType === 'CUSTOM') {
      if (!cleanPromptPay || (cleanPromptPay.length !== 10 && cleanPromptPay.length !== 13)) {
        setError('กรุณากรอกหมายเลขพร้อมเพย์ให้ถูกต้อง (เบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก)');
        return;
      }
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
          email: cleanMail,
          storeName: storeName.trim(),
          phone: phone.trim(),
          bankName,
          bankAccountNo: cleanAccount,
          bankAccountName: (bankAccountName || name).trim(),
          promptPayId: cleanPromptPay,
          promptPayName: (promptPayName || storeName || name).trim(),
          otp: otp.trim(),
          refCode: refCode.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'phone_taken' || data.code === 'bank_taken' || data.code === 'email_taken' || data.code === 'promptpay_taken') {
          setIsDuplicate(true);
        }
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
            <div role="alert" aria-live="assertive" className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold space-y-2">
              <div className="flex items-start space-x-2">
                <span className="text-sm shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
              {isDuplicate && (
                <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                  <span className="text-slate-300 text-[11px]">มีบัญชีร้านนี้อยู่แล้ว?</span>
                  <Link
                    href="/login"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <span>เข้าสู่ระบบบัญชีเดิม</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {otpMessage && (
            <div role="status" aria-live="polite" className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{otpMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Store Name */}
            <div>
              <label htmlFor="register-store-name" className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อร้านอาหาร (Store Name) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  id="register-store-name"
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
              <label htmlFor="register-owner-name" className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อเจ้าของร้าน / ผู้ดูแล (Your Name) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="register-owner-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>

            {/* Email Address for Password Recovery */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="register-email" className="block text-xs font-bold text-slate-300">
                  อีเมลสำหรับกู้คืนรหัสผ่าน (Email) *
                </label>
                {emailStatus.checking && (
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                    <span>กำลังตรวจสอบ...</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น somchai@gmail.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm focus:outline-none placeholder-slate-500 transition-all font-mono ${
                    emailStatus.taken
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ring-1 ring-rose-500/50'
                      : emailStatus.valid
                      ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                      : 'border-slate-700 focus:ring-2 focus:ring-orange-500'
                  }`}
                />
              </div>
              {emailStatus.taken ? (
                <div className="mt-1.5 flex items-center space-x-1.5 text-xs font-bold text-rose-500 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>มีในระบบแล้ว</span>
                </div>
              ) : emailStatus.valid ? (
                <div className="mt-1 flex items-center space-x-1 text-[11px] font-medium text-emerald-400 animate-fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>อีเมลนี้สามารถใช้งานได้</span>
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">
                  🔒 ใช้สำหรับรับลิงก์ตั้งรหัสผ่านใหม่เมื่อลืมรหัสผ่าน (จำกัด 1 บัญชีต่อ 1 อีเมล)
                </p>
              )}
            </div>

            {/* Bank Account Section (For Receiving Payments & Anti-Abuse) */}
            <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/70 space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>บัญชีธนาคารสำหรับรับเงินของร้านค้า *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Bank Select */}
                <div>
                  <label htmlFor="register-bank-name" className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ธนาคาร *
                  </label>
                  <select
                    id="register-bank-name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {THAI_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="register-bank-account-no" className="block text-[11px] font-semibold text-slate-300">
                      เลขที่บัญชี (10–12 หลัก) *
                    </label>
                    {bankStatus.checking && (
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                        <span>ตรวจ...</span>
                      </span>
                    )}
                  </div>
                  <input
                    id="register-bank-account-no"
                    type="text"
                    required
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value.replace(/[^\d-]/g, ''))}
                    placeholder="เช่น 123-4-56789-0"
                    maxLength={15}
                    className={`w-full px-3 py-2 bg-slate-800 border rounded-xl text-white text-xs font-mono focus:outline-none placeholder-slate-500 transition-all ${
                      bankStatus.taken
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ring-1 ring-rose-500/50'
                        : bankStatus.valid
                        ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-2 focus:ring-orange-500'
                    }`}
                  />
                  {bankStatus.taken && (
                    <div className="mt-1 flex items-center space-x-1 text-xs font-bold text-rose-500 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>มีในระบบแล้ว</span>
                    </div>
                  )}
                  {!bankStatus.taken && bankStatus.valid && (
                    <div className="mt-1 flex items-center space-x-1 text-[10px] font-medium text-emerald-400 animate-fade-in">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>สามารถใช้งานได้</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label htmlFor="register-bank-account-name" className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ชื่อบัญชีธนาคาร *
                </label>
                <input
                  id="register-bank-account-name"
                  type="text"
                  required
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี (ตรงกับหน้าสมุดบัญชี)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                🔒 ข้อมูลนี้จะถูกนำไปตั้งเป็นบัญชีรับเงินของร้านใน POS อัตโนมัติ (จำกัดสิทธิ์ 1 ร้านค้าต่อ 1 บัญชี)
              </p>
            </div>

            {/* Mobile Phone Number + Request OTP Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="register-phone" className="block text-xs font-bold text-slate-300">
                  เบอร์โทรศัพท์มือถือ (ใช้สำหรับ Login) *
                </label>
                {phoneStatus.checking && (
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                    <span>กำลังตรวจสอบ...</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="register-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm focus:outline-none placeholder-slate-500 font-mono transition-all ${
                      phoneStatus.taken
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ring-1 ring-rose-500/50'
                        : phoneStatus.valid
                        ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-2 focus:ring-orange-500'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || countdown > 0 || !phone.trim() || phoneStatus.taken || phoneStatus.checking}
                  title={phoneStatus.taken ? 'เบอร์โทรศัพท์นี้มีในระบบแล้ว' : undefined}
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
              {phoneStatus.taken ? (
                <div className="mt-1.5 flex items-center space-x-1.5 text-xs font-bold text-rose-500 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>มีในระบบแล้ว</span>
                </div>
              ) : phoneStatus.valid ? (
                <div className="mt-1 flex items-center space-x-1 text-[11px] font-medium text-emerald-400 animate-fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>เบอร์โทรศัพท์นี้สามารถใช้งานได้</span>
                </div>
              ) : null}
            </div>

            {/* SMS OTP Code Input (Appears when OTP is requested) */}
            {otpSent && (
              <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-orange-500/30 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <label htmlFor="register-otp" className="flex items-center space-x-1.5 text-orange-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>กรอกรหัสยืนยัน OTP (6 หลัก)</span>
                  </label>
                  {refCode && (
                    <span className="text-[11px] font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-400 border border-slate-700">
                      Ref: {refCode}
                    </span>
                  )}
                </div>

                <input
                  id="register-otp"
                  type="text"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl font-black py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-amber-400 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"
                />

                {/* Dev Mode Mock OTP Banner */}
                {devOtp && (
                  <div
                    onClick={() => setOtp(devOtp)}
                    className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center cursor-pointer hover:bg-amber-500/25 active:scale-[0.99] transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-center space-x-2 font-bold mb-1">
                      <span className="text-xs text-amber-300">💡 รหัส OTP ทดสอบ:</span>
                      <span className="font-mono text-base px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 rounded-lg text-amber-200 font-black tracking-wider">{devOtp}</span>
                    </div>
                    <span className="text-[11px] text-amber-400/90 block font-medium">
                      👆 แตะที่นี่เพื่อใส่รหัสอัตโนมัติ (ระบบอยู่ในโหมดทดสอบ ไม่ได้ส่งเข้า SMS มือถือ)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PromptPay Account Section */}
            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <div className="flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>บัญชีพร้อมเพย์รับเงิน (PromptPay) *</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                  <span>🔒 ล็อกห้ามแก้ไข</span>
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Radio selection: same as phone vs custom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      promptPayType === 'SAME_AS_PHONE'
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promptPayType"
                      checked={promptPayType === 'SAME_AS_PHONE'}
                      onChange={() => setPromptPayType('SAME_AS_PHONE')}
                      className="accent-emerald-500"
                    />
                    <span className="text-[11px]">ใช้เบอร์เดียวกับ Login ({phone || 'เบอร์มือถือ'})</span>
                  </label>
                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      promptPayType === 'CUSTOM'
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promptPayType"
                      checked={promptPayType === 'CUSTOM'}
                      onChange={() => setPromptPayType('CUSTOM')}
                      className="accent-emerald-500"
                    />
                    <span className="text-[11px]">ระบุเบอร์อื่น / บัตร ปชช.</span>
                  </label>
                </div>

                {promptPayType === 'CUSTOM' && (
                  <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="register-promptpay-id" className="block text-[11px] font-semibold text-slate-300">
                        หมายเลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก) *
                      </label>
                      {promptPayStatus.checking && (
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                          <span>ตรวจ...</span>
                        </span>
                      )}
                    </div>
                    <input
                      id="register-promptpay-id"
                      type="text"
                      required={promptPayType === 'CUSTOM'}
                      value={customPromptPayId}
                      onChange={(e) => setCustomPromptPayId(e.target.value.replace(/\D/g, ''))}
                      placeholder="เช่น 0812345678 หรือ 1234567890123"
                      maxLength={13}
                      className={`w-full px-3 py-2 bg-slate-800 border rounded-xl text-white text-xs font-mono focus:outline-none placeholder-slate-500 transition-all ${
                        promptPayStatus.taken
                          ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ring-1 ring-rose-500/50'
                          : promptPayStatus.valid
                          ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                          : 'border-slate-700 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    {promptPayStatus.taken && (
                      <div className="mt-1 flex items-center space-x-1 text-xs font-bold text-rose-500 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>มีในระบบแล้ว</span>
                      </div>
                    )}
                    {!promptPayStatus.taken && promptPayStatus.valid && (
                      <div className="mt-1 flex items-center space-x-1 text-[10px] font-medium text-emerald-400 animate-fade-in">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>สามารถใช้งานได้</span>
                      </div>
                    )}
                  </div>
                )}

                {promptPayType === 'SAME_AS_PHONE' && promptPayStatus.taken && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-1.5 text-xs font-bold text-rose-500 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>มีในระบบแล้ว (หมายเลขพร้อมเพย์นี้มีในระบบแล้ว)</span>
                  </div>
                )}

                <div>
                  <label htmlFor="register-promptpay-name" className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ชื่อบัญชีพร้อมเพย์ที่แสดงบน QR Code รับเงิน
                  </label>
                  <input
                    id="register-promptpay-name"
                    type="text"
                    value={promptPayName}
                    onChange={(e) => setPromptPayName(e.target.value)}
                    placeholder={storeName || name || 'เช่น ร้านกะเพราถาดยายสม'}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-300/90 leading-relaxed flex items-start space-x-1.5">
                <span className="text-xs shrink-0">🔒</span>
                <span>
                  หมายเลขพร้อมเพย์นี้จะถูกนำไปสร้าง <strong>QR Code รับเงินอัตโนมัติ</strong> ประจำโต๊ะและแคชเชียร์ทันที และ<strong>ถูกล็อกห้ามแก้ไขด้วยตนเอง</strong> เพื่อความปลอดภัยสูงสุดของร้านค้า
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-xs font-bold text-slate-300 mb-1">
                รหัสผ่านสำหรับเข้าสู่ระบบ (Password) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  type="password"
                  required
                  autoComplete="new-password"
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
              <label htmlFor="register-confirm-password" className="block text-xs font-bold text-slate-300 mb-1">
                ยืนยันรหัสผ่าน (Confirm Password) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
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
                disabled={loading || !otpSent || phoneStatus.taken || bankStatus.taken || emailStatus.taken || promptPayStatus.taken}
                className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-extrabold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสอบและเปิดร้าน...</span>
                  </>
                ) : (phoneStatus.taken || bankStatus.taken || emailStatus.taken || promptPayStatus.taken) ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span>มีข้อมูลในระบบแล้ว กรุณาตรวจสอบก่อนเปิดร้าน</span>
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
