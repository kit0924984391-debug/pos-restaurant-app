/**
 * API and Interface Design - Menu Contract
 * 
 * Enforces contract first and clear separation between input mutations and output representations.
 */

import { MenuItemId, StoreId } from './types';

export interface CreateMenuItemInput {
  name: string;
  nameEn?: string;
  category: string;
  price: number;
  cost?: number;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  options?: unknown;
}

export interface UpdateMenuItemInput {
  name?: string;
  nameEn?: string;
  category?: string;
  price?: number;
  cost?: number;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  options?: unknown;
}

export interface ToggleAvailabilityInput {
  isAvailable: boolean;
}

export interface MenuItemOutput {
  id: MenuItemId | string;
  storeId: StoreId | string;
  name: string;
  nameEn?: string | null;
  category: string;
  price: number;
  cost?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  options?: unknown;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MenuCategoryOutput {
  name: string;
  itemCount: number;
  items: MenuItemOutput[];
}
