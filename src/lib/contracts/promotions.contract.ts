/**
 * API and Interface Design - Promotions Contract
 */

import { StoreId } from './types';

export interface CreatePromotionInput {
  name: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface PromotionOutput {
  id: string;
  storeId: StoreId | string;
  name: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isActive: boolean;
  usageCount: number;
  createdAt?: string | Date;
}
