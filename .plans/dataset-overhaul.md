# Framework-Wide `dataset` Overhaul

**Goal:** Convert every `data-*` attribute read/write across `nexus-ux/src/` from `getAttribute`/`hasAttribute`/`setAttribute`/`removeAttribute` to `HTMLElement.dataset`, consistent with the framework's documented contract: **"dataset is the operational primitive of the entire framework"** (spec §3.3, reference §1.5).

---

## Rules

| Old | New | Notes |
|---|---|---|
| `el.getAttribute('data-foo-bar')` | `el.dataset.fooBar` | kebab→camel, dot notation |
| `el.getAttribute(...) \|\| fallback` | `el.dataset.fooBar ?? fallback` | preserves fallback |
| `el.hasAttribute('data-foo-bar')` | `'fooBar' in el.dataset` | presence check |
| `el.setAttribute('data-foo-bar', val)` | `el.dataset.fooBar = val` | val must be string |
| `el.removeAttribute('data-foo-bar')` | `delete el.dataset.fooBar` | — |
| `el.getAttribute('data-teleport:drop')` | `el.dataset['teleport:drop']` | colon preserved, bracket notation |
| `el.hasAttribute('data-bind.lazy')` | `'bind.lazy' in el.dataset` | period preserved, bracket notation |

**Semantics preserved:** `dataset` returns `string | undefined`, identical falsy behavior to `getAttribute` returning `null`. All truthiness checks and strict string comparisons (`=== 'true'`) work identically.

**Out of scope:**
- Non-`data-*` attributes (`draggable`, `class`, `src`, `href`, SVG attrs, etc.)
- Dynamic `attr.name`/`attr.value` loops (reconciler blanks) — names are unknown at write time

---

## File work order

### Batch 1 — `drag.ts` (33 hits)

| Lines | Change |
|---|---|
| 358, 382, 517, 593, 603, 606, 653 | `data-ux-template`, `data-drag-container`, `data-dropzone-state` → `dataset` |
| 901 | `data-drag-multi` → `dataset.dragMulti` |
| 902 | `data-drag-selected-class` → `dataset.dragSelectedClass` |
| 903 | `data-drag-swap` → `'dragSwap' in dataset` / `dataset.dragSwap` |
| 904 | `data-drag-swap-class` → `dataset.dragSwapClass` |
| 906 | `data-drag-group` → `dataset.dragGroup` |
| 911–914 | `data-drag-pull/clone/put/revert-clone` → `dataset` |
| 920 | `data-drag-direction` → `dataset.dragDirection` |
| 925 | `data-drag-swap-threshold` → `dataset.dragSwapThreshold` |
| 928 | `data-drag-invert-swap` → `dataset.dragInvertSwap` |
| 940–941 | `data-drag-handle/filter` → `dataset` |
| 978–979, 1233 | `data-teleport:drop` → `dataset['teleport:drop']` |
| 1006 | `data-drag-clone` → `dataset.dragClone` |
| 1212 | `data-drag-container` / `data-teleport:drop` → `dataset` |
| 1220–1221 | threshold binding → `dataset.dragSwapThreshold` |
| 1234 | `data-drag-ghost-opacity` → `dataset.dragGhostOpacity` |

Keep: `draggable` (standard HTML attr), child-loop `getAttribute('draggable')` checks.

### Batch 2 — `predictive.ts` (~6 of 32 hits)

| Lines | Change |
|---|---|
| 242 | `data-debug` → `'debug' in document.documentElement.dataset` |
| 512–514 | `data-on-click/hover/mouseenter` → `'onClick'/'onHover'/'onMouseenter' in el.dataset` |
| 520 | `data-bind` → `'bind' in el.dataset` |

Keep: all SVG/CSS `setAttribute` calls (`cx`, `cy`, `r`, `fill`, `stroke`, etc.).

### Batch 3 — `reconciler.ts` (17 hits)

| Change | Notes |
|---|---|
| `data-key` reads/writes → `dataset.key` | |
| `DATA_PRESERVE_ATTR` reads → bracket notation if name contains dot/colon | |

Keep: `href`, `src`, `rel`, `class`, `type`. The `attr.name`/`attr.value` sync loop stays on `setAttribute`/`removeAttribute`.

### Batch 4 — `import.ts` (12 hits)

| Old | New |
|---|---|
| `data-import` | `dataset.import` |
| `data-import-pattern` | `dataset.importPattern` |
| `data-component-name` | `dataset.componentName` |
| `data-nexus-tailwind-bridge` | `dataset.nexusTailwindBridge` |
| `data-nexus-loading/ready` | `dataset.nexusLoading` / `dataset.nexusReady` |
| `data-ux-ignore`, `data-nexus-ignore`, `data-style-ignore` | bracket notation |
| `data-ignore:off`, `data-ignore` | bracket notation |
| `data-ux-init` | `dataset.uxInit` |

### Batch 5 — `spatial.ts` (10 hits)

| Old | New |
|---|---|
| `data-nexus-spatial-draggable/canvas/spatial` set/remove | `dataset` + `delete` |
| `data-for` | `dataset.for` |
| `data-teleport:drop` | `dataset['teleport:drop']` |

### Batch 6 — `bind.ts` (9 hits)

| Old | New |
|---|---|
| `data-bind` | `'bind' in el.dataset` / `el.dataset.bind` |
| `data-bind:lazy` | `'bind:lazy' in el.dataset` |
| `data-bind.lazy` | `'bind.lazy' in el.dataset` |

Keep: `draggable` (standard HTML attr), dynamic `param`/`target` standard-attribute writes.

### Batch 7 — Smaller files

**`route.ts`** (6): `data-route-*` → `dataset`  
**`pwa.ts`** (6): `data-theme-color`, `data-manifest`, `data-icon` → `dataset`  
**`teleport.ts`** (5): `data-teleport-mode`, `data-teleport`, `data-drag`, `data-ux-template` → `dataset`  
**`for.ts`** (3): `data-ux-template`, `data-for` → `dataset`  
**`build.ts`** (3): `data-nexus-loading`, `data-nexus-ready` → `dataset`  
**`modules.ts`** (8): `data-debug`, `data-ignore*`, `data-ux-init`, `data-ux-template` → `dataset`  
**Remaining** (`computed.ts`, `flow.ts`, `switcher.ts`, `theme.ts`, `signal.ts`, `on.ts`, `stylesheet.ts`, `hash.ts`, `animation.ts`, `mutation.ts`, `scope.ts`, `fetch.ts`, `debug.ts`, `agent.ts`, `linkRewriter.ts`, `svg.ts`, `preserve.ts`, `index.ts`): convert all removable `data-*` accesses per the same rules.

---

## Validation

1. `deno task build` after each batch — zero TS errors
2. Browser smoke test on `site/dashboard/pages/interaction/drag.html` after Batch 1
3. Browser smoke test on `site/dashboard/` index after Batch 7
4. Verify no `MutationObserver` dual-path regressions

## Risks

- No automated tests; safety net is `deno task build` + manual verification.
- `dataset` returns `string | undefined`; existing truthiness/string-compare checks work identically.
- Bracket notation for colons/periods is spec-compliant and cross-browser.
- Reserved-word property names (`dataset.import`, `dataset.class`) are valid `DOMStringMap` accesses.
