/**
 * API and Interface Design - Inventory Contract
 * 
 * Enforces contract-first input/output interfaces for inventory management.
 */

import { StoreId } from './types';

export interface CreateIngredientInput {
  name: string;
  unit: string;
  costPerUnit?: number;
  currentStock?: number;
  minStockAlert?: number;
}

export interface AdjustStockInput {
  action: 'STOCK_ADJUST';
  ingredientId: string;
  changeQty: number;
  reason?: 'STOCK_IN' | 'WASTE' | 'CORRECTION' | 'RECIPE_USAGE';
  note?: string;
}

export interface IngredientOutput {
  id: string;
  storeId: StoreId | string;
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  minStockAlert: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  stockLogs?: StockLogOutput[];
}

export interface StockLogOutput {
  id: string;
  ingredientId: string;
  changeQty: number;
  reason: string;
  note?: string | null;
  cost?: number | null;
  createdAt: string | Date;
}
