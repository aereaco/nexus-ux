/// <reference path="./composition.ts" />
import { CLEANUP_FUNCTIONS_KEY, EFFECT_RUNNERS_KEY, RUN_EFFECT_RUNNERS_KEY, DATA_STACK_KEY, MARKER_KEY } from './consts.ts';
import { reportError } from './debug.ts';
import { scheduler } from './scheduler.ts';

// =============================================================================
// ZCZS: Zero-Copy Zero-Serialization Infrastructure (Embedded)
// =============================================================================
export const ZCZS_SUPPORTED = typeof SharedArrayBuffer !== 'undefined';

class SignalHeap {
  private _floatHeap: Float64Array;
  private _intHeap: Int32Array;
  private _boolHeap: Uint8Array;
  private _stringHeap: Map<string, string>;
  private _stringPool: Map<string, number>;
  private _objectHeap: Map<string, unknown>;
  private _arrayHeap: Map<string, unknown[]>;
  private _indexMap: Map<string, number>;
  private _typeMap: Map<string, 'float' | 'int' | 'bool' | 'string' | 'object' | 'array'>;
  private _nextIndex: number = 0;
  private _shared: boolean = false;

  constructor(size: number = 1024, shared: boolean = false) {
    this._shared = shared && ZCZS_SUPPORTED;
    if (this._shared) {
      const sab = new SharedArrayBuffer(size * 8);
      this._floatHeap = new Float64Array(sab);
      this._intHeap = new Int32Array(sab, size * 4);
      this._boolHeap = new Uint8Array(new SharedArrayBuffer(size));
    } else {
      this._floatHeap = new Float64Array(size);
      this._intHeap = new Int32Array(size);
      this._boolHeap = new Uint8Array(size);
    }
    this._stringHeap = new Map();
    this._stringPool = new Map();
    this._objectHeap = new Map();
    this._arrayHeap = new Map();
    this._indexMap = new Map();
    this._typeMap = new Map();
  }

  private _allocateSlot(key: string, type: 'float' | 'int' | 'bool' | 'string' | 'object' | 'array'): number {
    if (this._indexMap.has(key)) {
      this._typeMap.set(key, type);
      return this._indexMap.get(key)!;
    }
    const index = this._nextIndex++;
    this._indexMap.set(key, index);
    this._typeMap.set(key, type);
    return index;
  }

  allocateForValue(key: string, value: unknown): number {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return this.allocateInt(key);
      return this.allocateNumeric(key);
    } else if (typeof value === 'boolean') {
      return this.allocateBoolean(key);
    } else if (typeof value === 'string') {
      return this.allocateString(key);
    } else if (Array.isArray(value)) {
      return this.allocateArray(key);
    } else if (typeof value === 'object' && value !== null) {
      return this.allocateObject(key);
    }
    return this.allocateObject(key);
  }

  allocateNumeric(key: string): number { return this._allocateSlot(key, 'float'); }
  allocateInt(key: string): number { return this._allocateSlot(key, 'int'); }
  allocateBoolean(key: string): number { return this._allocateSlot(key, 'bool'); }
  allocateString(key: string): number { return this._allocateSlot(key, 'string'); }
  allocateObject(key: string): number { return this._allocateSlot(key, 'object'); }
  allocateArray(key: string): number { return this._allocateSlot(key, 'array'); }

  set(key: string, value: unknown): void {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) this.setInt(key, value);
      else this.setNumeric(key, value);
    } else if (typeof value === 'boolean') {
      this.setBoolean(key, value);
    } else if (typeof value === 'string') {
      this.setString(key, value);
    } else if (Array.isArray(value)) {
      this.setArray(key, value);
    } else if (typeof value === 'object' && value !== null) {
      this.setObject(key, value);
    }
  }

  get(key: string): unknown {
    const type = this._typeMap.get(key);
    switch (type) {
      case 'float': return this.getNumeric(key);
      case 'int': return this.getInt(key);
      case 'bool': return this.getBoolean(key);
      case 'string': return this.getString(key);
      case 'array': return this.getArray(key);
      case 'object': return this.getObject(key);
      default: return undefined;
    }
  }

  setNumeric(key: string, value: number): void {
    const index = this.allocateNumeric(key);
    this._floatHeap[index] = value;
  }
  getNumeric(key: string): number | undefined {
    const index = this._indexMap.get(key);
    return index !== undefined ? this._floatHeap[index] : undefined;
  }
  setInt(key: string, value: number): void {
    const index = this.allocateInt(key);
    this._intHeap[index] = value;
  }
  getInt(key: string): number | undefined {
    const index = this._indexMap.get(key);
    return index !== undefined ? this._intHeap[index] : undefined;
  }
  setBoolean(key: string, value: boolean): void {
    const index = this.allocateBoolean(key);
    this._boolHeap[index] = value ? 1 : 0;
  }
  getBoolean(key: string): boolean | undefined {
    const index = this._indexMap.get(key);
    return index !== undefined ? this._boolHeap[index] === 1 : undefined;
  }
  setString(key: string, value: string): void {
    this._allocateSlot(key, 'string');
    if (!this._stringPool.has(value)) {
      this._stringPool.set(value, this._stringPool.size);
    }
    this._stringHeap.set(key, value);
  }
  getString(key: string): string | undefined { return this._stringHeap.get(key); }
  setObject(key: string, value: unknown): void {
    this._allocateSlot(key, 'object');
    this._objectHeap.set(key, value);
  }
  getObject(key: string): unknown | undefined { return this._objectHeap.get(key); }
  setArray(key: string, value: unknown[]): void {
    this._allocateSlot(key, 'array');
    this._arrayHeap.set(key, value);
  }
  getArray(key: string): unknown[] | undefined { return this._arrayHeap.get(key); }
  has(key: string): boolean { return this._indexMap.has(key); }
  getType(key: string): string | undefined { return this._typeMap.get(key); }
  delete(key: string): void {
    this._indexMap.delete(key);
    this._typeMap.delete(key);
    this._stringHeap.delete(key);
    this._objectHeap.delete(key);
    this._arrayHeap.delete(key);
  }
  attachSharedBuffer(sab: SharedArrayBuffer): void {
    if (this._shared) return;
    this._shared = true;
    this._floatHeap = new Float64Array(sab);
    this._intHeap = new Int32Array(sab, this._floatHeap.length * 8);
    this._boolHeap = new Uint8Array(sab, (this._floatHeap.length * 8) + (this._intHeap.length * 4));
    console.log('[SignalHeap] Attached SharedArrayBuffer');
  }
}

export const heap = new SignalHeap();

// =============================================================================
// Ownership & Borrow Tracker
// =============================================================================
const OWNERSHIP_KEY = Symbol.for('nexus.ownership');
const BORROW_KEY = Symbol.for('nexus.borrow');

export interface Ownership {
  ownerId: string;
  refCount: number;
  acquiredAt: number;
}
export interface Borrow {
  borrower: object;
  type: 'immutable' | 'mutable';
  borrowedAt: number;
}

class OwnershipTracker {
  private _ownerships = new WeakMap<object, Ownership>();
  private _borrows = new WeakMap<object, Borrow[]>();

  acquire(value: object, ownerId: string): void {
    const ownership = { ownerId, refCount: 1, acquiredAt: Date.now() };
    this._ownerships.set(value, ownership);
    (value as any)[OWNERSHIP_KEY] = ownership;
  }
  release(value: object, ownerId: string): void {
    const ownership = this._ownerships.get(value);
    if (!ownership || ownership.ownerId !== ownerId) return;
    ownership.refCount--;
    if (ownership.refCount <= 0) {
      this._ownerships.delete(value);
      delete (value as any)[OWNERSHIP_KEY];
    }
  }
  borrowImmutable(value: object, borrower: object): boolean {
    const borrows = this._borrows.get(value) || [];
    if (borrows.some(b => b.type === 'mutable')) return false;
    borrows.push({ borrower, type: 'immutable', borrowedAt: Date.now() });
    this._borrows.set(value, borrows);
    (value as any)[BORROW_KEY] = borrows[borrows.length - 1];
    return true;
  }
  borrowMutable(value: object, borrower: object): boolean {
    const borrows = this._borrows.get(value);
    if (borrows && borrows.length > 0) return false;
    const borrow = { borrower, type: 'mutable' as const, borrowedAt: Date.now() };
    this._borrows.set(value, [borrow]);
    (value as any)[BORROW_KEY] = borrow;
    return true;
  }
  returnBorrow(value: object, borrower: object): void {
    const borrows = this._borrows.get(value);
    if (!borrows) return;
    const idx = borrows.findIndex(b => b.borrower === borrower);
    if (idx !== -1) {
      borrows.splice(idx, 1);
      if (borrows.length === 0) this._borrows.delete(value);
      delete (value as any)[BORROW_KEY];
    }
  }
  validateBorrow(value: object, type: 'immutable' | 'mutable'): void {
    const borrows = this._borrows.get(value);
    if (type === 'mutable' && borrows && borrows.length > 0) {
      throw new Error(`Mutable borrow denied for ${type}: active borrows exist`);
    }
    if (type === 'immutable' && borrows?.some(b => b.type === 'mutable')) {
      throw new Error(`Immutable borrow denied for ${type}: mutable borrow exists`);
    }
  }
  getBorrowers(value: object): Borrow[] { return this._borrows.get(value) || []; }
}

export const ownership = new OwnershipTracker();

// =============================================================================
// Native Proxy-based Reactivity Core
// =============================================================================
export interface ActiveEffect {
  run(): void;
  stop(): void;
  deps: Set<Set<ActiveEffect>>;
  scheduler?: () => void;
}

export type ReactiveEffectRunner<T = any> = (() => T) & { effect: ActiveEffect };

export interface ReactiveEffectOptions {
  lazy?: boolean;
  scheduler?: (...args: any[]) => any;
}

export interface Ref<T = any> { value: T; }
export interface ComputedRef<T = any> extends Ref<T> { readonly value: T; }

const ITERATE_KEY = Symbol('iterate');
const targetMap = new WeakMap<object, Map<string | symbol, Set<ActiveEffect>>>();
let activeEffect: ActiveEffect | null = null;

export function track(target: object, key: string | symbol) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.add(dep);
  }
}

export function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effectsToRun = new Set<ActiveEffect>();
  const addEffects = (effects?: Set<ActiveEffect>) => {
    if (effects) {
      for (const eff of effects) {
        if (eff !== activeEffect) effectsToRun.add(eff);
      }
    }
  };

  addEffects(depsMap.get(key));

  if (Array.isArray(target)) {
    if (key === 'length') {
      depsMap.forEach((effects, k) => {
        if (k === 'length' || (typeof k === 'string' && Number(k) >= (target as any).length)) {
          addEffects(effects);
        }
      });
    } else if (typeof key === 'string' && !isNaN(Number(key))) {
      addEffects(depsMap.get('length'));
      addEffects(depsMap.get(ITERATE_KEY));
    }
  }

  for (const eff of effectsToRun) {
    if (eff.scheduler) eff.scheduler();
    else eff.run();
  }
}

const reactiveMap = new WeakMap<object, any>();
const rawMap = new WeakMap<object, any>();

export function isReactive(value: unknown): boolean { return rawMap.has(value as object); }
export function isProxy(value: unknown): boolean { return isReactive(value); }
export function isReadonly(_value: unknown): boolean { return false; }
export function toRaw<T>(observed: T): T {
  const raw = (observed as any)?.__v_raw;
  return raw ? toRaw(raw) : observed;
}

export function reactive<T extends object>(target: T): T {
  if (!target || typeof target !== 'object') return target;
  if (rawMap.has(target)) return target;

  let proxy = reactiveMap.get(target);
  if (proxy) return proxy;

  proxy = new Proxy(target, {
    get(t, key, receiver) {
      if (key === '__v_raw') return t;
      if (key === '__v_isReactive') return true;
      track(t, key);
      const res = Reflect.get(t, key, receiver);
      if (res && typeof res === 'object') {
        return reactive(res);
      }
      return res;
    },
    set(t, key, value, receiver) {
      const oldVal = Reflect.get(t, key, receiver);
      const oldLength = Array.isArray(t) ? t.length : 0;
      const rawVal = toRaw(value);
      const success = Reflect.set(t, key, rawVal, receiver);

      if (success) {
        const newVal = Reflect.get(t, key, receiver);
        const isNewKey = !Object.prototype.hasOwnProperty.call(t, key);
        if (oldVal !== newVal || (Array.isArray(t) && t.length !== oldLength)) {
          trigger(t, key);
          if (isNewKey) trigger(t, ITERATE_KEY);
        }
      }
      return success;
    },
    deleteProperty(t, key) {
      const hasKey = Object.prototype.hasOwnProperty.call(t, key);
      const success = Reflect.deleteProperty(t, key);
      if (success && hasKey) {
        trigger(t, key);
        trigger(t, ITERATE_KEY);
      }
      return success;
    },
    has(t, key) {
      track(t, key);
      return Reflect.has(t, key);
    },
    ownKeys(t) {
      track(t, Array.isArray(t) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(t);
    }
  });

  reactiveMap.set(target, proxy);
  rawMap.set(proxy, target);
  return proxy;
}

export function shallowReactive<T extends object>(target: T): T { return reactive(target); }
export function readonly<T extends object>(target: T): T { return reactive(target); }
export function shallowReadonly<T extends object>(target: T): T { return reactive(target); }

export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions): ReactiveEffectRunner {
  const effectRunner: ActiveEffect = {
    deps: new Set(),
    scheduler: options?.scheduler,
    run() {
      if (!this.deps) return;
      cleanupEffect(this);
      const lastActiveEffect = activeEffect;
      activeEffect = this;
      try {
        return fn();
      } finally {
        activeEffect = lastActiveEffect;
      }
    },
    stop() {
      cleanupEffect(this);
      this.deps.clear();
      (this as any).deps = null;
    }
  };

  if (!options?.lazy) {
    effectRunner.run();
  }

  const runner = effectRunner.run.bind(effectRunner) as any;
  runner.effect = effectRunner;
  return runner;
}

function cleanupEffect(eff: ActiveEffect) {
  for (const dep of eff.deps) {
    dep.delete(eff);
  }
  eff.deps.clear();
}

export function stop(runner: any) {
  const eff = runner?.effect || runner;
  if (eff && typeof eff.stop === 'function') {
    eff.stop();
  }
}

class RefImpl<T> {
  private _value: T;
  private _rawValue: T;
  public readonly __v_isRef = true;

  constructor(value: T, shallow = false) {
    this._rawValue = shallow ? value : toRaw(value);
    this._value = shallow ? value : (typeof value === 'object' && value !== null ? reactive(value as any) : value);
  }

  get value() {
    track(this, 'value');
    return this._value;
  }

  set value(newValue) {
    newValue = toRaw(newValue);
    if (newValue !== this._rawValue) {
      this._rawValue = newValue;
      this._value = typeof newValue === 'object' && newValue !== null ? reactive(newValue as any) : newValue;
      trigger(this, 'value');
    }
  }
}

export function ref<T>(value?: T): Ref<T> { return new RefImpl(value) as any; }
export function isRef(value: any): value is Ref { return !!(value && value.__v_isRef === true); }
export function shallowRef<T>(value?: T): Ref<T> { return new RefImpl(value, true) as any; }
export function triggerRef(r: any) { trigger(r, 'value'); }
export function unref<T>(r: T | Ref<T>): T { return isRef(r) ? (r.value as any) : r; }

export function customRef<T>(factory: (track: () => void, trigger: () => void) => { get: () => T; set: (value: T) => void }): Ref<T> {
  const { get, set } = factory(
    () => track(refObj, 'value'),
    () => trigger(refObj, 'value')
  );
  const refObj = {
    __v_isRef: true,
    get value() { return get(); },
    set value(v) { set(v); }
  };
  return refObj as any;
}

class ComputedRefImpl<T> {
  private _value!: T;
  private _dirty = true;
  private _runner: any;
  public readonly __v_isRef = true;
  public readonly __v_isReadonly = true;

  constructor(getter: () => T) {
    this._runner = effect(getter, {
      lazy: true,
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true;
          trigger(this, 'value');
        }
      }
    });
  }

  get value() {
    track(this, 'value');
    if (this._dirty) {
      this._value = this._runner();
      this._dirty = false;
    }
    return this._value;
  }
}

export function computed<T>(getter: () => T): ComputedRef<T> { return new ComputedRefImpl(getter) as any; }

export function watch(source: any, cb: any, options?: any) {
  let getter: () => any;
  if (isRef(source)) getter = () => source.value;
  else if (isReactive(source)) getter = () => traverse(source);
  else if (typeof source === 'function') getter = source;
  else if (Array.isArray(source)) {
    getter = () => source.map(s => isRef(s) ? s.value : (isReactive(s) ? traverse(s) : s));
  } else getter = () => {};

  let oldValue: any;
  const job = () => {
    const newValue = runner();
    if (cb) {
      cb(newValue, oldValue);
      oldValue = newValue;
    }
  };

  const runner = effect(getter, {
    lazy: true,
    scheduler: () => {
      if (options?.scheduler) options.scheduler(job);
      else job();
    }
  });

  if (options?.immediate) job();
  else oldValue = runner();

  return () => { stop(runner); };
}

function traverse(value: any, seen = new Set<any>()): any {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  if (isRef(value)) traverse(value.value, seen);
  else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) traverse(value[i], seen);
  } else {
    for (const key of Object.keys(value)) traverse(value[key], seen);
  }
  return value;
}

class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true;
  constructor(private _object: T, private _key: K, private _defaultValue?: T[K]) {}
  get value() {
    const val = this._object[this._key];
    return val === undefined ? this._defaultValue! : val;
  }
  set value(newVal) { this._object[this._key] = newVal; }
}

export function toRef<T extends object, K extends keyof T>(object: T, key: K, defaultValue?: T[K]): Ref<T[K]> {
  const val = object[key];
  return isRef(val) ? val : (new ObjectRefImpl(object, key, defaultValue) as any);
}

export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const ret: any = Array.isArray(object) ? new Array(object.length) : {};
  for (const key in object) ret[key] = toRef(object, key);
  return ret;
}

export function onEffectCleanup(fn: () => void) {
  if (activeEffect) {
    let cleanupFns = (activeEffect as any).cleanupFns;
    if (!cleanupFns) {
      cleanupFns = [];
      (activeEffect as any).cleanupFns = cleanupFns;
      const originalRun = activeEffect.run;
      activeEffect.run = function() {
        for (const cleanup of cleanupFns) {
          try { cleanup(); } catch {}
        }
        cleanupFns.length = 0;
        return originalRun.apply(this, arguments as any);
      };
    }
    cleanupFns.push(fn);
  }
}

let effectIdCounter = 0;

export function elementBoundEffect(
  el: HTMLElement,
  effectCallback: () => void,
  options?: ReactiveEffectOptions
): [ReactiveEffectRunner<void>, () => void] {
  const pendingPromises = new WeakSet<Promise<any>>();
  let pendingCount = 0;
  let consecutiveFailures = 0;
  let lastErrorMessage = '';

  const suspenseWrappedCallback = () => {
    try {
      effectCallback();
      consecutiveFailures = 0;
      lastErrorMessage = '';
    } catch (err) {
      if (err instanceof Promise) {
        if (pendingPromises.has(err)) return;
        if ((window as any)._nexusDebug) console.debug(`[Nexus Suspense] <${el.tagName}> suspended pending network resolution.`);
        pendingCount++;
        pendingPromises.add(err);
        err.finally(() => {
          pendingCount--;
          pendingPromises.delete(err);
          if ((window as any)._nexusDebug) console.debug(`[Nexus Suspense] <${el.tagName}> resumed.`);
          if (runner) {
            let reEntryCount = 0;
            const MAX_REENTRY = 10;
            const safeRun = () => {
              if (pendingCount > 0) return;
              if (reEntryCount++ > MAX_REENTRY) {
                console.warn(`[Nexus Loop Guard] Stopped runaway effect on <${el.tagName}> after ${MAX_REENTRY} re-entries.`);
                return;
              }
              runner();
            };
            queueMicrotask(safeRun);
          }
        });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === lastErrorMessage) consecutiveFailures++;
        else {
          consecutiveFailures = 1;
          lastErrorMessage = msg;
        }

        if (consecutiveFailures >= 3) {
          console.error(`[Nexus Diagnostic] Persistent error on <${el.tagName}> (${consecutiveFailures}x):`, err);
          reportError(err instanceof Error ? err : new Error(msg), el, `Persistent failure (${consecutiveFailures}x) — effect quarantined`);
          stop(runner);
          const enhanced = el as NexusEnhancedElement;
          enhanced[EFFECT_RUNNERS_KEY]?.delete(runner);
        } else {
          if ((globalThis as any).Nexus?.coordinator?.runtimeContext?.isDevMode) {
            console.debug(`[Nexus Transient] <${el.tagName}> effect attempt ${consecutiveFailures}/3:`, msg);
          }
        }
      }
    }
  };

  let runner: ReactiveEffectRunner<void>;
  try {
    const schedulerOptions: ReactiveEffectOptions = {
      scheduler: () => { scheduler.enqueueEvaluate(runner); },
      ...options
    };
    runner = effect(suspenseWrappedCallback, schedulerOptions);
  } catch (e) {
    console.error(`[Reactivity Error] effect() failed for <${el.tagName}>:`, e);
    throw e;
  }

  const enhancedEl = el as NexusEnhancedElement;
  if (!enhancedEl[EFFECT_RUNNERS_KEY]) {
    enhancedEl[EFFECT_RUNNERS_KEY] = new Set();
    if (!(enhancedEl as any).nexus) (enhancedEl as any).nexus = {};
    (enhancedEl as any).nexus.effectRunners = enhancedEl[EFFECT_RUNNERS_KEY];
  }
  enhancedEl[EFFECT_RUNNERS_KEY].add(runner);

  if (!enhancedEl[RUN_EFFECT_RUNNERS_KEY]) {
    enhancedEl[RUN_EFFECT_RUNNERS_KEY] = () => {
      if (!enhancedEl[EFFECT_RUNNERS_KEY]) return;
      for (const r of enhancedEl[EFFECT_RUNNERS_KEY]) {
        try {
          r();
        } catch (err) {
          console.error(`[Nexus Isolation] Effect failed on <${enhancedEl.tagName}>, isolated from ${enhancedEl[EFFECT_RUNNERS_KEY]!.size - 1} sibling effects:`, err);
          reportError(err instanceof Error ? err : new Error(String(err)), enhancedEl, 'Isolated effect failure');
        }
      }
    };
  }

  const cleanup = () => {
    stop(runner);
    const enhancedEl = el as NexusEnhancedElement;
    if (enhancedEl[EFFECT_RUNNERS_KEY]) {
      enhancedEl[EFFECT_RUNNERS_KEY].delete(runner);
      if (enhancedEl[EFFECT_RUNNERS_KEY].size === 0) {
        delete enhancedEl[EFFECT_RUNNERS_KEY];
        delete enhancedEl[RUN_EFFECT_RUNNERS_KEY];
      }
    }
  };

  if (!enhancedEl[CLEANUP_FUNCTIONS_KEY]) {
    enhancedEl[CLEANUP_FUNCTIONS_KEY] = new Map();
  }
  const cleanupKey = `effect-${effectIdCounter++}`;
  enhancedEl[CLEANUP_FUNCTIONS_KEY].set(cleanupKey, cleanup);

  return [runner, cleanup];
}

// ZCZS woven unifiedRef implementation
export function unifiedRef<T extends Record<string, unknown>>(
  initialValue: T,
  key?: string,
  typeHints?: Record<string, 'number' | 'boolean' | 'string' | 'object'>
): ReturnType<typeof customRef<T>> {
  const heapKey = key || `unified_${Math.random().toString(36).slice(2)}`;
  if (typeHints) {
    Object.entries(typeHints).forEach(([k, type]) => {
      const fullKey = `${heapKey}.${k}`;
      if (type === 'number') heap.allocateNumeric(fullKey);
      else if (type === 'boolean') heap.allocateBoolean(fullKey);
      else if (type === 'string') heap.setString(fullKey, '');
    });
  } else {
    Object.entries(initialValue).forEach(([k, v]) => {
      const fullKey = `${heapKey}.${k}`;
      if (typeof v === 'number') heap.allocateNumeric(fullKey);
      else if (typeof v === 'boolean') heap.allocateBoolean(fullKey);
    });
  }

  let state = reactive(initialValue);
  const ownerId = heapKey;
  ownership.acquire(state, ownerId);

  return customRef<T>((track, trigger) => ({
    get() {
      track();
      ownership.validateBorrow(state, 'immutable');
      return state as T;
    },
    set(newValue) {
      ownership.validateBorrow(state, 'mutable');
      if (newValue && typeof newValue === 'object') {
        Object.entries(newValue).forEach(([k, v]) => {
          const fullKey = `${heapKey}.${k}`;
          heap.set(fullKey, v);
          (state as any)[k] = v;
        });
      } else {
        state = newValue as any;
      }
      trigger();
    }
  }));
}

// ZCZS woven unifiedComputed implementation
export function unifiedComputed<T>(getter: () => T, key?: string): ComputedRef<T> {
  const heapKey = key || `computed_${Math.random().toString(36).slice(2)}`;
  return computed<any>(() => {
    const value = getter();
    heap.set(heapKey, value);
    return value;
  });
}

export interface NexusEnhancedElement extends HTMLElement {
  [EFFECT_RUNNERS_KEY]?: Set<ReactiveEffectRunner<void>>;
  [RUN_EFFECT_RUNNERS_KEY]?: () => void;
  [CLEANUP_FUNCTIONS_KEY]?: Map<string, () => void>;
  [DATA_STACK_KEY]?: Record<string, unknown>[];
  [MARKER_KEY]?: number;
}
