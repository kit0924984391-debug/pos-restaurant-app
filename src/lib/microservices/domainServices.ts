import { SagaOrchestrator } from './saga';
import { defaultDomainEventBus } from './eventBus';
import { logger } from '@/lib/logger';

export interface OrderItemInput {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderCreationContext {
  orderId: string;
  storeId: string;
  tableId?: string;
  customerName?: string;
  items: OrderItemInput[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'PROMPTPAY' | 'TRANSFER';
  paymentReference?: string;
  status?: string;
  inventoryReserved?: boolean;
  paymentProcessed?: boolean;
  kitchenNotified?: boolean;
  cancellationReason?: string;
}

/**
 * Creates an orchestrated Order Fulfillment Saga.
 * Coordinates Order Creation -> Inventory Reservation -> Payment Processing -> Kitchen Notification.
 * Automatically executes reverse compensating actions if any stage fails.
 */
export function createOrderFulfillmentSaga(options?: {
  onOrderCreated?: (ctx: OrderCreationContext) => Promise<void> | void;
  onInventoryReserved?: (ctx: OrderCreationContext) => Promise<void> | void;
  onPaymentProcessed?: (ctx: OrderCreationContext) => Promise<void> | void;
  onKitchenNotified?: (ctx: OrderCreationContext) => Promise<void> | void;
}): SagaOrchestrator<OrderCreationContext> {
  const saga = new SagaOrchestrator<OrderCreationContext>('OrderFulfillment');

  // Step 1: Initialize / Record Order
  saga.addStep(
    'create_order',
    async (ctx) => {
      ctx.status = 'PENDING';
      logger.info(`[OrderService] Order ${ctx.orderId} initialized`, { orderId: ctx.orderId });
      if (options?.onOrderCreated) {
        await options.onOrderCreated(ctx);
      }
      await defaultDomainEventBus.publish({
        type: 'order.created',
        aggregateId: ctx.orderId,
        aggregateType: 'Order',
        data: { orderId: ctx.orderId, storeId: ctx.storeId, items: ctx.items, total: ctx.totalAmount },
      });
      return { status: 'PENDING' };
    },
    async (ctx, error) => {
      ctx.status = 'CANCELLED';
      ctx.cancellationReason = `Order creation rolled back: ${error}`;
      logger.warn(`[OrderService] Order ${ctx.orderId} cancelled via compensation`);
      await defaultDomainEventBus.publish({
        type: 'order.cancelled',
        aggregateId: ctx.orderId,
        aggregateType: 'Order',
        data: { orderId: ctx.orderId, reason: ctx.cancellationReason },
      });
    }
  );

  // Step 2: Reserve Inventory / Deduct Recipe Stock
  saga.addStep(
    'reserve_inventory',
    async (ctx) => {
      ctx.inventoryReserved = true;
      logger.info(`[InventoryService] Reserved stock for order ${ctx.orderId}`);
      if (options?.onInventoryReserved) {
        await options.onInventoryReserved(ctx);
      }
      await defaultDomainEventBus.publish({
        type: 'inventory.reserved',
        aggregateId: ctx.orderId,
        aggregateType: 'Inventory',
        data: { orderId: ctx.orderId, itemCount: ctx.items.length },
      });
      return { inventoryReserved: true };
    },
    async (ctx) => {
      ctx.inventoryReserved = false;
      logger.warn(`[InventoryService] Released reserved stock for order ${ctx.orderId}`);
      await defaultDomainEventBus.publish({
        type: 'inventory.released',
        aggregateId: ctx.orderId,
        aggregateType: 'Inventory',
        data: { orderId: ctx.orderId },
      });
    }
  );

  // Step 3: Process Payment / Verify Financial Transaction
  saga.addStep(
    'process_payment',
    async (ctx) => {
      ctx.paymentProcessed = true;
      ctx.status = 'PAID';
      logger.info(`[PaymentService] Processed ${ctx.paymentMethod} payment for order ${ctx.orderId} (฿${ctx.totalAmount})`);
      if (options?.onPaymentProcessed) {
        await options.onPaymentProcessed(ctx);
      }
      await defaultDomainEventBus.publish({
        type: 'payment.completed',
        aggregateId: ctx.orderId,
        aggregateType: 'Payment',
        data: { orderId: ctx.orderId, amount: ctx.totalAmount, method: ctx.paymentMethod },
      });
      return { paymentProcessed: true, status: 'PAID' };
    },
    async (ctx) => {
      ctx.paymentProcessed = false;
      logger.warn(`[PaymentService] Voided/Refunded payment for order ${ctx.orderId}`);
      await defaultDomainEventBus.publish({
        type: 'payment.refunded',
        aggregateId: ctx.orderId,
        aggregateType: 'Payment',
        data: { orderId: ctx.orderId, amount: ctx.totalAmount },
      });
    }
  );

  // Step 4: Dispatch Ticket to Kitchen Display
  saga.addStep(
    'notify_kitchen',
    async (ctx) => {
      ctx.kitchenNotified = true;
      logger.info(`[KitchenService] Dispatched kitchen ticket for order ${ctx.orderId}`);
      if (options?.onKitchenNotified) {
        await options.onKitchenNotified(ctx);
      }
      await defaultDomainEventBus.publish({
        type: 'kitchen.ticket_dispatched',
        aggregateId: ctx.orderId,
        aggregateType: 'Kitchen',
        data: { orderId: ctx.orderId, tableId: ctx.tableId },
      });
      return { kitchenNotified: true };
    },
    async (ctx) => {
      ctx.kitchenNotified = false;
      logger.warn(`[KitchenService] Recalled kitchen ticket for order ${ctx.orderId}`);
      await defaultDomainEventBus.publish({
        type: 'kitchen.ticket_recalled',
        aggregateId: ctx.orderId,
        aggregateType: 'Kitchen',
        data: { orderId: ctx.orderId },
      });
    }
  );

  return saga;
}
