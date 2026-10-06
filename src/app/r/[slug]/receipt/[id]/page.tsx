'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Receipt,
  Share2,
  Sparkles,
  ArrowLeft,
  Store,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Award,
  Download,
  Utensils,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

export default function ElectronicReceiptPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const { slug, id } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/r/${slug}/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('ไม่พบข้อมูลใบเสร็จนี้');
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดใบเสร็จ');
        setLoading(false);
      });
  }, [slug, id]);

  const handleShareLine = () => {
    if (!order) return;
    const url = window.location.href;
    const storeName = order.store?.name || 'ร้านอาหาร';
    const text = `📄 ใบเสร็จอิเล็กทรอนิกส์ (E-Receipt)\n${storeName}\nยอดชำระ: ฿${(
      order.netAmount || 0
    ).toLocaleString()}\nดูใบเสร็จฉบับเต็มได้ที่: ${url}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Receipt className="w-12 h-12 text-orange-400 animate-bounce mb-3" />
        <p className="font-extrabold text-sm text-slate-300">กำลังโหลดใบเสร็จอิเล็กทรอนิกส์...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            ✕
          </div>
          <h2 className="font-black text-lg text-white">ไม่พบใบเสร็จ</h2>
          <p className="text-xs text-slate-400">{error || 'ไม่พบข้อมูลออเดอร์นี้ในระบบ'}</p>
          <Link
            href={`/r/${slug}/table/${order?.tableNo || 1}`}
            className="inline-block px-5 py-2.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs"
          >
            กลับหน้าสั่งอาหาร
          </Link>
        </div>
      </div>
    );
  }

  const store = order.store || {};
  const isPaid = order.paymentStatus === 'PAID';
  const tableTitle = order.table?.name || `โต๊ะ ${order.tableNo}`;
  const items = order.items || [];
  const pointsEarned = order.pointsEarned || Math.floor((order.netAmount || 0) / 25);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 pb-24">
      {/* Top Header Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <Link
          href={`/r/${slug}/table/${order.tableNo || 1}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับโต๊ะอาหาร</span>
        </Link>
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-800 text-orange-400 border border-slate-700">
          E-Receipt Official
        </span>
      </div>

      {/* Main E-Receipt Digital Paper Card */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Verification Banner */}
        <div className="bg-emerald-600 text-white p-4 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 font-black text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{isPaid ? 'ชำระเงินเรียบร้อยแล้ว' : 'ใบแจ้งยอดชำระเงิน'}</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">{store.name || 'ร้านอาหารตามสั่ง'}</h1>
          {store.address && (
            <p className="text-[11px] text-emerald-100 max-w-xs mx-auto truncate">{store.address}</p>
          )}
          {store.phone && (
            <p className="text-[10px] text-emerald-200 font-bold">โทร: {store.phone}</p>
          )}
        </div>

        {/* Receipt Meta */}
        <div className="p-5 border-b border-dashed border-slate-300 bg-slate-50 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>เลขที่บิล:</span>
            <span className="font-mono font-black text-slate-900">#{order.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>โต๊ะ / ประเภท:</span>
            <span className="font-extrabold text-slate-900">{tableTitle}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>วันที่ & เวลา:</span>
            <span className="font-bold text-slate-900">{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>วิธีชำระ:</span>
            <span className="font-bold text-slate-900">
              {order.paymentMethod === 'PROMPTPAY'
                ? 'โอนเงินพร้อมเพย์ (PromptPay)'
                : order.paymentMethod === 'CASH'
                ? 'เงินสด (Cash)'
                : 'รอชำระ'}
            </span>
          </div>
          {order.customerName && (
            <div className="flex justify-between items-center text-slate-600">
              <span>ชื่อลูกค้า:</span>
              <span className="font-bold text-slate-900">{order.customerName}</span>
            </div>
          )}
        </div>

        {/* Itemized Order List */}
        <div className="p-5 space-y-3">
          <div className="flex justify-between text-xs font-black text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
            <span>รายการอาหาร ({items.length})</span>
            <span>จำนวน x ราคา</span>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            {items.map((it: any, idx: number) => {
              let parsedOptions: any[] = [];
              if (it.selectedOptions) {
                try {
                  parsedOptions =
                    typeof it.selectedOptions === 'string'
                      ? JSON.parse(it.selectedOptions)
                      : it.selectedOptions;
                } catch {}
              }

              return (
                <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                  <div className="flex-1 pr-2">
                    <span className="font-black text-slate-900 block leading-tight">
                      {idx + 1}. {it.name}
                    </span>

                    {parsedOptions.length > 0 && (
                      <div className="ml-3 mt-0.5 space-y-0.5">
                        {parsedOptions.map((opt: any, oIdx: number) => (
                          <span key={oIdx} className="text-[10px] text-slate-500 block">
                            • {opt.choice || opt.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {it.specialNote && (
                      <span className="ml-3 mt-0.5 text-[10px] text-rose-600 font-bold block">
                        * {it.specialNote}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500 block">x{it.quantity || 1}</span>
                    <span className="font-black text-slate-900">
                      ฿{((it.price || 0) * (it.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-4 border-t-2 border-slate-900 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>ยอดรวมรายการ:</span>
              <span>฿{(order.totalAmount || 0).toLocaleString()}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>ส่วนลด:</span>
                <span>-฿{order.discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
              <span>ยอดสุทธิ (Total Paid):</span>
              <span className="text-emerald-700">฿{(order.netAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* CRM Loyalty Points Banner */}
        {order.memberPhone && (
          <div className="mx-5 mb-5 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-black text-amber-950 block">แต้มสะสมสมาชิก</span>
                <span className="text-[10px] text-amber-800">
                  เบอร์: {order.memberPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-black text-amber-700 text-sm">+{pointsEarned} แต้ม</span>
              <span className="text-[9px] text-amber-600 block">สะสมเรียบร้อย</span>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center space-y-1 text-[11px] text-slate-500">
          <p>{store.receiptFooter || 'ขอบคุณที่มาอุดหนุนครับ 🙏 ทานให้อร่อย โอกาสหน้าเชิญใหม่ครับ'}</p>
          <p className="text-[9px] text-slate-400">Order POS • Digital E-Receipt System</p>
        </div>
      </div>

      {/* Share & Actions Toolbar */}
      <div className="w-full max-w-md mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleShareLine}
          className="p-3 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>แชร์เข้า LINE</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all cursor-pointer"
        >
          <Receipt className="w-4 h-4 text-orange-400" />
          <span>{copied ? 'คัดลอกลิงก์แล้ว! ✓' : 'คัดลอกลิงก์ใบเสร็จ'}</span>
        </button>
      </div>
    </div>
  );
}
