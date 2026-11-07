import Link from 'next/link';
import { UtensilsCrossed, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/10">
        <UtensilsCrossed className="w-10 h-10" />
      </div>
      <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-3">
        404 Not Found
      </span>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
        ไม่พบหน้าที่คุณต้องการ
      </h1>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        หน้าที่คุณกำลังค้นหาไม่มีอยู่ ลิงก์อาจหมดอายุ หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>กลับหน้าแรก</span>
        </Link>
      </div>
    </div>
  );
}
