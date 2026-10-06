'use client';

import React, { useState, useEffect } from 'react';
import ReceiptPrintModal from '@/components/ReceiptPrintModal';
import ReportPdfPreviewModal from '@/components/ReportPdfPreviewModal';
import {
  BarChart3,
  TrendingUp,
  Banknote,
  QrCode,
  Receipt,
  Printer,
  Calendar,
  RefreshCw,
  Award,
  CheckCircle2,
  Download,
  Eye,
  Clock,
  PieChart,
  Flame,
  Utensils,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';

const getBangkokToday = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
};

const getPastDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
};

const PRESETS = [
  { id: '1d', label: '1 วัน', days: 0 },
  { id: '7d', label: '7 วัน', days: 6 },
  { id: '30d', label: '30 วัน', days: 29 },
  { id: '3m', label: '3 เดือน', days: 89 },
  { id: '6m', label: '6 เดือน', days: 179 },
];

export default function AdminReportsView({ slug = 'lung-pa' }: { slug?: string }) {
  const [report, setReport] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date Range State (Bangkok Timezone UTC+7)
  const [startDate, setStartDate] = useState(getBangkokToday());
  const [endDate, setEndDate] = useState(getBangkokToday());
  const [activePreset, setActivePreset] = useState<string>('1d');

  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  const applyPreset = (presetId: string, days: number) => {
    setActivePreset(presetId);
    const today = getBangkokToday();
    const past = getPastDateStr(days);
    setStartDate(past);
    setEndDate(today);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const [repRes, settingsRes] = await Promise.all([
        fetch(`/api/r/${slug}/reports/daily?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/r/${slug}/settings`),
      ]);
      const [repData, sData] = await Promise.all([
        repRes.json().catch(() => null),
        settingsRes.json().catch(() => null),
      ]);
      setReport(repData?.error ? null : repData);
      setStore(sData?.error ? null : sData);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [slug, startDate, endDate]);

  const isSingleDay = startDate === endDate;

  const handleDownloadCSV = () => {
    if (!report) return;

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[][] = [];

    // Header info
    const storeTitle = store?.storeName || store?.name || slug;
    rows.push(['รายงานสรุปยอดขาย', storeTitle]);
    rows.push(['ช่วงวันที่', startDate, 'ถึงวันที่', endDate]);
    rows.push(['วันที่พิมพ์/ส่งออกข้อมูล', new Date().toLocaleString('th-TH')]);
    rows.push([]);

    // Overview KPIs
    rows.push(['=== สรุปภาพรวม (Overview KPIs) ===']);
    rows.push(['ยอดขายรวมสุทธิ (บาท)', String(report.totalSales || 0)]);
    rows.push(['จำนวนบิลสำเร็จ (บิล)', String(report.totalBills || 0)]);
    const avgBill = report.totalBills > 0 ? (report.totalSales / report.totalBills).toFixed(2) : '0.00';
    rows.push(['ยอดขายเฉลี่ยต่อบิล (บาท)', avgBill]);
    rows.push(['ต้นทุนวัตถุดิบ COGS (บาท)', (report.totalCost || 0).toFixed(2)]);
    rows.push(['กำไรสุทธิ (บาท)', (report.grossProfit || 0).toFixed(2)]);
    rows.push(['อัตรากำไร (%)', `${report.profitMargin || 0}%`]);
    rows.push(['ยอดชำระพร้อมเพย์ (บาท)', String(report.promptPaySales || 0)]);
    rows.push(['ยอดชำระเงินสด (บาท)', String(report.cashSales || 0)]);
    if (report.totalGpDeducted > 0) {
      rows.push(['หัก GP เดลิเวอรีรวม (บาท)', String(report.totalGpDeducted || 0)]);
    }
    rows.push([]);

    // Sales by Channel
    if (report.channelBreakdown) {
      rows.push(['=== สรุปยอดขายแยกตามช่องทาง (Sales by Channel) ===']);
      rows.push(['ช่องทาง', 'จำนวนออเดอร์', 'ยอดขายรวม (บาท)', 'ค่า GP ที่หัก (บาท)', 'ยอดสุทธิ (บาท)']);
      const channelLabels: Record<string, string> = {
        DINE_IN: 'ทานที่ร้าน (Dine-in)',
        TAKEAWAY: 'สั่งกลับบ้าน (Takeaway)',
        LINEMAN: 'LINE MAN',
        GRAB: 'GrabFood',
        SHOPEE_FOOD: 'ShopeeFood',
        ROBINHOOD: 'Robinhood',
      };
      for (const [key, ch] of Object.entries(report.channelBreakdown as Record<string, any>)) {
        if (ch.count > 0 || ['DINE_IN', 'TAKEAWAY', 'LINEMAN', 'GRAB', 'SHOPEE_FOOD'].includes(key)) {
          rows.push([
            channelLabels[key] || key,
            String(ch.count || 0),
            String(ch.gross || 0),
            String(ch.gp || 0),
            String(ch.net || 0),
          ]);
        }
      }
      rows.push([]);
    }

    // Daily Breakdown
    if (report.dailyBreakdown && report.dailyBreakdown.length > 0) {
      rows.push(['=== สรุปยอดขายแยกรายวัน (Daily Breakdown) ===']);
      rows.push(['วันที่', 'จำนวนบิล', 'ยอดขายรวมสุทธิ (บาท)', 'ต้นทุนวัตถุดิบ (บาท)', 'กำไรสุทธิ (บาท)', 'พร้อมเพย์ (บาท)', 'เงินสด (บาท)']);
      for (const day of report.dailyBreakdown) {
        rows.push([
          day.date,
          String(day.bills || 0),
          String(day.sales || 0),
          (day.cost || 0).toFixed(2),
          (day.profit || 0).toFixed(2),
          String(day.promptPay || 0),
          String(day.cash || 0),
        ]);
      }
      rows.push([]);
    }

    // Top Selling Items
    if (report.topSellingItems && report.topSellingItems.length > 0) {
      rows.push(['=== เมนูขายดี (Top Sellers) ===']);
      rows.push(['อันดับ', 'ชื่อเมนู', 'จำนวนจานที่ขายได้', 'ยอดขายรวม (บาท)']);
      report.topSellingItems.forEach((item: any, idx: number) => {
        rows.push([String(idx + 1), item.name, String(item.quantity), String(item.revenue || 0)]);
      });
      rows.push([]);
    }

    // Category Breakdown
    if (report.categoryBreakdown && report.categoryBreakdown.length > 0) {
      rows.push(['=== สรุปยอดขายตามหมวดหมู่ (Category Breakdown) ===']);
      rows.push(['หมวดหมู่อาหาร', 'จำนวนจานที่ขายได้', 'ยอดขายรวม (บาท)', 'สัดส่วนยอดขาย (%)']);
      report.categoryBreakdown.forEach((cat: any) => {
        const pct = report.totalSales > 0 ? ((cat.revenue / report.totalSales) * 100).toFixed(1) : '0';
        rows.push([cat.name, String(cat.quantity), String(cat.revenue), `${pct}%`]);
      });
      rows.push([]);
    }

    // Hourly Peak Hours
    if (report.hourlyBreakdown && report.hourlyBreakdown.some((h: any) => h.count > 0)) {
      rows.push(['=== สรุปยอดขายตามช่วงเวลา (Peak Hours 0-23 น.) ===']);
      rows.push(['ช่วงเวลา', 'จำนวนบิล', 'ยอดขายรวม (บาท)']);
      report.hourlyBreakdown
        .filter((h: any) => h.count > 0)
        .forEach((h: any) => {
          rows.push([`${h.label} - ${String(h.hour + 1).padStart(2, '0')}:00`, String(h.count), String(h.sales)]);
        });
      rows.push([]);
    }

    // Orders details
    if (report.orders && report.orders.length > 0) {
      rows.push(['=== รายการบิลทั้งหมด (All Orders) ===']);
      rows.push(['ลำดับ', 'รหัสบิล', 'เวลาที่ชำระ', 'โต๊ะ/ช่องทาง', 'วิธีชำระ', 'ยอดขายสุทธิ (บาท)', 'ต้นทุน (บาท)', 'กำไร (บาท)', 'รายการสินค้า']);
      report.orders.forEach((ord: any, idx: number) => {
        const itemsSummary = (ord.items || [])
          .map((it: any) => `${it.name || it.menuItem?.name || 'เมนู'} x${it.quantity}`)
          .join(', ');
        const timeStr = ord.paidAt || ord.createdAt ? new Date(ord.paidAt || ord.createdAt).toLocaleString('th-TH') : '-';
        const tableName = ord.table?.name || (ord.tableId ? `โต๊ะ ${ord.tableId}` : (ord.orderChannel || ord.orderType || 'ทานที่ร้าน'));
        const profit = (ord.netAmount - (ord.gpAmount || 0)) - (ord.costAmount || 0);

        rows.push([
          String(idx + 1),
          ord.id.slice(-8).toUpperCase(),
          timeStr,
          tableName,
          ord.paymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด',
          String(ord.netAmount ?? ord.totalAmount ?? 0),
          (ord.costAmount || 0).toFixed(2),
          profit.toFixed(2),
          itemsSummary,
        ]);
      });
    }

    // Prepend UTF-8 BOM so Excel opens Thai correctly
    const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCSV).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (storeTitle || 'report').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    const filename = `รายงานยอดขาย_${safeName}_${startDate}${startDate !== endDate ? `_ถึง_${endDate}` : ''}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm no-print w-full">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isSingleDay
                ? 'รายงานยอดขาย & ปิดกะประจำวัน'
                : 'รายงานสรุปยอดขาย (ช่วงเวลา)'}
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> •{' '}
            {isSingleDay
              ? `วันที่ ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'long' })}`
              : `ช่วงวันที่ ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'short' })} ถึง ${new Date(endDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'short' })}`}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full lg:w-auto">
          {/* Main Row: [จาก: วันที่] ➔ [ถึง: วันที่] + ปุ่มพิมพ์รายงาน */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-300 w-full sm:w-auto shadow-2xs">
              <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-none">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold pl-1 whitespace-nowrap">จาก</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="p-1 rounded-lg border-none text-xs font-bold text-slate-700 bg-transparent focus:ring-0 focus:outline-none w-full sm:w-auto"
                />
              </div>
              <span className="text-slate-400 font-bold text-xs flex-shrink-0">➔</span>
              <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-none">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold whitespace-nowrap">ถึง</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="p-1 rounded-lg border-none text-xs font-bold text-slate-700 bg-transparent focus:ring-0 focus:outline-none w-full sm:w-auto"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center">
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(true)}
                disabled={!report || loading}
                className="px-2.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                title="ดูตัวอย่างรายงาน PDF ก่อนสั่งพิมพ์"
              >
                <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="inline sm:hidden">ดู PDF</span>
                <span className="hidden sm:inline">ดูตัวอย่าง PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={!report || loading}
                className="px-2.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                title="ดาวน์โหลดรายงานยอดขายเป็นไฟล์ Excel (CSV)"
              >
                <Download className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="inline sm:hidden">Excel</span>
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="inline sm:hidden">พิมพ์</span>
                <span className="hidden sm:inline">พิมพ์รายงาน</span>
              </button>
            </div>
          </div>

          {/* Compact Quick Preset Buttons Below */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 max-w-full">
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id, preset.days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95 flex-shrink-0 ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-orange-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            {activePreset === 'custom' && (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap flex-shrink-0">
                กำหนดเอง
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Printable Report Container (Bug #10) */}
      <div id={isPdfPreviewOpen ? undefined : 'printable-report'} className="space-y-3.5 sm:space-y-6">
        {/* Print-only Header */}
        <div className="hidden print:block pb-4 border-b border-slate-200 mb-4">
          <h2 className="text-xl font-black text-slate-900">{store?.storeName || store?.name || slug}</h2>
          <p className="text-xs text-slate-600 font-bold mt-1">
            {isSingleDay
              ? `รายงานยอดขาย & ปิดกะประจำวัน: ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'long' })}`
              : `รายงานสรุปยอดขาย: ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'long' })} ถึง ${new Date(endDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'long' })}`}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            พิมพ์เมื่อ: {new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        {/* Enterprise KPI Cards (Equal Height Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 auto-rows-fr w-full">
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-slate-400">ยอดขายรวมสุทธิ</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ฿{(report?.totalSales || 0).toLocaleString()}
            </div>
          </div>
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs">
            <span className="text-emerald-600 font-bold">{report?.totalBills || 0} บิลสำเร็จ</span>
            <span className="text-slate-500 font-bold">
              เฉลี่ย ฿{(report?.averageBillAmount || (report?.totalBills ? Math.round(report.totalSales / report.totalBills) : 0)).toLocaleString()}/บิล
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-amber-500">ต้นทุนวัตถุดิบ (COGS)</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              ฿{(report?.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block pt-1.5 border-t border-slate-100">
            คำนวณตามสูตรตัดสต็อก
          </span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-slate-400">กำไรสุทธิหลังหัก GP เดลิเวอรี</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ฿{(report?.grossProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-600 font-bold block pt-1.5 border-t border-slate-100">
            {report?.totalGpDeducted > 0 ? `หัก GP รวม ฿${(report?.totalGpDeducted || 0).toLocaleString()} • ` : ''}อัตรากำไร {report?.profitMargin || 0}%
          </span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-slate-400">สัดส่วนช่องทางชำระ & สินค้า</span>
            <div className="text-xs space-y-1 mt-1 font-extrabold">
              <div className="flex justify-between text-orange-600">
                <span>พร้อมเพย์:</span>
                <span>฿{(report?.promptPaySales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>เงินสด:</span>
                <span>฿{(report?.cashSales || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-500 font-bold block pt-1.5 border-t border-slate-100">
            {report?.totalItemsSold > 0
              ? `จำหน่าย ${report.totalItemsSold} จาน (${report.averageItemsPerBill} จาน/บิล)`
              : 'ยอดขายและสัดส่วนชำระ'}
          </span>
        </div>
      </div>

      {/* Delivery Channels Breakdown Card */}
      {report?.channelBreakdown && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 w-full">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <span>🛵 สรุปยอดขายแยกตามช่องทาง (Sales by Channel & Platform)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: 'DINE_IN', label: '🍽️ ทานที่ร้าน', data: report.channelBreakdown.DINE_IN, bg: 'bg-slate-50', text: 'text-slate-900' },
              { id: 'TAKEAWAY', label: '🛍️ กลับบ้าน', data: report.channelBreakdown.TAKEAWAY, bg: 'bg-orange-50/50', text: 'text-orange-900' },
              { id: 'LINEMAN', label: '🟢 LINE MAN', data: report.channelBreakdown.LINEMAN, bg: 'bg-emerald-50/60', text: 'text-emerald-900' },
              { id: 'GRAB', label: '🟢 GrabFood', data: report.channelBreakdown.GRAB, bg: 'bg-emerald-50/60', text: 'text-emerald-900' },
              { id: 'SHOPEE_FOOD', label: '🟠 ShopeeFood', data: report.channelBreakdown.SHOPEE_FOOD, bg: 'bg-amber-50/60', text: 'text-amber-900' },
            ].map((item) => (
              <div key={item.id} className={`p-3 rounded-2xl border border-slate-200/70 ${item.bg} space-y-1`}>
                <span className={`text-xs font-black block ${item.text}`}>{item.label}</span>
                <span className="text-[11px] text-slate-500 font-bold block">{item.data?.count || 0} ออเดอร์</span>
                <div className="pt-1.5 border-t border-slate-200/60 flex flex-col">
                  <span className="text-xs font-black text-slate-900">฿{(item.data?.gross || 0).toLocaleString()}</span>
                  {item.data?.gp > 0 && (
                    <span className="text-[10px] text-rose-600 font-bold">
                      (หัก GP -฿{(item.data?.gp || 0).toLocaleString()})
                    </span>
                  )}
                  {item.data?.gp > 0 && (
                    <span className="text-[11px] text-emerald-700 font-extrabold">
                      สุทธิ ฿{(item.data?.net || 0).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Hours & Rush Heatmap */}
      {report?.hourlyBreakdown && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>⏰ ช่วงเวลาขายดี (Peak Hours & Rush Analysis)</span>
            </h3>
            {(() => {
              const peakHour = [...(report.hourlyBreakdown || [])].sort((a: any, b: any) => b.sales - a.sales)[0];
              if (peakHour && peakHour.sales > 0) {
                return (
                  <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                    🔥 ขายดีสุด: {peakHour.label} - {String(peakHour.hour + 1).padStart(2, '0')}:00 น. (฿{peakHour.sales.toLocaleString()})
                  </span>
                );
              }
              return null;
            })()}
          </div>

          {/* Hourly 24-Bar Histogram Chart */}
          <div className="pt-2">
            <div className="h-32 flex items-end gap-1 sm:gap-1.5 overflow-x-auto pb-1 pt-6 px-1">
              {(() => {
                const maxSales = Math.max(...report.hourlyBreakdown.map((h: any) => h.sales), 1);
                return report.hourlyBreakdown.map((h: any) => {
                  const heightPct = Math.max(4, Math.round((h.sales / maxSales) * 100));
                  const isBusy = h.sales > 0;
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 min-w-[20px] flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-9 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {h.label} น.: ฿{h.sales.toLocaleString()} ({h.count} บิล)
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isBusy
                            ? 'bg-gradient-to-t from-orange-500 to-amber-400 group-hover:from-orange-600 group-hover:to-amber-500 shadow-sm'
                            : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}
                      />

                      {/* Hour Label */}
                      <span className={`text-[9px] mt-1.5 ${isBusy ? 'font-bold text-slate-700' : 'text-slate-400'}`}>
                        {h.hour % 2 === 0 ? h.hour : ''}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-1 border-t border-slate-100">
              <span>00:00 (เที่ยงคืน)</span>
              <span>12:00 (เที่ยงวัน)</span>
              <span>23:00 น.</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown (If categories exist) */}
      {report?.categoryBreakdown && report.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 w-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <span>🍲 ยอดขายตามหมวดหมู่อาหาร (Category Share)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">
              {report.categoryBreakdown.length} หมวดหมู่
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.categoryBreakdown.map((cat: any) => {
              const pct = report.totalSales > 0 ? Math.round((cat.revenue / report.totalSales) * 100) : 0;
              return (
                <div key={cat.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 truncate">{cat.name}</span>
                    <span className="text-xs font-extrabold text-emerald-600">{pct}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{cat.quantity} จาน</span>
                    <span className="font-bold text-slate-700">฿{cat.revenue.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Breakdown Table (Shown when date range has multiple days) */}
      {report?.dailyBreakdown && report.dailyBreakdown.length > 0 && !isSingleDay && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>📊 สรุปยอดขายแยกรายวัน (Daily Breakdown • {report.dailyBreakdown.length} วันที่มีการขาย)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">
              เฉลี่ย ฿{report.dailyBreakdown.length > 0 ? Math.round(report.totalSales / report.dailyBreakdown.length).toLocaleString() : 0} / วัน
            </span>
          </div>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="text-slate-400 font-bold border-b border-slate-100 bg-slate-50/50">
                <tr className="whitespace-nowrap">
                  <th className="py-2.5 px-3">วันที่</th>
                  <th className="py-2.5 px-3 text-center">จำนวนบิล</th>
                  <th className="py-2.5 px-3 text-right">ยอดขายรวมสุทธิ</th>
                  <th className="py-2.5 px-3 text-right">ต้นทุนวัตถุดิบ</th>
                  <th className="py-2.5 px-3 text-right">กำไรสุทธิ</th>
                  <th className="py-2.5 px-3 text-right">สัดส่วนชำระเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {report.dailyBreakdown.map((day: any) => {
                  const dateFormatted = new Date(day.date + 'T00:00:00').toLocaleDateString('th-TH', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={day.date} className="hover:bg-slate-50/80 whitespace-nowrap transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {dateFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                        {day.bills} บิล
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        ฿{day.sales.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600 font-bold">
                        ฿{day.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                        ฿{day.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px]">
                        <span className="text-orange-600 font-bold">พร้อมเพย์: ฿{day.promptPay.toLocaleString()}</span>
                        {day.cash > 0 && (
                          <span className="text-emerald-600 font-bold ml-2">เงินสด: ฿{day.cash.toLocaleString()}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Sellers & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {/* Top 10 Best Sellers */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Award className="w-4 h-4 text-orange-500" />
            <span>เมนูขายดี (Top Sellers)</span>
          </h3>

          <div className="divide-y divide-slate-100 space-y-2">
            {report?.topSellingItems?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มีข้อมูลยอดขายในวันนี้</p>
            ) : (
              report?.topSellingItems?.map((item: any, idx: number) => (
                <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1 truncate">
                    <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-700 font-black text-[11px] flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-800 truncate">{item.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-900 block">{item.quantity} จาน</span>
                    <span className="text-[10px] text-slate-400">฿{item.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Bills Table (Isolated Horizontal Scroll) */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-700" />
            <span>รายการบิลที่ชำระเงินแล้ว ({report?.orders?.length || 0} บิล)</span>
          </h3>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="text-slate-400 font-bold border-b border-slate-100">
                <tr className="whitespace-nowrap">
                  <th className="py-2.5 px-3">เวลา</th>
                  <th className="py-2.5 px-3">โต๊ะ</th>
                  <th className="py-2.5 px-3">วิธีจ่าย</th>
                  <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                  <th className="py-2.5 px-3 text-right">ใบเสร็จ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {report?.orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-50 whitespace-nowrap">
                    <td className="py-2.5 px-3 font-semibold">{formatTime(ord.paidAt || ord.createdAt)}</td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">
                      {ord.orderChannel === 'LINEMAN' ? (
                        <span className="inline-flex items-center gap-1 text-[#06C755]">
                          <span>🟢 LINE MAN</span>
                          <span className="text-slate-500 font-normal">#{ord.deliveryOrderId || ord.id.slice(-4)}</span>
                        </span>
                      ) : ord.orderChannel === 'GRAB' ? (
                        <span className="inline-flex items-center gap-1 text-[#00B14F]">
                          <span>🟢 GrabFood</span>
                          <span className="text-slate-500 font-normal">#{ord.deliveryOrderId || ord.id.slice(-4)}</span>
                        </span>
                      ) : ord.orderChannel === 'SHOPEE_FOOD' ? (
                        <span className="inline-flex items-center gap-1 text-[#EE4D2D]">
                          <span>🟠 Shopee</span>
                          <span className="text-slate-500 font-normal">#{ord.deliveryOrderId || ord.id.slice(-4)}</span>
                        </span>
                      ) : ord.orderType === 'TAKEAWAY' ? (
                        <span>🛍️ กลับบ้าน</span>
                      ) : (
                        <span>{ord.table?.name || `โต๊ะ ${ord.tableNo}`}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ord.paymentMethod === 'PROMPTPAY'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {ord.paymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-black text-slate-900 block">฿{ord.netAmount.toLocaleString()}</span>
                      {ord.gpAmount > 0 && (
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          (สุทธิ ฿{ord.netRevenue || ord.netAmount - ord.gpAmount})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setReceiptOrder({
                            storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
                            promptPayName: store?.promptPayName || '',
                            phone: store?.phone || '',
                            address: store?.address || '',
                            receiptFooter: store?.receiptFooter || '',
                            tableId: ord.tableNo,
                            tableName: ord.table?.name || `โต๊ะ ${ord.tableNo}`,
                            orders: [ord],
                            totalAmount: ord.totalAmount,
                            discountAmount: ord.discountAmount,
                            netAmount: ord.netAmount,
                            paymentMethod: ord.paymentMethod,
                            cashReceived: ord.cashReceived,
                            changeAmount: ord.changeAmount,
                            paidAt: ord.paidAt || ord.createdAt,
                          });
                          setIsReceiptModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-900"
                        title="พิมพ์ใบเสร็จซ้ำ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>

      {/* Receipt Modal */}
      {isReceiptModalOpen && receiptOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={receiptOrder}
        />
      )}

      {/* PDF Report Preview Modal */}
      {isPdfPreviewOpen && (
        <ReportPdfPreviewModal
          isOpen={isPdfPreviewOpen}
          onClose={() => setIsPdfPreviewOpen(false)}
          report={report}
          store={store}
          slug={slug}
          startDate={startDate}
          endDate={endDate}
          onDownloadExcel={handleDownloadCSV}
        />
      )}
    </div>
  );
}
