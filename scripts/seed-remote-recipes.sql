-- 1. Insert New Ingredients for Demo Store (lung-pa)
INSERT OR IGNORE INTO Ingredient (id, storeId, name, unit, costPerUnit, currentStock, minStockAlert, createdAt, updatedAt) VALUES
('ing_chili_garlic', 'cmtiaoepk00029776xuk9x3t6', 'พริกสด & กระเทียมไทย', 'กรัม (g)', 0.12, 3000, 300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ing_cooking_oil', 'cmtiaoepk00029776xuk9x3t6', 'น้ำมันพืชสำหรับปรุงอาหาร', 'มล. (ml)', 0.06, 10000, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ing_fresh_shrimp', 'cmtiaoepk00029776xuk9x3t6', 'กุ้งสดแกะเปลือก', 'กรัม (g)', 0.30, 3000, 300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ing_fresh_kale', 'cmtiaoepk00029776xuk9x3t6', 'ผักคะน้าสด', 'กรัม (g)', 0.06, 4000, 400, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ing_leng_bone', 'cmtiaoepk00029776xuk9x3t6', 'กระดูกหมูเล้งต้มซุป', 'กรัม (g)', 0.08, 5000, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Clear old recipes if any
DELETE FROM MenuItemRecipe WHERE menuItemId IN (
  'cmtxolpet0010pwflm7iu4t2v',
  'cmtxolrkv001ppwflm5489ryf',
  'cmtxoltad002apwfl7wx6rl0j',
  'cmtxoluqr002ppwflyj376882',
  'cmtxolw8e0033pwfl289zx5f4',
  'cmtxom4kp003ipwflhpcdzm0j',
  'cmtxom688003qpwfl0rwhnmfx',
  'cmtxomxj3003zpwfltcltuoko',
  'cmu5ff55h0035nv3127k60u2t'
);

-- 3. Insert BOM Recipes for Demo Store Menu Items
INSERT INTO MenuItemRecipe (id, menuItemId, ingredientId, quantity) VALUES
-- ผัดกะเพราสูตรโบราณ (ราดข้าว)
('rec_krapao_pork', 'cmtxolpet0010pwflm7iu4t2v', 'cmtqt9enh004cxvjrz9k3xhrx', 100),
('rec_krapao_rice', 'cmtxolpet0010pwflm7iu4t2v', 'cmtqt9gxo004kxvjruwysv7n6', 180),
('rec_krapao_basil', 'cmtxolpet0010pwflm7iu4t2v', 'cmtqt9hi8004mxvjre2hn75wt', 15),
('rec_krapao_sauce', 'cmtxolpet0010pwflm7iu4t2v', 'cmtqt9i2s004oxvjrzat1kcu3', 20),
('rec_krapao_chili', 'cmtxolpet0010pwflm7iu4t2v', 'ing_chili_garlic', 15),
('rec_krapao_oil', 'cmtxolpet0010pwflm7iu4t2v', 'ing_cooking_oil', 15),

-- ผัดพริกแกงราดข้าว
('rec_prikgaeng_pork', 'cmtxolrkv001ppwflm5489ryf', 'cmtqt9enh004cxvjrz9k3xhrx', 100),
('rec_prikgaeng_rice', 'cmtxolrkv001ppwflm5489ryf', 'cmtqt9gxo004kxvjruwysv7n6', 180),
('rec_prikgaeng_chili', 'cmtxolrkv001ppwflm5489ryf', 'ing_chili_garlic', 20),
('rec_prikgaeng_sauce', 'cmtxolrkv001ppwflm5489ryf', 'cmtqt9i2s004oxvjrzat1kcu3', 20),
('rec_prikgaeng_oil', 'cmtxolrkv001ppwflm5489ryf', 'ing_cooking_oil', 15),

-- ทอดกระเทียมพริกไทยราดข้าว
('rec_kratiem_pork', 'cmtxoltad002apwfl7wx6rl0j', 'cmtqt9enh004cxvjrz9k3xhrx', 120),
('rec_kratiem_rice', 'cmtxoltad002apwfl7wx6rl0j', 'cmtqt9gxo004kxvjruwysv7n6', 180),
('rec_kratiem_chili', 'cmtxoltad002apwfl7wx6rl0j', 'ing_chili_garlic', 25),
('rec_kratiem_sauce', 'cmtxoltad002apwfl7wx6rl0j', 'cmtqt9i2s004oxvjrzat1kcu3', 15),
('rec_kratiem_oil', 'cmtxoltad002apwfl7wx6rl0j', 'ing_cooking_oil', 20),

-- ผัดคะน้าหมูกรอบราดข้าว
('rec_kana_crispy', 'cmtxoluqr002ppwflyj376882', 'cmtqt9f82004exvjruh80zu7a', 80),
('rec_kana_kale', 'cmtxoluqr002ppwflyj376882', 'ing_fresh_kale', 120),
('rec_kana_rice', 'cmtxoluqr002ppwflyj376882', 'cmtqt9gxo004kxvjruwysv7n6', 180),
('rec_kana_sauce', 'cmtxoluqr002ppwflyj376882', 'cmtqt9i2s004oxvjrzat1kcu3', 20),
('rec_kana_chili', 'cmtxoluqr002ppwflyj376882', 'ing_chili_garlic', 10),
('rec_kana_oil', 'cmtxoluqr002ppwflyj376882', 'ing_cooking_oil', 15),

-- ข้าวผัดโบราณ / ข้าวผัดไข่
('rec_friedrice_rice', 'cmtxolw8e0033pwfl289zx5f4', 'cmtqt9gxo004kxvjruwysv7n6', 200),
('rec_friedrice_egg', 'cmtxolw8e0033pwfl289zx5f4', 'cmtqt9gd5004ixvjrl9fn0a64', 1),
('rec_friedrice_pork', 'cmtxolw8e0033pwfl289zx5f4', 'cmtqt9enh004cxvjrz9k3xhrx', 50),
('rec_friedrice_oil', 'cmtxolw8e0033pwfl289zx5f4', 'ing_cooking_oil', 15),
('rec_friedrice_sauce', 'cmtxolw8e0033pwfl289zx5f4', 'cmtqt9i2s004oxvjrzat1kcu3', 15),

-- ข้าวไข่เจียวฟูปูอัด/หมูสับ (2 ฟอง)
('rec_omelet_egg', 'cmtxom4kp003ipwflhpcdzm0j', 'cmtqt9gd5004ixvjrl9fn0a64', 2),
('rec_omelet_pork', 'cmtxom4kp003ipwflhpcdzm0j', 'cmtqt9enh004cxvjrz9k3xhrx', 50),
('rec_omelet_rice', 'cmtxom4kp003ipwflhpcdzm0j', 'cmtqt9gxo004kxvjruwysv7n6', 180),
('rec_omelet_oil', 'cmtxom4kp003ipwflhpcdzm0j', 'ing_cooking_oil', 40),
('rec_omelet_sauce', 'cmtxom4kp003ipwflhpcdzm0j', 'cmtqt9i2s004oxvjrzat1kcu3', 10),

-- ต้มยำกุ้ง / ทะเลน้ำข้น (หม้อ/ถ้วย)
('rec_tomyum_shrimp', 'cmtxom688003qpwfl0rwhnmfx', 'ing_fresh_shrimp', 150),
('rec_tomyum_chili', 'cmtxom688003qpwfl0rwhnmfx', 'ing_chili_garlic', 30),
('rec_tomyum_sauce', 'cmtxom688003qpwfl0rwhnmfx', 'cmtqt9i2s004oxvjrzat1kcu3', 30),

-- ต้มจืดเต้าหู้หมูสับสาหร่าย
('rec_tomjued_pork', 'cmtxomxj3003zpwfltcltuoko', 'cmtqt9enh004cxvjrz9k3xhrx', 120),
('rec_tomjued_kale', 'cmtxomxj3003zpwfltcltuoko', 'ing_fresh_kale', 50),
('rec_tomjued_sauce', 'cmtxomxj3003zpwfltcltuoko', 'cmtqt9i2s004oxvjrzat1kcu3', 20),

-- ต้มเล้ง
('rec_leng_bone', 'cmu5ff55h0035nv3127k60u2t', 'ing_leng_bone', 300),
('rec_leng_chili', 'cmu5ff55h0035nv3127k60u2t', 'ing_chili_garlic', 30),
('rec_leng_sauce', 'cmu5ff55h0035nv3127k60u2t', 'cmtqt9i2s004oxvjrzat1kcu3', 25);
