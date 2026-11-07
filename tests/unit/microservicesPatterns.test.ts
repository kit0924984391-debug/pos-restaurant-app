import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SagaOrchestrator,
  DomainEventBus,
  Bulkhead,
  BulkheadRejectedError,
  BulkheadTimeoutError,
  ServiceAggregator,
  createOrderFulfillmentSaga,
  type OrderCreationContext,
} from '@/lib/microservices';

describe('Microservices Patterns Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Saga Orchestrator & Distributed Transactions
  describe('1. Saga Orchestrator & Compensating Transactions', () => {
    it('executes all steps sequentially when all actions succeed', async () => {
      const orderSaga = new SagaOrchestrator<{ orderId: string; stepLog: string[] }>('TestSuccessSaga');

      orderSaga
        .addStep(
          'step_one',
          async (ctx) => {
            ctx.stepLog.push('step_one_action');
            return { stepOneDone: true };
          },
          async (ctx) => {
            ctx.stepLog.push('step_one_compensate');
          }
        )
        .addStep(
          'step_two',
          async (ctx) => {
            ctx.stepLog.push('step_two_action');
            return { stepTwoDone: true };
          },
          async (ctx) => {
            ctx.stepLog.push('step_two_compensate');
          }
        );

      const result = await orderSaga.execute({ orderId: 'ord_101', stepLog: [] });

      expect(result.status).toBe('COMPLETED');
      expect(result.completedSteps).toEqual(['step_one', 'step_two']);
      expect(result.compensatedSteps).toEqual([]);
      expect(result.context.stepLog).toEqual(['step_one_action', 'step_two_action']);
      expect((result.context as any).stepOneDone).toBe(true);
      expect((result.context as any).stepTwoDone).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('rolls back completed steps in reverse order when a middle step fails', async () => {
      const executionOrder: string[] = [];
      const failSaga = new SagaOrchestrator<{ id: string }>('FailingSaga');

      failSaga
        .addStep(
          'first_step',
          async () => {
            executionOrder.push('action_1');
          },
          async () => {
            executionOrder.push('compensate_1');
          }
        )
        .addStep(
          'second_step',
          async () => {
            executionOrder.push('action_2');
          },
          async () => {
            executionOrder.push('compensate_2');
          }
        )
        .addStep(
          'third_step_failing',
          async () => {
            executionOrder.push('action_3');
            throw new Error('Insufficient credit limit');
          },
          async () => {
            executionOrder.push('compensate_3');
          }
        );

      const result = await failSaga.execute({ id: 'tx_fail_1' });

      expect(result.status).toBe('COMPENSATED');
      expect(result.error).toBe('Insufficient credit limit');
      expect(result.completedSteps).toEqual(['first_step', 'second_step']);
      // Compensations must be executed in reverse order: second_step then first_step
      expect(result.compensatedSteps).toEqual(['second_step', 'first_step']);
      expect(executionOrder).toEqual(['action_1', 'action_2', 'action_3', 'compensate_2', 'compensate_1']);
    });

    it('marks status as FAILED if any compensation action encounters an error', async () => {
      const brokenCompSaga = new SagaOrchestrator<{ id: string }>('BrokenCompensationSaga');

      brokenCompSaga
        .addStep(
          'step_a',
          async () => {},
          async () => {
            throw new Error('Deadlock during compensation');
          }
        )
        .addStep(
          'step_b',
          async () => {
            throw new Error('Trigger rollback');
          },
          async () => {}
        );

      const result = await brokenCompSaga.execute({ id: 'tx_err' });

      expect(result.status).toBe('FAILED');
      expect(result.compensatedSteps.length).toBe(0); // failed to compensate step_a
    });
  });

  // 2. Domain Event Bus (Pub/Sub, Wildcards & Outbox)
  describe('2. Domain Event Bus & Asynchronous Decoupling', () => {
    it('dispatches events to exact and wildcard subscribers (* and prefix.*)', async () => {
      const eventBus = new DomainEventBus();
      const exactReceived: any[] = [];
      const prefixWildcardReceived: any[] = [];
      const globalWildcardReceived: any[] = [];

      eventBus.subscribe('order.created', (e) => { exactReceived.push(e.data); });
      eventBus.subscribe('order.*', (e) => { prefixWildcardReceived.push(e.type); });
      eventBus.subscribe('*', (e) => { globalWildcardReceived.push(e.type); });

      await eventBus.publish({
        type: 'order.created',
        aggregateId: 'ord_555',
        aggregateType: 'Order',
        data: { total: 150 },
      });

      await eventBus.publish({
        type: 'order.cancelled',
        aggregateId: 'ord_555',
        aggregateType: 'Order',
        data: { reason: 'Customer changed mind' },
      });

      await eventBus.publish({
        type: 'payment.completed',
        aggregateId: 'pay_123',
        aggregateType: 'Payment',
        data: { amount: 150 },
      });

      expect(exactReceived).toEqual([{ total: 150 }]);
      expect(prefixWildcardReceived).toEqual(['order.created', 'order.cancelled']);
      expect(globalWildcardReceived).toEqual(['order.created', 'order.cancelled', 'payment.completed']);
    });

    it('supports unsubscription cleanly', async () => {
      const eventBus = new DomainEventBus();
      const calls: string[] = [];

      const unsubscribe = eventBus.subscribe('kitchen.alert', (e) => {
        calls.push(e.aggregateId);
      });

      await eventBus.publish({ type: 'kitchen.alert', aggregateId: 'call_1', aggregateType: 'Kitchen', data: {} });
      unsubscribe();
      await eventBus.publish({ type: 'kitchen.alert', aggregateId: 'call_2', aggregateType: 'Kitchen', data: {} });

      expect(calls).toEqual(['call_1']);
    });

    it('isolates subscriber errors so other subscribers still receive events', async () => {
      const eventBus = new DomainEventBus();
      const successfulCalls: string[] = [];

      eventBus.subscribe('item.sold_out', async () => {
        throw new Error('Subscriber 1 threw a crash');
      });

      eventBus.subscribe('item.sold_out', async (e) => {
        successfulCalls.push(e.aggregateId);
      });

      await eventBus.publish({
        type: 'item.sold_out',
        aggregateId: 'item_krapao',
        aggregateType: 'Menu',
        data: { name: 'Krapao Pork' },
      });

      expect(successfulCalls).toEqual(['item_krapao']);
    });

    it('stores published events in outbox and allows replaying them', async () => {
      const eventBus = new DomainEventBus({ maxOutboxSize: 5 });

      for (let i = 1; i <= 3; i++) {
        await eventBus.publish({
          type: 'table.seated',
          aggregateId: `tbl_${i}`,
          aggregateType: 'Table',
          data: { tableNo: i },
        });
      }

      const outbox = eventBus.getOutbox();
      expect(outbox.length).toBe(3);
      expect(outbox[0].aggregateId).toBe('tbl_1');

      // Replay to a new subscriber
      const replayed: string[] = [];
      eventBus.subscribe('table.seated', (e) => {
        replayed.push(e.aggregateId);
      });

      const replayedCount = await eventBus.replayEvents();
      expect(replayedCount).toBe(3);
      expect(replayed).toEqual(['tbl_1', 'tbl_2', 'tbl_3']);
    });
  });

  // 3. Bulkhead Concurrency & Resource Isolation Pattern
  describe('3. Bulkhead Concurrency & Resource Isolation Pattern', () => {
    it('executes tasks immediately when below maxConcurrent', async () => {
      const bulkhead = new Bulkhead({ maxConcurrent: 3, maxQueue: 5 });

      const result = await bulkhead.execute(async () => 'fast_result');
      expect(result).toBe('fast_result');

      const stats = bulkhead.getStats();
      expect(stats.activeCalls).toBe(0);
      expect(stats.totalCompleted).toBe(1);
      expect(stats.totalRejected).toBe(0);
    });

    it('queues tasks when active calls reach maxConcurrent and drains correctly', async () => {
      const bulkhead = new Bulkhead({ maxConcurrent: 2, maxQueue: 4 });
      const runningTimes: number[] = [];

      const makeTask = (delayMs: number, id: number) => () =>
        bulkhead.execute(async () => {
          runningTimes.push(id);
          await new Promise((r) => setTimeout(r, delayMs));
          return id;
        });

      // Launch 4 tasks (2 active, 2 queued)
      const p1 = makeTask(30, 1)();
      const p2 = makeTask(30, 2)();
      const p3 = makeTask(10, 3)();
      const p4 = makeTask(10, 4)();

      const results = await Promise.all([p1, p2, p3, p4]);
      expect(results).toEqual([1, 2, 3, 4]);

      const stats = bulkhead.getStats();
      expect(stats.totalCompleted).toBe(4);
      expect(stats.totalRejected).toBe(0);
    });

    it('fast-rejects immediately with BulkheadRejectedError when queue capacity is exceeded', async () => {
      const bulkhead = new Bulkhead({ maxConcurrent: 1, maxQueue: 1 });

      // First task occupies active slot
      const t1 = bulkhead.execute(() => new Promise((r) => setTimeout(r, 50)));
      // Second task occupies queue
      const t2 = bulkhead.execute(() => new Promise((r) => setTimeout(r, 50)));

      // Third task exceeds maxQueue (1 active + 1 queued = capacity reached)
      await expect(bulkhead.execute(async () => 'overflow')).rejects.toThrow(BulkheadRejectedError);

      const stats = bulkhead.getStats();
      expect(stats.totalRejected).toBe(1);

      await Promise.all([t1, t2]);
    });

    it('times out tasks in queue if queueTimeoutMs is exceeded', async () => {
      const bulkhead = new Bulkhead({ maxConcurrent: 1, maxQueue: 5, queueTimeoutMs: 20 });

      // Block active slot with a 60ms task
      const blocker = bulkhead.execute(() => new Promise((r) => setTimeout(r, 60)));

      // Enqueued task will wait past 20ms and timeout
      const queuedTask = bulkhead.execute(async () => 'will_timeout');

      await expect(queuedTask).rejects.toThrow(BulkheadTimeoutError);
      expect(bulkhead.getStats().totalTimeouts).toBe(1);

      await blocker;
    });
  });

  // 4. Service Aggregator (API Gateway Pattern)
  describe('4. Service Aggregator (API Gateway Aggregation Pattern)', () => {
    it('aggregates multiple domain services concurrently', async () => {
      const result = await ServiceAggregator.aggregate({
        order: async () => ({ id: 'ord_99', total: 120 }),
        payment: async () => ({ status: 'PAID', method: 'PROMPTPAY' }),
        table: async () => ({ tableNo: 5, seats: 4 }),
      });

      expect(result.isComplete).toBe(true);
      expect(result.data.order).toEqual({ id: 'ord_99', total: 120 });
      expect(result.data.payment).toEqual({ status: 'PAID', method: 'PROMPTPAY' });
      expect(result.data.table).toEqual({ tableNo: 5, seats: 4 });
      expect(Object.keys(result.errors).length).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('resiliently handles partial service failures without crashing other service data', async () => {
      const result = await ServiceAggregator.aggregate({
        order: async () => ({ id: 'ord_77' }),
        promotions: async () => {
          throw new Error('Promotion engine unavailable');
        },
        inventory: async () => ({ stockStatus: 'IN_STOCK' }),
      });

      expect(result.isComplete).toBe(false);
      expect(result.data.order).toEqual({ id: 'ord_77' });
      expect(result.data.inventory).toEqual({ stockStatus: 'IN_STOCK' });
      expect(result.errors.promotions).toContain('Promotion engine unavailable');
    });

    it('handles downstream service timeouts gracefully', async () => {
      const result = await ServiceAggregator.aggregate(
        {
          fastService: async () => 'fast',
          slowService: async () => {
            await new Promise((r) => setTimeout(r, 60));
            return 'slow';
          },
        },
        { timeoutMs: 20 }
      );

      expect(result.isComplete).toBe(false);
      expect(result.data.fastService).toBe('fast');
      expect(result.errors.slowService).toContain('timed out after 20ms');
    });
  });

  // 5. End-to-End Restaurant Order Fulfillment Saga
  describe('5. End-to-End Restaurant Order Fulfillment Saga', () => {
    it('successfully processes full order fulfillment workflow', async () => {
      const saga = createOrderFulfillmentSaga();

      const context: OrderCreationContext = {
        orderId: 'ord_test_full',
        storeId: 'store_central',
        tableId: 'table_3',
        customerName: 'Khun Somchai',
        items: [
          { menuItemId: 'item_1', name: 'Pad Thai', quantity: 2, price: 60 },
          { menuItemId: 'item_2', name: 'Thai Tea', quantity: 2, price: 25 },
        ],
        totalAmount: 170,
        paymentMethod: 'PROMPTPAY',
      };

      const result = await saga.execute(context);

      expect(result.status).toBe('COMPLETED');
      expect(result.completedSteps).toEqual([
        'create_order',
        'reserve_inventory',
        'process_payment',
        'notify_kitchen',
      ]);
      expect(result.compensatedSteps).toEqual([]);
      expect(result.context.status).toBe('PAID');
      expect(result.context.inventoryReserved).toBe(true);
      expect(result.context.paymentProcessed).toBe(true);
      expect(result.context.kitchenNotified).toBe(true);
    });

    it('triggers compensating actions (releasing inventory, cancelling order) when payment fails', async () => {
      const saga = createOrderFulfillmentSaga({
        onPaymentProcessed: () => {
          throw new Error('PromptPay QR code expired');
        },
      });

      const context: OrderCreationContext = {
        orderId: 'ord_test_fail_pay',
        storeId: 'store_central',
        tableId: 'table_1',
        items: [{ menuItemId: 'item_1', name: 'Krapao Rice', quantity: 1, price: 50 }],
        totalAmount: 50,
        paymentMethod: 'PROMPTPAY',
      };

      const result = await saga.execute(context);

      expect(result.status).toBe('COMPENSATED');
      expect(result.error).toContain('PromptPay QR code expired');
      expect(result.completedSteps).toEqual(['create_order', 'reserve_inventory']);
      // Must compensate reserve_inventory then create_order
      expect(result.compensatedSteps).toEqual(['reserve_inventory', 'create_order']);
      expect(result.context.inventoryReserved).toBe(false);
      expect(result.context.status).toBe('CANCELLED');
    });
  });
});
