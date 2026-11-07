/**
 * WebSocket Broadcaster Adapter
 * Bridges POS business events from eventBus into WebSocket rooms and connections.
 */

import { IRealtimeBroadcaster, EventPayload } from '@/lib/events';
import { getWebSocketManager, type WebSocketServerManager } from './server';
import { WebSocketRooms, createWebSocketMessage } from './protocol';

export class WebSocketBroadcaster implements IRealtimeBroadcaster {
  private manager?: WebSocketServerManager;

  constructor(manager?: WebSocketServerManager) {
    this.manager = manager;
  }

  broadcast(payload: EventPayload): void {
    const manager = this.manager || getWebSocketManager();

    // 1. If scoped to a store, broadcast to store room and kitchen room
    if (payload.storeId) {
      const storeRoom = WebSocketRooms.store(payload.storeId);
      manager.notifyRoom(storeRoom, 'pos-event', payload);

      // Kitchen-relevant events also notify the dedicated kitchen room
      if (
        payload.type === 'ORDER_CREATED' ||
        payload.type === 'ORDER_UPDATED' ||
        payload.type === 'SERVICE_CALLED'
      ) {
        const kitchenRoom = WebSocketRooms.kitchen(payload.storeId);
        manager.notifyRoom(kitchenRoom, 'pos-event', payload);
      }

      // If payload refers to a specific table, notify that table's room
      const tableId = payload.data?.tableId || payload.data?.id;
      if (tableId && payload.type === 'TABLE_UPDATED') {
        const tableRoom = WebSocketRooms.table(tableId);
        manager.notifyRoom(tableRoom, 'pos-event', payload);
      }
    } else {
      // Global broadcast for unrouted events
      const envelope = createWebSocketMessage('broadcast', {
        content: payload,
      });
      manager.broadcast(envelope);
    }
  }
}

export const defaultWebSocketBroadcaster = new WebSocketBroadcaster();
