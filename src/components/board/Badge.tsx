import React from 'react';
import { ShieldCheck, Store, User as UserIcon, CheckCircle, Clock, Wrench, XCircle } from 'lucide-react';

interface UserBadgeProps {
  role?: string;
  storeName?: string | null;
  className?: string;
}

export function UserRoleBadge({ role, storeName, className = '' }: UserBadgeProps) {
  if (role === 'SUPER_ADMIN') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 ${className}`}
        title="ผู้ดูแลระบบ Order Pos"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span>ทีมงาน Order Pos 🛡️</span>
      </span>
    );
  }

  if (storeName) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}
        title={`เจ้าของร้าน ${storeName}`}
      >
        <Store className="w-3.5 h-3.5 text-amber-400" />
        <span className="truncate max-w-[150px]">{storeName} 🏪</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}
    >
      <UserIcon className="w-3 h-3 text-slate-400" />
      <span>สมาชิก 👤</span>
    </span>
  );
}

interface FeatureStatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function FeatureStatusBadge({ status, className = '' }: FeatureStatusBadgeProps) {
  if (!status) return null;

  switch (status) {
    case 'UNDER_REVIEW':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-400" />
          <span>📋 รับเรื่องแล้ว</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30 ${className}`}
        >
          <Wrench className="w-3 h-3 text-blue-400" />
          <span>⚙️ กำลังพัฒนา</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${className}`}
        >
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span>✅ เปิดใช้งานแล้ว</span>
        </span>
      );
    case 'DECLINED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-500/15 text-slate-400 border border-slate-600/30 ${className}`}
        >
          <XCircle className="w-3 h-3 text-slate-400" />
          <span>❌ ปิดการพิจารณา</span>
        </span>
      );
    default:
      return null;
  }
}
