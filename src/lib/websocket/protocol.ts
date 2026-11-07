/**
 * WebSocket Protocol Specification
 * Defines standard message envelope, room conventions, and validation.
 */

export type WebSocketMessageType =
  | 'join-room'
  | 'leave-room'
  | 'message'
  | 'broadcast'
  | 'direct-message'
  | 'user-joined'
  | 'user-left'
  | 'presence'
  | 'typing'
  | 'ping'
  | 'pong'
  | 'ack'
  | 'error'
  | 'pos-event';

export interface WebSocketMessage<T = any> {
  id: string;
  type: WebSocketMessageType;
  roomId?: string;
  userId?: string;
  targetUserId?: string;
  content?: T;
  timestamp: number;
  ack?: boolean;
  error?: string;
}

export interface ClientAckResponse {
  success: boolean;
  messageId: string;
  timestamp: number;
  error?: string;
}

/**
 * Generate standard room identifiers
 */
export const WebSocketRooms = {
  store: (storeIdOrSlug: string) => `store:${storeIdOrSlug}`,
  kitchen: (storeIdOrSlug: string) => `kitchen:${storeIdOrSlug}`,
  table: (tableId: string) => `table:${tableId}`,
  user: (userId: string) => `user:${userId}`,
} as const;

/**
 * Create a formatted WebSocket message envelope
 */
export function createWebSocketMessage<T = any>(
  type: WebSocketMessageType,
  options: {
    roomId?: string;
    userId?: string;
    targetUserId?: string;
    content?: T;
    id?: string;
    ack?: boolean;
    error?: string;
  } = {}
): WebSocketMessage<T> {
  return {
    id: options.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    roomId: options.roomId,
    userId: options.userId,
    targetUserId: options.targetUserId,
    content: options.content,
    timestamp: Date.now(),
    ack: options.ack,
    error: options.error,
  };
}

/**
 * Create an ACK response message
 */
export function createAckMessage(
  originalMessageId: string,
  success: boolean = true,
  error?: string
): WebSocketMessage<ClientAckResponse> {
  return {
    id: `ack_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: 'ack',
    content: {
      success,
      messageId: originalMessageId,
      timestamp: Date.now(),
      error,
    },
    timestamp: Date.now(),
  };
}

/**
 * Parse and validate incoming raw WebSocket payload
 */
export function parseWebSocketMessage(raw: string | ArrayBuffer | any): WebSocketMessage | null {
  try {
    const str = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    const parsed = JSON.parse(str);
    if (!parsed || typeof parsed !== 'object' || !parsed.type) {
      return null;
    }
    return {
      id: parsed.id || `msg_${Date.now()}`,
      type: parsed.type,
      roomId: parsed.roomId,
      userId: parsed.userId,
      targetUserId: parsed.targetUserId,
      content: parsed.content,
      timestamp: parsed.timestamp || Date.now(),
      ack: Boolean(parsed.ack),
      error: parsed.error,
    };
  } catch {
    return null;
  }
}
