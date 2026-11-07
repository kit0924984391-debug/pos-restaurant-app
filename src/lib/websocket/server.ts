/**
 * WebSocket Server Manager
 * Manages WebSocket connections, rooms, authentication, message broadcasting, and horizontal scaling.
 */

import {
  WebSocketMessage,
  createWebSocketMessage,
  createAckMessage,
  parseWebSocketMessage,
  WebSocketRooms,
} from './protocol';

export interface WebSocketClientConnection {
  id: string;
  userId?: string;
  rooms: Set<string>;
  send: (msg: string | WebSocketMessage) => void;
  close: (code?: number, reason?: string) => void;
  lastPing?: number;
  authenticated?: boolean;
}

export interface WebSocketServerStats {
  activeConnections: number;
  rooms: string[];
  totalRooms: number;
  users: number;
  totalMessagesProcessed: number;
  uptimeSeconds: number;
}

export interface WebSocketHealthStatus {
  status: 'healthy' | 'degraded';
  uptime: number;
  activeConnections: number;
  roomsCount: number;
  timestamp: number;
}

export class WebSocketServerManager {
  private connections = new Map<string, WebSocketClientConnection>();
  private users = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private rooms = new Map<string, Set<string>>(); // roomId -> Set of socketIds
  private totalMessagesProcessed = 0;
  private startTime = Date.now();
  private tokenVerifier?: (token: string) => Promise<{ id: string; [key: string]: any } | null>;

  constructor(options?: {
    tokenVerifier?: (token: string) => Promise<{ id: string; [key: string]: any } | null>;
  }) {
    this.tokenVerifier = options?.tokenVerifier;
  }

  /**
   * Set custom token verifier for authentication
   */
  setTokenVerifier(verifier: (token: string) => Promise<{ id: string; [key: string]: any } | null>) {
    this.tokenVerifier = verifier;
  }

  /**
   * Register a new client connection
   */
  registerClient(conn: WebSocketClientConnection) {
    this.connections.set(conn.id, conn);
    if (conn.userId) {
      this.bindUser(conn.userId, conn.id);
    }
  }

  /**
   * Unregister and clean up client connection
   */
  unregisterClient(connId: string) {
    const conn = this.connections.get(connId);
    if (!conn) return;

    // Leave all joined rooms
    Array.from(conn.rooms).forEach((roomId) => {
      this.leaveRoom(connId, roomId);
    });

    // Remove from user index
    if (conn.userId) {
      const userSockets = this.users.get(conn.userId);
      if (userSockets) {
        userSockets.delete(connId);
        if (userSockets.size === 0) {
          this.users.delete(conn.userId);
        }
      }
    }

    this.connections.delete(connId);
  }

  /**
   * Bind a connection to a user ID
   */
  bindUser(userId: string, connId: string) {
    const conn = this.connections.get(connId);
    if (conn) {
      conn.userId = userId;
    }
    let sockets = this.users.get(userId);
    if (!sockets) {
      sockets = new Set<string>();
      this.users.set(userId, sockets);
    }
    sockets.add(connId);
  }

  /**
   * Authenticate a connection using token
   */
  async authenticate(connId: string, token: string): Promise<boolean> {
    const conn = this.connections.get(connId);
    if (!conn) return false;

    if (!this.tokenVerifier) {
      // Default: accept token if non-empty
      if (token && token.trim().length > 0) {
        conn.authenticated = true;
        return true;
      }
      return false;
    }

    try {
      const user = await this.tokenVerifier(token);
      if (user && user.id) {
        conn.authenticated = true;
        this.bindUser(user.id, connId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Join a specific room
   */
  joinRoom(connId: string, roomId: string): boolean {
    const conn = this.connections.get(connId);
    if (!conn) return false;

    conn.rooms.add(roomId);

    let roomSockets = this.rooms.get(roomId);
    if (!roomSockets) {
      roomSockets = new Set<string>();
      this.rooms.set(roomId, roomSockets);
    }
    roomSockets.add(connId);

    // Notify room of user arrival if user is identified
    if (conn.userId) {
      this.notifyRoom(
        roomId,
        'user-joined',
        { userId: conn.userId, timestamp: Date.now() },
        connId
      );
    }

    return true;
  }

  /**
   * Leave a room
   */
  leaveRoom(connId: string, roomId: string): boolean {
    const conn = this.connections.get(connId);
    if (conn) {
      conn.rooms.delete(roomId);
    }

    const roomSockets = this.rooms.get(roomId);
    if (roomSockets) {
      roomSockets.delete(connId);
      if (roomSockets.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    if (conn?.userId) {
      this.notifyRoom(
        roomId,
        'user-left',
        { userId: conn.userId, timestamp: Date.now() },
        connId
      );
    }

    return true;
  }

  /**
   * Handle incoming message from a client
   */
  async handleMessage(
    connId: string,
    rawMessage: string | ArrayBuffer | WebSocketMessage
  ): Promise<WebSocketMessage | null> {
    this.totalMessagesProcessed++;
    const conn = this.connections.get(connId);
    if (!conn) return null;

    const message =
      typeof rawMessage === 'object' && 'type' in rawMessage
        ? (rawMessage as WebSocketMessage)
        : parseWebSocketMessage(rawMessage);

    if (!message) {
      const err = createWebSocketMessage('error', { error: 'Invalid message payload' });
      conn.send(err);
      return err;
    }

    switch (message.type) {
      case 'ping': {
        const pong = createWebSocketMessage('pong', { id: message.id });
        conn.send(pong);
        return pong;
      }

      case 'join-room': {
        if (message.roomId) {
          this.joinRoom(connId, message.roomId);
          if (message.ack) {
            const ack = createAckMessage(message.id, true);
            conn.send(ack);
            return ack;
          }
        }
        break;
      }

      case 'leave-room': {
        if (message.roomId) {
          this.leaveRoom(connId, message.roomId);
          if (message.ack) {
            const ack = createAckMessage(message.id, true);
            conn.send(ack);
            return ack;
          }
        }
        break;
      }

      case 'direct-message': {
        if (message.targetUserId) {
          this.sendDirectMessage(message.targetUserId, {
            ...message,
            senderUserId: conn.userId,
          });
          if (message.ack) {
            const ack = createAckMessage(message.id, true);
            conn.send(ack);
            return ack;
          }
        }
        break;
      }

      case 'message':
      case 'broadcast': {
        if (message.roomId) {
          this.notifyRoom(message.roomId, message.type, message.content, connId);
        } else {
          this.broadcast(message, connId);
        }
        if (message.ack) {
          const ack = createAckMessage(message.id, true);
          conn.send(ack);
          return ack;
        }
        break;
      }

      default:
        break;
    }

    return message;
  }

  /**
   * Notify all clients in a specific room
   */
  notifyRoom(roomId: string, event: string, data: any, excludeConnId?: string) {
    const roomSockets = this.rooms.get(roomId);
    if (!roomSockets) return;

    const envelope = createWebSocketMessage(event as any, {
      roomId,
      content: data,
    });
    const serialized = JSON.stringify(envelope);

    Array.from(roomSockets).forEach((socketId) => {
      if (excludeConnId && socketId === excludeConnId) return;
      const conn = this.connections.get(socketId);
      if (conn) {
        try {
          conn.send(serialized);
        } catch {
          this.unregisterClient(socketId);
        }
      }
    });
  }

  /**
   * Send a direct message to all active sockets of a user
   */
  sendDirectMessage(userId: string, message: any): boolean {
    const socketIds = this.users.get(userId);
    if (!socketIds || socketIds.size === 0) return false;

    const envelope = createWebSocketMessage('direct-message', {
      targetUserId: userId,
      content: message,
    });
    const serialized = JSON.stringify(envelope);

    let delivered = false;
    Array.from(socketIds).forEach((socketId) => {
      const conn = this.connections.get(socketId);
      if (conn) {
        try {
          conn.send(serialized);
          delivered = true;
        } catch {
          this.unregisterClient(socketId);
        }
      }
    });
    return delivered;
  }

  /**
   * Broadcast an update targeted to a user
   */
  broadcastUserUpdate(userId: string, data: any) {
    this.notifyRoom(WebSocketRooms.user(userId), 'presence', data);
    this.sendDirectMessage(userId, data);
  }

  /**
   * Global broadcast to all connected clients
   */
  broadcast(message: WebSocketMessage, excludeConnId?: string) {
    const serialized = JSON.stringify(message);
    this.connections.forEach((conn, id) => {
      if (excludeConnId && id === excludeConnId) return;
      try {
        conn.send(serialized);
      } catch {
        this.unregisterClient(id);
      }
    });
  }

  /**
   * Operational stats monitoring endpoint data
   */
  getStats(): WebSocketServerStats {
    return {
      activeConnections: this.connections.size,
      rooms: Array.from(this.rooms.keys()),
      totalRooms: this.rooms.size,
      users: this.users.size,
      totalMessagesProcessed: this.totalMessagesProcessed,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Operational health status endpoint data
   */
  getHealth(): WebSocketHealthStatus {
    return {
      status: 'healthy',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      activeConnections: this.connections.size,
      roomsCount: this.rooms.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset / clear manager state (useful in tests)
   */
  reset() {
    this.connections.clear();
    this.users.clear();
    this.rooms.clear();
    this.totalMessagesProcessed = 0;
    this.startTime = Date.now();
  }
}

// Global Singleton instance for process-level reuse
const globalForWebSocket = globalThis as unknown as {
  posWebSocketManager: WebSocketServerManager | undefined;
};

export const defaultWebSocketManager =
  globalForWebSocket.posWebSocketManager ?? new WebSocketServerManager();

if (process.env.NODE_ENV !== 'production') {
  globalForWebSocket.posWebSocketManager = defaultWebSocketManager;
}

export function getWebSocketManager(): WebSocketServerManager {
  return defaultWebSocketManager;
}
