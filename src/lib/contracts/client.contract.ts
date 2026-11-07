/**
 * API and Interface Design - Store Client API Contract
 * 
 * Defines the public contract interface for client-to-server communication,
 * establishing clear module boundaries between frontend UI and backend API routes.
 */

import { CreateOrderInput, OrderOutput } from './orders.contract';
import { CreateMenuItemInput, MenuItemOutput } from './menu.contract';
import { CreateTableInput, TableOutput } from './tables.contract';
import { CreateIngredientInput, IngredientOutput } from './inventory.contract';
import { RegisterMemberInput, MemberOutput } from './members.contract';
import { CreatePromotionInput, PromotionOutput } from './promotions.contract';
import { PaginatedResultContract, PaginationParamsContract } from './api.contract';

export interface IStoreApiClient {
  // Orders
  getOrders(params?: PaginationParamsContract & { tableId?: string; status?: string }): Promise<PaginatedResultContract<OrderOutput> | OrderOutput[]>;
  getOrderById(orderId: string): Promise<OrderOutput>;
  createOrder(input: CreateOrderInput, idempotencyKey?: string): Promise<OrderOutput>;
  updateOrderStatus(orderId: string, status: string): Promise<OrderOutput>;

  // Menu
  getMenuItems(category?: string): Promise<MenuItemOutput[]>;
  createMenuItem(input: CreateMenuItemInput): Promise<MenuItemOutput>;
  toggleMenuAvailability(menuId: string, isAvailable: boolean): Promise<MenuItemOutput>;

  // Tables
  getTables(): Promise<TableOutput[]>;
  createTable(input: CreateTableInput): Promise<TableOutput>;
  clearTable(tableNo: number): Promise<{ success: boolean; message: string }>;

  // Inventory
  getInventory(): Promise<IngredientOutput[]>;
  createIngredient(input: CreateIngredientInput): Promise<IngredientOutput>;

  // Members
  getMembers(search?: string): Promise<MemberOutput[]>;
  registerMember(input: RegisterMemberInput): Promise<MemberOutput>;

  // Promotions
  getPromotions(): Promise<PromotionOutput[]>;
  createPromotion(input: CreatePromotionInput): Promise<PromotionOutput>;
}
