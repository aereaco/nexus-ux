import { RuntimeContext } from '../../engine/composition.ts';

interface WebSocketState {
  status: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
  lastMessage: any;
  error: string | null;
  send: (data: any) => void;
  close: () => void;
}

const connectionPool = new Map<string, {
  ws: WebSocket | null;
  state: WebSocketState;
  reconnectAttempts: number;
  reconnectTimeout: number | null;
}>();

export default function wsFactory(runtime: RuntimeContext) {
  return {
    $ws: function wsSprite(url: string, options: { autoReconnect?: boolean, maxReconnects?: number } = {}) {
      // Return existing connection proxy if already established for this URL
      if (connectionPool.has(url)) {
        return connectionPool.get(url)!.state;
      }

    const { autoReconnect = true, maxReconnects = 10 } = options;

    const state = runtime.reactive<WebSocketState>({
      status: 'CONNECTING',
      lastMessage: null,
      error: null,
      send: (data: any) => {
        const poolEntry = connectionPool.get(url);
        if (poolEntry && poolEntry.ws && poolEntry.state.status === 'OPEN') {
          const payload = typeof data === 'string' ? data : JSON.stringify(data);
          poolEntry.ws.send(payload);
        } else {
          runtime.warn(`[Nexus-UX] WebSocket cannot send, status is ${poolEntry?.state.status}`);
        }
      },
      close: () => {
        const poolEntry = connectionPool.get(url);
        if (poolEntry) {
          if (poolEntry.reconnectTimeout) clearTimeout(poolEntry.reconnectTimeout);
          poolEntry.reconnectAttempts = maxReconnects; // Prevent auto-reconnect
          if (poolEntry.ws) {
            poolEntry.ws.close(1000, 'Client closed deliberately');
          }
          state.status = 'CLOSING';
        }
      }
    });

    const poolEntry = {
      ws: null as WebSocket | null,
      state,
      reconnectAttempts: 0,
      reconnectTimeout: null as number | null
    };
    
    connectionPool.set(url, poolEntry);

    function connect() {
      if (poolEntry.reconnectAttempts >= maxReconnects) {
        state.error = 'Max reconnection attempts reached.';
        state.status = 'CLOSED';
        return;
      }

      state.status = 'CONNECTING';
      state.error = null;

      try {
        const socket = new WebSocket(url);
        poolEntry.ws = socket;

        socket.onopen = () => {
          state.status = 'OPEN';
          poolEntry.reconnectAttempts = 0; // Reset attempts on successful connection
          if (runtime.isDevMode) runtime.info(`[Nexus-UX] WebSocket connected: ${url}`);
        };

        socket.onmessage = (event) => {
          let parsed;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            parsed = event.data;
          }
          // Intentionally overwrite to trigger reactive updates deeply
          state.lastMessage = parsed;
        };

        socket.onerror = () => {
          state.error = 'WebSocket connection error occurred.';
        };

        socket.onclose = (event) => {
          state.status = 'CLOSED';
          if (runtime.isDevMode) runtime.warn(`[Nexus-UX] WebSocket closed: ${url}`, event.code, event.reason);
          
          if (autoReconnect && event.code !== 1000) {
            poolEntry.reconnectAttempts++;
            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            const backoffMs = Math.min(1000 * Math.pow(2, poolEntry.reconnectAttempts - 1), 30000);
            if (runtime.isDevMode) runtime.info(`[Nexus-UX] Reconnecting WebSocket in ${backoffMs}ms... (Attempt ${poolEntry.reconnectAttempts}/${maxReconnects})`);
            
            poolEntry.reconnectTimeout = setTimeout(connect, backoffMs);
          }
        };
      } catch (err: unknown) {
        state.status = 'CLOSED';
        state.error = err instanceof Error ? err.message : String(err);
      }
    }

    // Initial connection kickoff
    connect();

    return state;
    }
  };
}
