'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  Phone,
  Mail,
  User,
  Store,
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
  Clock,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { THAI_BANKS } from '@/lib/bank-constants';

function SecurityEditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // Initial loading & Token verification state
  const [initialLoading, setInitialLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('KBANK');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [promptPayType, setPromptPayType] = useState<'SAME_AS_PHONE' | 'CUSTOM'>('SAME_AS_PHONE');
  const [customPromptPayId, setCustomPromptPayId] = useState('');
  const [promptPayName, setPromptPayName] = useState('');

  // OTP State for Phone Changes
  const [originalPhone, setOriginalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [refCode, setRefCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState('');

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

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 1. Fetch Store Details via Token
  useEffect(() => {
    if (!token) {
      setTokenError('ไม่พบโทเค็นสำหรับการแก้ไขข้อมูล กรุณาตรวจสอบลิงก์ในอีเมลของคุณอีกครั้ง');
      setInitialLoading(false);
      return;
    }

    async function loadStore() {
      try {
        const res = await fetch(`/api/store/security-edit?token=${encodeURIComponent(token!)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'ลิงก์แก้ไขข้อมูลไม่ถูกต้องหรือหมดอายุ');
        }

        const s = data.store;
        setStoreData(s);
        setName(s.ownerName || '');
        setEmail(s.ownerEmail || '');
        setPhone(s.phone || '');
        setOriginalPhone(s.phone || '');
        setBankName(s.bankName || 'KBANK');
        setBankAccountNo(s.bankAccountNo || '');
        setBankAccountName(s.bankAccountName || s.ownerName || '');
        setPromptPayName(s.promptPayName || s.name || '');

        if (s.promptPayId && s.promptPayId !== s.phone) {
          setPromptPayType('CUSTOM');
          setCustomPromptPayId(s.promptPayId);
        } else {
          setPromptPayType('SAME_AS_PHONE');
        }
      } catch (err: any) {
        setTokenError(err.message);
      } finally {
        setInitialLoading(false);
      }
    }

    loadStore();
  }, [token]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Phone Change Detection: reset OTP state if phone changes
  const isPhoneChanged = phone.replace(/\D/g, '') !== originalPhone.replace(/\D/g, '');

  // 2. Real-time Phone Availability Check (Debounced, excluding current store)
  useEffect(() => {
    if (!storeData?.id) return;
    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      setPhoneStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    // If unchanged from original store phone, it is valid and available for this store
    if (clean === originalPhone.replace(/\D/g, '')) {
      setPhoneStatus({ checking: false, taken: false, valid: true, message: null });
      return;
    }

    setPhoneStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'phone', value: clean, excludeStoreId: storeData.id }),
        });
        const data = await res.json();
        if (data.available === false) {
          setPhoneStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
        } else {
          setPhoneStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setPhoneStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [phone, storeData?.id, originalPhone]);

  // 3. Real-time Email Availability Check (Debounced, excluding current store)
  useEffect(() => {
    if (!storeData?.id) return;
    const cleanMail = email.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.') || cleanMail.endsWith('@') || cleanMail.endsWith('.')) {
      setEmailStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    if (cleanMail === (storeData.ownerEmail || '').toLowerCase()) {
      setEmailStatus({ checking: false, taken: false, valid: true, message: null });
      return;
    }

    setEmailStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'email', value: cleanMail, excludeStoreId: storeData.id }),
        });
        const data = await res.json();
        if (data.available === false) {
          setEmailStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
        } else {
          setEmailStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setEmailStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [email, storeData?.id, storeData?.ownerEmail]);

  // 4. Real-time Bank Account Availability Check (Debounced, excluding current store)
  useEffect(() => {
    if (!storeData?.id) return;
    const cleanAccount = bankAccountNo.replace(/\D/g, '');
    if (!cleanAccount || cleanAccount.length < 10) {
      setBankStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    if (cleanAccount === (storeData.bankAccountNo || '').replace(/\D/g, '')) {
      setBankStatus({ checking: false, taken: false, valid: true, message: null });
      return;
    }

    setBankStatus(prev => ({ ...prev, checking: true, message: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'bankAccountNo', value: cleanAccount, bankName, excludeStoreId: storeData.id }),
        });
        const data = await res.json();
        if (data.available === false) {
          setBankStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
        } else {
          setBankStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setBankStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [bankAccountNo, bankName, storeData?.id, storeData?.bankAccountNo]);

  // 5. Real-time PromptPay Availability Check (Debounced, excluding current store)
  useEffect(() => {
    if (!storeData?.id) return;
    const cleanPromptPay = promptPayType === 'SAME_AS_PHONE'
      ? phone.replace(/\D/g, '')
      : customPromptPayId.replace(/\D/g, '');

    if (!cleanPromptPay || cleanPromptPay.length < 10) {
      setPromptPayStatus({ checking: false, taken: false, valid: false, message: null });
      return;
    }

    if (cleanPromptPay === (storeData.promptPayId || '').replace(/\D/g, '')) {
      setPromptPayStatus({ checking: false, taken: false, valid: true, message: null });
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
            excludeStoreId: storeData.id,
          }),
        });
        const data = await res.json();
        if (data.available === false) {
          setPromptPayStatus({ checking: false, taken: true, valid: false, message: 'มีในระบบแล้ว' });
        } else {
          setPromptPayStatus({ checking: false, taken: false, valid: true, message: null });
        }
      } catch (err) {
        setPromptPayStatus(prev => ({ ...prev, checking: false }));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [promptPayType, customPromptPayId, phone, storeData?.id, storeData?.promptPayId]);

  // Request SMS OTP for new phone
  const handleSendOtp = async () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      setError('กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลักก่อนขอรหัส OTP');
      return;
    }
    if (phoneStatus.taken) {
      setError('เบอร์โทรศัพท์นี้มีในระบบแล้ว กรุณาใช้เบอร์อื่น');
      return;
    }

    setOtpSending(true);
    setError('');
    setOtpMessage('');

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, purpose: 'RESET_PASSWORD' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งรหัส OTP ได้');
      }
      setOtpSent(true);
      setRefCode(data.refCode || '');
      setDevOtp(data.devOtp || null);
      setCountdown(60);
      setOtpMessage(data.message || `ส่งรหัส OTP ไปยัง ${phone} เรียบร้อยแล้ว`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneStatus.taken || bankStatus.taken || emailStatus.taken || promptPayStatus.taken) {
      setError('ข้อมูลบางรายการมีในระบบแล้ว กรุณาตรวจสอบข้อความเตือนสีแดง');
      return;
    }

    if (isPhoneChanged && (!otp || otp.trim().length !== 6)) {
      setError('ท่านได้เปลี่ยนเบอร์โทรศัพท์ กรุณายืนยันรหัส OTP 6 หลักเพื่อความปลอดภัย');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPromptPay = promptPayType === 'SAME_AS_PHONE'
        ? phone.replace(/\D/g, '')
        : customPromptPayId.replace(/\D/g, '');

      const res = await fetch('/api/store/security-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          bankName,
          bankAccountNo: bankAccountNo.replace(/\D/g, ''),
          bankAccountName: bankAccountName.trim() || name.trim(),
          promptPayId: cleanPromptPay,
          promptPayName: promptPayName.trim() || storeData?.name || name.trim(),
          otp: isPhoneChanged ? otp.trim() : undefined,
          refCode: isPhoneChanged ? refCode.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // State A: Initial Loading
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
          <p className="text-sm font-bold text-slate-300">กำลังตรวจสอบโทเค็นความปลอดภัย...</p>
        </div>
      </div>
    );
  }

  // State B: Token Error or Expired
  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">ลิงก์แก้ไขข้อมูลไม่สามารถใช้งานได้</h2>
          <p className="text-xs text-rose-300 leading-relaxed font-semibold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
            {tokenError}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            เพื่อความปลอดภัยสูงสุดของร้านค้า ลิงก์แก้ไขข้อมูลบัญชีรับเงินมีอายุใช้งาน 24 ชั่วโมง และสามารถใช้งานได้ครั้งเดียว หากท่านต้องการแก้ไขข้อมูล กรุณาติดต่อ Platform Admin เพื่อขอรับลิงก์ใหม่
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State C: Successful Update Confirmation
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">อัปเดตข้อมูลสำเร็จแล้ว!</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            ข้อมูลบัญชีธนาคาร, บัญชีพร้อมเพย์, เบอร์โทรศัพท์ และอีเมลของร้าน{' '}
            <strong className="text-orange-400 font-bold">{storeData?.name}</strong> ได้รับการปรับปรุงและล็อกอย่างปลอดภัยเรียบร้อยแล้ว
          </p>

          <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700 text-left text-xs space-y-1.5 font-mono text-slate-300">
            <div>📞 เบอร์โทร: <span className="text-white font-bold">{phone}</span></div>
            <div>💳 พร้อมเพย์: <span className="text-emerald-400 font-bold">{promptPayType === 'SAME_AS_PHONE' ? phone : customPromptPayId}</span></div>
            <div>🏦 ธนาคาร: <span className="text-amber-400 font-bold">{bankName} - {bankAccountNo}</span></div>
            <div>📧 อีเมล: <span className="text-white font-bold">{email}</span></div>
          </div>

          <div className="pt-3">
            <Link
              href={`/r/${storeData?.slug}/pos`}
              className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-xl text-white text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all space-x-2"
            >
              <span>ไปยังระบบหน้าร้าน (POS)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State D: Edit Form
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand / Logo */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white tracking-tight">Order Pos</span>
              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Security Portal</span>
            </div>
          </Link>
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            แก้ไขข้อมูลร้านค้า & บัญชีรับเงิน
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            สำหรับร้าน <span className="text-emerald-400 font-bold">{storeData?.name}</span> (ยืนยันสิทธิ์ด้วยตนเอง)
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {/* Security Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300/90 leading-relaxed flex items-start space-x-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>นโยบายความปลอดภัยสูงสุด:</strong> Admin แพลตฟอร์มไม่สามารถแก้ไขบัญชีรับเงินของร้านค้าได้โดยตรง เพื่อป้องกันการทุจริต ท่านต้องเป็นผู้ตรวจสอบและแก้ไขข้อมูลความปลอดภัยนี้ด้วยตนเอง
            </span>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {otpMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{otpMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Owner Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อเจ้าของร้าน / ผู้ดูแล (Name) *
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  อีเมลเจ้าของร้าน (Email) *
                </label>
                {emailStatus.checking && (
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                    <span>กำลังตรวจ...</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm focus:outline-none transition-all font-mono ${
                    emailStatus.taken
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 ring-1 ring-rose-500/50'
                      : emailStatus.valid
                      ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                      : 'border-slate-700 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
              </div>
              {emailStatus.taken && (
                <div className="mt-1 flex items-center space-x-1 text-xs font-bold text-rose-500 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>มีในระบบแล้ว</span>
                </div>
              )}
              {!emailStatus.taken && emailStatus.valid && (
                <div className="mt-1 flex items-center space-x-1 text-[10px] font-medium text-emerald-400 animate-fade-in">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>สามารถใช้งานได้</span>
                </div>
              )}
            </div>

            {/* Bank Account Section */}
            <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/70 space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>บัญชีธนาคารสำหรับรับเงินของร้านค้า *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ธนาคาร *
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {THAI_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
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
                    type="text"
                    required
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value.replace(/[^\d-]/g, ''))}
                    placeholder="123-4-56789-0"
                    maxLength={15}
                    className={`w-full px-3 py-2 bg-slate-800 border rounded-xl text-white text-xs font-mono focus:outline-none transition-all ${
                      bankStatus.taken
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 ring-1 ring-rose-500/50'
                        : bankStatus.valid
                        ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-2 focus:ring-emerald-500'
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ชื่อบัญชีธนาคาร *
                </label>
                <input
                  type="text"
                  required
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* PromptPay Section */}
            <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>บัญชีพร้อมเพย์รับเงิน (PromptPay) *</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-xl border cursor-pointer transition-all ${
                      promptPayType === 'SAME_AS_PHONE'
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="promptPayType"
                      checked={promptPayType === 'SAME_AS_PHONE'}
                      onChange={() => setPromptPayType('SAME_AS_PHONE')}
                      className="accent-emerald-500"
                    />
                    <span className="text-[11px]">ใช้เบอร์เดียวกับมือถือ ({phone || 'เบอร์มือถือ'})</span>
                  </label>
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-xl border cursor-pointer transition-all ${
                      promptPayType === 'CUSTOM'
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
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
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        หมายเลขพร้อมเพย์ (10 หรือ 13 หลัก) *
                      </label>
                      {promptPayStatus.checking && (
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                          <span>ตรวจ...</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required={promptPayType === 'CUSTOM'}
                      value={customPromptPayId}
                      onChange={(e) => setCustomPromptPayId(e.target.value.replace(/\D/g, ''))}
                      maxLength={13}
                      className={`w-full px-3 py-2 bg-slate-800 border rounded-xl text-white text-xs font-mono focus:outline-none transition-all ${
                        promptPayStatus.taken
                          ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 ring-1 ring-rose-500/50'
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

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ชื่อบัญชีพร้อมเพย์ที่แสดงบน QR Code
                  </label>
                  <input
                    type="text"
                    value={promptPayName}
                    onChange={(e) => setPromptPayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number & SMS OTP Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  เบอร์โทรศัพท์มือถือ *
                </label>
                {phoneStatus.checking && (
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                    <span>กำลังตรวจ...</span>
                  </span>
                )}
              </div>
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
                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border rounded-xl text-white text-sm focus:outline-none font-mono transition-all ${
                      phoneStatus.taken
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 ring-1 ring-rose-500/50'
                        : phoneStatus.valid
                        ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                </div>

                {isPhoneChanged && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || countdown > 0 || !phone.trim() || phoneStatus.taken || phoneStatus.checking}
                    className="px-3 py-2 rounded-xl text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 border border-orange-500/30 transition-all flex items-center justify-center space-x-1 shrink-0"
                  >
                    {otpSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : countdown > 0 ? (
                      <span>{countdown}s</span>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>ขอ OTP ยืนยันเบอร์ใหม่</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {phoneStatus.taken && (
                <div className="mt-1 flex items-center space-x-1 text-xs font-bold text-rose-500 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>มีในระบบแล้ว</span>
                </div>
              )}
              {!phoneStatus.taken && phoneStatus.valid && (
                <div className="mt-1 flex items-center space-x-1 text-[10px] font-medium text-emerald-400 animate-fade-in">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>สามารถใช้งานได้</span>
                </div>
              )}

              {/* OTP Input if Phone Changed */}
              {isPhoneChanged && otpSent && (
                <div className="mt-3 p-3 bg-slate-800/80 rounded-2xl border border-orange-500/30 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="text-orange-400">กรอกรหัส OTP 6 หลักที่ได้รับ:</span>
                    {refCode && <span className="font-mono text-[11px] text-amber-400">Ref: {refCode}</span>}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl font-black py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {devOtp && (
                    <div
                      onClick={() => setOtp(devOtp)}
                      className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center cursor-pointer hover:bg-amber-500/25 transition-all text-xs text-amber-300 font-bold"
                    >
                      💡 โหมดทดสอบ แตะใส่รหัส OTP: <span className="font-mono underline">{devOtp}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting || phoneStatus.taken || bankStatus.taken || emailStatus.taken || promptPayStatus.taken || (isPhoneChanged && (!otp || otp.length !== 6))}
                className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-extrabold bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูลความปลอดภัย...</span>
                  </>
                ) : (phoneStatus.taken || bankStatus.taken || emailStatus.taken || promptPayStatus.taken) ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span>มีข้อมูลในระบบแล้ว กรุณาแก้ไขก่อนบันทึก</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>ยืนยันบันทึกข้อมูลร้านค้า & บัญชีรับเงิน</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SecurityEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <SecurityEditContent />
    </Suspense>
  );
}
