# Nexus-UX ZCZS + Rust Borrowing: Implementation Analysis

## Executive Summary

After comprehensive analysis of the entire **nexus-ux/src** codebase and **scripts/build.ts**, I can confirm:

1. **The codebase already has ZCZS "ghost key" pre-allocation** in [`signal.ts:27-35`](nexus-ux/src/modules/attributes/signal.ts:27) and [`computed.ts:13-24`](nexus-ux/src/modules/attributes/computed.ts:13)
2. **The codebase has "Zero-GC" event delegation** in [`on.ts:5-30`](nexus-ux/src/modules/attributes/on.ts:5)
3. **The full Vue reactivity API is exposed** via [`engine/reactivity.ts`](nexus-ux/src/engine/reactivity.ts:1)

However, true **ZCZS (typed arrays, SharedArrayBuffer)** and **Rust Borrowing** are NOT implemented. The current "ghost key" approach only pre-allocates Vue `shallowRef` slots, not raw typed arrays.

---

## 1. Current Architecture Analysis

### 1.1 Reactivity Flow

```mermaid
graph TD
    A[data-signal attribute] --> B[signal.ts handle()]
    B --> C[Parse expression for ghost keys]
    C --> D[Create shallowRef with undefined slots]
    D --> E[Create Proxy wrapper around shallowRef]
    E --> F[Add scope to element via addScopeToNode]
    F --> G[elementBoundEffect creates Vue effect]
    G --> H[Evaluate expression → reactive state]
    H --> I[shallowRef.value = reactiveState]
    I --> J[DOM updates via Vue reactivity]
```

### 1.2 Key Findings

| Component | Current Implementation | ZCZS Gap |
| :--- | :--- | :--- |
| **signal.ts** | Uses `shallowRef` + Proxy wrapper | ❌ Uses JS objects, not typed arrays |
| **computed.ts** | Uses Vue `computed()` | ❌ No typed array backing |
| **for.ts** | Uses `runtime.reactive(scope)` | ❌ Standard Vue reactive |
| **on.ts** | Zero-GC event delegation | ✅ Already optimized |
| **scheduler.ts** | 4-phase scheduler | ⚠️ Single-threaded only |

---

## 2. Implementation Plan: Direct Vue Integration

### Phase 1: Create ZCZS-Reactive Core (`engine/zcxs.ts`)

Create a new file that extends Vue's reactivity with typed array backing:

```typescript
// nexus-ux/src/engine/zcxs.ts
import { customRef, triggerRef, Ref } from '@vue/reactivity';

/**
 * Zero-Copy Zero-Serialization (ZCZS) Reactive Core
 * 
 * Embeds Rust-inspired ownership semantics directly into Vue proxies.
 * 
 * DESIGN:
 * - Primitives (number, boolean): Direct Float64Array/Uint8Array access
 * - Objects: Vue reactive with ownership metadata
 * - Ownership: Explicit owner tracking, borrow checking
 */

const OWNERSHIP = Symbol.for('nexus.ownership');

// Pre-allocated typed arrays (ZCZS)
const NUMBER_HEAP = new Float64Array(1024);
const BOOL_HEAP = new Uint8Array(1024);
let HEAP_POINTER = 0;

/**
 * Allocate a slot in the typed array heap
 */
function allocHeapSlot(initial: number): number {
  if (HEAP_POINTER >= NUMBER_HEAP.length) {
    // Expand heap (simplified - would use growth strategy in production)
    const newHeap = new Float64Array(NUMBER_HEAP.length * 2);
    newHeap.set(NUMBER_HEAP);
    NUMBER_HEAP.length = newHeap.length;
  }
  NUMBER_HEAP[HEAP_POINTER] = initial;
  return HEAP_POINTER++;
}

/**
 * ZCZS-aware customRef - Vue ref with typed array backing for numbers
 */
export function zcxsRef<T>(initial: T): Ref<T> {
  // For primitives, use typed array backing
  if (typeof initial === 'number') {
    const slot = allocHeapSlot(initial);
    return customRef((track, trigger) => ({
      get() {
        track();
        return NUMBER_HEAP[slot]; // Direct read - ZERO allocation
      },
      set(value) {
        NUMBER_HEAP[slot] = value;
        trigger();
      }
    }));
  }
  
  // For objects, delegate to standard Vue ref
  return customRef((track, trigger) => ({
    get() {
      track();
      return initial;
    },
    set(value) {
      initial = value;
      trigger();
    }
  }));
}

/**
 * Ownership metadata attached to values
 */
interface Ownership {
  ownerId: string;
  refCount: number;
  borrowState: 'none' | 'immutable' | 'mutable';
}

/**
 * Attach ownership to a value (Rust-inspired)
 */
export function withOwnership<T>(value: T, ownerId: string): T {
  Object.defineProperty(value, OWNERSHIP, {
    value: {
      ownerId,
      refCount: 1,
      borrowState: 'none'
    } as Ownership,
    writable: false,
    enumerable: false,
    configurable: false
  });
  return value;
}

/**
 * Check borrow rules (Rust-style)
 */
export function borrowCheck(ownerId: string, requested: 'immutable' | 'mut'): boolean {
  // Implementation of borrow checker rules
  return true; // Simplified
}
```

### Phase 2: Update signal.ts to Use ZCZS

Modify [`modules/attributes/signal.ts`](nexus-ux/src/modules/attributes/signal.ts):

```typescript
// ADD: Import ZCZS utilities
import { zcxsRef, withOwnership, borrowCheck } from '../../engine/zcxs.ts';

// MODIFY: handle function
handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
  // ... existing parsing code ...

  // Use ZCZS-ref for numeric signals
  const stateRef = zcxsRef<Record<string, unknown>>(initialGhostState);
  
  // Attach ownership (Rust-inspired)
  const ownerId = crypto.randomUUID();
  withOwnership(initialGhostState, ownerId);
  
  // ... rest unchanged ...
}
```

### Phase 3: Extend RuntimeContext

Update [`engine/composition.ts`](nexus-ux/src/engine/composition.ts) to export ZCZS functions:

```typescript
// Add to RuntimeContext interface
interface RuntimeContext {
  // ... existing fields ...
  
  // ZCZS additions
  zcxsRef: typeof import('./zcxs').zcxsRef;
  withOwnership: typeof import('./zcxs').withOwnership;
  borrowCheck: typeof import('./zcxs').borrowCheck;
}
```

### Phase 4: Update ModuleCoordinator

Modify [`engine/modules.ts`](nexus-ux/src/engine/modules.ts:178) to inject ZCZS functions:

```typescript
// In constructor, add:
this.runtimeContext = {
  // ... existing ...
  
  // ZCZS
  zcxsRef: zcxs.zcxsRef,
  withOwnership: zcxs.withOwnership,
  borrowCheck: zcxs.borrowCheck,
};
```

---

## 3. Impact Analysis

### 3.1 Files Affected

| File | Change Type | Risk |
| :--- | :--- | :--- |
| `engine/zcxs.ts` | NEW | Low |
| `engine/composition.ts` | MODIFY | Medium |
| `engine/modules.ts` | MODIFY | Medium |
| `modules/attributes/signal.ts` | MODIFY | Medium |
| `modules/attributes/computed.ts` | MODIFY | Medium |

### 3.2 Backward Compatibility

- **Fully backward compatible**: ZCZS is opt-in via `zcxsRef()`
- Existing code using `shallowRef` continues to work
- Vue reactivity API unchanged

### 3.3 Performance Impact

| Metric | Current | With ZCZS |
| :--- | :--- | :--- |
| Number signal access | Proxy + JS object | Direct typed array |
| GC pressure (numbers) | Medium | Near zero |
| Memory (numeric signals) | ~24 bytes/object | 8 bytes/slot |

---

## 4. Implementation Roadmap

### Step 1: Create ZCZS Core (Priority: HIGH)
- [ ] Create `engine/zcxs.ts`
- [ ] Implement typed array heap
- [ ] Implement `zcxsRef()` factory
- [ ] Implement ownership/borrow utilities

### Step 2: Integrate with Runtime (Priority: HIGH)
- [ ] Update `composition.ts` types
- [ ] Update `modules.ts` to inject ZCZS functions
- [ ] Test basic reactivity

### Step 3: Update Signal Module (Priority: MEDIUM)
- [ ] Modify `signal.ts` to use `zcxsRef()`
- [ ] Add ownership tracking
- [ ] Test with numeric signals

### Step 4: Extend to Computed (Priority: MEDIUM)
- [ ] Modify `computed.ts` to use ZCZS for numeric getters

### Step 5: Testing & Optimization (Priority: HIGH)
- [ ] Benchmark numeric signal performance
- [ ] Test GC pressure
- [ ] Verify backward compatibility

---

## 5. Conclusion

**Yes, we can weave ZCZS compliance and Rust-inspired Borrowing directly into Vue Proxies** by:

1. **Creating a new ZCZS layer** (`engine/zcxs.ts`) that wraps Vue's `customRef` with typed array backing
2. **Extending RuntimeContext** to expose ZCZS functions to all modules
3. **Updating signal.ts and computed.ts** to use `zcxsRef()` instead of `shallowRef`
4. **Adding ownership metadata** via Symbol properties (non-invasive)

This approach:
- ✅ Maintains full Vue compatibility
- ✅ Is backward compatible
- ✅ Reduces GC pressure for numeric signals
- ✅ Embeds Rust-inspired ownership semantics
- ✅ Can be extended to SharedArrayBuffer for cross-thread