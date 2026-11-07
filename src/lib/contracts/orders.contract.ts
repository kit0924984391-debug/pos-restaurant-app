/**
 * API and Interface Design - Orders Contract
 * 
 * Enforces Contract First & Input/Output Separation:
 * - CreateOrderInput represents external client payload
 * - OrderOutput represents server-computed canonical state
 */

import { OrderId, StoreId, TableId } from './types';

export interface OrderItemOptionInput {
  name: string;
  choice: string;
  extraPrice?: number;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  name?: string;
  price?: number;
  quantity: number;
  notes?: string;
  options?: OrderItemOptionInput[];
}

export interface CreateOrderInput {
  tableId?: string;
  tableNo?: number;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  orderChannel?: 'DINE_IN' | 'TAKEAWAY' | 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD';
  deliveryOrderId?: string;
  riderName?: string;
  riderPhone?: string;
  gpPercent?: number;
  items: CreateOrderItemInput[];
  customerName?: string;
  customerLineId?: string;
  memberPhone?: string;
  promoCode?: string;
  discountAmount?: number;
  pointsRedeemed?: number;
  note?: string;
  clientRequestId?: string;
}

export interface UpdateOrderStatusInput {
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  cancelReason?: string;
}

export interface OrderItemOutput {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  totalPrice: number;
  notes?: string | null;
  options?: string | null;
  menuItem?: {
    id: string;
    name: string;
    category?: string | null;
    imageUrl?: string | null;
  };
}

export interface OrderOutput {
  id: OrderId | string;
  storeId: StoreId | string;
  orderNumber: number;
  status: string;
  orderType: string;
  orderChannel: string;
  tableId?: TableId | string | null;
  tableNo?: number | null;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  deliveryOrderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  items?: OrderItemOutput[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface ListOrdersQueryContract {
  tableId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
