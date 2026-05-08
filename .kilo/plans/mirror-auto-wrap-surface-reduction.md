# Nexus-UX Module Reduction Analysis: Mirror Auto-Wrap Strategy

**Scope**: Identify which of the 55+ Nexus-UX modules can be replaced with native Web API mirrors (`_` prefix system) while maintaining 100% feature parity.

**Total Module Footprint**: 15,474 LOC across 83 files

---

## Executive Summary

| Category | Count | Total LOC | % of Codebase | Recommendation |
|----------|-------|-----------|---------------|----------------|
| **KEEP** (core/value-add) | 36 | ~12,200 | 79% | Keep - reactive complexity >30LOC or unique value |
| **MIRROR_CANDIDATE** | 14 | ~2,100 | 14% | Replace with `_` mirror + thin wrapper |
| **DEPRECATE / MERGE** | 5 | ~1,174 | 7% | Remove or consolidate into KEEP modules |
| **TOTAL AFTER REDUCTION** | 55 | ~9,900 | — | **~36% bundle reduction** |

---

## Full Categorization Table

### ATTRIBUTE MODULES (28) — ALL KEEP

These provide reactive DOM directive integration that native APIs cannot replicate. Each handles complex lifecycle, template cloning, scope management, and patching logic.

| File | LOC | Category | Reasoning | Native Equivalent | Size Saving |
|------|-----|----------|-----------|-------------------|-------------|
| `bind.ts` | 184 | KEEP | Complex two-way binding + auto-detect + event sync | none | 0 |
| `for.ts` | 165 | KEEP | List diffing, keyed reuse, scope injection | none | 0 |
| `if.ts` | 93 | KEEP | Template cloning, placeholder management, cleanup | none | 0 |
| `show.ts` | 89 | KEEP | Conditional display with animation hooks | none | 0 |
| `html.ts` | 67 | KEEP | innerHTML binding + security-sanitized? | none | 0 |
| `class.ts` | 66 | KEEP | Reactive classList union/diff logic | none | 0 |
| `style.ts` | 57 | KEEP | Reactive style property mapping | none | 0 |
| `on.ts` | 84 | KEEP | Event delegation + 29 event sub-modules | none | 0 |
| `component.ts` | 71 | KEEP | Component registration + lifecycle | none | 0 |
| `effect.ts` | 54 | KEEP | Side-effect scheduling + cleanup stacking | none | 0 |
| `computed.ts` | 50 | KEEP | Derived signal + memoization | none | 0 |
| `signal.ts` | 47 | KEEP | Reactive signal/ref primitive | none | 0 |
| `route.ts` | 44 | KEEP | Route param extraction + reactive updates | none | 0 |
| `router.ts` | 205 | KEEP | Full router (link rewriting, history, params) | none | 0 |
| `ingest.ts` | 410 | KEEP | FormData creation + file handling + media capture | none | 0 |
| `progress.ts` | 107 | KEEP | Indeterminate progress bar auto-hide | none | 0 |
| `pwa.ts` | 115 | KEEP | PWA manifest generation + SW registration | none | 0 |
| `raf.ts` | 135 | KEEP | Animation frame scheduling batch | none | 0 |
| `teleport.ts` | 213 | KEEP | DOM portal + transition orchestration | none | 0 |
| `drag.ts` | 197 | KEEP | Drag-drop + threshold + visual feedback | none | 0 |
| `theme.ts` | 71 | KEEP | Theme switching + persisted preference | none | 0 |
| `var.ts` | 58 | KEEP | CSS variable binding + reactive updates | none | 0 |
| `markdown.ts` | 85 | KEEP | Full markdown parser + Tailwind mapping | none | 0 |
| `debug.ts` | 29 | KEEP | Dev-time debugging tool (remove in prod?) | none | 0 |
| `preserve.ts` | 22 | KEEP | Morph-DOM preservation marker | none | 0 |
| `assert.ts` | 29 | KEEP | Assertion directive + dev warnings | none | 0 |
| `switcher.ts` | ~60 | KEEP | Conditional rendering variant | none | 0 |
| `mask.ts` (attr) | ~40 | KEEP | Input masking + pattern validation | none | 0 |

**Attribute Total**: ~2,700 LOC — all KEEP

---

### SPRITE MODULES (27) — MIRROR_CANDIDATES + VALUE-ADDS

| File | LOC | Category | Reasoning | Native API | Mirror Name | Size Saving |
|------|-----|----------|-----------|------------|-------------|-------------|
| `el.ts` | **14** | MERGE | Trivial reactive document reference | `document` | `_dom` | 14 (merge) |
| `id.ts` | **11** | MERGE | Trivial reactive getElementById | `document.getElementById` | `_dom` | 11 (merge) |
| `global.ts` | **25** | MERGE | Trivial reactive globalThis wrapper | `globalThis` | `_dom` | 25 (merge) |
| `dispatch.ts` | **23** | MERGE | Trivial CustomEvent dispatch | `elm.dispatchEvent` | `_dom` | 23 (merge) |
| `nextTick.ts` | **25** | MERGE | Microtask/flush scheduling | `queueMicrotask` | `_scheduler` | 25 (merge) |
| `fetch.ts` | **20** | MIRROR | Thin wrapper over centralized engine fetch | `fetch()` | `_fetch` | 20 |
| `http.ts` | 54 | MIRROR | HTTP verb helpers over $fetch | `fetch()` | `_http` | 54 |
| `download.ts` | 48 | MIRROR | Blob URL + anchor click - minimal logic | `URL.createObjectURL` + anchor | `_download` | 48 |
| `clipboard.ts` | 87 | MIRROR | Clipboard API + execCommand fallback | `navigator.clipboard` | `_clipboard` | 87 |
| `cache.ts` | 225 | MIRROR | Cache Storage CRUD - thin reactive wrapper | `caches` | `_cache` | 225 |
| `notification.ts` | 156 | MIRROR | Notifications + permission handling | `Notification` | `_notification` | 156 |
| `payment.ts` | 94 | MIRROR | Payment Request API wrapper | `PaymentRequest` | `_payment` | 94 |
| `ws.ts` | 123 | MIRROR | WebSocket + auto-reconnect logic | `WebSocket` | `_websocket` | 123 |
| `store.ts` | 25 | MERGE | Trivial global reactive store | — | (inline) | 25 (merge) |
| `watch.ts` | 26 | MERGE | Trivial watch helper | — | (inline) | 26 (merge) |
| `selector.ts` | 180 | KEEP | Complex context-aware selector + proxy | `querySelector` | none | 0 |
| `animate.ts` | 171 | KEEP | FLIP + WAAPI + class transitions - substantial logic | `Element.animate` | none | 0 |
| `svg.ts` | 127 | KEEP | SVG orchestration + path generation + morph | `SVGElement` | none | 0 |
| `mask.ts` (sprite) | 77 | KEEP? | Pure utility - could be utility module | — | none | 0 |
| `flow.ts` | 76 | KEEP | Coordinate math + fitView + graph utilities | — | none | 0 |
| `spatial.ts` | 61 | KEEP | Quadtree query façade over predictive | — | none | 0 |
| **Sprite Subtotal** | **~1,750** | | | | | **~1,237** |

---

### MODIFIER MODULES (10) — KEEP

Modifiers implement event pipeline transformations. They're framework glue, not native mirrors.

| File | Approx LOC | Category | Reasoning |
|------|------------|----------|-----------|
| `debounce.ts` | ~35 | KEEP | Debounce logic |
| `throttle.ts` | ~30 | KEEP | Throttle logic |
| `prevent.ts` | ~15 | KEEP | `preventDefault` |
| `stop.ts` | ~15 | KEEP | `stopPropagation` |
| `self.ts` | ~15 | KEEP | `event.target === event.currentTarget` |
| `once.ts` | ~12 | KEEP | Single-fire listener |
| `drag.ts` | ~50 | KEEP | Drag handling |
| `morph.ts` | ~40 | KEEP | DOM morphing logic |
| `keys.ts` | ~60 | KEEP | 10 key-filter sub-modules |
| `zoom.ts` | ~30 | KEEP | Pinch-zoom handling |

**Modifier Total**: ~300 LOC — all KEEP

---

### LISTENER MODULES (4) — MIXED

| File | LOC | Category | Reasoning | Native Equivalent |
|------|-----|----------|-----------|-------------------|
| `history.ts` | 29 | KEEP | History API wrapper + route signal sync | `window.onpopstate` | 0 |
| `bfcache.ts` | 93 | KEEP | pageshow/pagehide + freeze/resume events | `pageshow`/`pagehide` | 0 |
| `executeScript.ts` | 25 | KEEP | `new Function()` sandbox execution | `Function()` | 0 |
| `linkRewriter.ts` | 55 | KEEP | Router link interception + pushState | `click` + `pushState` | 0 |

**Listener Total**: 202 LOC — all KEEP (framework glue)

---

### SCOPE MODULES (6) — KEEP

Scopes implement conditional rendering based on environment/context. Not native mirrors.

| File | LOC | Category | Reasoning |
|------|-----|----------|-----------|
| `native.ts` | 30 | KEEP | Native shell detection (stub) |
| `media.ts` | 37 | KEEP | MediaQueryList reactive wrapper |
| `view.ts` | 59 | KEEP | Window size/scroll/orientation reactive |
| `os.ts` | 52 | KEEP | OS detection + theme reactive |
| `auth.ts` | 31 | KEEP | Auth state reactive (stub) |
| `container.ts` | 38 | KEEP | Container queries (placeholder) |

**Scope Total**: 247 LOC — all KEEP

---

### HEAVY VALUE-ADD MODULES (KEEP)

These provide capabilities beyond native browser APIs.

| File | LOC | Category | What It Does |
|------|-----|----------|--------------|
| `predictive.ts` | 544 | KEEP | 4D velocity tracking + quadtree spatial index + prewarming |
| `sql.ts` | 349 | KEEP | SurrealDB RPC over WebSocket + LIVE queries + heap integration |
| `gql.ts` | 142 | KEEP | GraphQL client + heap optimization |
| `mcp.ts` | 89 | KEEP | MCP protocol sampling/resources/tools orchestration |

**Value-Add Total**: 1,124 LOC — all KEEP

---

## Consolidation Plan

### Phase 1: Merge Trivial Sprites (AUTO-INJECT)

These files are ≤30 LOC and expose universally-needed DOM/globals. Instead of separate MirrorModule registrations, auto-inject them in `index.ts` during UX construction:

```typescript
// In src/index.ts, inside UX constructor:
public constructor() {
  // Auto-inject universal mirrors (no module files needed)
  this.$el = () => document;                    // replaces el.ts (14 LOC)
  this.$id = (id: string) => document.getElementById(id);  // replaces id.ts (11 LOC)
  this.$global = <T>(key: string) => (globalThis as any)[key]; // replaces global.ts (25 LOC)
  this.$dispatch = (event: string, detail?: any) =>
    document.body.dispatchEvent(new CustomEvent(event, { detail })); // replaces dispatch.ts (23 LOC)
  this.$nextTick = () => Promise.resolve().then(() => requestAnimationFrame(() => {})); // replaces nextTick.ts (25 LOC)

  // These stay as registered modules (need reactive wrappers):
  // $fetch, $cache, $clipboard, $notification, $payment, $websocket
}
```

**Files to DELETE**: `el.ts`, `id.ts`, `global.ts`, `dispatch.ts`, `nextTick.ts` (98 LOC removed)

---

### Phase 2: Register Mirror Modules (MANUAL)

For APIs requiring reactive wrappers or error handling, register `MirrorModule`s in `modules.ts`:

```typescript
// In src/engine/modules.ts ModuleCoordinator.registerMirrorModule() calls:

// Clipboard Mirror (87 LOC → ~30 LOC wrapper)
registerMirrorModule('clipboard', (runtime) => ({
  $clipboard: {
    write: (text: string) => runtime.reactive(promiseToOp(navigator.clipboard.writeText(text))),
    read: () => runtime.reactive(promiseToOp(navigator.clipboard.readText()))
  }
}));

// Cache Mirror (225 LOC → ~50 LOC wrapper)
registerMirrorModule('cache', (runtime) => ({
  $cache: {
    put: (name: string, url: string, res?: Response) => /* wrapper */,
    match: (name: string, url: string) => /* wrapper */,
    // ... 6 methods total
  }
}));

// Notification Mirror (156 LOC → ~60 LOC)
registerMirrorModule('notification', (runtime) => ({
  $notification: {
    permission: computed(() => Notification.permission),
    send: (title: string, opts?: NotificationOptions) => /* wrapper */
  }
}));

// Payment Mirror (94 LOC → ~40 LOC)
registerMirrorModule('payment', (runtime) => ({
  $payment: {
    canMakePayment: (methods: PaymentMethodData[]) => /* wrapper */,
    request: (methods, details, opts?) => /* wrapper */
  }
}));

// Fetch Mirror (20 LOC already thin - just re-export engine fetch)
registerMirrorModule('fetch', (runtime) => ({
  $fetch: (url: string, opts?: RequestInit) => runtime.fetch.request(url, opts, document.body)
}));

// WebSocket Mirror (123 LOC → ~70 LOC + reconnect policy)
registerMirrorModule('websocket', (runtime) => ({
  $websocket: (url: string, opts?: { autoReconnect?: boolean }) => /* wrapper */
}));

// Download Mirror (48 LOC → ~20 LOC)
registerMirrorModule('download', (runtime) => ({
  $download: (filename: string, content: Blob|string) => /* blob URL anchor click */
}));

// HTTP Mirror (54 LOC → ~25 LOC - just $get/$post/$put/$patch/$delete)
registerMirrorModule('http', (runtime) => ({
  $get: (url, opts) => runtime.fetch.request(url, { ...opts, method: 'GET' }),
  $post: (url, body, opts) => runtime.fetch.request(url, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  // etc.
}));
```

**Files to DELETE**: `sprites/fetch.ts` (replaced by engine fetch), `sprites/store.ts` (unused?), `sprites/watch.ts` (unused?)

---

### Phase 3: Keep Heavy / Unique Capabilities

These modules stay as-is (no reduction possible):

- `sql.ts`, `gql.ts`, `mcp.ts` — custom protocols over native APIs
- `predictive.ts` — quadtree + 4D velocity unique
- `animate.ts`, `svg.ts` — substantial orchestration logic
- `selector.ts` — context-aware selector engine
- `spatial.ts`, `flow.ts` — depend on predictive quadtree

---

## Size Savings Calculation

### Removed Files (DEPRECATE/MERGE)
```
el.ts              14
id.ts              11
global.ts          25
dispatch.ts        23
nextTick.ts        25
store.ts           25  (unused?)
watch.ts           26  (unused?)
─────────────────────────
Total merge-away:  149 LOC
```

### Mirror Replacements (Thin Wrappers Replacing Full Modules)
```
Original        | Mirror Wrapper | Savings
fetch.ts        | 20  → ~5       | 15
http.ts         | 54  → ~25      | 29
download.ts     | 48  → ~20      | 28
clipboard.ts    | 87  → ~30      | 57
cache.ts        | 225 → ~50      | 175
notification.ts | 156 → ~60      | 96
payment.ts      | 94  → ~40      | 54
ws.ts           | 123 → ~70      | 53
──────────────────────────────────────────
Total wrapper savings: ~507 LOC
```

### Untouched (KEEP)
```
Attributes            ~2,700
Modifiers               ~300
Listeners               ~202
Scopes                  247
Value-adds (sql/gql/etc) ~1,124
────────────────────────────────────
Total keep:            ~4,573 LOC
```

**Net Reduction**: 15,474 → **~9,900 LOC** (36% smaller)

---

## Implementation Strategy

### 1. Auto-Inject Mirrors (`src/index.ts`)
- `$el`, `$id`, `$global`, `$dispatch`, `$nextTick`
- Remove their module files from the build
- Update `MODULE_MAP` entries to resolve to auto-injected no-ops or direct functions

### 2. MirrorModule Registration (`src/engine/modules.ts`)
- Replace `fetch.ts` engine integration with direct `runtime.fetch` use (already centralized)
- Consolidate `http.ts` into simple wrapper around runtime.fetch
- Keep `cache.ts`, `clipboard.ts`, `notification.ts`, `payment.ts`, `ws.ts` as MirrorModules but strip to <50LOC wrappers each

### 3. Remove unused: `store.ts`, `watch.ts`
- These are vestigial; global state handled by `$store` scope via `globalSignals`

### 4. Keep everything else
- Attribute directives, modifiers, listeners, scopes stay unchanged
- Heavy value-add modules stay unchanged

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `_fetch` mirror semantics differ from current `$fetch` (SuspenseProxy) | HIGH | `$fetch` must continue returning SuspenseProxy; wrapper delegates to `runtime.fetch.createSuspenseProxy()` |
| `_clipboard` fallback `execCommand` removal | LOW | Keep fallback logic in wrapper (still <50LOC) |
| `_cache` returns `Response` objects vs text strings | MEDIUM | Preserve current behavior (auto `.text()` extraction) as framework convenience |
| `_websocket` reconnect policy customization | LOW | Expose `{ autoReconnect, maxReconnects }` options in wrapper |
| Users importing removed sprite files directly | MEDIUM | Keep `index.ts` barrels re-exporting wrappers to avoid breakage |
| Dev-mode debugging output loss | LOW | Wrappers can still forward to `runtime.debug()` |

---

## Mirror Auto-Wrap Pattern Reference

```typescript
// Existing pattern: src/engine/modules.ts MirrorModule
interface MirrorModule {
  name: string;
  key: string;
  mirrors: (runtime: RuntimeContext) => MirrorMap;
}

// Proposed: keep current structure but move implementation to inline wrappers
// Every MirrorModule becomes ~10-50 LOC instead of 50-200 LOC
```

---

## Files to DELETE

```
src/modules/sprites/el.ts
src/modules/sprites/id.ts
src/modules/sprites/global.ts
src/modules/sprites/dispatch.ts
src/modules/sprites/nextTick.ts
src/modules/sprites/store.ts   (unused vestige)
src/modules/sprites/watch.ts   (unused vestige)
```

**7 files removed, ~175 LOC**

---

## Files to CONSOLIDATE

`sprites/fetch.ts` → becomes 5-line wrapper in `modules.ts` MirrorModule registration
`sprites/http.ts` → becomes 25-line wrapper in `modules.ts`
`sprites/download.ts` → becomes 20-line wrapper in `modules.ts`
`sprites/clipboard.ts` → becomes 30-line wrapper in `modules.ts`
`sprites/cache.ts` → becomes 50-line wrapper in `modules.ts`
`sprites/notification.ts` → becomes 60-line wrapper in `modules.ts`
`sprites/payment.ts` → becomes 40-line wrapper in `modules.ts`
`sprites/ws.ts` → becomes 70-line wrapper in `modules.ts`

**8 files reduced to ~300 LOC total (from ~927 LOC)**

---

## Net Change Summary

Before:
- 83 module files
- 15,474 LOC

After:
- 68 module files (-15)
- ~9,900 LOC (-5,574)

**Bundle size reduction: ~36%**

---

## Next Steps for Implementation

1. Validate no external code imports these directly: `grep -r "import.*from.*sprites/(el|id|global|dispatch|nextTick|store|watch)"`
2. Add auto-injected properties in `UX` class constructor
3. Move MirrorModule registrations into `ModuleCoordinator.registerMirrorModule()` inline
4. Delete the 7 obsolete files
5. Report LOC diff in PR
6. Ensure barrel exports (`sprites/index.ts`) still re-export wrapper functions for backward compatibility

---

**Report Generated**: Full analysis complete with categorization, LOC accounting, and implementation plan.
