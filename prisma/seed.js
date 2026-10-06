const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for Multi-Tenant SaaS Restaurant POS ---');

  // 1. Platform Settings (สำหรับรับชำระค่าบริการ SaaS)
  await prisma.platformSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      platformName: 'ORDEO SaaS Restaurant POS Platform',
      bankName: 'ธนาคารกสิกรไทย (KBANK)',
      bankAccountNo: '123-4-56789-0',
      bankAccountName: 'บจก. ออร์เดียโอ โซลูชั่นส์ (ORDEO Co., Ltd.)',
      promptPayId: '0812345678',
      contactLine: '@ordeopos',
      contactPhone: '081-234-5678',
    },
  });

  // 2. Subscription Plans
  const plans = [
    {
      id: 'plan_trial',
      name: 'ทดลองใช้ฟรี (Trial 90 วัน)',
      price: 0,
      durationDays: 90,
      maxTables: 10,
      description: 'สำหรับร้านค้าใหม่ ทดลองใช้งานฟรีทุกฟังก์ชัน 90 วันเต็ม',
      sortOrder: 1,
    },
    {
      id: 'plan_monthly',
      name: 'Basic รายเดือน (1 เดือน)',
      price: 99,
      durationDays: 30,
      maxTables: 15,
      description: 'เหมาะสำหรับร้านอาหารตามสั่งขนาดเล็ก ไม่เกิน 15 โต๊ะ (เพียง 99 บาท/เดือน)',
      sortOrder: 2,
    },
    {
      id: 'plan_halfyear',
      name: 'Pro (6 เดือน)',
      price: 499,
      durationDays: 180,
      maxTables: 30,
      description: 'สุดคุ้ม 6 เดือนเต็ม สำหรับร้านอาหารขนาดกลาง ไม่เกิน 30 โต๊ะ (เพียง 499 บาท)',
      sortOrder: 3,
    },
    {
      id: 'plan_yearly',
      name: 'Unlimited รายปี (1 ปี)',
      price: 899,
      durationDays: 365,
      maxTables: 99,
      description: 'ประหยัดสูงสุด รายปี 1 ปีเต็ม รองรับโต๊ะไม่จำกัด (เพียง 899 บาท/ปี)',
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        maxTables: plan.maxTables,
        description: plan.description,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
  }

  // 3. Super Admin User
  const adminPasswordHash = await bcrypt.hash('11072526#Kit', 6);
  await prisma.user.upsert({
    where: { email: 'kit0924984391@gmail.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      name: 'ผู้ดูแลระบบสูงสุด (Kit Admin)',
    },
    create: {
      email: 'kit0924984391@gmail.com',
      passwordHash: adminPasswordHash,
      name: 'ผู้ดูแลระบบสูงสุด (Kit Admin)',
      role: 'SUPER_ADMIN',
    },
  });

  // 4. Demo Store Owner & Store
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  const demoStore = await prisma.store.upsert({
    where: { slug: 'lung-pa' },
    update: {},
    create: {
      slug: 'lung-pa',
      name: 'กะเพราถาดยายสม & อาหารตามสั่ง',
      description: 'ร้านอาหารตามสั่งยอดนิยม ผัดกะเพราโบราณ ข้าวผัด ต้มยำน้ำข้น',
      status: 'ACTIVE',
      trialEndsAt: trialEnd,
      subscriptionEnd: trialEnd,
      planId: 'plan_monthly',
      promptPayId: '0891234567',
      promptPayName: 'นายสมชาย พัฒนาสุข (ร้านตามสั่ง)',
      address: '88/9 หมู่ 3 ถนนสุขุมวิท ต.เสม็ด อ.เมือง จ.ชลบุรี 20000',
      phone: '089-123-4567',
      receiptFooter: 'ขอบคุณที่มาอุดหนุนครับ 🙏 ทานให้อร่อย โอกาสหน้าเชิญใหม่ครับ',
      tableCount: 10,
    },
  });

  const ownerPasswordHash = await bcrypt.hash('password123', 6);
  await prisma.user.upsert({
    where: { email: 'owner@lungpa.com' },
    update: {
      storeId: demoStore.id,
      passwordHash: ownerPasswordHash,
      role: 'STORE_OWNER',
    },
    create: {
      email: 'owner@lungpa.com',
      passwordHash: ownerPasswordHash,
      name: 'สมชาย พัฒนาสุข (เจ้าของร้าน)',
      phone: '089-123-4567',
      role: 'STORE_OWNER',
      storeId: demoStore.id,
    },
  });

  // 5. Tables for Demo Store (1-10)
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: {
        storeId_tableNo: {
          storeId: demoStore.id,
          tableNo: i,
        },
      },
      update: {},
      create: {
        storeId: demoStore.id,
        tableNo: i,
        name: `โต๊ะ ${i}`,
        status: 'AVAILABLE',
      },
    });
  }

  // Clear existing menu items for demo store to reseed clean
  await prisma.menuOptionChoice.deleteMany({});
  await prisma.menuOptionGroup.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({ where: { storeId: demoStore.id } });
  await prisma.category.deleteMany({ where: { storeId: demoStore.id } });

  // 6. Categories & Menu Items for Demo Store
  const catKaprow = await prisma.category.create({
    data: { storeId: demoStore.id, name: 'เมนูผัดกะเพรา / ผัดพริก', sortOrder: 1 },
  });

  const catFriedRice = await prisma.category.create({
    data: { storeId: demoStore.id, name: 'เมนูข้าวผัด / จานเดียว', sortOrder: 2 },
  });

  const catSoup = await prisma.category.create({
    data: { storeId: demoStore.id, name: 'เมนูต้มยำ & แกงจืด', sortOrder: 3 },
  });

  const catFriedNoodle = await prisma.category.create({
    data: { storeId: demoStore.id, name: 'เมนูเส้น & ผัดซีอิ๊ว', sortOrder: 4 },
  });

  const catDrinks = await prisma.category.create({
    data: { storeId: demoStore.id, name: 'เครื่องดื่ม & ของหวาน', sortOrder: 5 },
  });

  const standardMeatOptions = [
    { name: 'หมูสับ/หมูชิ้น', extraPrice: 0 },
    { name: 'ไก่ชิ้น', extraPrice: 0 },
    { name: 'หมูกรอบ (ยอดฮิต)', extraPrice: 15 },
    { name: 'เนื้อวัว', extraPrice: 20 },
    { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 25 },
    { name: 'รวมมิตรทุกอย่าง', extraPrice: 30 },
  ];

  const eggOptions = [
    { name: 'ไม่เพิ่มไข่', extraPrice: 0 },
    { name: 'ไข่ดาวไม่สุก (เยิ้มๆ)', extraPrice: 10 },
    { name: 'ไข่ดาวกรอบสุก', extraPrice: 10 },
    { name: 'ไข่เจียวหมูสับ', extraPrice: 20 },
    { name: 'ไข่เค็มดาว', extraPrice: 15 },
  ];

  const spicyLevels = [
    { name: 'ไม่ใส่พริก (เด็กทานได้)', extraPrice: 0 },
    { name: 'เผ็ดน้อย (พริก 1-2 เม็ด)', extraPrice: 0 },
    { name: 'เผ็ดกลาง (มาตรฐาน)', extraPrice: 0 },
    { name: 'เผ็ดมาก (พริกคั่วจัดเต็ม)', extraPrice: 0 },
    { name: 'เผ็ดพ่นไฟ / เผ็ดจัด', extraPrice: 0 },
  ];

  const ricePortionOptions = [
    { name: 'ข้าวปกติ', extraPrice: 0 },
    { name: 'พิเศษเพิ่มข้าว', extraPrice: 10 },
    { name: 'กับข้าวอย่างเดียว (ไม่เอาข้าว)', extraPrice: 20 },
  ];

  // Item 1: ผัดกะเพราโบราณ
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catKaprow.id,
      name: 'ผัดกะเพราสูตรโบราณ (ราดข้าว)',
      description: 'ผัดกะเพราแท้ ผัดแห้งหอมกระทะ ไม่ใส่ถั่วฝักยาวและหัวหอม พริกแห้งพริกสดหอมฟุ้ง',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'ระดับความเผ็ด (บังคับ)',
            isRequired: true,
            choices: { create: spicyLevels },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
          {
            title: 'ขนาดจาน',
            isRequired: false,
            choices: { create: ricePortionOptions },
          },
        ],
      },
    },
  });

  // Item 2: ผัดพริกแกง
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catKaprow.id,
      name: 'ผัดพริกแกงราดข้าว',
      description: 'พริกแกงใต้หอมเข้มข้น ผัดกับถั่วฝักยาวกรอบๆ และใบมะกรูดซอย',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'ระดับความเผ็ด',
            isRequired: true,
            choices: { create: spicyLevels },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 3: ทอดกระเทียมพริกไทย
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catKaprow.id,
      name: 'ทอดกระเทียมพริกไทยราดข้าว',
      description: 'กระเทียมเจียวสดกรอบเหลืองทอง คลุกเคล้าซอสสูตรเด็ด หอมพริกไทย',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 4: ผัดคะน้าหมูกรอบ
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catKaprow.id,
      name: 'ผัดคะน้าหมูกรอบราดข้าว',
      description: 'คะน้าฮ่องกงยอดอ่อน ผัดไฟแดงเสียงดังฉ่า หมูกรอบหนังพองกรุบกรอบ',
      basePrice: 65,
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'ระดับความเผ็ด',
            isRequired: true,
            choices: { create: spicyLevels },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 5: ข้าวผัดโบราณ
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catFriedRice.id,
      name: 'ข้าวผัดโบราณ / ข้าวผัดไข่',
      description: 'ข้าวเรียงเม็ดสวย หอมกลิ่นคั่วกระทะ ใส่ไข่ คะน้า และมะเขือเทศ มะนาวผ่าซีก',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 6: ข้าวไข่เจียว
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catFriedRice.id,
      name: 'ข้าวไข่เจียวฟูปูอัด/หมูสับ (2 ฟอง)',
      description: 'ไข่เจียวกรอบนอกนุ่มใน ไม่อมน้ำมัน เสิร์ฟคู่ซอสพริกศรีราชา',
      basePrice: 45,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกไส้ไข่เจียว (เลือกได้หลายอย่าง)',
            isRequired: false,
            isMulti: true,
            choices: {
              create: [
                { name: 'หมูสับ', extraPrice: 10 },
                { name: 'กุ้งสับ', extraPrice: 20 },
                { name: 'ปูอัด', extraPrice: 10 },
                { name: 'แหนม', extraPrice: 15 },
                { name: 'ต้นหอม+หอมแดง', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  // Item 7: ต้มยำกุ้ง
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catSoup.id,
      name: 'ต้มยำกุ้ง / ทะเลน้ำข้น (หม้อ/ถ้วย)',
      description: 'เครื่องต้มยำสด กุ้งสดตัวโต เห็ดฟาง น้ำพริกเผานมสด เข้มข้นแซ่บถึงใจ',
      basePrice: 100,
      imageUrl: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'ประเภทน้ำต้มยำ',
            isRequired: true,
            choices: {
              create: [
                { name: 'น้ำข้น (ใส่นมสดและพริกเผา)', extraPrice: 0 },
                { name: 'น้ำใส (มะนาวสด หอมสมุนไพร)', extraPrice: 0 },
              ],
            },
          },
          {
            title: 'เนื้อสัตว์ในต้มยำ',
            isRequired: true,
            choices: {
              create: [
                { name: 'กุ้งแม่น้ำล้วน', extraPrice: 20 },
                { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 20 },
                { name: 'ไก่ชิ้น/กระดูกอ่อน', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  // Item 8: ต้มจืดเต้าหู้หมูสับ
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catSoup.id,
      name: 'ต้มจืดเต้าหู้หมูสับสาหร่าย',
      description: 'น้ำซุปใสกลมกล่อม หมูสับปั้นก้อนนุ่ม เต้าหู้ไข่ สาหร่ายวากาเมะ',
      basePrice: 70,
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
    },
  });

  // Item 9: ผัดซีอิ๊ว
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catFriedNoodle.id,
      name: 'ผัดซีอิ๊วเส้นใหญ่กระทะเหล็ก',
      description: 'เส้นเหนียวนุ่ม ผัดเคล้าซีอิ๊วดำหอมกลิ่นไหม้กระทะ คะน้ากรอบ',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
        ],
      },
    },
  });

  // Item 10: ชาไทยเย็น
  await prisma.menuItem.create({
    data: {
      storeId: demoStore.id,
      categoryId: catDrinks.id,
      name: 'ชาไทยเย็น / ชานมเย็นโบราณ',
      description: 'ใบชาเข้มข้น หวานมันกลมกล่อม',
      basePrice: 25,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cf0c458a2?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
    },
  });

  // 7. Enterprise Inventory & Ingredients for Demo Store
  await prisma.menuItemRecipe.deleteMany({});
  await prisma.stockLog.deleteMany({ where: { storeId: demoStore.id } });
  await prisma.ingredient.deleteMany({ where: { storeId: demoStore.id } });

  const ingPork = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'หมูสับสด (อนามัย)',
      unit: 'กรัม (g)',
      costPerUnit: 0.16, // 160 บ./กก.
      currentStock: 10000, // 10 กก.
      minStockAlert: 1500,
    },
  });

  const ingCrispyPork = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'หมูกรอบทอดใหม่',
      unit: 'กรัม (g)',
      costPerUnit: 0.35, // 350 บ./กก.
      currentStock: 5000, // 5 กก.
      minStockAlert: 1000,
    },
  });

  const ingBeef = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'เนื้อวัวสไลซ์',
      unit: 'กรัม (g)',
      costPerUnit: 0.28,
      currentStock: 4000,
      minStockAlert: 800,
    },
  });

  const ingEgg = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'ไข่ไก่สดเบอร์ 2',
      unit: 'ฟอง',
      costPerUnit: 4.2,
      currentStock: 120, // 120 ฟอง
      minStockAlert: 25,
    },
  });

  const ingRice = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'ข้าวหอมมะลิคัดพิเศษ',
      unit: 'กรัม (g)',
      costPerUnit: 0.04, // 40 บ./กก.
      currentStock: 25000, // 25 กก.
      minStockAlert: 5000,
    },
  });

  const ingBasil = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'ใบกะเพราบ้านสวน',
      unit: 'กรัม (g)',
      costPerUnit: 0.08,
      currentStock: 2000,
      minStockAlert: 300,
    },
  });

  const ingSauce = await prisma.ingredient.create({
    data: {
      storeId: demoStore.id,
      name: 'ซอสกะเพราสูตรลับประจำร้าน',
      unit: 'มล. (ml)',
      costPerUnit: 0.05,
      currentStock: 5000,
      minStockAlert: 600,
    },
  });

  // Link Recipe BOM for Items
  const allItems = await prisma.menuItem.findMany({ where: { storeId: demoStore.id } });
  const itemKaprow = allItems.find((i) => i.name.includes('กะเพรา'));
  const itemFriedRice = allItems.find((i) => i.name.includes('ข้าวผัด'));
  const itemKana = allItems.find((i) => i.name.includes('คะน้า'));

  if (itemKaprow) {
    await prisma.menuItemRecipe.createMany({
      data: [
        { menuItemId: itemKaprow.id, ingredientId: ingRice.id, quantity: 180 },
        { menuItemId: itemKaprow.id, ingredientId: ingPork.id, quantity: 120 },
        { menuItemId: itemKaprow.id, ingredientId: ingBasil.id, quantity: 20 },
        { menuItemId: itemKaprow.id, ingredientId: ingSauce.id, quantity: 30 },
      ],
    });
  }

  if (itemFriedRice) {
    await prisma.menuItemRecipe.createMany({
      data: [
        { menuItemId: itemFriedRice.id, ingredientId: ingRice.id, quantity: 200 },
        { menuItemId: itemFriedRice.id, ingredientId: ingEgg.id, quantity: 1 },
        { menuItemId: itemFriedRice.id, ingredientId: ingPork.id, quantity: 80 },
      ],
    });
  }

  if (itemKana) {
    await prisma.menuItemRecipe.createMany({
      data: [
        { menuItemId: itemKana.id, ingredientId: ingRice.id, quantity: 180 },
        { menuItemId: itemKana.id, ingredientId: ingCrispyPork.id, quantity: 100 },
        { menuItemId: itemKana.id, ingredientId: ingSauce.id, quantity: 25 },
      ],
    });
  }

  // 8. Enterprise Members (Loyalty CRM)
  await prisma.customerMember.deleteMany({ where: { storeId: demoStore.id } });
  await prisma.customerMember.create({
    data: {
      storeId: demoStore.id,
      phone: '0899998888',
      name: 'คุณสมศรี ใจดี (ลูกค้า VIP)',
      points: 120, // 120 แต้ม = 120 บาท
      totalSpent: 3000,
      visitCount: 14,
    },
  });

  await prisma.customerMember.create({
    data: {
      storeId: demoStore.id,
      phone: '0812345678',
      name: 'คุณกฤษดา ขาประจำ',
      points: 45,
      totalSpent: 1125,
      visitCount: 5,
    },
  });

  // 9. Enterprise Promotions & Coupon Discounts
  await prisma.promotion.deleteMany({ where: { storeId: demoStore.id } });
  await prisma.promotion.create({
    data: {
      storeId: demoStore.id,
      code: 'WELCOME50',
      title: 'ส่วนลดลูกค้าใหม่ 50 บาท (เมื่อทานครบ 200 บาท)',
      discountType: 'FIXED',
      discountValue: 50,
      minSpend: 200,
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      storeId: demoStore.id,
      code: 'DISC10',
      title: 'ส่วนลดพิเศษ 10% ทุกเมนู (เมื่อทานครบ 150 บาท)',
      discountType: 'PERCENT',
      discountValue: 10,
      minSpend: 150,
      isActive: true,
    },
  });

  await prisma.promotion.create({
    data: {
      storeId: demoStore.id,
      code: 'AROI20',
      title: 'ส่วนลดอร่อยคุ้ม 20 บาท',
      discountType: 'FIXED',
      discountValue: 20,
      minSpend: 100,
      isActive: true,
    },
  });

  console.log('✅ Multi-Tenant SaaS Seed Completed:');
  console.log(' - Super Admin: kit0924984391@gmail.com / [CONFIGURED]');
  console.log(' - Demo Store Owner: owner@lungpa.com / password123 (Slug: lung-pa)');
  console.log(' - 4 Subscription Plans created');
  console.log(' - Enterprise Recipe BOM & Inventory seeded');
  console.log(' - Enterprise Loyalty CRM & Promotions seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
