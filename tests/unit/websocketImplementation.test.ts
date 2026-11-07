import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWebSocketMessage,
  createAckMessage,
  parseWebSocketMessage,
  WebSocketRooms,
} from '@/lib/websocket/protocol';
import {
  WebSocketServerManager,
  WebSocketClientConnection,
} from '@/lib/websocket/server';
import { WebSocketClient } from '@/lib/websocket/client';
import { WebSocketBroadcaster } from '@/lib/websocket/broadcaster';
import { GET as getStatsRoute } from '@/app/api/ws/stats/route';
import { GET as getHealthRoute } from '@/app/api/ws/health/route';
import { GET as getWsRoute } from '@/app/api/ws/route';
import { EventPayload } from '@/lib/events';

describe('WebSocket Implementation Suite', () => {
  let serverManager: WebSocketServerManager;

  beforeEach(() => {
    serverManager = new WebSocketServerManager();
  });

  // 1. Message Protocol & Envelope
  describe('1. Message Protocol & Envelope Validation', () => {
    it('creates standard message envelope with id, timestamp and metadata', () => {
      const msg = createWebSocketMessage('message', {
        roomId: 'store:demo',
        userId: 'user_1',
        content: { text: 'Hello POS' },
        ack: true,
      });

      expect(msg.id).toBeDefined();
      expect(msg.type).toBe('message');
      expect(msg.roomId).toBe('store:demo');
      expect(msg.userId).toBe('user_1');
      expect(msg.content).toEqual({ text: 'Hello POS' });
      expect(msg.ack).toBe(true);
      expect(typeof msg.timestamp).toBe('number');
    });

    it('creates RFC-compliant ACK responses linked to original message ID', () => {
      const ack = createAckMessage('msg_999', true);
      expect(ack.type).toBe('ack');
      expect((ack.content as any).messageId).toBe('msg_999');
      expect((ack.content as any).success).toBe(true);
      expect(ack.timestamp).toBeDefined();
    });

    it('parses valid JSON strings and safely rejects corrupt payloads', () => {
      const valid = JSON.stringify({ type: 'ping', id: '123' });
      const parsed = parseWebSocketMessage(valid);
      expect(parsed?.type).toBe('ping');
      expect(parsed?.id).toBe('123');

      expect(parseWebSocketMessage('corrupted_not_json')).toBeNull();
      expect(parseWebSocketMessage(JSON.stringify({ notype: true }))).toBeNull();
    });

    it('generates consistent, collision-free room names', () => {
      expect(WebSocketRooms.store('lung-pa')).toBe('store:lung-pa');
      expect(WebSocketRooms.kitchen('lung-pa')).toBe('kitchen:lung-pa');
      expect(WebSocketRooms.table('tbl_5')).toBe('table:tbl_5');
      expect(WebSocketRooms.user('usr_admin')).toBe('user:usr_admin');
    });
  });

  // 2. Server Connection & User Indexing
  describe('2. Connection Management & User Indexing', () => {
    it('registers client and indexes user sockets accurately', () => {
      const sentMessages: string[] = [];
      const conn: WebSocketClientConnection = {
        id: 'conn_1',
        userId: 'u_101',
        rooms: new Set(),
        send: (msg) => sentMessages.push(typeof msg === 'string' ? msg : JSON.stringify(msg)),
        close: vi.fn(),
      };

      serverManager.registerClient(conn);
      const stats = serverManager.getStats();
      expect(stats.activeConnections).toBe(1);
      expect(stats.users).toBe(1);

      // Direct message delivery
      const delivered = serverManager.sendDirectMessage('u_101', { alert: 'Order ready' });
      expect(delivered).toBe(true);
      expect(sentMessages.length).toBe(1);
      const received = JSON.parse(sentMessages[0]);
      expect(received.type).toBe('direct-message');
      expect(received.content.alert).toBe('Order ready');
    });

    it('cleans up client and user indexes upon unregister', () => {
      const conn: WebSocketClientConnection = {
        id: 'conn_2',
        userId: 'u_202',
        rooms: new Set(),
        send: vi.fn(),
        close: vi.fn(),
      };

      serverManager.registerClient(conn);
      expect(serverManager.getStats().activeConnections).toBe(1);

      serverManager.unregisterClient('conn_2');
      expect(serverManager.getStats().activeConnections).toBe(0);
      expect(serverManager.getStats().users).toBe(0);
      expect(serverManager.sendDirectMessage('u_202', 'test')).toBe(false);
    });

    it('supports custom token verification for authentication', async () => {
      serverManager.setTokenVerifier(async (token) => {
        if (token === 'valid_secret') return { id: 'user_auth' };
        return null;
      });

      const conn: WebSocketClientConnection = {
        id: 'conn_auth',
        rooms: new Set(),
        send: vi.fn(),
        close: vi.fn(),
      };
      serverManager.registerClient(conn);

      const fail = await serverManager.authenticate('conn_auth', 'wrong_token');
      expect(fail).toBe(false);
      expect(conn.authenticated).toBeFalsy();

      const success = await serverManager.authenticate('conn_auth', 'valid_secret');
      expect(success).toBe(true);
      expect(conn.authenticated).toBe(true);
      expect(conn.userId).toBe('user_auth');
    });
  });

  // 3. Room-based Messaging & Targeted Broadcasting
  describe('3. Room-based Subscriptions & Targeted Broadcasting', () => {
    it('manages room join/leave and isolates room notifications', () => {
      const client1Messages: string[] = [];
      const client2Messages: string[] = [];

      const conn1: WebSocketClientConnection = {
        id: 'c1',
        rooms: new Set(),
        send: (m) => client1Messages.push(typeof m === 'string' ? m : JSON.stringify(m)),
        close: vi.fn(),
      };
      const conn2: WebSocketClientConnection = {
        id: 'c2',
        rooms: new Set(),
        send: (m) => client2Messages.push(typeof m === 'string' ? m : JSON.stringify(m)),
        close: vi.fn(),
      };

      serverManager.registerClient(conn1);
      serverManager.registerClient(conn2);

      serverManager.joinRoom('c1', 'room:kitchen');
      // conn2 does NOT join room:kitchen

      serverManager.notifyRoom('room:kitchen', 'pos-event', { orderId: 'ord_1' });

      expect(client1Messages.length).toBe(1);
      expect(client2Messages.length).toBe(0);

      const parsed = JSON.parse(client1Messages[0]);
      expect(parsed.type).toBe('pos-event');
      expect(parsed.content.orderId).toBe('ord_1');

      // Leave room
      serverManager.leaveRoom('c1', 'room:kitchen');
      serverManager.notifyRoom('room:kitchen', 'pos-event', { orderId: 'ord_2' });
      expect(client1Messages.length).toBe(1); // no new message
    });

    it('excludes sender connection when excludeConnId is provided', () => {
      const msgsA: string[] = [];
      const msgsB: string[] = [];

      serverManager.registerClient({
        id: 'cA',
        rooms: new Set(),
        send: (m) => msgsA.push(String(m)),
        close: vi.fn(),
      });
      serverManager.registerClient({
        id: 'cB',
        rooms: new Set(),
        send: (m) => msgsB.push(String(m)),
        close: vi.fn(),
      });

      serverManager.joinRoom('cA', 'room:chat');
      serverManager.joinRoom('cB', 'room:chat');

      serverManager.notifyRoom('room:chat', 'message', { text: 'from A' }, 'cA');

      expect(msgsA.length).toBe(0); // Excluded sender
      expect(msgsB.length).toBe(1); // Received
    });
  });

  // 4. Ping/Pong Heartbeat & Delivery ACK
  describe('4. Heartbeat and Delivery Acknowledgment', () => {
    it('replies to ping with pong matching the ping id', async () => {
      const responses: any[] = [];
      const conn: WebSocketClientConnection = {
        id: 'c_ping',
        rooms: new Set(),
        send: (m) => responses.push(m),
        close: vi.fn(),
      };
      serverManager.registerClient(conn);

      const pingMsg = createWebSocketMessage('ping', { id: 'ping_test_1' });
      const reply = await serverManager.handleMessage('c_ping', pingMsg);

      expect(reply?.type).toBe('pong');
      expect(responses.length).toBe(1);
      expect(responses[0].type).toBe('pong');
      expect(responses[0].id).toBe('ping_test_1');
    });

    it('returns delivery ACK when client requests acknowledgment', async () => {
      const responses: any[] = [];
      const conn: WebSocketClientConnection = {
        id: 'c_ack',
        rooms: new Set(),
        send: (m) => responses.push(m),
        close: vi.fn(),
      };
      serverManager.registerClient(conn);

      const joinMsg = createWebSocketMessage('join-room', {
        roomId: 'store:test',
        id: 'msg_req_ack',
        ack: true,
      });

      const ackResult = await serverManager.handleMessage('c_ack', joinMsg);
      expect(ackResult?.type).toBe('ack');
      expect(ackResult?.content.messageId).toBe('msg_req_ack');
      expect(ackResult?.content.success).toBe(true);
    });
  });

  // 5. Resilient WebSocketClient (Offline Queue & Backoff)
  describe('5. Resilient Client: Backoff & Offline Queue', () => {
    it('calculates exponential backoff within configured minimum and maximum limits', () => {
      const client = new WebSocketClient('ws://localhost:3000/api/ws', {
        reconnectionDelay: 1000,
        maxReconnectionDelay: 10000,
      });

      const delay0 = client.calculateBackoff(0);
      const delay1 = client.calculateBackoff(1);
      const delay5 = client.calculateBackoff(5);

      // Backoff increases with attempts
      expect(delay0).toBeGreaterThanOrEqual(800);
      expect(delay0).toBeLessThanOrEqual(1200);

      expect(delay1).toBeGreaterThanOrEqual(1200);
      expect(delay1).toBeLessThanOrEqual(1800);

      expect(delay5).toBeLessThanOrEqual(11000); // respects max bound
    });

    it('enqueues messages when offline and tracks queue length', async () => {
      const client = new WebSocketClient('ws://localhost:3000/api/ws', {
        autoConnect: false,
      });

      expect(client.isConnected()).toBe(false);
      expect(client.getQueuedMessageCount()).toBe(0);

      // Send messages while offline
      await client.send('store:demo', { item: 'Fried Rice' });
      await client.send('store:demo', { item: 'Pad Thai' });

      expect(client.getQueuedMessageCount()).toBe(2);
    });

    it('records active rooms and supports listener registration', () => {
      const client = new WebSocketClient('ws://localhost:3000/api/ws', {
        autoConnect: false,
      });

      client.joinRoom('store:main');
      client.joinRoom('kitchen:main');

      expect(client.getActiveRooms()).toEqual(['store:main', 'kitchen:main']);

      const listener = vi.fn();
      const unsubscribe = client.on('pos-event', listener);
      expect(typeof unsubscribe).toBe('function');

      client.leaveRoom('store:main');
      expect(client.getActiveRooms()).toEqual(['kitchen:main']);

      client.disconnect();
      expect(client.getStatus()).toBe('disconnected');
    });
  });

  // 6. WebSocketBroadcaster POS EventBus Integration
  describe('6. Broadcaster Bridge & POS EventBus Integration', () => {
    it('WebSocketBroadcaster routes store and kitchen events to appropriate rooms', () => {
      const notifySpy = vi.spyOn(serverManager, 'notifyRoom');
      const broadcaster = new WebSocketBroadcaster(serverManager);

      const payload: EventPayload = {
        type: 'ORDER_CREATED',
        data: { id: 'ord_555', tableNo: 3, total: 320 },
        storeId: 'store_bkk',
        timestamp: Date.now(),
      };

      broadcaster.broadcast(payload);

      // Should notify both store room and kitchen room for ORDER_CREATED
      const calls = vi.mocked(serverManager.notifyRoom).mock.calls;
      const roomNames = calls.map((c) => c[0]);
      expect(roomNames).toContain('store:store_bkk');
      expect(roomNames).toContain('kitchen:store_bkk');
    });
  });

  // 7. Operational Health and Monitoring Endpoints
  describe('7. Monitoring & Operational Health Endpoints', () => {
    it('GET /api/ws/stats returns JSON metrics for active connections and rooms', async () => {
      const res = await getStatsRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.activeConnections).toBe('number');
      expect(Array.isArray(data.rooms)).toBe(true);
      expect(typeof data.uptimeSeconds).toBe('number');
    });

    it('GET /api/ws/health returns healthy operational status and memory metrics', async () => {
      const res = await getHealthRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.timestamp).toBe('number');
    });

    it('GET /api/ws returns protocol metadata and available routes on standard HTTP request', async () => {
      const req = new Request('http://localhost:3000/api/ws');
      const res = await getWsRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('online');
      expect(data.protocol).toBe('RFC-6455');
      expect(data.endpoints.stats).toBe('/api/ws/stats');
      expect(data.endpoints.health).toBe('/api/ws/health');
    });
  });
});
