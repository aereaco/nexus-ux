import { RuntimeContext } from '../../engine/composition.ts';
import { heap } from '../../engine/reactivity.ts';
import { errMsg } from '../../engine/debug.ts';

/**
 * SurrealDB / Nexus-DB WebSocket JSON-RPC 2.0 Client (`$sql` sprite).
 *
 * Implements standard SurrealDB JSON-RPC 2.0 positional parameters:
 *   - `use`:          [namespace, database]
 *   - `authenticate`: [token]
 *   - `query`:        [sql, vars]
 *   - `live`:         [table]
 *   - `kill`:         [liveId]
 *
 * Supports race-free `LIVE SELECT` (subscribe -> buffer -> seed -> replay -> stream),
 * automatic reconnection with subscription restoration, and `KILL` cleanup on
 * unsubscribe or reactive scope disposal.
 */

interface LiveNotificationEvent {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  result: unknown;
}

interface LiveSubscription {
  url: string;
  ns: string;
  db: string;
  table: string;
  seedSql: string;
  vars?: Record<string, unknown>;
  liveId: string | null;
  buffering: boolean;
  buffer: LiveNotificationEvent[];
  closed: boolean;
  onRows: (rows: unknown[]) => void;
  onEvent: (event: LiveNotificationEvent) => void;
  onStatus: (status: string, error?: string | null) => void;
}

interface PendingRpc {
  ws: WebSocket;
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface SurrealConnection {
  url: string;
  ws: WebSocket | null;
  connected: boolean;
  ready: boolean;
  connectPromise: Promise<boolean> | null;
  ns: string;
  db: string;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  subscriptions: Set<LiveSubscription>;
}

const connectionPool = new Map<string, SurrealConnection>();
const pendingRequests = new Map<string, PendingRpc>();
const liveQueries = new Map<string, LiveSubscription>();
let requestId = 0;

// Configurable defaults (reusable against any SurrealDB / Nexus-DB endpoint)
let defaultUrl: string | null = null;
let defaultNs = 'nexus';
let defaultDb = 'system';
let authToken: string | null = null;

function resolveDefaultUrl(runtime?: RuntimeContext): string {
  const runtimeUrl = (runtime as any)?.config?.sqlUrl;
  if (typeof runtimeUrl === 'string' && runtimeUrl.trim()) return runtimeUrl.trim();
  if (defaultUrl) return defaultUrl;
  if (typeof globalThis.location !== 'undefined' && globalThis.location.host) {
    const proto = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${globalThis.location.host}/rpc`;
  }
  return 'ws://localhost:8000/rpc';
}

function getConnection(url: string, ns: string, db: string): SurrealConnection {
  let conn = connectionPool.get(url);
  if (!conn) {
    conn = {
      url,
      ws: null,
      connected: false,
      ready: false,
      connectPromise: null,
      ns,
      db,
      reconnectAttempts: 0,
      reconnectTimer: null,
      subscriptions: new Set(),
    };
    connectionPool.set(url, conn);
  }
  return conn;
}

function sendRequest(ws: WebSocket, method: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      reject(new Error(`WebSocket is not open for method "${method}"`));
      return;
    }

    const id = String(++requestId);
    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`RPC request "${method}" timed out`));
      }
    }, 30000);

    pendingRequests.set(id, { ws, resolve, reject, timer });

    const payload = JSON.stringify({
      id,
      method,
      params,
    });
    ws.send(payload);
  });
}

function dispatchLiveNotification(notif: LiveNotificationEvent): void {
  const sub = liveQueries.get(notif.id);
  if (!sub || sub.closed) return;
  if (sub.buffering) {
    sub.buffer.push(notif);
  } else {
    sub.onEvent(notif);
  }
}

function scheduleReconnect(conn: SurrealConnection): void {
  if (conn.subscriptions.size === 0 || conn.reconnectTimer !== null) return;
  const delayMs = Math.min(15000, 500 * Math.pow(2, conn.reconnectAttempts));
  conn.reconnectAttempts++;

  conn.reconnectTimer = setTimeout(async () => {
    conn.reconnectTimer = null;
    if (conn.subscriptions.size === 0) return;

    try {
      await connect(conn.url, conn.ns, conn.db);
      conn.reconnectAttempts = 0;
      await restoreSubscriptions(conn);
    } catch {
      scheduleReconnect(conn);
    }
  }, delayMs);
}

function connect(url: string, ns?: string, db?: string): Promise<boolean> {
  const targetNs = ns || defaultNs;
  const targetDb = db || defaultDb;
  const conn = getConnection(url, targetNs, targetDb);

  if (conn.ready && conn.ws && conn.ws.readyState === WebSocket.OPEN) {
    if (conn.ns !== targetNs || conn.db !== targetDb) {
      return sendRequest(conn.ws, 'use', [targetNs, targetDb]).then(() => {
        conn.ns = targetNs;
        conn.db = targetDb;
        return true;
      });
    }
    return Promise.resolve(true);
  }

  if (conn.connectPromise) {
    return conn.connectPromise;
  }

  conn.connectPromise = new Promise<boolean>((resolve, reject) => {
    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close();
    }

    let settled = false;
    const settleResolve = (val: boolean) => {
      if (!settled) {
        settled = true;
        conn.connectPromise = null;
        resolve(val);
      }
    };
    const settleReject = (err: Error) => {
      if (!settled) {
        settled = true;
        conn.connectPromise = null;
        reject(err);
      }
    };

    const ws = new WebSocket(url);
    conn.ws = ws;
    conn.connected = false;
    conn.ready = false;

    ws.onopen = async () => {
      conn.connected = true;
      try {
        // 1. Authenticate once per connection (fail closed if token is rejected)
        if (authToken) {
          await sendRequest(ws, 'authenticate', [authToken]);
        }
        // 2. Scope connection namespace/database using positional JSON-RPC params
        if (targetNs || targetDb) {
          await sendRequest(ws, 'use', [targetNs, targetDb]);
          conn.ns = targetNs;
          conn.db = targetDb;
        }
        conn.ready = true;
        conn.reconnectAttempts = 0;
        settleResolve(true);
      } catch (err) {
        conn.ready = false;
        try { ws.close(); } catch { /* noop */ }
        settleReject(err instanceof Error ? err : new Error(errMsg(err)));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));

        // 1. Direct JSON-RPC response matched by `id`
        if (msg.id !== undefined && msg.id !== null) {
          const reqKey = String(msg.id);
          const pending = pendingRequests.get(reqKey);
          if (pending) {
            clearTimeout(pending.timer);
            pendingRequests.delete(reqKey);
            if (msg.error) {
              pending.reject(new Error(msg.error.message || 'RPC error'));
            } else {
              pending.resolve(msg.result);
            }
            return;
          }
        }

        // 2. SurrealDB v2 / Nexus-DB LIVE push frame: { result: { id, action, result } }
        if (
          (msg.id === undefined || msg.id === null) &&
          msg.result &&
          typeof msg.result === 'object' &&
          typeof msg.result.id === 'string' &&
          typeof msg.result.action === 'string'
        ) {
          dispatchLiveNotification({
            id: msg.result.id,
            action: msg.result.action.toUpperCase(),
            result: msg.result.result,
          });
          return;
        }

        // 3. Legacy SurrealDB v1 `notify` frame fallback
        if (msg.method === 'notify' && Array.isArray(msg.params) && msg.params[0]) {
          const n = msg.params[0];
          if (typeof n.id === 'string') {
            dispatchLiveNotification({
              id: n.id,
              action: String(n.action || 'UPDATE').toUpperCase(),
              result: n.result,
            });
          }
        }
      } catch (e) {
        console.error('[UX SQL] Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = () => {
      conn.connected = false;
      conn.ready = false;
      settleReject(new Error(`WebSocket connection failed (${url})`));
    };

    ws.onclose = () => {
      const wasCurrent = conn.ws === ws;
      if (wasCurrent) {
        conn.connected = false;
        conn.ready = false;
        conn.ws = null;
      }

      // Reject only requests belonging to this closed socket
      for (const [id, pending] of Array.from(pendingRequests.entries())) {
        if (pending.ws === ws) {
          clearTimeout(pending.timer);
          pendingRequests.delete(id);
          pending.reject(new Error('WebSocket connection closed'));
        }
      }

      settleReject(new Error('WebSocket connection closed during handshake'));

      if (wasCurrent && conn.subscriptions.size > 0) {
        for (const sub of conn.subscriptions) {
          if (!sub.closed) sub.onStatus('reconnecting');
        }
        scheduleReconnect(conn);
      }
    };
  });

  return conn.connectPromise;
}

function extractQueryRows(rpcResult: unknown): unknown[] {
  if (Array.isArray(rpcResult)) {
    const first = rpcResult[0] as any;
    if (first && typeof first === 'object' && 'status' in first && 'result' in first) {
      if (first.status && first.status !== 'OK') {
        throw new Error(typeof first.result === 'string' ? first.result : `Query failed (${first.status})`);
      }
      return Array.isArray(first.result) ? first.result : (first.result !== undefined && first.result !== null ? [first.result] : []);
    }
    return rpcResult;
  }
  return rpcResult !== undefined && rpcResult !== null ? [rpcResult] : [];
}

function recordKey(row: unknown): string | null {
  if (row && typeof row === 'object' && 'id' in (row as Record<string, unknown>)) {
    const id = (row as Record<string, unknown>).id;
    if (id !== undefined && id !== null) return String(id);
  }
  return null;
}

function applyLiveEventToRows(rows: unknown[], event: LiveNotificationEvent): unknown[] {
  const action = event.action.toUpperCase();
  const payload = event.result;
  const key = recordKey(payload);

  if (action === 'DELETE') {
    if (key !== null) {
      return rows.filter((r) => recordKey(r) !== key);
    }
    if (typeof payload === 'string') {
      return rows.filter((r) => recordKey(r) !== payload);
    }
    return rows;
  }

  if (action === 'CREATE' || action === 'UPDATE') {
    if (key !== null) {
      const idx = rows.findIndex((r) => recordKey(r) === key);
      if (idx >= 0) {
        const next = rows.slice();
        next[idx] = payload;
        return next;
      }
      return [...rows, payload];
    }
    return payload !== undefined ? [...rows, payload] : rows;
  }

  return rows;
}

function parseLiveTableAndSeed(query: string): { table: string; seedSql: string } {
  const trimmed = query.trim();
  const seedSql = trimmed.replace(/^LIVE\s+/i, '');
  const tableMatch = seedSql.match(/\bFROM\s+([a-zA-Z0-9_:`-]+)/i);
  const table = tableMatch ? tableMatch[1].replace(/`/g, '') : '';
  if (!table) {
    throw new Error(`Unable to determine table name from LIVE query: "${query}"`);
  }
  return { table, seedSql };
}

async function activateSubscription(conn: SurrealConnection, sub: LiveSubscription): Promise<string> {
  if (sub.closed) return '';
  await connect(conn.url, sub.ns, sub.db);
  if (!conn.ws || conn.ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket unavailable for LIVE subscription');
  }

  // Clean up any prior liveId mapping before re-registering (prevents duplicate delivery on reconnect)
  if (sub.liveId) {
    liveQueries.delete(sub.liveId);
    sub.liveId = null;
  }

  // 1. Subscribe FIRST while buffering incoming notifications to eliminate seed/live race
  sub.buffering = true;
  sub.buffer.length = 0;

  const liveIdRaw = await sendRequest(conn.ws, 'live', [sub.table]);
  const liveId = typeof liveIdRaw === 'string' ? liveIdRaw : String(liveIdRaw || '');
  if (!liveId) {
    sub.buffering = false;
    throw new Error(`LIVE subscription on "${sub.table}" did not return a subscription ID`);
  }

  if (sub.closed) {
    try { await sendRequest(conn.ws, 'kill', [liveId]); } catch { /* noop */ }
    return '';
  }

  sub.liveId = liveId;
  liveQueries.set(liveId, sub);

  // 2. Seed initial rows via standard SELECT query
  const seedResp = await sendRequest(conn.ws, 'query', [sub.seedSql, sub.vars || {}]);
  let rows = extractQueryRows(seedResp);

  // 3. Replay & deduplicate buffered notifications received during seeding
  for (const bufferedEvent of sub.buffer) {
    rows = applyLiveEventToRows(rows, bufferedEvent);
  }
  sub.buffer.length = 0;
  sub.buffering = false;

  if (!sub.closed) {
    sub.onRows(rows);
    sub.onStatus('live', null);
  }

  return liveId;
}

async function restoreSubscriptions(conn: SurrealConnection): Promise<void> {
  for (const sub of Array.from(conn.subscriptions)) {
    if (sub.closed) {
      conn.subscriptions.delete(sub);
      continue;
    }
    try {
      await activateSubscription(conn, sub);
    } catch (err) {
      sub.onStatus('error', errMsg(err));
    }
  }
}

async function executeQuery(
  url: string,
  query: string,
  vars?: Record<string, unknown>,
  ns?: string,
  db?: string
): Promise<unknown> {
  await connect(url, ns, db);
  const conn = getConnection(url, ns || defaultNs, db || defaultDb);
  return sendRequest(conn.ws!, 'query', [query, vars || {}]);
}

async function unsubscribeLive(sub: LiveSubscription): Promise<void> {
  if (sub.closed) return;
  sub.closed = true;
  sub.buffering = false;
  sub.buffer.length = 0;

  const conn = connectionPool.get(sub.url);
  if (conn) {
    conn.subscriptions.delete(sub);
    if (conn.subscriptions.size === 0 && conn.reconnectTimer !== null) {
      clearTimeout(conn.reconnectTimer);
      conn.reconnectTimer = null;
    }
  }

  const liveId = sub.liveId;
  sub.liveId = null;
  if (liveId) {
    liveQueries.delete(liveId);
    if (conn?.ws && conn.ready && conn.ws.readyState === WebSocket.OPEN) {
      try {
        await sendRequest(conn.ws, 'kill', [liveId]);
      } catch {
        // Connection may already be closing
      }
    }
  }
}

/**
 * Configure default SQL client connection parameters.
 * Works with Nexus-IO `/rpc` or any SurrealDB JSON-RPC 2.0 WebSocket endpoint.
 */
export function configureSqlClient(config: {
  url?: string;
  namespace?: string;
  database?: string;
  token?: string | null;
}) {
  if (config.url !== undefined) defaultUrl = config.url;
  if (config.namespace !== undefined) defaultNs = config.namespace;
  if (config.database !== undefined) defaultDb = config.database;
  if (config.token !== undefined) authToken = config.token;
}

function syncNumericFieldsToHeap(rows: unknown[], numericFields: string[]): void {
  if (numericFields.length === 0) return;
  rows.forEach((row, idx) => {
    if (row && typeof row === 'object') {
      const rec = row as Record<string, unknown>;
      numericFields.forEach((field) => {
        if (typeof rec[field] === 'number') {
          heap.setNumeric(`${field}_${idx}`, rec[field] as number);
        }
      });
    }
  });
}

/**
 * The `$sql` sprite.
 * Usage: `$sql('SELECT * FROM task')` or `$sql('LIVE SELECT * FROM task')`
 */
export function sqlSprite(runtime: RuntimeContext) {
  return async (
    query: string,
    vars?: Record<string, unknown>,
    opts?: { url?: string; namespace?: string; database?: string }
  ) => {
    const url = opts?.url || resolveDefaultUrl(runtime);
    const ns = opts?.namespace || (runtime as any).config?.sqlNs || defaultNs;
    const db = opts?.database || (runtime as any).config?.sqlDb || defaultDb;
    const isLive = /^LIVE\s+/i.test(query.trim());

    let activeSub: LiveSubscription | null = null;

    const result: {
      data: unknown[];
      status: string;
      error: string | null;
      liveId: string | null;
      unsubscribe: () => Promise<void>;
    } = runtime.reactive({
      data: [],
      status: isLive ? 'connecting' : 'loading',
      error: null,
      liveId: null,
      unsubscribe: async () => {
        if (activeSub) {
          await unsubscribeLive(activeSub);
          result.liveId = null;
          result.status = 'closed';
        }
      },
    });

    try {
      if (isLive) {
        const numericFields: string[] = [];
        const fieldMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
        if (fieldMatch) {
          fieldMatch[1].split(',').map((f) => f.trim()).forEach((f) => {
            if (f !== '*' && !f.includes('(')) {
              const fieldName = f.split(/\s+AS\s+/i).pop()?.trim() || f.trim();
              if (/_id|_count|_at|_time|_amount|_price|_qty$/.test(fieldName.toLowerCase())) {
                numericFields.push(fieldName);
                heap.allocateNumeric(fieldName);
              }
            }
          });
        }

        const { table, seedSql } = parseLiveTableAndSeed(query);
        const conn = getConnection(url, ns, db);

        const sub: LiveSubscription = {
          url,
          ns,
          db,
          table,
          seedSql,
          vars,
          liveId: null,
          buffering: true,
          buffer: [],
          closed: false,
          onRows: (rows) => {
            syncNumericFieldsToHeap(rows, numericFields);
            result.data = rows;
          },
          onEvent: (event) => {
            const next = applyLiveEventToRows(result.data, event);
            syncNumericFieldsToHeap(next, numericFields);
            result.data = next;
            result.status = 'live';
          },
          onStatus: (status, error) => {
            result.status = status;
            if (error !== undefined) result.error = error;
          },
        };

        activeSub = sub;
        conn.subscriptions.add(sub);

        // Automatically tear down server subscription if called inside a reactive effect
        if (typeof runtime.onEffectCleanup === 'function') {
          runtime.onEffectCleanup(() => {
            void unsubscribeLive(sub);
          });
        }

        const liveId = await activateSubscription(conn, sub);
        result.liveId = liveId || null;
      } else {
        const response = await executeQuery(url, query, vars, ns, db);
        const queryResult = extractQueryRows(response);

        if (Array.isArray(queryResult) && queryResult.length > 10) {
          const sample = queryResult[0];
          if (sample && typeof sample === 'object') {
            const keys = Object.keys(sample);
            const numericCount = keys.filter((k) => typeof (sample as any)[k] === 'number').length;
            if (keys.length > 0 && numericCount / keys.length >= 0.5) {
              const numKeys = keys.filter((k) => typeof (sample as any)[k] === 'number');
              numKeys.forEach((k) => heap.allocateNumeric(k));
              syncNumericFieldsToHeap(queryResult, numKeys);
            }
          }
        }

        result.data = queryResult;
        result.status = 'ready';
      }
    } catch (err) {
      result.error = errMsg(err);
      result.status = 'error';
    }

    return result;
  };
}

/**
 * Close all pooled WebSocket connections and clear stale live subscriptions.
 * Automatically invoked when IAM identity changes (`nexus:auth-changed`) so
 * subsequent `$sql` calls re-authenticate cleanly over a fresh WebSocket handshake.
 */
export function resetSqlConnections(): void {
  for (const [, conn] of connectionPool.entries()) {
    if (conn.reconnectTimer !== null) {
      clearTimeout(conn.reconnectTimer);
      conn.reconnectTimer = null;
    }
    for (const sub of conn.subscriptions) {
      sub.closed = true;
      if (sub.liveId) {
        liveQueries.delete(sub.liveId);
      }
    }
    conn.subscriptions.clear();
    try {
      conn.ws?.close(1000, 'auth-changed');
    } catch {
      // ignore close errors
    }
  }
  connectionPool.clear();
}

let authListenerBound = false;
function ensureAuthChangeListener(): void {
  if (authListenerBound || typeof window === 'undefined') return;
  authListenerBound = true;
  window.addEventListener('nexus:auth-changed', () => {
    resetSqlConnections();
  });
}

import type { SpriteModule } from '../../engine/modules.ts';

export const sqlSpriteModule: SpriteModule = {
  name: 'sql',
  key: '$sql',
  sprites: (runtime: RuntimeContext) => {
    ensureAuthChangeListener();
    return sqlSprite(runtime);
  },
};

export default sqlSpriteModule;
