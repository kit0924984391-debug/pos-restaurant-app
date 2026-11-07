'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Next.js App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-6 shadow-xl shadow-rose-500/10">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-3">
        Application Error
      </span>
      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
        เกิดข้อผิดพลาดในการแสดงผล
      </h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณากดปุ่มลองใหม่อีกครั้ง หรือกลับไปที่หน้าหลัก
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>กลับหน้าแรก</span>
        </Link>
      </div>
    </div>
  );
}
