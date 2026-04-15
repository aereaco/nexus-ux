# 🌌 Nexus-UX

**Signal-Driven Universal Reactivity. High-Fidelity Tailwind JIT. Omni-State
(DOM-as-State) Framework.**

Nexus-UX is a "Zenith-Class" reactive framework designed for developers who
demand absolute performance, granular control, and a **zero-build** experience.
It collapses the traditional frontend stack by treating the DOM as a queryable,
reactive state graph while achieving **100% functional parity with Tailwind
v4**.

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

## 🛰️ The NEG Grammar (Nexus Expression Grammar)

Nexus-UX utilizes a deterministic, token-based grammar for high-baud efficiency.

| Token   | Designation       | Purpose                                         | Example                            |
| :------ | :---------------- | :---------------------------------------------- | :--------------------------------- |
| **`.`** | Native Access     | Unwrapped, raw JS/DOM property access.          | `user.name`                        |
| **`#`** | Global Signal     | The Global Registry of reactive sources.        | `#auth.user`                       |
| **`_`** | Env Mirror        | Read-only reactive snapshots of Browser APIs.   | `_window.innerWidth`               |
| **`:`** | Modifier          | Pipeline anchors and interceptors.              | `data-on-click:once`               |
| **`$`** | Sprite / Selector | Framework tools, Sprites, and the $() engine.   | `$(^card).$save()`                 |
| **`@`** | Scope Rule        | Context-aware boundary rules (Media, OS, Auth). | `@media(min-width: 600px) { ... }` |

---

## 🧩 Core Directives

| Directive       | Role               | Description                                                                     |
| :-------------- | :----------------- | :------------------------------------------------------------------------------ |
| `data-signal`   | **State**          | Initializes reactive signals. Supports **Signal Auto-Promotion** on-the-fly.    |
| `data-class`    | **Hardened JIT**   | Reconciles Tailwind v4 utilities against reactive state with 0ms latency.       |
| `data-bind`     | **Binding**        | High-performance bidirectional binding to inputs and state.                     |
| `data-text`     | **Painting**       | Injects reactive expressions into `textContent`.                                |
| `data-on`       | **Behavior**       | Standard and **Native Event Mapping** (`hover`, `click:debounce.200ms`).        |
| `data-on-hover` | **Orchestration**  | Maps native mouseenter/mouseleave to a local `hovered` signal.                  |
| `data-ingest`   | **Asset Registry** | Asynchronously adopts links, scripts, and components into the Unified Registry. |
| `data-switcher` | **Iteration**      | Automates cycling through states (e.g., Theme Toggles).                         |

---

## 🔍 The High-Fidelity JIT Engine

Nexus-UX doesn't just "support" Tailwind; it implements the **Official Tailwind
v4 Design System** logic natively.

- **Compositing Parity**: Advanced utilities like **Filters, Backdrop Filters,
  and Transforms** are synchronized via `@property` registrations for
  hardware-accelerated performance.
- **Motion Hardening**: Standard transition durations (150ms) and animation
  keyframes (`spin`, `pulse`, etc.) are baked into the core registry.
- **Zero FOUC**: Uses `adoptCSSSync` to ensure UI structure and presentation are
  linked before the first paint.

---

## ⚡ High-Order Sprites (`$`)

- **`$fetch`**: Managed, reactive HTTP requests with **Suspense Proxy** support.
- **`$sql`**: Direct database integration (SurrealDB LIVE queries).
- **`$nextTick`**: Deferred execution after the next DOM update cycle.
- **`$()`**: Reactive selector engine with combinators (`^` parent, `+` sibling,
  `*` global).

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
        Nexus Zenith
      </h1>

      <p class="text-neutral-400 mb-8">
        Counter: <span class="font-mono text-blue-400" data-text="count"
        >0</span>
      </p>

      <!-- Native NEG Event Syntax: data-on-EVENT:MODIFIER -->
      <button
        data-on-click:once="count++"
        class="px-8 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-full font-bold transition-all"
      >
        Increment Once
      </button>

      <!-- Asset Ingestion 2.0: Unified Registry for ZCZS Parity -->
      <div
        data-ingest="{ 
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
        Welcome back, <span data-text="#auth.user.name">User</span>
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

### Asset Ingestion 2.0 (`data-ingest`)

The framework manages 3rd party scripts and styles via a unified ingestion
schema:

```javascript
data-ingest="{ 
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

## 🛡️ License

Nexus-UX is released under the **MIT License**. Created with ❤️ by the Nexus-UX
Authors.
