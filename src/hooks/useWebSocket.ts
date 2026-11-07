'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  WebSocketClient,
  WebSocketClientOptions,
  WebSocketConnectionStatus,
} from '@/lib/websocket/client';
import { WebSocketMessage } from '@/lib/websocket/protocol';

export interface UseWebSocketOptions extends WebSocketClientOptions {
  roomId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  maxStoredMessages?: number;
}

export interface UseWebSocketReturn {
  connected: boolean;
  status: WebSocketConnectionStatus;
  messages: WebSocketMessage[];
  send: (
    roomId?: string,
    content?: any,
    options?: { ack?: boolean; targetUserId?: string; timeoutMs?: number }
  ) => Promise<boolean>;
  joinRoom: (roomId: string, ack?: boolean) => Promise<boolean>;
  leaveRoom: (roomId: string, ack?: boolean) => Promise<boolean>;
  client: WebSocketClient | null;
  clearMessages: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const [status, setStatus] = useState<WebSocketConnectionStatus>('idle');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const clientRef = useRef<WebSocketClient | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const client = new WebSocketClient(url, {
      ...optionsRef.current,
      autoConnect: true,
    });
    clientRef.current = client;

    const unsubStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const unsubMessages = client.on('*', (msg) => {
      setMessages((prev) => {
        const max = optionsRef.current.maxStoredMessages ?? 50;
        const next = [...prev, msg];
        return next.length > max ? next.slice(-max) : next;
      });
      optionsRef.current.onMessage?.(msg);
    });

    if (optionsRef.current.roomId) {
      client.joinRoom(optionsRef.current.roomId);
    }

    return () => {
      unsubStatus();
      unsubMessages();
      client.disconnect();
      clientRef.current = null;
    };
  }, [url]);

  const send = useCallback(
    (
      roomId?: string,
      content?: any,
      opts?: { ack?: boolean; targetUserId?: string; timeoutMs?: number }
    ) => {
      if (!clientRef.current) return Promise.resolve(false);
      return clientRef.current.send(roomId, content, opts);
    },
    []
  );

  const joinRoom = useCallback((roomId: string, ack?: boolean) => {
    if (!clientRef.current) return Promise.resolve(false);
    return clientRef.current.joinRoom(roomId, ack);
  }, []);

  const leaveRoom = useCallback((roomId: string, ack?: boolean) => {
    if (!clientRef.current) return Promise.resolve(false);
    return clientRef.current.leaveRoom(roomId, ack);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    connected: status === 'connected',
    status,
    messages,
    send,
    joinRoom,
    leaveRoom,
    client: clientRef.current,
    clearMessages,
  };
}
