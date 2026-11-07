'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Server,
  Zap,
  Globe,
  Database,
  Radio,
  Bluetooth,
  ShieldCheck,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
  X,
  Gauge,
  Wifi,
  Smartphone,
  Check,
} from 'lucide-react';
import { playOrderChime } from '@/lib/sound';
import ScrollReveal from './ScrollReveal';

// -----------------------------------------------------------------------------
// Data Structures for the Celestial Tech Stack Module
// -----------------------------------------------------------------------------
type ScenarioType = 'rush' | 'offline' | 'quiet' | 'multi';

interface ScenarioDetail {
  id: ScenarioType;
  title: string;
  badge: string;
  traditional: {
    title: string;
    description: string;
    cpu: string;
    latency: string;
    status: string;
    warningText: string;
  };
  serverless: {
    title: string;
    description: string;
    cpu: string;
    latency: string;
    status: string;
    advantageText: string;
  };
  chartLatencyTrad: number[];
  chartLatencyEdge: number[];
}

const SCENARIOS: Record<ScenarioType, ScenarioDetail> = {
  rush: {
    id: 'rush',
    title: '12:30 น. ช่วงพีค (50 โต๊ะสั่งพร้อมกัน)',
    badge: 'Peak Hour Rush',
    traditional: {
      title: 'เซิร์ฟเวอร์คอมพิวเตอร์ในร้าน (Local PC)',
      description: 'CPU พุ่งทะลุ 98% เครื่องเริ่มร้อน โปรแกรมค้าง เด็กเสิร์ฟยืนรอหมุนติ้ว ครัวออกอาหารสลับคิว ลูกค้ารอนานและบ่นยกเลิก',
      cpu: '98% Overload',
      latency: '1,850 ms (หน่วง)',
      status: 'วิกฤต / เสี่ยงค้าง',
      warningText: 'เสียโอกาสขาย ลูกค้ารอนาน พนักงานเครียด',
    },
    serverless: {
      title: 'Order POS บน Cloudflare Global Edge',
      description: 'ระบบขยายกำลังอัตโนมัติตามปริมาณคน ประมวลผลที่ Node กรุงเทพฯ <28ms ทุกโต๊ะสแกนสั่งได้พร้อมกันลื่นไหล 60fps ไม่มีสะดุด',
      cpu: 'Auto-scaled Elastic',
      latency: '24 ms (ทันที)',
      status: 'ปกติ 99.99%',
      advantageText: 'รับได้ 100+ โต๊ะพร้อมกัน ครัวทำตามคิวไม่มีตกหล่น',
    },
    chartLatencyTrad: [120, 280, 650, 1200, 1850],
    chartLatencyEdge: [24, 25, 26, 25, 24],
  },
  offline: {
    id: 'offline',
    title: 'เน็ตซิมมือถือหลุด / ไฟตกหน้าร้าน',
    badge: 'Network Drops',
    traditional: {
      title: 'เซิร์ฟเวอร์คอมพิวเตอร์ในร้าน (Local PC)',
      description: 'เครื่องคอมพิวเตอร์ดับกะทันหัน ออเดอร์และโต๊ะที่เปิดค้างไว้หายเกลี้ยง ออกบิลไม่ได้ ต้องจดมือมั่ว สรุปยอดเงินปิดกะไม่ตรง',
      cpu: 'Dead / Offline',
      latency: 'Timeout (ขาดการเชื่อมต่อ)',
      status: 'หยุดทำงานถาวร',
      warningText: 'ข้อมูลบิลสูญหาย คิดเงินลูกค้าไม่ได้',
    },
    serverless: {
      title: 'Order POS บน Cloudflare Global Edge',
      description: 'PWA Offline Cache ทำงานต่อได้ทันที รับออเดอร์และออกใบเสร็จได้ปกติ เมื่อเน็ตกลับมาระบบจะซิงก์ข้อมูลขึ้นคลาวด์แบบอัตโนมัติ',
      cpu: 'Client Cache Fallback',
      latency: '0 ms (Local)',
      status: 'ทำงานต่อได้ 100%',
      advantageText: 'ขายต่อได้แม้เน็ตตัด ข้อมูลไม่หายแน่นอน',
    },
    chartLatencyTrad: [120, 800, 0, 0, 0],
    chartLatencyEdge: [24, 15, 8, 8, 24],
  },
  quiet: {
    id: 'quiet',
    title: 'ร้านปิด ตี 3 (ไม่มีลูกค้า)',
    badge: 'Idle Time (03:00 AM)',
    traditional: {
      title: 'เซิร์ฟเวอร์คอมพิวเตอร์ในร้าน (Local PC)',
      description: 'เครื่องคอมพิวเตอร์ยังเปิดกินไฟ 300W ตลอด 24 ชั่วโมง เสี่ยงไฟไหม้ ฮาร์ดดิสก์เสื่อม และมีค่าเสื่อมราคาคอมพิวเตอร์ทุกวัน',
      cpu: 'กินไฟ 24/7',
      latency: 'ไม่จำเป็น',
      status: 'สิ้นเปลืองค่าไฟ',
      warningText: 'จ่ายค่าไฟและค่าบำรุงรักษาแม้ไม่มีใครใช้',
    },
    serverless: {
      title: 'Order POS บน Cloudflare Global Edge',
      description: 'ระบบ Serverless จะหยุดประมวลผลทันทีเมื่อไม่มีคำขอเข้ามา ค่าใช้จ่าย = 0 บาท แต่พร้อมตื่นมาทำงานเต็มประสิทธิภาพใน 0.01 วินาที',
      cpu: 'Zero Resource Usage',
      latency: 'Sleep (พร้อมตื่น)',
      status: 'ประหยัด 100%',
      advantageText: 'ไม่ต้องจ่ายเงินให้ทรัพยากรที่ไม่ได้ใช้งาน',
    },
    chartLatencyTrad: [120, 120, 120, 120, 120],
    chartLatencyEdge: [0, 0, 0, 0, 0],
  },
  multi: {
    id: 'multi',
    title: 'เปิดสาขาใหม่ / เจ้าของร้านดูยอดนอกร้าน',
    badge: 'Remote Multi-Branch',
    traditional: {
      title: 'เซิร์ฟเวอร์คอมพิวเตอร์ในร้าน (Local PC)',
      description: 'ดูยอดขายได้แค่หน้าจอเครื่องในร้านเท่านั้น เจ้าของร้านต้องนั่งเฝ้าทั้งวัน หรือต้องต่อ VPN ที่ติดตั้งยาก เสี่ยงโดนแฮก',
      cpu: 'Local Isolation',
      latency: 'เข้าถึงไม่ได้จากข้างนอก',
      status: 'ต้องเฝ้าร้าน',
      warningText: 'ขยายสาขายาก ต้องซื้อคอมพิวเตอร์ใหม่ยกชุด',
    },
    serverless: {
      title: 'Order POS บน Cloudflare Global Edge',
      description: 'เปิดดูยอดขายสด เมนูขายดี และสถานะโต๊ะจากมือถือได้ทุกที่ทั่วโลก ขยายสาขาใหม่ได้ใน 5 นาทีเพียงแค่สแกน QR Code เข้าใช้งาน',
      cpu: 'Global Mesh Network',
      latency: '< 28 ms ทุกจุด',
      status: 'เข้าถึงได้จากทุกที่',
      advantageText: 'บริหารหลายสาขาได้ง่าย เจ้าของร้านมีเวลาพักผ่อน',
    },
    chartLatencyTrad: [0, 0, 0, 0, 0],
    chartLatencyEdge: [24, 25, 27, 26, 25],
  },
};

interface TechPillar {
  id: string;
  category: 'all' | 'frontend' | 'edge' | 'hardware' | 'security';
  title: string;
  subtitle: string;
  badge: string;
  role: string;
  icon: any;
  metric: string;
  description: string;
  deepDive: {
    whyWeChose: string;
    businessImpact: string;
    standards: string[];
    actionPrompt?: string;
  };
}

const TECH_PILLARS: TechPillar[] = [
  {
    id: 'nextjs',
    category: 'frontend',
    title: 'Next.js 14 App Router',
    subtitle: 'หน้าบ้านลื่นไหล 60fps & PWA',
    badge: 'Frontend Architecture',
    role: 'โครงสร้างหน้าบ้าน & แคชเชียร์',
    icon: Globe,
    metric: 'FCP < 0.2s • 60fps',
    description: 'เรนเดอร์หน้าจอสั่งอาหารและ POS ได้รวดเร็วแบบเสี้ยววินาที รองรับการติดตั้งเป็นแอป (PWA) บน iPad, แท็บเล็ต หรือมือถือทุกรุ่น',
    deepDive: {
      whyWeChose: 'สถาปัตยกรรม App Router พร้อม React 18 Concurrent Rendering มอบความลื่นไหลระดับ Native Application โดยไม่ต้องบังคับให้ลูกค้าดาวน์โหลดแอปจาก App Store',
      businessImpact: 'ลูกค้าสแกน QR แล้วเปิดเมนูได้ในเสี้ยววินาที ไม่ต้องทนรอโหลดหน้าเว็บ หมุนรอบโต๊ะได้เร็วขึ้น 18%',
      standards: ['PWA Offline Capable', 'Zero Layout Shift (CLS < 0.01)', 'Tailwind CSS Modern Theme'],
      actionPrompt: 'ดูตัวอย่างหน้าสแกนสั่งที่โต๊ะ',
    },
  },
  {
    id: 'cloudflare-edge',
    category: 'edge',
    title: 'Cloudflare Global Edge',
    subtitle: 'ประมวลผลเสี้ยววินาที <28ms',
    badge: 'Serverless Edge Compute',
    role: 'เครือข่ายประมวลผลทั่วโลก',
    icon: Cpu,
    metric: '< 28ms Latency • Node กรุงเทพฯ',
    description: 'เซิร์ฟเวอร์แบบ Edge กระจาย 330+ เมืองทั่วโลก มี Edge Node อยู่ในกรุงเทพฯ โดยตรง ตอบสนองไวกว่าคลาวด์ทั่วไป 4 เท่า',
    deepDive: {
      whyWeChose: 'ลดการเดินทางของข้อมูล (Network Hop) แทนที่จะต้องส่งไปสิงคโปร์หรืออเมริกา ระบบประมวลผลที่ชุมสายอินเทอร์เน็ตกรุงเทพฯ โดยตรง',
      businessImpact: 'ไม่มีอาการค้าง ไม่เคยเจอปัญหา "เซิร์ฟเวอร์ล่มช่วงเที่ยง" รองรับคนสั่งพร้อมกันนับพันคนได้อย่างสบาย',
      standards: ['V8 Isolate Sandboxing', 'Zero Cold-Start (<1ms)', 'DDoS Protection Layer 7'],
      actionPrompt: 'ทดสอบความเร็วตอบสนอง',
    },
  },
  {
    id: 'cloudflare-d1',
    category: 'edge',
    title: 'Cloudflare D1 Distributed DB',
    subtitle: 'ฐานข้อมูลคำสั่งซื้อ & สต็อกสูตรอาหาร',
    badge: 'Distributed Database',
    role: 'คลังข้อมูลแบบกระจายศูนย์',
    icon: Database,
    metric: '99.99% Uptime • ACID Safe',
    description: 'จัดเก็บออเดอร์ บิลขาย และคำนวณตัดสต็อกสูตรอาหาร (BOM) ด้วย ACID Transaction ไร้ปัญหาข้อมูลชนกันหรือยอดไม่ตรง',
    deepDive: {
      whyWeChose: 'SQLite Distributed ที่อยู่ติดกับ Edge Worker ทำให้การคิวรีข้อมูลไวที่สุดในโลก ข้อมูลถูกสำรองหลาย Region อัตโนมัติ',
      businessImpact: 'ตัดสต็อกหมูกรอบ ไข่ไก่ ผักกาด แบบเรียลไทม์ทันทีที่ปิดบิล ยอดเงินในกะแม่นยำ 100% ไม่มีความเสี่ยงฮาร์ดดิสก์พัง',
      standards: ['ACID Transactional Guarantees', 'Automatic Continuous Replication', 'Zero Disk Failures'],
      actionPrompt: 'ดูจำลองการตัดสต็อก BOM',
    },
  },
  {
    id: 'web-audio',
    category: 'hardware',
    title: 'Web Audio Neural Voice',
    subtitle: 'ขานออเดอร์เสียงพูดไทยในครัว',
    badge: 'Voice Synthesizer',
    role: 'ระบบเสียงขานชื่ออาหารอัตโนมัติ',
    icon: Radio,
    metric: '0ms Audio Lag • สำเนียงไทย',
    description: 'สังเคราะห์เสียงพูดไทยธรรมชาติจากเบราว์เซอร์โดยตรง ขานชื่อเมนู ระดับความเผ็ด และเบอร์โต๊ะเข้าครัวทันทีที่ลูกค้าสั่ง',
    deepDive: {
      whyWeChose: 'ใช้ Web Audio API สังเคราะห์ความถี่และ Speech Synthesis Engine โดยตรง ไม่ต้องพึ่งพา Cloud Voice API ภายนอก ทำให้เร็ว 0ms และไม่มีค่าใช้จ่ายรายเดือนเพิ่ม',
      businessImpact: 'พ่อครัวไม่ต้องคอยละสายตามาเพ่งดูหน้าจอ ฟังเสียงขานแล้วลงมือผัดได้ทันที อาหารเสร็จไวขึ้น 40%',
      standards: ['Web Audio API W3C Standard', 'Custom Bell Chime Frequency (880Hz)', 'Hardware Speaker Compatibility'],
      actionPrompt: 'ทดลองกดฟังเสียงขานภาษาไทย',
    },
  },
  {
    id: 'web-bluetooth',
    category: 'hardware',
    title: 'Web Bluetooth & Thermal Driver',
    subtitle: 'สั่งพิมพ์ใบเสร็จความร้อน 80mm/58mm',
    badge: 'Hardware Printing Engine',
    role: 'ไดรเวอร์พิมพ์สลิปไร้สาย',
    icon: Bluetooth,
    metric: '0.3s Print Speed • ทุกยี่ห้อ',
    description: 'เชื่อมต่อเครื่องพิมพ์สลิปบลูทูธผ่านเบราว์เซอร์ได้โดยตรง ไม่ต้องลง Driver หรือโปรแกรมแปลกปลอม สั่งพิมพ์บิลลูกค้าและใบส่งครัวได้ทันที',
    deepDive: {
      whyWeChose: 'ไดรเวอร์ ESC/POS ถูกคอมไพล์ทำงานบน Web Bluetooth API ส่ง Packet ไบต์ตรงเข้าหัวพิมพ์ความร้อนอย่างฉับไวใน 300ms',
      businessImpact: 'ใช้กับเครื่องพิมพ์ราคาประหยัดตามท้องตลาดได้ทุกรุ่น (58mm และ 80mm) ประหยัดค่าฮาร์ดแวร์หลักหมื่นบาท',
      standards: ['ESC/POS Binary Standard', 'Web Bluetooth GATT Protocol', 'Raw Byte Rasterization'],
      actionPrompt: 'กดจำลองการพิมพ์ใบเสร็จ',
    },
  },
  {
    id: 'promptpay-anti-fraud',
    category: 'security',
    title: 'PromptPay QR & Anti-Fraud',
    subtitle: 'สแกนจ่ายตรงบัญชีร้าน & ตรวจสลิป',
    badge: 'Fintech & Security',
    role: 'ระบบการเงินและการตรวจสอบสลิป',
    icon: ShieldCheck,
    metric: '100% ป้องกันสลิปปลอม • 0% GP',
    description: 'สร้าง QR Code ยอดเงินพอดีเศษสตางค์ เงินเข้าบัญชีธนาคารของเจ้าของร้านโดยตรง พร้อมระบบตรวจจับสลิปซ้ำ สลิปปลอม และสลิปข้ามวัน',
    deepDive: {
      whyWeChose: 'ผสาน EMVCo PromptPay Standard เข้ากับอัลกอริทึม Hash ตรวจจับสลิป ป้องกันการนำสลิปเก่ามาใช้ซ้ำ 100%',
      businessImpact: 'ร้านค้าไม่เสียค่าธรรมเนียม GP แม้แต่บาทเดียว เงินเข้าบัญชีทันที ไม่ต้องกลัวมิจฉาชีพโชว์สลิปปลอมตอนคนแน่นร้าน',
      standards: ['EMVCo QR Code Specification', 'Anti-Duplicate Slip Fingerprint', 'Bank API Direct Mapping'],
      actionPrompt: 'ดูระบบตรวจสอบสลิป',
    },
  },
];

// -----------------------------------------------------------------------------
// Celestial Tech Stack Component
// -----------------------------------------------------------------------------
export default function CelestialTechStack() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('rush');
  const [techCategory, setTechCategory] = useState<'all' | 'frontend' | 'edge' | 'hardware' | 'security'>('all');
  const [activeModalPillar, setActiveModalPillar] = useState<TechPillar | null>(null);

  const scenario = SCENARIOS[selectedScenario];

  const filteredPillars =
    techCategory === 'all' ? TECH_PILLARS : TECH_PILLARS.filter((p) => p.category === techCategory);

  const handleScenarioChange = (id: ScenarioType) => {
    setSelectedScenario(id);
    try {
      playOrderChime();
    } catch {}
  };

  const openPillarModal = (pillar: TechPillar) => {
    setActiveModalPillar(pillar);
    try {
      playOrderChime();
    } catch {}
  };

  return (
    <section id="tech-stack" className="py-24 sm:py-32 bg-[#050811] text-white relative overflow-hidden px-4 sm:px-6 lg:px-8 border-y border-slate-800/80">
      {/* Background Cosmic Starfield / Grid Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* =========================================================================
            1. SECTION HEADER (Celestial Spotlight Style)
            ========================================================================= */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 shadow-[inset_0px_1px_2px_0px_rgba(255,255,255,0.15)] backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-sky-300">
              สร้างด้วยเทคโนโลยีสมัยใหม่ที่พิสูจน์แล้ว
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight gradient-text-celestial">
            ทำไมระบบของเราถึงไม่มีวันช้าลง
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            โปรแกรมร้านอาหารดั้งเดิมส่วนใหญ่พังหรืออืดเมื่อเจอชั่วโมงเร่งด่วน 
            แต่ <strong className="text-white">Order POS</strong> รันบนสถาปัตยกรรม{' '}
            <strong className="text-sky-400">Cloudflare Edge Serverless</strong> สเกลตามผู้ใช้งานจริง 
            ไม่มีคำว่าระบบค้าง และประหยัดค่าใช้จ่ายสูงสุด
          </p>
        </div>

        {/* =========================================================================
            2. INTERACTIVE ARCHITECTURE COMPARISON (Traditional PC vs Cloudflare Edge)
            ========================================================================= */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-2">
              <span>เลือกลองจำลองสถานการณ์จริงของร้านอาหาร</span>
            </h3>
            <p className="text-xs text-slate-400">
              แตะสลับสถานการณ์ด้านล่าง เพื่อดูความแตกต่างระหว่างเครื่องคอมฯ แบบเดิม vs สถาปัตยกรรม Edge Cloud
            </p>
          </div>

          {/* Scenario Selector Tabs */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
            {(
              [
                { id: 'rush', label: '1. เที่ยงวันเร่งด่วน (50 โต๊ะ)', icon: Zap },
                { id: 'offline', label: '2. เน็ตหลุด / ไฟตก', icon: Wifi },
                { id: 'quiet', label: '3. ร้านปิด ตี 3 (เงียบ)', icon: Clock },
                { id: 'multi', label: '4. เช็คยอดนอกร้าน', icon: Smartphone },
              ] as const
            ).map((sc) => {
              const Icon = sc.icon;
              const isSelected = selectedScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleScenarioChange(sc.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center space-x-2 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-400 shadow-lg shadow-sky-500/25 scale-[1.02]'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-sky-400'}`} />
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Display Grid with Slide In/Out and Gradual Sharpen */}
          <div key={selectedScenario} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch animate-in fade-in duration-300">
            {/* TRADITIONAL POS CARD (Slides in from Left, blurs to sharp) */}
            <ScrollReveal direction="left" delay={60} className="h-full">
              <div className="h-full p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-red-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black">
                      <Server className="w-3.5 h-3.5" />
                      <span>เซิร์ฟเวอร์คอมพิวเตอร์แบบเดิม (Local PC)</span>
                    </div>
                    <span className="text-[10px] text-red-400 font-bold px-2 py-0.5 rounded bg-red-950 border border-red-800">
                      ❌ เสี่ยงล่ม
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-white">{scenario.traditional.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {scenario.traditional.description}
                  </p>
                </div>

                {/* Traditional Metrics */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">ภาระ CPU เครื่อง:</span>
                      <strong className="text-red-400 text-sm font-black">{scenario.traditional.cpu}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">ความหน่วง (Latency):</span>
                      <strong className="text-red-400 text-sm font-black">{scenario.traditional.latency}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>ผลกระทบ: {scenario.traditional.warningText}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* ORDER POS CLOUDFLARE EDGE CARD (Slides in from Right, blurs to sharp) */}
            <ScrollReveal direction="right" delay={200} className="h-full">
              <div className="h-full p-6 sm:p-8 rounded-3xl celestial-card border-sky-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 blur-3xl pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-black">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>Order POS • Cloudflare Global Edge</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      ✨ เสถียร 99.99%
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-white">{scenario.serverless.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {scenario.serverless.description}
                  </p>
                </div>

                {/* Edge Metrics */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">การจัดการทรัพยากร:</span>
                      <strong className="text-emerald-400 text-sm font-black">{scenario.serverless.cpu}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">ความเร็วตอบสนอง:</span>
                      <strong className="text-sky-400 text-sm font-black">{scenario.serverless.latency}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-900/50 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>จุดเด่น: {scenario.serverless.advantageText}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Real-time Dynamic Architecture Comparison Graphic (Inspired by CelestialCode SVG Chart) */}
          <ScrollReveal direction="up" delay={150}>
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-inner space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h5 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <span>กราฟเปรียบเทียบความเร็วตอบสนองตามจำนวนออเดอร์ (Latency vs Load)</span>
                </h5>
                <span className="text-[11px] text-slate-400">
                  เซิร์ฟเวอร์คอมพิวเตอร์ในร้านจะหน่วงขึ้นเรื่อย ๆ เมื่อบิลเยอะ ขณะที่ Cloudflare Edge ความเร็วคงที่ &lt;28ms
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-1 bg-red-500 rounded" /> แบบดั้งเดิม (ช้าลงตามโหลด)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-1 bg-emerald-400 rounded" /> Order POS Edge (คงที่ &lt;28ms)
                </span>
              </div>
            </div>

            {/* Simulated Live SVG Line Graph */}
            <div className="w-full h-44 relative bg-slate-900/60 rounded-2xl p-4 flex items-end justify-between border border-slate-800">
              {/* Y-axis markers */}
              <div className="absolute left-2 inset-y-2 flex flex-col justify-between text-[9px] text-slate-500 font-mono pointer-events-none">
                <span>2,000ms</span>
                <span>1,000ms</span>
                <span>100ms</span>
                <span>0ms</span>
              </div>

              {/* Background Reference Grid */}
              <div className="absolute inset-x-12 inset-y-3 flex flex-col justify-between border-b border-slate-800/80 pointer-events-none">
                <div className="w-full border-b border-dashed border-slate-800" />
                <div className="w-full border-b border-dashed border-slate-800" />
                <div className="w-full border-b border-dashed border-slate-800" />
              </div>

              {/* Load Points (10 tables, 20 tables, 30 tables, 40 tables, 50 tables) */}
              {['10 โต๊ะ', '20 โต๊ะ', '30 โต๊ะ', '40 โต๊ะ', '50 โต๊ะพีค'].map((label, idx) => {
                const tradVal = scenario.chartLatencyTrad[idx] || 50;
                const edgeVal = scenario.chartLatencyEdge[idx] || 25;

                // Scale value to height (max 2000ms = 100%)
                const tradHeightPct = Math.min(100, Math.max(8, (tradVal / 2000) * 100));
                const edgeHeightPct = Math.min(100, Math.max(8, (edgeVal / 200) * 10));

                return (
                  <div key={label} className="flex-1 flex flex-col items-center justify-end h-full z-10 px-2 group">
                    <div className="w-full flex justify-center items-end gap-2 h-full pb-2">
                      {/* Traditional Bar */}
                      <div
                        className="w-3 sm:w-5 bg-gradient-to-t from-red-600 to-red-400 rounded-t-md transition-all duration-500 relative"
                        style={{ height: `${tradHeightPct}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {tradVal}ms
                        </span>
                      </div>

                      {/* Edge Bar */}
                      <div
                        className="w-3 sm:w-5 bg-gradient-to-t from-emerald-600 via-teal-400 to-sky-400 rounded-t-md transition-all duration-500 shadow-md shadow-sky-500/20 relative"
                        style={{ height: `${edgeHeightPct}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {edgeVal}ms
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          </ScrollReveal>
        </div>

        {/* =========================================================================
            3. SIX PILLARS TECH STACK GRID (Celestial Constellation Cards)
            ========================================================================= */}
        <div className="space-y-8 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-black text-sky-400 uppercase tracking-widest block">
                6 เสาหลักของระบบ
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                สถาปัตยกรรมเทคโนโลยีเบื้องหลัง Order POS
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                แตะที่การ์ดแต่ละใบเพื่อดูเหตุผลที่เราเลือกใช้ และบทบาทในการช่วยให้ร้านของคุณขายดีขึ้น
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'frontend', label: 'หน้าบ้าน' },
                { id: 'edge', label: 'คลาวด์ & DB' },
                { id: 'hardware', label: 'ฮาร์ดแวร์' },
                { id: 'security', label: 'การเงิน' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTechCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    techCategory === cat.id
                      ? 'bg-sky-500 text-white font-black shadow-md shadow-sky-500/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <ScrollReveal
                  key={pillar.id}
                  direction="up"
                  delay={idx * 115}
                  duration={750}
                  className="h-full"
                >
                  <div
                    onClick={() => openPillarModal(pillar)}
                    className="h-full celestial-card p-6 sm:p-7 rounded-3xl cursor-pointer group transition-all duration-300 hover:-translate-y-2 relative overflow-hidden flex flex-col justify-between space-y-6"
                  >
                    {/* Subtle Card Glow Effect */}
                    <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-400/20 transition-all pointer-events-none" />

                    <div className="space-y-4">
                      {/* Top Row: Icon & Badge */}
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-500/20 transition-all">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-900/90 text-slate-300 border border-slate-800">
                          {pillar.badge}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-white group-hover:text-sky-300 transition-colors">
                          {pillar.title}
                        </h4>
                        <span className="text-xs text-sky-400 font-bold block">{pillar.subtitle}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{pillar.description}</p>
                    </div>

                    {/* Bottom Row: Metric & Action Link */}
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-emerald-400 font-mono text-[11px]">
                        {pillar.metric}
                      </span>
                      <span className="text-sky-400 font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>อ่านรายละเอียด</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            4. LIVE ENTERPRISE BENCHMARKS & STATS
            ========================================================================= */}
        <ScrollReveal direction="zoom" delay={100}>
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0a1120] to-slate-950 border border-sky-500/20 shadow-2xl relative overflow-hidden">
            <div className="max-w-4xl mx-auto space-y-8 text-center">
              <span className="text-xs font-black text-sky-400 uppercase tracking-widest block">
                ผลการทดสอบประสิทธิภาพจริง (Enterprise Benchmarks)
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-white">
                สร้างขึ้นเพื่อให้ร้านของคุณขายได้ต่อเนื่อง โดยไม่มีคำว่าสะดุด
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center space-y-1">
                  <span className="text-3xl sm:text-4xl font-black text-white block">99.99%</span>
                  <span className="text-xs font-bold text-sky-400 block">Uptime SLA</span>
                  <p className="text-[11px] text-slate-400">โครงสร้าง Edge ทั่วโลก ไร้ดาวน์ไทม์</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center space-y-1">
                  <span className="text-3xl sm:text-4xl font-black text-white block">&lt; 28ms</span>
                  <span className="text-xs font-bold text-emerald-400 block">Edge Latency</span>
                  <p className="text-[11px] text-slate-400">Node ในประเทศไทย ตอบสนองไวที่สุด</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center space-y-1">
                  <span className="text-3xl sm:text-4xl font-black text-white block">0.3 วิ</span>
                  <span className="text-xs font-bold text-amber-400 block">พิมพ์สลิป & ตัดสต็อก</span>
                  <p className="text-[11px] text-slate-400">ออกใบเสร็จไว หมุนรอบโต๊ะเร็วขึ้น</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-center space-y-1">
                  <span className="text-3xl sm:text-4xl font-black text-white block">฿0 บาท</span>
                  <span className="text-xs font-bold text-purple-400 block">ค่าเครื่องแม่ข่าย</span>
                  <p className="text-[11px] text-slate-400">ไม่ต้องซื้อคอมพิวเตอร์หลักหมื่น</p>
                </div>
              </div>

              {/* Signature Celestial Shiny CTA Button */}
              <div className="pt-6 flex flex-wrap justify-center items-center gap-4">
                <a
                  href="#simulator"
                  className="group relative z-0 inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-4 text-sm font-black text-slate-900 bg-white shadow-[0_0_25px_-5px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95"
                >
                  <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
                    <span className="size-44 rounded-full bg-[linear-gradient(90deg,#2f79d0_0%,#aebdce_49%,#f97316_100%)] opacity-0 blur-[24px] transition-all duration-300 group-hover:size-36 group-hover:opacity-100 motion-safe:group-hover:animate-spin" />
                  </span>
                  <span className="relative z-[2] inline-flex items-center gap-2 font-black text-slate-900">
                    <span>ทดลองสัมผัสความลื่นไหลจริง</span>
                    <ArrowRight className="w-4 h-4 text-orange-600 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>

                <Link
                  href="/register"
                  className="px-6 py-4 rounded-full text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-2"
                >
                  <span>สมัครเปิดร้านทดลองฟรี 30 วัน</span>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* =========================================================================
          5. INTERACTIVE TECH DEEP DIVE MODAL
          ========================================================================= */}
      {activeModalPillar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1222] border border-sky-400/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setActiveModalPillar(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                {React.createElement(activeModalPillar.icon, { className: 'w-6 h-6' })}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                  {activeModalPillar.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">{activeModalPillar.title}</h3>
              </div>
            </div>

            {/* Deep Dive Content */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-black text-sky-300 uppercase tracking-wide block">
                  💡 ทำไมเราถึงเลือกเทคโนโลยีนี้?
                </span>
                <p className="leading-relaxed text-slate-300">{activeModalPillar.deepDive.whyWeChose}</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-1.5">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wide block">
                  📈 ผลลัพธ์ต่อเจ้าของร้านอาหาร
                </span>
                <p className="leading-relaxed text-emerald-200">{activeModalPillar.deepDive.businessImpact}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-400 uppercase block">
                  มาตรฐานทางเทคนิค & โปรโตคอล
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeModalPillar.deepDive.standards.map((std, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-sky-400" />
                      <span>{std}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveModalPillar(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 border border-slate-800"
              >
                ปิดหน้าต่าง
              </button>
              <a
                href="#simulator"
                onClick={() => setActiveModalPillar(null)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs hover:scale-105 transition-all shadow-md shadow-sky-500/25 flex items-center gap-1.5"
              >
                <span>{activeModalPillar.deepDive.actionPrompt || 'ลองทดสอบในระบบ'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
