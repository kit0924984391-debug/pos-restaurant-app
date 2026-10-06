/**
 * AI Smart Upselling & Cross-Selling Recommendation Engine
 * Analyzes current cart items or selected dishes to intelligently suggest
 * high-margin complementary pairings (drinks, extra toppings, side dishes, soups).
 */

export interface UpsellRecommendation {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryName?: string;
  reason: string;
  badge: string;
  item: any;
}

/**
 * Heuristic AI Matcher for complementary dishes and drinks
 */
export function getUpsellingRecommendations(
  currentItems: any[],
  allCategories: any[],
  limit: number = 4
): UpsellRecommendation[] {
  if (!allCategories || !Array.isArray(allCategories) || allCategories.length === 0) {
    return [];
  }

  // Flatten all available menu items
  const allMenuItems: any[] = [];
  allCategories.forEach((cat) => {
    if (cat.items && Array.isArray(cat.items)) {
      cat.items.forEach((item: any) => {
        if (item.isAvailable !== false) {
          allMenuItems.push({
            ...item,
            categoryName: cat.name,
          });
        }
      });
    }
  });

  if (allMenuItems.length === 0) return [];

  // Current item names and categories for deduplication
  const currentItemIds = new Set(currentItems.map((i) => i.id || i.menuItemId));
  const currentNamesText = currentItems.map((i) => (i.name || '').toLowerCase()).join(' ');

  const hasDrink =
    /น้ำ|ชา|กาแฟ|นม|โอเลี้ยง|โซดา|หวาน|ปั่น|เย็น|โค้ก|เป๊ปซี่|เก๊กฮวย|drink|beverage/i.test(
      currentNamesText
    );
  const hasWokOrRice =
    /กะเพรา|กระเพรา|ข้าวผัด|ผัด|คั่ว|ทอด|หมูกรอบ|กระเทียม|ไข่เจียว/i.test(currentNamesText);
  const hasSoupOrCurry = /ต้มยำ|แกง|ซุป|ต้มจืด|เกาเหลา|เล้ง|soup/i.test(currentNamesText);
  const hasRice = /ข้าวสวย|ข้าวเปล่า|ข้าวหอม/i.test(currentNamesText);

  const candidates: UpsellRecommendation[] = [];

  // Helper to find matching menu item by regex
  const findItem = (pattern: RegExp) => {
    return allMenuItems.find(
      (m) => pattern.test(m.name.toLowerCase()) && !currentItemIds.has(m.id)
    );
  };

  // Rule 1: Wok / Stir-fry -> suggest Fried Egg / Omelet if not in cart
  if (hasWokOrRice) {
    const eggItem = findItem(/ไข่ดาว|ไข่เจียว/i);
    if (eggItem) {
      candidates.push({
        id: eggItem.id,
        name: eggItem.name,
        price: eggItem.price,
        imageUrl: eggItem.imageUrl,
        categoryName: eggItem.categoryName,
        reason: 'ท็อปปิ้งคู่กะเพราขายดีอันดับ 1',
        badge: '🍳 คู่ซี้จานผัด',
        item: eggItem,
      });
    }

    const soupItem = findItem(/ต้มจืด|แกงจืด|ซุป/i);
    if (soupItem) {
      candidates.push({
        id: soupItem.id,
        name: soupItem.name,
        price: soupItem.price,
        imageUrl: soupItem.imageUrl,
        categoryName: soupItem.categoryName,
        reason: 'ซดน้ำซุปร้อนๆ คล่องคอ',
        badge: '🍲 ซดคล่องคอ',
        item: soupItem,
      });
    }
  }

  // Rule 2: Soup / Curry -> suggest Jasmine Rice
  if (hasSoupOrCurry && !hasRice) {
    const riceItem = findItem(/ข้าวสวย|ข้าวเปล่า|ข้าวหอม/i);
    if (riceItem) {
      candidates.push({
        id: riceItem.id,
        name: riceItem.name,
        price: riceItem.price,
        imageUrl: riceItem.imageUrl,
        categoryName: riceItem.categoryName,
        reason: 'ทานคู่ต้มยำ/แกงจืด ร้อนๆ ฟินมาก',
        badge: '🍚 สั่งคู่แกง',
        item: riceItem,
      });
    }
  }

  // Rule 3: No Drink in Cart -> Suggest refreshing iced drinks (High Margin!)
  if (!hasDrink) {
    const teaItem = findItem(/ชาไทย|ชาเย็น|ชามะนาว|เก๊กฮวย/i);
    if (teaItem) {
      candidates.push({
        id: teaItem.id,
        name: teaItem.name,
        price: teaItem.price,
        imageUrl: teaItem.imageUrl,
        categoryName: teaItem.categoryName,
        reason: 'เครื่องดื่มดับกระหาย แก้เผ็ดสดชื่น',
        badge: '🥤 ดับกระหาย',
        item: teaItem,
      });
    }

    const softDrink = findItem(/โค้ก|เป๊ปซี่|น้ำอัดลม|สไปรท์/i);
    if (softDrink && !candidates.some((c) => c.id === softDrink.id)) {
      candidates.push({
        id: softDrink.id,
        name: softDrink.name,
        price: softDrink.price,
        imageUrl: softDrink.imageUrl,
        categoryName: softDrink.categoryName,
        reason: 'ซ่าสดชื่น ดื่มคู่มื้ออร่อย',
        badge: '🧊 ซ่าเย็นชื่นใจ',
        item: softDrink,
      });
    }
  }

  // Rule 4: Appetizer / Snack / Crispy Sides
  const sideItem = findItem(/หมูกรอบ|ลูกชิ้น|เกี๊ยว|ปีกไก่|ทอด/i);
  if (sideItem && !candidates.some((c) => c.id === sideItem.id)) {
    candidates.push({
      id: sideItem.id,
      name: sideItem.name,
      price: sideItem.price,
      imageUrl: sideItem.imageUrl,
      categoryName: sideItem.categoryName,
      reason: 'ของทานเล่นเคี้ยวเพลินประจำร้าน',
      badge: '✨ สั่งเพิ่มยอดฮิต',
      item: sideItem,
    });
  }

  // Rule 5: Desserts (if available)
  const dessertItem = findItem(/บัวลอย|เฉาก๊วย|หวาน|ไอศกรีม|ไอติม/i);
  if (dessertItem && !candidates.some((c) => c.id === dessertItem.id)) {
    candidates.push({
      id: dessertItem.id,
      name: dessertItem.name,
      price: dessertItem.price,
      imageUrl: dessertItem.imageUrl,
      categoryName: dessertItem.categoryName,
      reason: 'ตบท้ายมื้ออร่อยด้วยของหวาน',
      badge: '🍧 ของหวานตบท้าย',
      item: dessertItem,
    });
  }

  // Fallback: If still under limit, fill with popular items from drink or side category
  if (candidates.length < limit) {
    const remaining = allMenuItems
      .filter((m) => !currentItemIds.has(m.id) && !candidates.some((c) => c.id === m.id))
      .slice(0, limit - candidates.length);

    remaining.forEach((rem) => {
      candidates.push({
        id: rem.id,
        name: rem.name,
        price: rem.price,
        imageUrl: rem.imageUrl,
        categoryName: rem.categoryName,
        reason: 'เมนูยอดนิยมที่ลูกค้าสั่งบ่อย',
        badge: '⭐️ เมนูแนะนำ',
        item: rem,
      });
    });
  }

  return candidates.slice(0, limit);
}
