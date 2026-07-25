import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { generateDynamicMirror } from '../src/engine/mirror.ts';
import { effect, triggerRef } from '../src/engine/reactivity.ts';

// Global mocks for DOM & Storage
class MockStorage implements Storage {
  private _store = new Map<string, string>();

  get length() { return this._store.size; }
  clear() { this._store.clear(); }
  getItem(key: string) { return this._store.get(key) ?? null; }
  key(index: number) { return Array.from(this._store.keys())[index] ?? null; }
  removeItem(key: string) { this._store.delete(key); }
  setItem(key: string, value: string) { this._store.set(key, String(value)); }
}

class MockElement {
  id = 'test_element';
  attributes = [];
  getAttribute() { return null; }
  hasAttribute() { return false; }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

(globalThis as any).Element = MockElement;
(globalThis as any).window = globalThis;

Deno.test('Mirror Test 1: Initial Boot Live Read & Deserialization', () => {
  const nativeStorage = new MockStorage();
  nativeStorage.setItem('rtl', 'true');
  nativeStorage.setItem('pageTabs', 'false');
  nativeStorage.setItem('zoom', '1.5');

  const mockRuntime: any = {
    globalSignals: () => ({}),
    globalActions: () => ({}),
    scheduler: { enqueueEffect: (cb: any) => cb() },
    unref: (v: any) => v
  };

  const mirror = generateDynamicMirror('localStorage', nativeStorage, mockRuntime);

  assertEquals(mirror.rtl, true);
  assertEquals(mirror.pageTabs, false);
  assertEquals(mirror.zoom, 1.5);
  assertEquals(mirror.nonexistent, undefined);
});

Deno.test('Mirror Test 2: Native Storage Write Reflects Live on Read', () => {
  const nativeStorage = new MockStorage();
  const mockRuntime: any = {
    globalSignals: () => ({}),
    globalActions: () => ({}),
    scheduler: { enqueueEffect: (cb: any) => cb() },
    unref: (v: any) => v
  };

  const mirror = generateDynamicMirror('localStorage', nativeStorage, mockRuntime);

  nativeStorage.setItem('rtl', 'false');
  assertEquals(mirror.rtl, false);

  nativeStorage.setItem('zoom', '2');
  assertEquals(mirror.zoom, 2);
});

Deno.test('Mirror Test 3: Reactive Effect Subscription & Native Update Trigger', () => {
  const nativeStorage = new MockStorage();
  const mockRuntime: any = {
    globalSignals: () => ({}),
    globalActions: () => ({}),
    scheduler: { enqueueEffect: (cb: any) => cb() },
    unref: (v: any) => v
  };

  const mirror = generateDynamicMirror('localStorage', nativeStorage, mockRuntime);

  let effectCount = 0;
  let observedRtl: any = undefined;

  effect(() => {
    effectCount++;
    observedRtl = mirror.rtl;
  });

  assertEquals(effectCount, 1);
  assertEquals(observedRtl, undefined);

  // Native storage updated via setItem method trap or native API
  mirror.setItem('rtl', 'true');
  assertEquals(effectCount, 2);
  assertEquals(observedRtl, true);

  mirror.setItem('rtl', 'false');
  assertEquals(effectCount, 3);
  assertEquals(observedRtl, false);
});

Deno.test('Mirror Test 4: Method Access Parity (.getItem / .setItem)', () => {
  const nativeStorage = new MockStorage();
  const mockRuntime: any = {
    globalSignals: () => ({}),
    globalActions: () => ({}),
    scheduler: { enqueueEffect: (cb: any) => cb() },
    unref: (v: any) => v
  };

  const mirror = generateDynamicMirror('localStorage', nativeStorage, mockRuntime);

  mirror.setItem('theme', 'dark');
  assertEquals(nativeStorage.getItem('theme'), 'dark');
  assertEquals(mirror.getItem('theme'), 'dark');
  assertEquals(mirror.theme, 'dark');

  mirror.removeItem('theme');
  assertEquals(nativeStorage.getItem('theme'), null);
  assertEquals(mirror.theme, undefined);
});

Deno.test('Mirror Test 5: Page Refresh Persistence via Native Storage', () => {
  const nativeStorage = new MockStorage();
  const mockRuntime: any = {
    globalSignals: () => ({}),
    globalActions: () => ({}),
    scheduler: { enqueueEffect: (cb: any) => cb() },
    unref: (v: any) => v
  };

  // Session 1: User toggles preference via native storage
  nativeStorage.setItem('refresh_rtl', 'true');
  nativeStorage.setItem('refresh_zoom', '1.8');

  // Session 2: Page reload creates fresh mirror over native storage
  const mirror2 = generateDynamicMirror('localStorage', nativeStorage, mockRuntime);
  assertEquals(mirror2.refresh_rtl, true);
  assertEquals(mirror2.refresh_zoom, 1.8);
});
