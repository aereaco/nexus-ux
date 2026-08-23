# 🌌 Nexus-UX

**Signal-Driven Universal Reactivity. High-Fidelity Tailwind JIT. Omni-State
(DOM-as-State) Framework.**

Nexus-UX is a reactive framework designed for developers who
demand absolute performance, granular control, and a **zero-build** experience.
It collapses the traditional frontend stack by treating the DOM as a queryable,
reactive state graph while achieving **100% functional parity with Tailwind v4**.

---

## 🏛️ The Five Pillars

1. **Omni-State (DOM-as-State)**: We assert that the DOM _is_ the primary state
   graph. No phantom Virtual DOM. No reconciliation tax. The HTML attributes are
   the declaration source, while the binary signal heap is the runtime truth.
2. **Native JIT Engine (Tailwind v4)**: Nexus-UX achieves **1:1 bit-for-bit
   parity** with the official Tailwind v4 CDN. It compiles utility classes into
   a high-performance **Unified Adopted StyleSheets Registry** in real-time.
3. **Zero-DOM Pollution**: Using `CSSStyleSheet.replaceSync()`, Nexus-UX
   eliminates all legacy `<style>` and `<link>` tag pollution. Styles
   automatically penetrate Shadow DOM boundaries without duplicative parsing.
4. **ZCZS (Zero-Copy Zero-Serialization)**: A value-pooling reactive core
   designed for 120fps animations. Data flows from kernel to DOM via binary
   signal heaps, bypassing JSON serialization.
5. **Agentic Readiness**: Built for **Machine Reasoning Efficiency**. Built-in
   **Resolution Beacons** report missing selectors and failed expressions back
   to Agentic Hosts (like Aerea) for automated self-healing.

---

---

## 🎯 Native API Binding Architecture

Nexus-UX provides **direct, fine-grained, push-based reactivity** for native browser APIs (`window`, `localStorage`, `sessionStorage`, `navigator`, `document`, `screen`) directly through standard JavaScript property access.

Unlike static native getters (`localStorage.getItem()`) that sample state only at invocation, **Native API Binding** automatically intercepts reads and writes via Proxy/Reflect traps. It registers fine-grained event listeners on read and **actively pushes state updates** to watching signals and DOM elements whenever native Web APIs mutate. No `_` prefix or mirror module registration required.

### Standard Native API Binding Pattern

```html
<div class="grid grid-cols-[0rem_1fr]" data-signal="{
      collapsed: localStorage.collapsed ?? true,
      pageTabs: localStorage.pageTabs ?? true,
      rtl: localStorage.rtl ?? false,
      zoom: localStorage.zoom ?? 1
    }" data-class="{ 'md:grid-cols-[5rem_1fr]': collapsed }">

  <!-- Pure Web API Action Directive (Mutates native storage directly) -->
  <button data-on-click="localStorage.setItem('collapsed', !localStorage.collapsed)"
          data-class="{ 'scale-x-[-1]': !collapsed }">
    Toggle Sidebar
  </button>
</div>
```

- **Declarative Signal Seeding:** Initialize signals directly from native API expressions with explicit nullish defaults (`??`).
- **Pure Web API Actions:** Action handlers call native browser APIs directly (`localStorage.setItem(...)`). The binding pushes updates to watching signals automatically—no manual signal mutations needed!
- **Concise View Templates:** Elements observe short signal names (`collapsed`, `pageTabs`), eliminating template code bloat.

- **Live Push Reactivity:** Instant same-tab & cross-tab updates without polling or re-renders
- **Zero-Copy Performance:** Proxies wrap native APIs by reference without cloning
- **Automatic Cleanup:** Zero memory leaks on element disposal

### Auto-Injected Utilities (Inline)

The following utility sprites are auto-injected by the core runtime and do
_not_ require module imports:

| Sprite       | Description                                      |
| :----------- | :----------------------------------------------- |
| **`$el`**    | Current element reference                        |
| **`$id`**   | Generate unique IDs                              |
| **`$dispatch`** | Dispatch CustomEvents on current element      |
| **`$global`** | Access runtime global signals                  |
| **`$nextTick`** | Schedule after reactive flush                  |

### Retained Sprites (Unique Value)

These 14 sprites provide capabilities beyond native browser APIs and remain as
explicit modules:

| Sprite | Description |
| :--- | :--- |
| **`$animate`** | Reactive Web Animations API engine with keyframes and timeline control |
| **`$selector`** | High-performance reactive DOM query engine (`$()` selector) |
| **`$predictive`** | 4D predictive interaction engine (frustum projection, quadtree) |
| **`$sql`** | SurrealDB reactive queries (LIVE SELECT real-time diff sync) |
| **`$gql`** | GraphQL queries with reactive results |
| **`$mcp`** | Model Context Protocol integration for AI agent orchestration |
| **`$svg`** | Reactive SVG manipulation and geometry engine |
| **`$flow`** | Infinite canvas and gesture flow recognizer (swipes, pans, pinch-zoom) |
| **`$mask`** | Advanced clipping and visual masking |
| **`$sw`** | Service Worker registration & lifecycle management |
| **`$push`** | Web Push notification subscription and handler |
| **`$bgSync`** | Background Sync API wrapper for offline action replay |
| **`$bgFetch`** | Background Fetch API wrapper for large background transfers |
| **`$periodicSync`** | Periodic Background Sync API wrapper |

---

## 🛰️ The NEG Grammar (Nexus Expression Grammar)

Nexus-UX utilizes a deterministic, token-based grammar for high-baud efficiency:

| Token | Designation | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **`.`** | **Native Access** | Unwrapped, raw JS/DOM/Browser API reactive property access. | `window.innerWidth`, `localStorage.theme` |
| **`#`** | **Global Signal** | The Global Registry of shared reactive sources. | `#auth.user` |
| **`:`** | **Modifier** | Pipeline anchors, filters, and lifecycle wrappers. | `data-on-click:once:prevent` |
| **`$`** | **Sprite / Selector** | Framework tools, Sprites, and the `$()` selector engine. | `$(^card).$animate()`, `$sql(...)` |
| **`@`** | **Scope Rule** | Context-aware boundary rules (Media, OS, Auth). | `@media(min-width: 600px) { ... }` |

---

## 🧩 Core Directives (30 Modules)

| Directive | Role | Description |
| :--- | :--- | :--- |
| **`data-signal`** | **State** | Initializes reactive signals with continuous dependency re-evaluation and typed heap allocation. |
| **`data-bind`** | **Binding** | High-performance bidirectional binding to inputs, text content, and native browser Web APIs. |
| **`data-computed`** | **Derivative** | Read-only derived signal caching expression results. |
| **`data-effect`** | **Side Effect** | Element-bound reactive side effects with automated disposal cleanups. |
| **`data-if` / `data-show`** | **Control Flow** | Conditional rendering via physical DOM morphing (`data-if`) or visual toggling (`data-show`). |
| **`data-for`** | **Iteration** | Keyed list rendering with zero memory allocation. |
| **`data-class`** | **Hardened JIT** | Reconciles dynamic classes and Tailwind v4 utilities against reactive state. |
| **`data-style`** | **Dynamic Style** | Dynamic inline CSS property synchronization with automatic unit appending. |
| **`data-stylesheet`** | **Adopted CSS** | Bridges constructable stylesheets and Tailwind v4 theme tokens into the CSSOM. |
| **`data-theme`** | **Theming** | Dynamic theme and color-mode orchestrator (`auto`, `light`, `dark`). |
| **`data-switcher`** | **Iteration** | Automates cycling through states (e.g., Theme Switchers). |
| **`data-drag`** | **Drag & Drop** | Native DnD engine supporting multi-drag, groups, cloning, handles, and sorting. |
| **`data-flow`** | **Spatial Canvas** | Infinite-canvas layout engine with pan, zoom, and spatial coordinate mapping. |
| **`data-on`** | **Behavior** | Event handlers with NEG pipeline modifiers (`:debounce`, `:once`, `:prevent`). |
| **`data-router` / `data-route`** | **Routing** | Declarative SPA client routing with guards, layouts, and History API sync. |
| **`data-component`** | **Components** | Mounts reusable HTML component fragments into Shadow DOM or light DOM. |
| **`data-import`** | **Asset Registry** | Asynchronously adopts scripts, stylesheets, and VFS components. |
| **`data-pwa`** | **PWA** | Progressive Web App lifecycle, service worker registration, and install prompts. |
| **`data-markdown`** | **Transpiler** | Zero-dependency markdown-to-HTML parser with Tailwind typography. |
| **`data-mask`** | **Masking** | Visual SVG and CSS mask synchronization. |
| **`data-preserve`** | **Shield** | Prevents node and state loss during server-driven morph reconciliation. |
| **`data-var-[name]`** | **Data Painting** | Directly synchronizes state to CSS custom properties (`--[name]`). |
| **`data-raf`** | **Animation** | Runs 120fps animation callbacks on every animation frame. |
| **`data-teleport`** | **Portal** | Teleports elements to target containers while preserving reactive context. |
| **`data-assert` / `data-debug`** | **Diagnostics** | Runtime invariant assertions and agentic self-heal inspector beacons. |
| **`data-build`** | **Bundler** | In-browser asset serialization to IndexedDB. |

---

## 🚀 Get Started

No transpilant, no bundler, no delay.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Nexus-UX: Hello World</title>
    <!-- Zero-Copy Zero-Serialization Core -->
    <script src="/dist/nexus-ux.js"></script>
  </head>
  <body
    class="bg-slate-900 text-white flex items-center justify-center min-h-screen"
  >
    <!-- Direct JIT Signal Integration: Brackets map directly to reactive variables -->
    <main
      class="p-8 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl transition-all duration-500 w-[width]"
      data-signal="{ count: 0, width: '400px' }"
      data-on-hover="width = hovered ? '500px' : '400px'"
    >
      <h1
        class="text-6xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4"
      >
        Nexus-UX
      </h1>

      <p class="text-neutral-400 mb-8">
        Counter: <span class="font-mono text-blue-400" data-bind="count"
        >0</span>
      </p>

      <!-- Native NEG Event Syntax: data-on-EVENT:MODIFIER -->
      <button
        data-on-click:once="count++"
        class="px-8 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-full font-bold transition-all"
      >
        Increment Once
      </button>

<!-- Asset Import 2.0: Unified Registry for ZCZS Parity -->
       <div
         data-import="{ 
       charts: { 
         script: [ { src: '/js/stats.js', defer: true }, '/js/charts.js' ],
         link: { href: '/css/charts.css', rel: 'stylesheet' }
       },
       theme: { theme: 'idb://themes/nebula' }
     }"
         >
      </div>

      <!-- Global Signal JIT Integration -->
      <div
        class="bg-[#auth.theme.primary] p-4 rounded mt-4"
        data-show="#auth.loggedIn"
      >
        Welcome back, <span data-bind="#auth.user.name">User</span>
      </div>
    </main>
  </body>
</html>
```

### Direct JIT Signal Parity

Nexus-UX includes a native Tailwind v4 JIT engine. You can use reactive signals
directly in utility classes using brackets. The engine automatically
synchronizes these to local CSS variables:

- **Usage**: `class="w-[width]"`
- **Mapping**: Matches signal `width` to `--nx-width`.
- **Global Mapping**: Matches `#auth.theme.primary` to
  `--nx-auth-theme-primary`.
- **Performance**: Zero-copy updates via direct `CSSStyleRule` modification.

### Asset Import 2.0 (`data-import`)

The framework manages 3rd party scripts and styles via a unified import
schema:

```javascript
data-import="{ 
  analytics: { 
    script: { src: '/js/stats.js', defer: true }, // or '/path/to/script.js'
    link: '/path/to/style.css',                   // External CSS (adopted via ZCZS)
    component: 'idb://lib/card',                  // VFS registration
    theme: 'idb://themes/nebula',                 // External theme link
    target: '#main',                              // Optional: Inject into specific target
    position: 'prepend'                           // Optional: before | after | append | prepend
  }
}"
```

---

## 🏗️ Build System

Nexus-UX uses a Deno-based build system (`scripts/build.ts`) that supports both
full and app-specific builds.

### Standard Build

Produces the full framework bundle including all modules:

```bash
deno run --allow-all scripts/build.ts
```

Output: `dist/nexus-ux.js` (unminified, size varies with modules)

### App-Specific Build with Tree-Shaking

Analyze an application's source to include only the modules actually used:

```bash
deno run --allow-all scripts/build.ts --app=./site
```

This:
- Scans the app directory for `data-*` directives, `$` sprite calls, and Tailwind classes
- Filters out auto-injected sprites (`$el`, `$id`, `$dispatch`, `$global`, `$nextTick`)
- Filters out mirror-provided APIs (`$fetch`, `$http`, `$download`, `$clipboard`, `$cache`, `$notification`, `$payment`, `$ws`) accessed via `_` prefix
- Tree-shakes **attribute modules**, **sprite modules**, and **modifier modules** based on actual usage
- Generates a tailored manifest with only used modules
- Produces optimized bundles (typical reduction: 30–50%)

**Example output**: Standard build includes all 15 sprite modules; app-specific
build may include only 3 (`animate`, `sql`, `svg`) depending on usage.

### Minification & Compression

Two-pass minification with Brotli compression:

```bash
deno run --allow-all scripts/build.ts --minify
# or combine with app analysis:
deno run --allow-all scripts/build.ts --app=./site --minify
```

Pipeline:
1. esbuild bundles + minifies
2. SWC second-pass minification (3 passes, dead code elimination, drop console)
3. Brotli‑11 compression

Output:
- `dist/nexus-ux.min.js` (~140–200 KB depending on modules)
- `dist/nexus-ux.min.js.br` (~38–56 KB)

### Build Options

| Flag | Description |
| :--- | :--- |
| `--name=NAME` | Output filename (default: `nexus-ux`) |
| `--app=DIR` | App directory to analyze for tree-shaking |
| `--exclude=MOD1,MOD2` | Explicitly exclude modules (comma-separated) |
| `--minify` | Enable two-pass minification + Brotli |
| `--ref=GIT_REF` | Build from a specific git commit |

### Batch Builds

Use a JSON config for multi-target builds:

```json
{
  "configs": [
    { "outputName": "nexus-ux-full", "minify": true },
    { "outputName": "nexus-ux-lite", "excludeModules": ["predictive", "mcp"] }
  ]
}
```

Run: `deno run --allow-all scripts/build.ts --batch --config=build-config.json`

---

## 🔬 Browser Compatibility

Nexus-UX targets **ES2022** and uses modern web APIs:

- **Adopted StyleSheets** (`CSSStyleSheet`) — native constructable stylesheets
- **Custom Elements** v1 — custom element lifecycle
- **ResizeObserver**, **MutationObserver** — efficient DOM observation
- **WebSocket**, **BroadcastChannel** — real-time communication
- **Cache API**, **Background Sync**, **Push API** — progressive web app features
- **requestIdleCallback**, **requestAnimationFrame** — scheduler integration

All native browser APIs (`window`, `localStorage`, `document`, etc.) are tracked reactively via direct Native API Binding with zero wrapper overhead.

---

## 📦 Module Architecture

```
src/
├── index.ts              # Entry point — UX class, inline utilities
├── manifest.ts           # AUTO-GENERATED module registry (build.ts)
├── engine/               # Core runtime (reactivity, scheduler, observers, ZCZS heap)
├── modules/
│   ├── attributes/       # data-* directive handlers (30 modules)
│   ├── sprites/          # $ sprite implementations (14 modules)
│   ├── modifiers/        # : Pipeline modifiers (15 modules)
│   ├── scopes/           # @ Logical Scope Rules (6 modules)
│   └── listeners/        # Global event listeners (4 modules)
├── docs/                 # Specification & reference
├── scripts/              # Build & dev utilities
└── dist/                 # Compiled production bundles
```

**Zero-maintenance**: New modules are auto-discovered and registered via the
manifest. No manual registration required.

---

## 🗺️ Living Development Roadmap & Active TODO List

Per Nexus-UX **Documentation-Driven Development (DDD)** directives, documentation stays ahead of code implementation as the single source of truth for architecture and features.

### Active TODO List

- [x] **Native API Auto-Tracking Proxy**: Generic Proxy/Reflect tracking for `window`, `localStorage`, `sessionStorage`, `document`, `screen`.
- [x] **Initial Boot Timing Alignment**: Synchronous `runSelf` initialization in `elementBoundEffect` so initial hydration reads capture dependencies.
- [x] **Real-Time Signal Property Re-Evaluation**: Trigger `stateRef` subscribers when evaluated signal properties mutate on window/storage events.
- [x] **Zero-Mirror Cleanup**: Removal of legacy `_` prefix mirrors in favor of direct property access.
- [ ] **Nexus-UX Official SPA Site**: Complete port of dashboard shell (`layout.html`, `documentation.html`, `router.html`) into single-page application architecture under `site/`.
- [ ] **Dev Server SPA Fallback**: Add History API index fallback in `scripts/serve.ts` for clean SPA route navigation (`hybrid` mode).
- [ ] **IndexedDB Engine Diagnostics Integration**: Connect live CodeMirror playground state in `documentation.html` to runtime SelfHeal agent.

---

## 🤝 Contributing

Nexus-UX is developed under the **MIT License**. Contributions are welcome via
pull request. See `nexus-ux-spec.md` for full architectural specifications and
`nexus-ux-reference.md` for API documentation.

---

**Created with ❤️ by Aerea Co.**
