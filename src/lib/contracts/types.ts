/**
 * API and Interface Design - Core Domain Types
 * 
 * Implements:
 * 1. Branded Types for Entity IDs (preventing accidental ID cross-assignment)
 * 2. Discriminated Unions for Entity States & Variants (enabling type-safe exhaustive checks)
 */

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

// Branded Types for Domain Entity IDs
export type StoreId = Brand<string, 'StoreId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type TableId = Brand<string, 'TableId'>;
export type MenuItemId = Brand<string, 'MenuItemId'>;
export type UserId = Brand<string, 'UserId'>;
export type MemberId = Brand<string, 'MemberId'>;

// Factory / Casting Helpers
export const asStoreId = (id: string): StoreId => id as StoreId;
export const asOrderId = (id: string): OrderId => id as OrderId;
export const asTableId = (id: string): TableId => id as TableId;
export const asMenuItemId = (id: string): MenuItemId => id as MenuItemId;
export const asUserId = (id: string): UserId => id as UserId;
export const asMemberId = (id: string): MemberId => id as MemberId;

// Discriminated Unions for Order Lifecycle
export type OrderLifecycleState =
  | { status: 'PENDING'; placedAt: string }
  | { status: 'COOKING'; startedAt: string; chefNotes?: string }
  | { status: 'READY'; readyAt: string }
  | { status: 'SERVED'; servedAt: string }
  | { status: 'COMPLETED'; completedAt: string; netAmount: number }
  | { status: 'CANCELLED'; cancelledAt: string; reason: string };

// Discriminated Unions for Payment Status
export type PaymentState =
  | { status: 'UNPAID' }
  | { status: 'PENDING_VERIFICATION'; method: 'PROMPTPAY'; slipUrl?: string }
  | { status: 'PAID'; method: 'CASH' | 'PROMPTPAY' | 'TRANSFER'; paidAt: string; amount: number }
  | { status: 'REFUNDED'; refundedAt: string; reason: string; amount: number };

// Discriminated Unions for Order Channels
export type OrderChannelVariant =
  | { channel: 'DINE_IN'; tableNo: number; tableId?: string }
  | { channel: 'TAKEAWAY'; customerName?: string; phone?: string }
  | { channel: 'LINEMAN'; deliveryOrderId: string; riderName?: string; riderPhone?: string }
  | { channel: 'GRAB'; deliveryOrderId: string; riderName?: string; riderPhone?: string }
  | { channel: 'SHOPEE_FOOD'; deliveryOrderId: string }
  | { channel: 'ROBINHOOD'; deliveryOrderId: string };
