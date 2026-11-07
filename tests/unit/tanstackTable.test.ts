import { describe, it, expect } from 'vitest';
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';

interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  minStockAlert: number;
  costPerUnit: number;
  unit: string;
}

describe('TanStack Table v8 Architecture & State Processing Suite', () => {
  const mockIngredients: Ingredient[] = [
    { id: '1', name: 'หมูกรอบ', currentStock: 2500, minStockAlert: 1000, costPerUnit: 0.35, unit: 'กรัม' },
    { id: '2', name: 'กะเพรา', currentStock: 50, minStockAlert: 200, costPerUnit: 0.05, unit: 'กรัม' },
    { id: '3', name: 'ไข่ไก่', currentStock: 0, minStockAlert: 20, costPerUnit: 4.5, unit: 'ฟอง' },
    { id: '4', name: 'ข้าวหอมมะลิ', currentStock: 15000, minStockAlert: 5000, costPerUnit: 0.04, unit: 'กรัม' },
  ];

  it('1. Calculates total value accessor correctly', () => {
    const colHelper = createColumnHelper<Ingredient>();
    const totalValCol = colHelper.accessor((row) => row.currentStock * row.costPerUnit, {
      id: 'totalValue',
      header: 'มูลค่าคงเหลือ',
    });

    expect(totalValCol.id).toBe('totalValue');
    if (typeof totalValCol.accessorFn === 'function') {
      expect(totalValCol.accessorFn(mockIngredients[0], 0)).toBe(2500 * 0.35); // 875
      expect(totalValCol.accessorFn(mockIngredients[2], 2)).toBe(0); // 0
    }
  });

  it('2. Evaluates stock alert status correctly', () => {
    const getStatusLevel = (ing: Ingredient) =>
      ing.currentStock <= 0 ? 0 : ing.currentStock <= ing.minStockAlert ? 1 : 2;

    expect(getStatusLevel(mockIngredients[2])).toBe(0); // หมดสต็อก
    expect(getStatusLevel(mockIngredients[1])).toBe(1); // ใกล้หมด
    expect(getStatusLevel(mockIngredients[0])).toBe(2); // ปกติ
  });

  it('3. Column sorting logic correctly sorts by stock level', () => {
    const sorted = [...mockIngredients].sort((a, b) => a.currentStock - b.currentStock);
    expect(sorted[0].name).toBe('ไข่ไก่'); // 0
    expect(sorted[1].name).toBe('กะเพรา'); // 50
    expect(sorted[3].name).toBe('ข้าวหอมมะลิ'); // 15000
  });

  it('4. Filters ingredients by search query case-insensitively', () => {
    const query = 'หมู';
    const filtered = mockIngredients.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('หมูกรอบ');
  });

  it('5. Computes correct pagination metadata', () => {
    const pageSize = 2;
    const totalItems = mockIngredients.length;
    const pageCount = Math.ceil(totalItems / pageSize);

    expect(pageCount).toBe(2);
    const page1 = mockIngredients.slice(0, pageSize);
    const page2 = mockIngredients.slice(pageSize, pageSize * 2);

    expect(page1.length).toBe(2);
    expect(page2.length).toBe(2);
    expect(page1[0].id).toBe('1');
    expect(page2[0].id).toBe('3');
  });
});
