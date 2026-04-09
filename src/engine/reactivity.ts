/// <reference path="./composition.ts" />
import {
  effect,
  stop,
  reactive,
  toRaw,
  isReactive,
  isReadonly,
  isProxy,
  readonly,
  shallowReactive,
  shallowReadonly,
  shallowRef,
  customRef,
  triggerRef,
  unref,
  ref,
  isRef,
  toRefs,
  toRef,
  computed,
  watch,
  onEffectCleanup,
  ReactiveEffectOptions,
  ReactiveEffectRunner,
  Ref,
  ComputedRef
} from '@vue/reactivity';

import { CLEANUP_FUNCTIONS_KEY, EFFECT_RUNNERS_KEY, RUN_EFFECT_RUNNERS_KEY, DATA_STACK_KEY, MARKER_KEY } from './consts.ts';

// =============================================================================
// ZCZS: Zero-Copy Zero-Serialization Infrastructure (Embedded)
// =============================================================================

/** Detect SharedArrayBuffer support (Cross-Origin Isolation required) */
export const ZCZS_SUPPORTED = typeof SharedArrayBuffer !== 'undefined';

/**
 * Binary Signal Heap for Zero-Copy Zero-Serialization
 * §5.2: Comprehensive typed array backing for all signal types
 * 
 * Memory layout:
 * - Float64Array: numbers (8 bytes each)
 * - Int32Array: integers, timestamps (4 bytes each)  
 * - Uint8Array: booleans, flags (1 byte each)
 * - String pool: interned strings for deduplication
 * - Object references: stored in Maps with identity tracking
 */
class SignalHeap {
  private _floatHeap: Float64Array;
  private _intHeap: Int32Array;
  private _boolHeap: Uint8Array;
  private _stringHeap: Map<string, string>;
  private _stringPool: Map<string, number>; // String interning
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

  /**
   * Allocate a slot and track the type for a key
   */
  private _allocateSlot(key: string, type: 'float' | 'int' | 'bool' | 'string' | 'object' | 'array'): number {
    if (this._indexMap.has(key)) {
      // Update type if key already exists
      this._typeMap.set(key, type);
      return this._indexMap.get(key)!;
    }
    const index = this._nextIndex++;
    this._indexMap.set(key, index);
    this._typeMap.set(key, type);
    return index;
  }

  /**
   * Detect the type of a value and allocate accordingly
   */
  allocateForValue(key: string, value: unknown): number {
    if (typeof value === 'number') {
      // Check if integer or float
      if (Number.isInteger(value)) {
        return this.allocateInt(key);
      }
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
    // Default - treat as object reference
    return this.allocateObject(key);
  }

  allocateNumeric(key: string): number {
    return this._allocateSlot(key, 'float');
  }

  allocateInt(key: string): number {
    return this._allocateSlot(key, 'int');
  }

  allocateBoolean(key: string): number {
    return this._allocateSlot(key, 'bool');
  }

  allocateString(key: string): number {
    return this._allocateSlot(key, 'string');
  }

  allocateObject(key: string): number {
    return this._allocateSlot(key, 'object');
  }

  allocateArray(key: string): number {
    return this._allocateSlot(key, 'array');
  }

  /**
   * Set a value - automatically detects type and stores appropriately
   */
  set(key: string, value: unknown): void {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        this.setInt(key, value);
      } else {
        this.setNumeric(key, value);
      }
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

  /**
   * Get a value - automatically retrieves from correct heap based on type
   */
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
    // String interning for deduplication
    if (!this._stringPool.has(value)) {
      this._stringPool.set(value, this._stringPool.size);
    }
    this._stringHeap.set(key, value);
  }

  getString(key: string): string | undefined { 
    return this._stringHeap.get(key); 
  }

  setObject(key: string, value: unknown): void {
    this._allocateSlot(key, 'object');
    this._objectHeap.set(key, value);
  }

  getObject(key: string): unknown | undefined { 
    return this._objectHeap.get(key); 
  }

  setArray(key: string, value: unknown[]): void {
    this._allocateSlot(key, 'array');
    this._arrayHeap.set(key, value);
  }

  getArray(key: string): unknown[] | undefined { 
    return this._arrayHeap.get(key); 
  }

  has(key: string): boolean { 
    return this._indexMap.has(key); 
  }

  getType(key: string): string | undefined {
    return this._typeMap.get(key);
  }

  delete(key: string): void {
    this._indexMap.delete(key);
    this._typeMap.delete(key);
    this._stringHeap.delete(key);
    this._objectHeap.delete(key);
    this._arrayHeap.delete(key);
  }

  /**
   * Attach a SharedArrayBuffer for cross-thread communication (Tier 1+)
   */
  attachSharedBuffer(sab: SharedArrayBuffer): void {
    if (this._shared) return; // Already using shared buffer
    
    this._shared = true;
    this._floatHeap = new Float64Array(sab);
    this._intHeap = new Int32Array(sab, this._floatHeap.length * 8);
    this._boolHeap = new Uint8Array(sab, (this._floatHeap.length * 8) + (this._intHeap.length * 4));
    
    console.log('[SignalHeap] Attached SharedArrayBuffer');
  }
}

/** Global Signal Heap - singleton */
export const heap = new SignalHeap();

// =============================================================================
// Rust-inspired Ownership & Borrow Semantics (Embedded)
// =============================================================================

const OWNERSHIP_KEY = Symbol.for('nexus.ownership');
const BORROW_KEY = Symbol.for('nexus.borrow');

export interface Ownership {
  ownerId: string;
  refCount: number;
  acquiredAt: number;
}

export interface Borrow {
  borrower : object;
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
      // WeakMap handles deletion from its internal table automatically
      // when the key is no longer reachable, but we can explicitly delete it too.
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

  getBorrowers(value: object): Borrow[] {
    return this._borrows.get(value) || [];
  }
}

/** Global Ownership Tracker - singleton */
export const ownership = new OwnershipTracker();

/**
 * Unified Signal - ZCZS woven into Vue's customRef
 * 
 * This is NOT a context switch between ZCZS and Vue reactivity.
 * Instead, it weaves typed arrays directly INTO Vue's reactivity system:
 * - Numeric/boolean values use typed arrays (ZCZS zero-copy)
 * - Object/array values use Vue's reactive proxies (deep reactivity)
 * - Borrow semantics are integrated into get/set (Rust-inspired)
 * 
 * @param initialValue - The initial state object
 * @param key - Optional key for heap allocation
 * @param typeHints - Optional map of key -> type for pre-allocation (from expression parsing)
 */
export function unifiedRef<T extends Record<string, unknown>>(
  initialValue: T,
  key?: string,
  typeHints?: Record<string, 'number' | 'boolean' | 'string' | 'object'>
): ReturnType<typeof customRef<T>> {
  const heapKey = key || `unified_${Math.random().toString(36).slice(2)}`;
  
  // Pre-allocate heap slots for numeric/boolean values
  // Use typeHints if provided (from expression parsing), otherwise infer from initialValue
  if (typeHints) {
    // Type hints provided - use them for precise pre-allocation
    Object.entries(typeHints).forEach(([k, type]) => {
      const fullKey = `${heapKey}.${k}`;
      if (type === 'number') heap.allocateNumeric(fullKey);
      else if (type === 'boolean') heap.allocateBoolean(fullKey);
      else if (type === 'string') heap.setString(fullKey, '');
    });
  } else {
    // No type hints - infer from initialValue (backward compatible)
    Object.entries(initialValue).forEach(([k, v]) => {
      const fullKey = `${heapKey}.${k}`;
      if (typeof v === 'number') heap.allocateNumeric(fullKey);
      else if (typeof v === 'boolean') heap.allocateBoolean(fullKey);
    });
  }
  
  // Wrap initialValue in Vue's deep reactivity proxy
  let state = reactive(initialValue);
  
  // Acquire ownership (Rust-inspired)
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
          // Sync properties to the reactive state
          (state as any)[k] = v;
        });
      } else {
        // If non-object value is set, we must replace the whole state
        // (This happens during two-way binding to simple signals)
        state = newValue as any;
      }
      
      trigger();
    }
  }));
}

/**
 * Unified Computed - ZCZS woven into Vue computed
 */
export function unifiedComputed<T>(
  getter: () => T,
  key?: string
): ComputedRef<T> {
  const heapKey = key || `computed_${Math.random().toString(36).slice(2)}`;
  
  return computed<any>(() => {
    const value = getter();
    
    // Track all value types in heap (ZCZS)
    // Use heap.set() which auto-detects type
    heap.set(heapKey, value);
    
    return value;
  });
}

export {
  reactive,
  effect,
  stop,
  toRaw,
  isReactive,
  isReadonly,
  isProxy,
  readonly,
  shallowReactive,
  shallowReadonly,
  customRef,
  triggerRef,
  unref,
  ref,
  isRef,
  toRefs,
  toRef,
  shallowRef,
  computed,
  watch,
  onEffectCleanup,
  type ReactiveEffectRunner,
  type Ref
};

export interface NexusEnhancedElement extends HTMLElement {
  [EFFECT_RUNNERS_KEY]?: Set<ReactiveEffectRunner<void>>;
  [RUN_EFFECT_RUNNERS_KEY]?: () => void;
  [CLEANUP_FUNCTIONS_KEY]?: Map<string, () => void>;
  [DATA_STACK_KEY]?: Record<string, unknown>[];
  [MARKER_KEY]?: number;
}

/**
 * Value-Pooling Reactive Core implementation.
 * Eliminates GC pressure by reusing effect records and tracker objects.
 */

let effectIdCounter = 0;


/**
 * Creates a reactive effect that is automatically stopped when the associated HTMLElement is removed from the DOM.
 */
export function elementBoundEffect(
  el: HTMLElement,
  effectCallback: () => void,
  options?: ReactiveEffectOptions
): [ReactiveEffectRunner<void>, () => void] {

  // Track which promises are currently pending for this specific effect to avoid multiple finally() listeners
  // which can lead to infinite microtask loops on settled promises from cache.
  const pendingPromises = new WeakSet<Promise<any>>();
  let pendingCount = 0;

  // Wrap the callback to catch Suspense Promises thrown by network proxies
  const suspenseWrappedCallback = () => {
    try {
      effectCallback();
    } catch (err) {
      if (err instanceof Promise) {
        // Deep Suspense Proxy tripped. Suspend this specific effect and resume when resolved.
        if (pendingPromises.has(err)) return; // Already waiting for this one

        if ((window as any)._nexusDebug) console.debug(`[Nexus Suspense] <${el.tagName}> suspended pending network resolution.`);
        
        pendingCount++;
        pendingPromises.add(err);
        err.finally(() => {
          pendingCount--;
          pendingPromises.delete(err);
          if ((window as any)._nexusDebug) console.debug(`[Nexus Suspense] <${el.tagName}> resumed.`);
          
          if (runner) {
            // Re-entry guard to break potential microtask infinite loops
            // if a promise settles instantly or triggers immediate re-throw.
            let reEntryCount = 0;
            const MAX_REENTRY = 10;

            const safeRun = () => {
              if (pendingCount > 0) return; // Wait for the new pending promise
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
        throw err; // Standard error, bubble up
      }
    }
  };

  let runner: ReactiveEffectRunner<void>;
  try {
    runner = effect(suspenseWrappedCallback, options);
  } catch (e) {
    console.error(`[Reactivity Error] effect() failed for <${el.tagName}>:`, e);
    throw e;
  }

  const enhancedEl = el as NexusEnhancedElement;

  if (!enhancedEl[EFFECT_RUNNERS_KEY]) {
    enhancedEl[EFFECT_RUNNERS_KEY] = new Set();
  }
  enhancedEl[EFFECT_RUNNERS_KEY].add(runner);

  if (!enhancedEl[RUN_EFFECT_RUNNERS_KEY]) {
    enhancedEl[RUN_EFFECT_RUNNERS_KEY] = () => {
      if (enhancedEl[EFFECT_RUNNERS_KEY]) {
        enhancedEl[EFFECT_RUNNERS_KEY].forEach((r: ReactiveEffectRunner<void>) => r());
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
  // Use monotonic counter to avoid key collision after cleanup+re-add cycles.
  const cleanupKey = `effect-${effectIdCounter++}`;
  enhancedEl[CLEANUP_FUNCTIONS_KEY].set(cleanupKey, cleanup);

  return [runner, cleanup];
}
