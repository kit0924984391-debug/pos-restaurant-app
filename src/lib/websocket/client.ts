/**
 * Resilient WebSocket Client
 * Features:
 * - Exponential backoff reconnection with jitter
 * - Offline message queue with auto-flush on connect
 * - Room-based subscriptions with automatic re-join upon reconnect
 * - Delivery acknowledgment (ACK) promise resolution
 * - Heartbeat ping-pong watchdog
 */

import {
  WebSocketMessage,
  createWebSocketMessage,
  parseWebSocketMessage,
  ClientAckResponse,
} from './protocol';

export type WebSocketConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export interface WebSocketClientOptions {
  auth?: {
    token?: string;
    userId?: string;
  };
  reconnection?: boolean;
  reconnectionDelay?: number;
  maxReconnectionDelay?: number;
  reconnectionAttempts?: number;
  pingInterval?: number;
  autoConnect?: boolean;
}

export type MessageHandler<T = any> = (message: WebSocketMessage<T>) => void;
export type StatusHandler = (status: WebSocketConnectionStatus) => void;

export class WebSocketClient {
  private url: string;
  private socket: WebSocket | null = null;
  private options: Required<WebSocketClientOptions>;
  private status: WebSocketConnectionStatus = 'idle';
  private retryAttempt = 0;
  private reconnectTimeout: any = null;
  private pingIntervalTimer: any = null;
  private messageQueue: WebSocketMessage[] = [];
  private activeRooms = new Set<string>();
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private statusHandlers = new Set<StatusHandler>();
  private pendingAcks = new Map<
    string,
    {
      resolve: (value: boolean) => void;
      reject: (reason?: any) => void;
      timer: any;
    }
  >();

  constructor(url: string, options: WebSocketClientOptions = {}) {
    this.url = url;
    this.options = {
      auth: options.auth || {},
      reconnection: options.reconnection ?? true,
      reconnectionDelay: options.reconnectionDelay ?? 1000,
      maxReconnectionDelay: options.maxReconnectionDelay ?? 15000,
      reconnectionAttempts: options.reconnectionAttempts ?? 10,
      pingInterval: options.pingInterval ?? 20000,
      autoConnect: options.autoConnect ?? false,
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (typeof window === 'undefined' && typeof WebSocket === 'undefined') {
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.setStatus(this.retryAttempt > 0 ? 'reconnecting' : 'connecting');

    try {
      // Build URL with optional auth token query parameter
      const wsUrl = new URL(this.url, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
      if (this.options.auth.token) {
        wsUrl.searchParams.set('token', this.options.auth.token);
      }
      if (this.options.auth.userId) {
        wsUrl.searchParams.set('userId', this.options.auth.userId);
      }

      this.socket = new WebSocket(wsUrl.toString());
      this.setupSocketEvents();
    } catch (err) {
      console.error('[WebSocketClient] Connection instantiation error:', err);
      this.scheduleReconnect();
    }
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.setStatus('connected');
      this.retryAttempt = 0;

      // Start ping heartbeat
      this.startHeartbeat();

      // Automatically re-join all active rooms
      this.activeRooms.forEach((roomId) => {
        this.emitInternal('join-room', { roomId });
      });

      // Flush offline queued messages
      this.flushQueue();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      const parsed = parseWebSocketMessage(event.data);
      if (!parsed) return;

      // Handle ACK response
      if (parsed.type === 'ack' && parsed.content?.messageId) {
        const ackData = parsed.content as ClientAckResponse;
        const pending = this.pendingAcks.get(ackData.messageId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingAcks.delete(ackData.messageId);
          pending.resolve(ackData.success);
        }
      }

      // Dispatch to type-specific and wildcard listeners
      this.dispatchMessage(parsed.type, parsed);
      this.dispatchMessage('*', parsed);
    };

    this.socket.onerror = (err) => {
      console.warn('[WebSocketClient] Socket error:', err);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      if (this.status !== 'disconnected') {
        this.setStatus('disconnected');
        if (this.options.reconnection) {
          this.scheduleReconnect();
        }
      }
    };
  }

  /**
   * Schedule reconnection with exponential backoff & jitter
   */
  private scheduleReconnect(): void {
    if (this.retryAttempt >= this.options.reconnectionAttempts) {
      console.warn('[WebSocketClient] Max reconnection attempts reached.');
      this.setStatus('disconnected');
      return;
    }

    clearTimeout(this.reconnectTimeout);
    const delay = this.calculateBackoff(this.retryAttempt);
    this.retryAttempt++;
    this.setStatus('reconnecting');

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Calculate exponential backoff with ±20% jitter
   */
  calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.options.reconnectionDelay * Math.pow(1.5, attempt),
      this.options.maxReconnectionDelay
    );
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }

  /**
   * Join a room and remember it for reconnection resilience
   */
  joinRoom(roomId: string, ack: boolean = false): Promise<boolean> {
    this.activeRooms.add(roomId);
    return this.send(roomId, undefined, { type: 'join-room', ack });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, ack: boolean = false): Promise<boolean> {
    this.activeRooms.delete(roomId);
    return this.send(roomId, undefined, { type: 'leave-room', ack });
  }

  /**
   * Send a message to a room or direct recipient
   */
  send(
    roomId?: string,
    content?: any,
    options: {
      type?: WebSocketMessage['type'];
      targetUserId?: string;
      ack?: boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<boolean> {
    const type = options.type || 'message';
    const msg = createWebSocketMessage(type, {
      roomId,
      targetUserId: options.targetUserId,
      userId: this.options.auth.userId,
      content,
      ack: options.ack,
    });

    return new Promise((resolve, reject) => {
      if (options.ack) {
        const timeoutMs = options.timeoutMs || 5000;
        const timer = setTimeout(() => {
          this.pendingAcks.delete(msg.id);
          resolve(false); // timed out without ACK
        }, timeoutMs);

        this.pendingAcks.set(msg.id, { resolve, reject, timer });
      }

      if (this.isConnected()) {
        try {
          this.socket!.send(JSON.stringify(msg));
          if (!options.ack) resolve(true);
        } catch {
          this.messageQueue.push(msg);
          if (!options.ack) resolve(false);
        }
      } else {
        // Enqueue offline message
        this.messageQueue.push(msg);
        if (!options.ack) resolve(false);
      }
    });
  }

  private emitInternal(type: WebSocketMessage['type'], payload: Partial<WebSocketMessage>): void {
    const msg = createWebSocketMessage(type, payload);
    if (this.isConnected()) {
      try {
        this.socket!.send(JSON.stringify(msg));
      } catch {}
    }
  }

  /**
   * Flush queued messages that were recorded while offline
   */
  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const msg = this.messageQueue.shift();
      if (msg) {
        try {
          this.socket!.send(JSON.stringify(msg));
        } catch {
          this.messageQueue.unshift(msg);
          break;
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalTimer = setInterval(() => {
      if (this.isConnected()) {
        this.emitInternal('ping', {});
      }
    }, this.options.pingInterval);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  /**
   * Register event listener for message types
   */
  on<T = any>(type: string, handler: MessageHandler<T>): () => void {
    let handlers = this.messageHandlers.get(type);
    if (!handlers) {
      handlers = new Set<MessageHandler>();
      this.messageHandlers.set(type, handlers);
    }
    handlers.add(handler as MessageHandler);

    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Unregister event listener
   */
  off<T = any>(type: string, handler: MessageHandler<T>): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler as MessageHandler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private dispatchMessage(type: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (err) {
          console.error('[WebSocketClient] Error in message handler:', err);
        }
      });
    }
  }

  private setStatus(newStatus: WebSocketConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.statusHandlers.forEach((handler) => {
      try {
        handler(newStatus);
      } catch (err) {
        console.error('[WebSocketClient] Error in status handler:', err);
      }
    });
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.readyState === WebSocket.OPEN);
  }

  getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  getActiveRooms(): string[] {
    return Array.from(this.activeRooms);
  }

  /**
   * Disconnect and clear state
   */
  disconnect(): void {
    this.options.reconnection = false;
    clearTimeout(this.reconnectTimeout);
    this.stopHeartbeat();

    // Reject all pending ACKs
    this.pendingAcks.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.resolve(false);
    });
    this.pendingAcks.clear();

    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    this.setStatus('disconnected');
  }
}
