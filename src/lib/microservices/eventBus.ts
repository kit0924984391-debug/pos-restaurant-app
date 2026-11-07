import { DomainEvent, EventHandler } from './types';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/errors/apiError';

export class DomainEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private outbox: DomainEvent[] = [];
  private maxOutboxSize: number;

  constructor(options: { maxOutboxSize?: number } = {}) {
    this.maxOutboxSize = options.maxOutboxSize || 1000;
  }

  /**
   * Subscribes an event handler to a specific event type or wildcard ('*' or 'order.*')
   * Returns an unsubscribe function.
   */
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const set = this.handlers.get(eventType)!;
    set.add(handler as EventHandler);

    return () => {
      set.delete(handler as EventHandler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * Helper to check if a subscriber pattern matches the published event type
   */
  private matchesTopic(pattern: string, eventType: string): boolean {
    if (pattern === '*' || pattern === eventType) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix + '.');
    }
    return false;
  }

  /**
   * Publishes a single domain event to all matching subscribers asynchronously
   */
  async publish<T = any>(eventInput: Omit<DomainEvent<T>, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      id: eventInput.id || generateRequestId(),
      timestamp: eventInput.timestamp || Date.now(),
      correlationId: eventInput.correlationId || generateRequestId(),
      ...eventInput,
    };

    // Store in outbox for audit / replay
    this.outbox.push(event);
    if (this.outbox.length > this.maxOutboxSize) {
      this.outbox.shift();
    }

    logger.debug(`[EventBus] Publishing ${event.type}`, {
      eventId: event.id,
      eventType: event.type,
      correlationId: event.correlationId,
      aggregateId: event.aggregateId,
    });

    // Find all matching handler sets
    const matchedHandlers: EventHandler[] = [];
    this.handlers.forEach((handlers, pattern) => {
      if (this.matchesTopic(pattern, event.type)) {
        handlers.forEach((h) => matchedHandlers.push(h));
      }
    });

    if (matchedHandlers.length === 0) {
      return event;
    }

    // Execute handlers with failure isolation (one failing subscriber does not break others)
    const promises = matchedHandlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (err: any) {
        logger.error(`[EventBus] Handler error for event ${event.type}`, err, {
          eventId: event.id,
          eventType: event.type,
          correlationId: event.correlationId,
        });
      }
    });

    await Promise.allSettled(promises);
    return event;
  }

  /**
   * Publishes multiple events in sequence
   */
  async publishMany(events: Array<Omit<DomainEvent, 'id' | 'timestamp'>>): Promise<DomainEvent[]> {
    const published: DomainEvent[] = [];
    for (const evt of events) {
      published.push(await this.publish(evt));
    }
    return published;
  }

  /**
   * Retrieves outbox history (useful for audit or replay)
   */
  getOutbox(): readonly DomainEvent[] {
    return [...this.outbox];
  }

  /**
   * Clears the outbox history
   */
  clearOutbox(): void {
    this.outbox = [];
  }

  /**
   * Clears all registered handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Replays events from the outbox to matching subscribers
   */
  async replayEvents(filter?: (event: DomainEvent) => boolean): Promise<number> {
    const eventsToReplay = filter ? this.outbox.filter(filter) : [...this.outbox];
    for (const evt of eventsToReplay) {
      const entries = Array.from(this.handlers.entries());
      for (const [pattern, handlers] of entries) {
        if (this.matchesTopic(pattern, evt.type)) {
          const handlerList = Array.from(handlers);
          for (const handler of handlerList) {
            try {
              await handler(evt);
            } catch (err) {
              logger.error(`[EventBus:Replay] Error replaying ${evt.type}`, err);
            }
          }
        }
      }
    }
    return eventsToReplay.length;
  }
}

export const defaultDomainEventBus = new DomainEventBus();
