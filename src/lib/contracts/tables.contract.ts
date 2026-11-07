/**
 * API and Interface Design - Tables Contract
 */

import { TableId, StoreId } from './types';

export interface CreateTableInput {
  tableNo: number;
  label?: string;
  capacity?: number;
  zone?: string;
}

export interface UpdateTableInput {
  tableNo?: number;
  label?: string;
  capacity?: number;
  zone?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILLING';
}

export interface TableOutput {
  id: TableId | string;
  storeId: StoreId | string;
  tableNo: number;
  label?: string | null;
  capacity?: number | null;
  zone?: string | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILLING' | string;
  currentOrderId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
