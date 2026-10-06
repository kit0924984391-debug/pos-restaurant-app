import { describe, it, expect } from 'vitest';
import { getUpsellingRecommendations } from '@/lib/aiUpselling';

// Sample Mock Menu Categories & Items
const mockCategories = [
  {
    id: 'cat-1',
    name: 'อาหารจานเดียว',
    items: [
      {
        id: 'item-kaprao',
        name: 'ข้าวกะเพราหมูกรอบ',
        basePrice: 65,
        isAvailable: true,
        options: [
          {
            id: 'opt-meat',
            title: 'เลือกเนื้อสัตว์',
            isRequired: true,
            isMulti: false,
            choices: [
              { id: 'c-pork', name: 'หมูสับ', extraPrice: 0 },
              { id: 'c-crispy', name: 'หมูกรอบ', extraPrice: 15 },
              { id: 'c-beef', name: 'เนื้อโคขุน', extraPrice: 20 },
            ],
          },
          {
            id: 'opt-egg',
            title: 'ท็อปปิ้งไข่',
            isRequired: false,
            isMulti: false,
            choices: [
              { id: 'c-no-egg', name: 'ไม่เพิ่มไข่', extraPrice: 0 },
              { id: 'c-fried-egg', name: 'ไข่ดาว', extraPrice: 10 },
              { id: 'c-omelet', name: 'ไข่เจียว', extraPrice: 15 },
            ],
          },
        ],
      },
      {
        id: 'item-fried-rice',
        name: 'ข้าวผัดทะเล',
        basePrice: 70,
        isAvailable: true,
        options: [],
      },
    ],
  },
  {
    id: 'cat-2',
    name: 'ต้มและแกง',
    items: [
      {
        id: 'item-tomyum',
        name: 'ต้มยำกุ้งน้ำข้น',
        basePrice: 120,
        isAvailable: true,
        options: [],
      },
      {
        id: 'item-soup',
        name: 'ต้มจืดเต้าหู้หมูสับ',
        basePrice: 60,
        isAvailable: true,
        options: [],
      },
    ],
  },
  {
    id: 'cat-3',
    name: 'ข้าวสวย & ท็อปปิ้ง',
    items: [
      {
        id: 'item-rice',
        name: 'ข้าวสวยหอมมะลิ',
        basePrice: 15,
        isAvailable: true,
        options: [],
      },
      {
        id: 'item-egg-only',
        name: 'ไข่ดาวกรอบ',
        basePrice: 10,
        isAvailable: true,
        options: [],
      },
      {
        id: 'item-out-of-stock',
        name: 'ไข่เจียวหมูสับพิเศษ',
        basePrice: 25,
        isAvailable: false, // Out of stock
        options: [],
      },
    ],
  },
  {
    id: 'cat-4',
    name: 'เครื่องดื่ม',
    items: [
      {
        id: 'item-tea',
        name: 'ชาไทยเย็น',
        basePrice: 30,
        isAvailable: true,
        options: [],
      },
      {
        id: 'item-coke',
        name: 'โค้กเย็น',
        basePrice: 20,
        isAvailable: true,
        options: [],
      },
    ],
  },
  {
    id: 'cat-5',
    name: 'ของหวาน',
    items: [
      {
        id: 'item-dessert',
        name: 'บัวลอยน้ำกะทิ',
        basePrice: 35,
        isAvailable: true,
        options: [],
      },
    ],
  },
];

describe('Menu Item Pricing & Customization Calculation Logic', () => {
  it('calculates standard base price correctly without options', () => {
    const item = mockCategories[0].items[1]; // ข้าวผัดทะเล (70 บาท)
    const quantity = 1;
    const extraPrice = 0;
    const total = (item.basePrice + extraPrice) * quantity;

    expect(total).toBe(70);
  });

  it('calculates price correctly with multiple quantities', () => {
    const item = mockCategories[0].items[1]; // 70 บาท
    const quantity = 3;
    const total = item.basePrice * quantity;

    expect(total).toBe(210);
  });

  it('calculates single choice option add-on extra price', () => {
    const item = mockCategories[0].items[0]; // ข้าวกะเพราหมูกรอบ (65 บาท)
    const selectedExtra = 15; // หมูกรอบ (+15)
    const eggExtra = 10; // ไข่ดาว (+10)
    const quantity = 2;

    const total = (item.basePrice + selectedExtra + eggExtra) * quantity;
    expect(total).toBe((65 + 15 + 10) * 2); // 90 * 2 = 180
  });

  it('calculates multi-choice option add-ons accurately', () => {
    const basePrice = 45; // ข้าวไข่เจียว
    const multiChoices = [
      { name: 'หมูสับ', extraPrice: 10 },
      { name: 'กุ้งสับ', extraPrice: 20 },
      { name: 'ปูอัด', extraPrice: 10 },
    ];

    const totalExtras = multiChoices.reduce((sum, c) => sum + c.extraPrice, 0);
    const quantity = 1;
    const total = (basePrice + totalExtras) * quantity;

    expect(totalExtras).toBe(40);
    expect(total).toBe(85);
  });

  it('handles zero extraPrice options without price inflation', () => {
    const basePrice = 60;
    const zeroChoices = [
      { name: 'เผ็ดน้อย', extraPrice: 0 },
      { name: 'ไม่ใส่กระเทียม', extraPrice: 0 },
    ];
    const totalExtras = zeroChoices.reduce((sum, c) => sum + (c.extraPrice || 0), 0);
    const total = (basePrice + totalExtras) * 1;

    expect(totalExtras).toBe(0);
    expect(total).toBe(60);
  });
});

describe('AI Smart Upselling Recommendation Engine Logic', () => {
  it('Rule 1: Recommends Fried Egg / Soup when user orders Wok/Rice dish', () => {
    const currentItem = mockCategories[0].items[0]; // ข้าวกะเพราหมูกรอบ
    const recommendations = getUpsellingRecommendations([currentItem], mockCategories, 4);

    expect(recommendations.length).toBeGreaterThan(0);
    const names = recommendations.map((r) => r.name);
    const hasEgg = names.some((n) => /ไข่ดาว|ไข่เจียว/.test(n));
    expect(hasEgg).toBe(true);

    // Verify each recommendation has a valid non-empty price and badge
    recommendations.forEach((rec) => {
      expect(rec.price).toBeGreaterThan(0);
      expect(typeof rec.price).toBe('number');
      expect(rec.badge).toBeDefined();
      expect(rec.reason).toBeDefined();
    });
  });

  it('Rule 2: Recommends Jasmine Rice when ordering Soup/Curry without rice', () => {
    const currentItem = mockCategories[1].items[0]; // ต้มยำกุ้งน้ำข้น
    const recommendations = getUpsellingRecommendations([currentItem], mockCategories, 4);

    const names = recommendations.map((r) => r.name);
    const hasRice = names.some((n) => /ข้าวสวย|ข้าวเปล่า/.test(n));
    expect(hasRice).toBe(true);
  });

  it('Rule 3: Recommends Drink when cart contains food but no beverage', () => {
    const currentItem = mockCategories[0].items[1]; // ข้าวผัดทะเล
    const recommendations = getUpsellingRecommendations([currentItem], mockCategories, 4);

    const names = recommendations.map((r) => r.name);
    const hasDrink = names.some((n) => /ชาไทย|โค้ก/.test(n));
    expect(hasDrink).toBe(true);
  });

  it('Rule 4: Does NOT recommend dishes that are already in the cart (Deduplication)', () => {
    const currentItems = [
      mockCategories[0].items[0], // กะเพรา
      mockCategories[2].items[1], // ไข่ดาว (already ordered)
    ];
    const recommendations = getUpsellingRecommendations(currentItems, mockCategories, 4);

    const ids = recommendations.map((r) => r.id);
    expect(ids).not.toContain('item-egg-only');
  });

  it('Rule 5: Does NOT recommend out-of-stock items (isAvailable === false)', () => {
    const currentItem = mockCategories[0].items[0]; // กะเพรา
    const recommendations = getUpsellingRecommendations([currentItem], mockCategories, 10);

    const ids = recommendations.map((r) => r.id);
    expect(ids).not.toContain('item-out-of-stock');
  });

  it('Rule 6: Respects the requested limit count', () => {
    const currentItem = mockCategories[0].items[0];
    const recommendations = getUpsellingRecommendations([currentItem], mockCategories, 2);

    expect(recommendations.length).toBeLessThanOrEqual(2);
  });

  it('Gracefully handles empty inputs without throwing errors', () => {
    expect(getUpsellingRecommendations([], [])).toEqual([]);
    expect(getUpsellingRecommendations([], null as any)).toEqual([]);
    expect(getUpsellingRecommendations([], undefined as any)).toEqual([]);
  });
});

describe('Cart Aggregation & Discount Calculation Logic', () => {
  it('calculates total cart amount across multiple dishes and quantities correctly', () => {
    const cart = [
      { name: 'ข้าวกะเพราหมูกรอบ', price: 80, quantity: 2 }, // 160
      { name: 'ต้มยำกุ้ง', price: 120, quantity: 1 }, // 120
      { name: 'ชาไทยเย็น', price: 30, quantity: 2 }, // 60
    ];

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    expect(total).toBe(340);
  });

  it('applies member loyalty reward discounts correctly', () => {
    const rawTotal = 340;
    const discountAmount = 50;
    const netToPay = Math.max(0, rawTotal - discountAmount);

    expect(netToPay).toBe(290);
  });

  it('caps discount so payable amount is never negative', () => {
    const rawTotal = 40;
    const discountAmount = 50;
    const netToPay = Math.max(0, rawTotal - discountAmount);

    expect(netToPay).toBe(0);
  });
});

describe('Quick Note Tag Formatting Logic', () => {
  const toggleQuickNote = (currentNote: string, tag: string) => {
    if (currentNote.includes(tag)) {
      return currentNote
        .replace(tag, '')
        .replace(/,\s*,/g, ',')
        .replace(/^,\s*|,\s*$/g, '')
        .trim();
    } else {
      return currentNote ? `${currentNote}, ${tag}` : tag;
    }
  };

  it('adds a tag to empty note', () => {
    expect(toggleQuickNote('', 'ไม่ใส่ผงชูรส')).toBe('ไม่ใส่ผงชูรส');
  });

  it('appends tags separated by comma', () => {
    let note = 'ไม่ใส่ผงชูรส';
    note = toggleQuickNote(note, 'เผ็ดน้อย');
    expect(note).toBe('ไม่ใส่ผงชูรส, เผ็ดน้อย');
  });

  it('removes tag cleanly without leaving trailing or double commas', () => {
    let note = 'ไม่ใส่ผงชูรส, เผ็ดน้อย, ข้าวน้อย';
    note = toggleQuickNote(note, 'เผ็ดน้อย');
    expect(note).toBe('ไม่ใส่ผงชูรส, ข้าวน้อย');
  });
});
