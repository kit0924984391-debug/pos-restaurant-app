# 🍳 Order Pos — ระบบ Multi-Tenant POS & Unified Delivery Hub

ระบบ POS และจัดการร้านอาหารตามสั่งยุคใหม่ พัฒนาด้วย **Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM, และ PostgreSQL (Supabase)** รองรับระบบร้านค้าแบบ Multi-Tenant พร้อมเชื่อมต่อกับระบบรับออเดอร์เดลิเวอรีทุกค่าย (LINE MAN, GrabFood, ShopeeFood, Robinhood) ผ่าน **ระบบเครื่องพิมพ์เสมือน (Virtual Print Proxy)** ปลอดภัย 100% ฟรีตลอดชีพ ไร้ค่าธรรมเนียมรายเดือน

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **📱 สแกนสั่งอาหารที่โต๊ะผ่าน Mobile Web (`/r/[slug]/table/[id]`)**:
   - ลูกค้าสแกน QR Code สั่งอาหารได้เองจากโต๊ะอาหาร
   - ตัวเลือกตามสั่งละเอียด: เนื้อสัตว์, ท็อปปิ้งไข่, ระดับความเผ็ด, หมายเหตุพิเศษ
   - ติดตามสถานะอาหารสดแบบเรียลไทม์ (รอทำ ⏳ ➔ กำลังปรุง 🍳 ➔ พร้อมเสิร์ฟ 🥗 ➔ เสิร์ฟแล้ว ✅)

2. **🛵 ศูนย์รับออเดอร์เดลิเวอรีผ่านเครื่องพิมพ์เสมือน (Virtual Print Proxy Delivery Hub)**:
   - ดักจับคำสั่งพิมพ์จากแอป Wongnai Merchant, GrabMerchant, Shopee Partner ผ่านพอร์ต ESC/POS 9100 / Bluetooth SPP
   - ถอดรหัสชื่อเมนู ล้างป้ายโปรโมชัน (`[โปรคุ้ม]`, `[1แถม1]`) อัตโนมัติ เพื่อจับคู่ตัดสต็อกวัตถุดิบ (Recipe BOM)
   - ส่งต่อพิมพ์ออกเครื่องพิมพ์ความร้อนจริงในครัวอัตโนมัติ (Print Pass-through)
   - คำนวณหัก % GP แยกตามค่าย และรายงานรายได้สุทธิ (Net Revenue)

3. **👨‍🍳 หน้าจอห้องครัว Kitchen Display System KDS (`/r/[slug]/kitchen`)**:
   - ออเดอร์ใหม่เด้งเข้าครัวทันทีแบบ Real-time พร้อมเสียงกระดิ่งเดลิเวอรี และกระดิ่งโต๊ะอาหาร
   - ระบบพิมพ์ใบสั่งอาหารเข้าครัวอัตโนมัติ (Auto-Print) เมื่อมีออเดอร์เข้า
   - สรุปเมนูยอดรวมสำหรับผัดกระทะเดียว (Batch Cooking Summary)

4. **🏢 หน้าจอแคชเชียร์ & ผังโต๊ะ Interactive (`/r/[slug]/pos`)**:
   - ผังโต๊ะแสดงสถานะแบบเรียลไทม์ (ว่าง, กำลังทาน, รอเช็คบิล) พร้อมแท็บจัดการออเดอร์เดลิเวอรี
   - ย้ายโต๊ะ, รวมโต๊ะ, แยกบิล, คิดเงินสด และรับเงินโอน PromptPay
   - พิมพ์ใบเสร็จรับเงินมาตรฐานกระดาษความร้อน 58mm / 80mm

5. **📦 ระบบคลังวัตถุดิบ & สูตรอาหาร (Inventory & Recipe BOM)**:
   - ผูกเมนูอาหารเข้ากับวัตถุดิบ (เช่น หมูกรอบ 150g, ไข่ไก่ 1 ฟอง, ใบกะเพรา 20g)
   - ตัดสต็อกอัตโนมัติทันทีที่รับออเดอร์ และคืนสต็อกอัตโนมัติเมื่อออเดอร์ถูกยกเลิก
   - ระบบแจ้งเตือนวัตถุดิบใกล้หมดสต็อก

6. **💳 PromptPay Dynamic QR Code & Hybrid Slip Verification**:
   - สร้าง QR Code พร้อมเพย์ตามยอดเงินสุทธิอัตโนมัติ (มาตรฐาน EMVCo ธนาคารแห่งประเทศไทย)
   - ตรวจจับสลิปซ้ำ (Anti-fraud duplicate check) และตรวจสอบยอดเงินอัตโนมัติ

7. **📊 รายงานยอดขาย & วิเคราะห์กำไรสุทธิ (`/r/[slug]/admin/reports`)**:
   - รายงานยอดขายประจำวันแบบ Timezone-aware (UTC+7 Asia/Bangkok)
   - แยกยอดขายตามช่องทาง: หน้าร้าน, กลับบ้าน, LINE MAN, Grab, ShopeeFood
   - วิเคราะห์ต้นทุนวัตถุดิบ (COGS), ค่าธรรมเนียม GP, และกำไรขั้นต้น

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend & Backend**: Next.js 14 (App Router, Route Handlers, Server Components)
* **Language**: TypeScript (Strict Mode)
* **Styling**: Tailwind CSS, Lucide Icons
* **Database & ORM**: PostgreSQL (Supabase Connection Pooler) + Prisma ORM
* **Testing**: Vitest + Testing Library
* **CI/CD**: GitHub Actions Automated Pipeline (`.github/workflows/ci.yml`)
* **Real-time Sync**: Server-Sent Events (SSE) Stream
* **Audio Synthesizer**: Web Audio API Oscillator (เสียงกระดิ่งไร้ไฟล์ภายนอก)

---

## 🚀 วิธีติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables (`.env`)
```env
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
JWT_SECRET="your_secure_jwt_secret_key_here"
```

### 3. รันการทดสอบและสร้างฐานข้อมูล
```bash
# ตรวจสอบโค้ดและรันชุดทดสอบ
npm test

# สร้างฐานข้อมูล
npx prisma db push
node prisma/seed.js
```

### 4. เริ่มต้นรันเซิร์ฟเวอร์
```bash
# โหมดพัฒนา (Development)
npm run dev

# โหมดทำงานจริง (Production)
npm run build
npm run start
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`
