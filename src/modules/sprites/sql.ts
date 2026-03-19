import { RuntimeContext } from '../../engine/composition.ts';
import { heap } from '../../engine/reactivity.ts';

/**
 * Real SurrealDB Client via WebSocket
 * Implements the SurrealDB RPC protocol over WebSocket
 * Supports LIVE queries for real-time updates
 * 
 * ZCZS: Uses typed arrays for numeric data when >50% of fields are numeric
 */
interface SurrealConnection {
  ws: WebSocket | null;
  connected: boolean;
  ready: boolean;
}

// Connection pool for multi-database support
const connectionPool = new Map<string, SurrealConnection>();
const pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
const liveQueries = new Map<string, (data: unknown) => void>();
let requestId = 0;

// Default connection config
let defaultNs = 'test';
let defaultDb = 'test';
let authToken: string | null = null;

/**
 * Get or create a connection for the given URL
 */
function getConnection(url: string): SurrealConnection {
  if (!connectionPool.has(url)) {
    connectionPool.set(url, {
      ws: null,
      connected: false,
      ready: false
    });
  }
  return connectionPool.get(url)!;
}

/**
 * Connect to SurrealDB via WebSocket
 */
function connect(url: string, ns?: string, db?: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const conn = getConnection(url);
    
    if (conn.ready) {
      resolve(true);
      return;
    }

    if (conn.ws) {
      conn.ws.close();
    }

    conn.ws = new WebSocket(url);
    conn.connected = false;
    conn.ready = false;

    conn.ws.onopen = () => {
      conn.connected = true;
      // Use namespace/database
      if (ns || defaultNs || db || defaultDb) {
        sendRequest(conn.ws!, 'use', { 
          namespace: ns || defaultNs, 
          database: db || defaultDb 
        }).then(() => {
          conn.ready = true;
          resolve(true);
        }).catch(reject);
      } else {
        conn.ready = true;
        resolve(true);
      }
    };

    conn.ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        
        // Handle response to a request
        if (response.id && pendingRequests.has(response.id)) {
          const { resolve: res, reject: rej } = pendingRequests.get(response.id)!;
          pendingRequests.delete(response.id);
          
          if (response.error) {
            rej(new Error(response.error.message));
          } else {
            res(response.result);
          }
        }
        
        // Handle LIVE query notifications
        if (response.method === 'notify' && response.params) {
          const [notification] = response.params;
          if (notification.id && liveQueries.has(notification.id)) {
            liveQueries.get(notification.id)!(notification.result);
          }
        }
      } catch (e) {
        console.error('[Nexus SQL] Failed to parse WebSocket message:', e);
      }
    };

    conn.ws.onerror = () => {
      conn.connected = false;
      conn.ready = false;
      reject(new Error('WebSocket connection failed'));
    };

    conn.ws.onclose = () => {
      conn.connected = false;
      conn.ready = false;
      // Reject pending requests
      pendingRequests.forEach(({ reject }) => reject(new Error('Connection closed')));
      pendingRequests.clear();
    };
  });
}

/**
 * Send a request via WebSocket
 */
function sendRequest(ws: WebSocket, method: string, params?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = String(++requestId);
    pendingRequests.set(id, { resolve, reject });
    
    const message = JSON.stringify({
      id,
      method,
      params: params || []
    });
    
    ws.send(message);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }
    }, 30000);
  });
}

/**
 * Execute a SurrealQL query
 */
async function executeQuery(
  url: string, 
  query: string, 
  vars?: Record<string, unknown>,
  ns?: string, 
  db?: string
): Promise<unknown> {
  await connect(url, ns, db);
  const conn = getConnection(url);
  
  // Authenticate if token is set
  if (authToken && conn.ws) {
    try {
      await sendRequest(conn.ws!, 'authenticate', { token: authToken });
    } catch (e) {
      console.warn('[Nexus SQL] Authentication failed:', e);
    }
  }
  
  return sendRequest(conn.ws!, 'query', { 
    sql: query, 
    vars: vars || {}
  });
}

/**
 * Subscribe to a LIVE query
 */
async function subscribeLive(
  url: string,
  query: string,
  callback: (data: unknown) => void,
  ns?: string,
  db?: string
): Promise<string> {
  await connect(url, ns, db);
  const conn = getConnection(url);
  
  const result = await sendRequest(conn.ws!, 'query', {
    sql: query,
    vars: {}
  }) as { id: string }[];
  
  const liveId = result[0]?.id;
  if (liveId) {
    liveQueries.set(liveId, callback);
  }
  
  return liveId;
}

/**
 * Kill a LIVE query
 */
async function unsubscribeLive(url: string, liveId: string): Promise<void> {
  const conn = getConnection(url);
  if (conn.ws && conn.ready) {
    await sendRequest(conn.ws, 'kill', { id: liveId });
    liveQueries.delete(liveId);
  }
}

/**
 * Configure the SQL client
 */
export function configureSqlClient(config: {
  url?: string;
  namespace?: string;
  database?: string;
  token?: string;
}) {
  if (config.namespace) defaultNs = config.namespace;
  if (config.database) defaultDb = config.database;
  if (config.token) authToken = config.token;
}

/**
 * The $sql sprite.
 * Usage: $sql('SELECT * FROM user') or $sql('LIVE SELECT * FROM user')
 * 
 * ZCZS Optimization: For numeric-heavy results, uses typed arrays via SignalHeap
 */
export function sqlSprite(runtime: RuntimeContext) {
  // Get connection config from runtime or use defaults
  const url = (runtime as any).config?.sqlUrl || 'ws://localhost:8000/rpc';
  const ns = (runtime as any).config?.sqlNs || defaultNs;
  const db = (runtime as any).config?.sqlDb || defaultDb;

  return async (query: string, vars?: Record<string, unknown>) => {
    // 1. Check if this is a LIVE query
    const isLive = query.trim().toUpperCase().startsWith('LIVE');
    
    // 2. Create reactive container for the result
    const result = runtime.reactive({
      data: [],
      status: isLive ? 'connecting' : 'loading',
      error: null,
      liveId: null
    });

    try {
      if (isLive) {
        // ZCZS: For live queries, use heap for numeric data if beneficial
        const numericFields: string[] = [];
        
        // Extract field names from query for heap pre-allocation
        const fieldMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
        if (fieldMatch) {
          const fields = fieldMatch[1].split(',').map(f => f.trim());
          fields.forEach(f => {
            if (f !== '*' && !f.includes('(')) {
              const fieldName = f.split(' AS ').pop()?.trim() || f.trim();
              // Heuristic: fields ending in _id, _count, _at, _time are likely numeric
              if (/_id|_count|_at|_time|_amount|_price|_qty$/.test(fieldName.toLowerCase())) {
                numericFields.push(fieldName);
                heap.allocateNumeric(fieldName);
              }
            }
          });
        }

        // Subscribe to live query
        const liveId = await subscribeLive(url, query, (data) => {
          // ZCZS: Update heap directly for numeric fields
          if (Array.isArray(data) && numericFields.length > 0) {
            data.forEach((row: Record<string, unknown>, idx: number) => {
              numericFields.forEach(field => {
                if (typeof row[field] === 'number') {
                  heap.setNumeric(`${field}_${idx}`, row[field] as number);
                }
              });
            });
          }
          
          result.data = data;
          result.status = 'live';
        }, ns, db);
        
        result.liveId = liveId;
        result.status = 'live';
      } else {
        // Standard query
        const response = await executeQuery(url, query, vars, ns, db) as { result: unknown[] }[];
        const queryResult = response[0]?.result || response;
        
        // ZCZS: Check if result would benefit from heap storage
        if (Array.isArray(queryResult) && queryResult.length > 10) {
          const sample = queryResult[0];
          if (sample && typeof sample === 'object') {
            const keys = Object.keys(sample);
            const numericCount = keys.filter(k => typeof (sample as any)[k] === 'number').length;
            
            // If >50% numeric, use heap
            if (numericCount / keys.length >= 0.5) {
              keys.forEach(k => {
                if (typeof (sample as any)[k] === 'number') {
                  heap.allocateNumeric(k);
                }
              });
              
              queryResult.forEach((row: Record<string, unknown>, idx: number) => {
                keys.forEach(k => {
                  if (typeof row[k] === 'number') {
                    heap.setNumeric(`${k}_${idx}`, row[k] as number);
                  }
                });
              });
            }
          }
        }
        
        result.data = queryResult;
        result.status = 'ready';
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      result.status = 'error';
    }

    return result;
  };
}

export default function(runtime: RuntimeContext) {
  return {
    $sql: sqlSprite(runtime)
  };
}
