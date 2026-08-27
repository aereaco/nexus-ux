/**
 * Nexus-UX Universal ETag Cache Engine
 *
 * Provides 0ms instant cache retrieval for all network resources
 * (HTML, CSS, JS, Images, Videos, Audio, PDFs, Blobs, JSON) combined with
 * non-blocking background ETag HTTP revalidation (If-None-Match).
 *
 * Storage Tiers:
 *   - Web Storage (sessionStorage / localStorage) for text, HTML, CSS, JS, JSON
 *   - IndexedDB ('nexus-media-cache') for binary media (images, videos, audio, PDFs, blobs)
 */

export interface CacheOptions {
  storage?: 'session' | 'local' | 'db';
  responseType?: 'text' | 'json' | 'blob' | 'arrayBuffer';
  timeoutMs?: number;
  onUpdate?: (freshContent: unknown) => void;
}

interface CacheEntry {
  content: unknown;
  etag?: string;
  timestamp: number;
}

// ============================================================================
// 1. INDEXEDDB BINARY MEDIA STORE
// ============================================================================
const DB_NAME = 'nexus-media-cache';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[Nexus Cache] IndexedDB open failed, falling back.');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

async function getIDBItem(key: string): Promise<CacheEntry | null> {
  const db = await getIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setIDBItem(key: string, entry: CacheEntry): Promise<void> {
  const db = await getIDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry, key);
  } catch {
    // Ignore quota errors
  }
}

// ============================================================================
// 2. UNIVERSAL ETAG CACHE ENGINE
// ============================================================================

export class UniversalCacheEngine {
  private inMemoryCache: Map<string, CacheEntry> = new Map();

  /**
   * Retrieves a resource with 0ms instant cache hit, followed by background
   * ETag revalidation.
   */
  async fetchWithCache(url: string, options: CacheOptions = {}): Promise<unknown> {
    const {
      storage = url.startsWith('http') && !url.includes(location?.host || '') ? 'local' : 'session',
      responseType = 'text',
      timeoutMs = 5000,
      onUpdate
    } = options;

    const cacheKey = `nx_cache:${url}`;

    // Step 1: Read Instant Cache (0ms)
    let cachedEntry: CacheEntry | null = this.inMemoryCache.get(cacheKey) || null;

    if (!cachedEntry) {
      if (storage === 'db' || responseType === 'blob' || responseType === 'arrayBuffer') {
        cachedEntry = await getIDBItem(cacheKey);
      } else if (typeof window !== 'undefined') {
        try {
          const store = storage === 'local' ? localStorage : sessionStorage;
          const raw = store.getItem(cacheKey);
          if (raw) {
            cachedEntry = JSON.parse(raw) as CacheEntry;
          }
        } catch {
          // Parse error / invalid storage
        }
      }
    }

    // Step 2: Instant Return if Cached
    if (cachedEntry) {
      this.inMemoryCache.set(cacheKey, cachedEntry);
      if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
        console.log(`[Cache Engine] INSTANT HIT (0ms): ${url}`);
      }

      // Non-blocking Background ETag Revalidation
      this.revalidateInBackground(url, cacheKey, cachedEntry, options);
      return cachedEntry.content;
    }

    // Step 3: Cache Miss -> Perform Initial Network Fetch
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
      console.log(`[Cache Engine] MISS: Fetching ${url}`);
    }

    const freshEntry = await this.performNetworkFetch(url, options, undefined);
    await this.saveCacheEntry(cacheKey, freshEntry, storage, responseType);
    this.inMemoryCache.set(cacheKey, freshEntry);
    return freshEntry.content;
  }

  /**
   * Non-blocking background HTTP fetch with If-None-Match header
   */
  private revalidateInBackground(
    url: string,
    cacheKey: string,
    cachedEntry: CacheEntry,
    options: CacheOptions
  ): void {
    setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (cachedEntry.etag) {
          headers['If-None-Match'] = cachedEntry.etag;
        }

        const res = await fetch(url, { headers });

        if (res.status === 304) {
          if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
            console.log(`[Cache Engine] VERIFIED 304 (Not Modified): ${url}`);
          }
          return;
        }

        if (res.status === 200) {
          const etag = res.headers.get('ETag') || res.headers.get('etag') || undefined;
          let content: unknown;

          switch (options.responseType) {
            case 'json':
              content = await res.json();
              break;
            case 'blob':
              content = await res.blob();
              break;
            case 'arrayBuffer':
              content = await res.arrayBuffer();
              break;
            case 'text':
            default:
              content = await res.text();
              break;
          }

          const newEntry: CacheEntry = { content, etag, timestamp: Date.now() };
          await this.saveCacheEntry(cacheKey, newEntry, options.storage || 'session', options.responseType || 'text');
          this.inMemoryCache.set(cacheKey, newEntry);

          if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-debug')) {
            console.log(`[Cache Engine] UPDATE DETECTED (200 OK): ${url}`);
          }

          if (options.onUpdate) {
            options.onUpdate(content);
          }
        }
      } catch {
        // Silent recovery on background fetch failure
      }
    }, 100);
  }

  private async performNetworkFetch(
    url: string,
    options: CacheOptions,
    etagHeader?: string
  ): Promise<CacheEntry> {
    const headers: Record<string, string> = {};
    if (etagHeader) headers['If-None-Match'] = etagHeader;

    let controller: AbortController | undefined;
    let timer: number | undefined;
    if (options.timeoutMs) {
      controller = new AbortController();
      timer = setTimeout(() => controller?.abort(), options.timeoutMs);
    }

    let res: Response;
    try {
      res = await fetch(url, { signal: controller?.signal, headers });
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const etag = res.headers.get('ETag') || res.headers.get('etag') || undefined;
    let content: unknown;

    switch (options.responseType) {
      case 'json':
        content = await res.json();
        break;
      case 'blob':
        content = await res.blob();
        break;
      case 'arrayBuffer':
        content = await res.arrayBuffer();
        break;
      case 'text':
      default:
        content = await res.text();
        break;
    }

    return { content, etag, timestamp: Date.now() };
  }

  private async saveCacheEntry(
    key: string,
    entry: CacheEntry,
    storage: 'session' | 'local' | 'db',
    responseType: string
  ): Promise<void> {
    if (storage === 'db' || responseType === 'blob' || responseType === 'arrayBuffer') {
      await setIDBItem(key, entry);
    } else if (typeof window !== 'undefined') {
      try {
        const store = storage === 'local' ? localStorage : sessionStorage;
        store.setItem(key, JSON.stringify(entry));
      } catch {
        // Storage quota catch
      }
    }
  }

  clearMemoryCache(): void {
    this.inMemoryCache.clear();
  }
}

export const cacheEngine = new UniversalCacheEngine();
