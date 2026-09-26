// Singleton Real-time SSE Manager
// Shares a single EventSource connection across all mounted components in the same tab (e.g. POS + Kitchen split screen)

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type EventCallback = (payload: any) => void;
type StatusCallback = (status: RealtimeStatus) => void;

interface StreamConnection {
  eventSource: EventSource | null;
  subscribers: Set<EventCallback>;
  statusSubscribers: Set<StatusCallback>;
  reconnectTimeout: any;
  watchdogInterval: any;
  isConnecting: boolean;
  status: RealtimeStatus;
  retryAttempt: number;
  lastHeartbeat: number;
  cleanupListeners?: () => void;
}

const connections = new Map<string, StreamConnection>();

const BASE_RECONNECT_DELAY = 1500;
const MAX_RECONNECT_DELAY = 15000;
const HEARTBEAT_TIMEOUT_MS = 35000;

function notifyStatus(conn: StreamConnection, newStatus: RealtimeStatus) {
  conn.status = newStatus;
  conn.statusSubscribers.forEach((cb) => {
    try {
      cb(newStatus);
    } catch (err) {
      console.error('Error in realtime status callback:', err);
    }
  });
}

function calculateBackoff(attempt: number): number {
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, attempt), MAX_RECONNECT_DELAY);
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

export function subscribeRealtime(slug: string, callback: EventCallback): () => void {
  if (typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {};
  }

  let conn = connections.get(slug);
  if (!conn) {
    conn = {
      eventSource: null,
      subscribers: new Set(),
      statusSubscribers: new Set(),
      reconnectTimeout: null,
      watchdogInterval: null,
      isConnecting: false,
      status: 'idle',
      retryAttempt: 0,
      lastHeartbeat: Date.now(),
    };
    connections.set(slug, conn);

    // Attach window lifecycle listeners
    const handleOnline = () => {
      const c = connections.get(slug);
      if (c && c.subscribers.size > 0 && c.status !== 'connected') {
        c.retryAttempt = 0;
        scheduleReconnect(slug, 200);
      }
    };

    const handleVisibilityChange = () => {
      const c = connections.get(slug);
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') {
          // Tab/screen inactive: close connection and pause reconnects to save serverless execution quota
          if (c) {
            clearTimeout(c.reconnectTimeout);
            if (c.eventSource) {
              try { c.eventSource.close(); } catch (e) {}
              c.eventSource = null;
            }
            notifyStatus(c, 'idle');
          }
        } else if (document.visibilityState === 'visible' && c && c.subscribers.size > 0) {
          // User returned to tab: reconnect immediately
          c.retryAttempt = 0;
          scheduleReconnect(slug, 100);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    conn.cleanupListeners = () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  conn.subscribers.add(callback);

  const scheduleReconnect = (targetSlug: string, explicitDelay?: number) => {
    const c = connections.get(targetSlug);
    if (!c || c.subscribers.size === 0) return;

    clearTimeout(c.reconnectTimeout);
    if (c.eventSource) {
      try {
        c.eventSource.close();
      } catch (e) {}
      c.eventSource = null;
    }

    // Do not reconnect in background/hidden tab to prevent wasting Serverless GB-Hours
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      notifyStatus(c, 'idle');
      return;
    }

    const delay = explicitDelay !== undefined ? explicitDelay : calculateBackoff(c.retryAttempt);
    c.retryAttempt++;
    notifyStatus(c, 'reconnecting');

    c.reconnectTimeout = setTimeout(() => {
      connect(targetSlug);
    }, delay);
  };

  const connect = (targetSlug: string) => {
    const c = connections.get(targetSlug);
    if (!c || c.subscribers.size === 0) return;
    if (c.eventSource && c.eventSource.readyState !== EventSource.CLOSED) return;

    try {
      c.isConnecting = true;
      notifyStatus(c, 'connecting');

      const es = new EventSource(`/api/r/${targetSlug}/stream`);
      c.eventSource = es;
      c.lastHeartbeat = Date.now();

      es.onmessage = (event) => {
        try {
          c.lastHeartbeat = Date.now();
          const payload = JSON.parse(event.data);
          c.subscribers.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error('Error in realtime subscriber callback:', err);
            }
          });
        } catch (e) {}
      };

      // Handle custom ping event from stream
      es.addEventListener('ping', () => {
        c.lastHeartbeat = Date.now();
      });

      // Handle graceful stream rotation from server
      es.addEventListener('reconnect', () => {
        c.retryAttempt = 0;
        scheduleReconnect(targetSlug, 300);
      });

      es.onerror = () => {
        scheduleReconnect(targetSlug);
      };

      es.onopen = () => {
        c.isConnecting = false;
        c.retryAttempt = 0;
        c.lastHeartbeat = Date.now();
        notifyStatus(c, 'connected');
      };

      // Watchdog interval to detect dead/silent connections
      clearInterval(c.watchdogInterval);
      c.watchdogInterval = setInterval(() => {
        const activeConn = connections.get(targetSlug);
        if (activeConn && activeConn.eventSource && activeConn.status === 'connected') {
          if (Date.now() - activeConn.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
            console.warn(`[RealtimeManager] Heartbeat timed out for slug: ${targetSlug}. Reconnecting...`);
            scheduleReconnect(targetSlug, 500);
          }
        }
      }, 10000);

    } catch (e) {
      scheduleReconnect(targetSlug);
    }
  };

  if (!conn.eventSource || conn.eventSource.readyState === EventSource.CLOSED) {
    connect(slug);
  }

  // Return unsubscribe cleanup function
  return () => {
    const currentConn = connections.get(slug);
    if (!currentConn) return;

    currentConn.subscribers.delete(callback);

    if (currentConn.subscribers.size === 0) {
      clearTimeout(currentConn.reconnectTimeout);
      clearInterval(currentConn.watchdogInterval);
      if (currentConn.eventSource) {
        currentConn.eventSource.close();
        currentConn.eventSource = null;
      }
      if (currentConn.cleanupListeners) {
        currentConn.cleanupListeners();
      }
      notifyStatus(currentConn, 'disconnected');
      connections.delete(slug);
    }
  };
}

export function subscribeRealtimeStatus(slug: string, callback: StatusCallback): () => void {
  let conn = connections.get(slug);
  if (!conn) {
    conn = {
      eventSource: null,
      subscribers: new Set(),
      statusSubscribers: new Set(),
      reconnectTimeout: null,
      watchdogInterval: null,
      isConnecting: false,
      status: 'idle',
      retryAttempt: 0,
      lastHeartbeat: Date.now(),
    };
    connections.set(slug, conn);
  }

  conn.statusSubscribers.add(callback);
  callback(conn.status);

  return () => {
    const currentConn = connections.get(slug);
    if (currentConn) {
      currentConn.statusSubscribers.delete(callback);
    }
  };
}

export function getRealtimeStatus(slug: string): RealtimeStatus {
  return connections.get(slug)?.status || 'idle';
}
