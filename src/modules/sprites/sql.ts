import { RuntimeContext } from '../../engine/composition.ts';

// Mock SurrealDB SDK interface (since we don't have the package installed yet)
interface Surreal {
  connect(url: string, options?: unknown): Promise<true>;
  query(sql: string, vars?: Record<string, unknown>): Promise<unknown>;
  live(table: string): Promise<string>; // Returns uuid
  kill(uuid: string): Promise<void>;
  // ...
}

// In a real app, this would be imported from 'surrealdb.js' or similar
class MockSurrealClient {
  connect(_url: string) { return Promise.resolve(true); }
  query(_sql: string) { return Promise.resolve([{ result: [] }]); }
  live(_table: string) { return Promise.resolve("uuid"); }
  kill(_uuid: string) { return Promise.resolve(); }
}

const db = new MockSurrealClient();

/**
 * The $sql sprite.
 * Usage: $sql('SELECT * FROM user') or $sql('LIVE SELECT * FROM user')
 */
export function sqlSprite(runtime: RuntimeContext) {
  return (query: string, _vars?: Record<string, unknown>) => {
    // 1. Create a reactive container for the result
    const result = runtime.reactive({
      data: [],
      status: 'loading',
      error: null
    });

    // 2. Execute Query
    // (Async execution, updates reactive state later)
    const isLive = query.trim().toUpperCase().startsWith('LIVE');

    if (isLive) {
      // Handle Live Query (Mock)
      // In reality, we'd setup a listener on the socket
      result.status = 'live';
      console.log(`[Nexus] Starting live query: ${query}`);
    } else {
      db.query(query).then(res => {
        result.data = res[0]?.result || res;
        result.status = 'ready';
      }).catch(err => {
        result.error = err.message;
        result.status = 'error';
      });
    }

    return result;
  };
}
