/**
 * Shared IndexedDB Utility for Nexus-UX.
 * Provides lightweight read/write helpers for the 'nexus-store' database.
 */

const DB_NAME = 'nexus-store';
const DEFAULT_STORES = ['files', 'builds', 'patterns', 'components', 'themes'];

/**
 * Opens the Nexus IndexedDB database, ensuring default stores exist.
 */
export async function openDB(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      DEFAULT_STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      });
    };
  });
}

/**
 * Reads a value from a specific object store.
 */
export async function readIDB(storeName: string, key: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      db.close();
      resolve(null);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      db.close();
      resolve(getReq.result);
    };
    getReq.onerror = () => {
      db.close();
      reject(getReq.error);
    };
  });
}

/**
 * Writes a value to a specific object store, creating it if it doesn't exist.
 */
export async function writeIDB(storeName: string, key: string, data: any): Promise<void> {
  let db = await openDB();
  
  if (!db.objectStoreNames.contains(storeName)) {
    const nextVersion = db.version + 1;
    db.close();
    db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, nextVersion);
       req.onupgradeneeded = (e) => {
         const udb = (e.target as IDBOpenDBRequest).result;
         if (!udb.objectStoreNames.contains(storeName)) {
           udb.createObjectStore(storeName);
         }
       };
       req.onsuccess = () => resolve(req.result);
       req.onerror = () => reject(req.error);
    });
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(data, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
