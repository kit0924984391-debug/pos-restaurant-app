/**
 * API and Interface Design - Members Contract
 */

import { MemberId, StoreId } from './types';

export interface RegisterMemberInput {
  name: string;
  phone: string;
  lineId?: string;
  email?: string;
  birthDate?: string;
}

export interface AdjustMemberPointsInput {
  action: 'ADJUST_POINTS' | 'REDEEM_POINTS';
  points: number;
  reason?: string;
  orderId?: string;
}

export interface MemberOutput {
  id: MemberId | string;
  storeId: StoreId | string;
  name: string;
  phone: string;
  points: number;
  totalSpent: number;
  totalOrders: number;
  tier?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
