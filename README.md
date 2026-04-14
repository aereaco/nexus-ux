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
| **`:`** | Modifier          | Pipeline anchors and interceptors.              | `data-on:click:once`               |
| **`$`** | Sprite / Selector | Framework tools, Sprites, and the $() engine.   | `$(^card).$save()`                 |
| **`@`** | Scope Rule        | Context-aware boundary rules (Media, OS, Auth). | `@media(min-width: 600px) { ... }` |

---

## 🧩 Core Directives

| Directive       | Role               | Description                                                                  |
| :-------------- | :----------------- | :--------------------------------------------------------------------------- |
| `data-signal`   | **State**          | Initializes reactive signals. Supports **Signal Auto-Promotion** on-the-fly. |
| `data-class`    | **Hardened JIT**   | Reconciles Tailwind v4 utilities against reactive state with 0ms latency.    |
| `data-bind`     | **Binding**        | High-performance bidirectional binding to inputs and state.                  |
| `data-text`     | **Painting**       | Injects reactive expressions into `textContent`.                             |
| `data-on`       | **Behavior**       | Standard and **Native Event Mapping** (`hover`, `click:debounce.200ms`).     |
| `data-on-hover` | **Orchestration**  | Maps native mouseenter/mouseleave to a local `$hovered` signal.              |
| `data-injest`   | **Asset Registry** | Synchronously adopts external/local CSS into the Unified Style Registry.     |
| `data-switcher` | **Iteration**      | Automates cycling through states (e.g., Theme Toggles).                      |

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
    <title>Nexus-UX Get Started</title>
    <!-- Framework Ignition -->
    <script
      src="/dist/nexus-ux.js"
      data-injest="['/styles/theme.css']"
    ></script>
  </head>
  <body
    data-signal="{ count: 0 }"
    class="bg-slate-900 text-white font-sans antialiased"
  >
    <div
      class="flex flex-col items-center justify-center min-h-screen space-y-8"
    >
      <!-- Reactive Text Binding -->
      <h1
        class="text-6xl font-black tracking-tight"
        data-text="'Count is ' + count"
      >
      </h1>

      <div class="flex space-x-4">
        <!-- Native Event Mapping (hover) + Signal Orchestration -->
        <button
          class="px-8 py-4 bg-primary text-white rounded-full transition-all duration-300 transform"
          data-class="{ 'scale-110 shadow-2xl shadow-primary/50': $hovered }"
          data-on-hover="count++"
        >
          Hover to Increment
        </button>

        <!-- Standard Click with Modifier -->
        <button
          class="px-8 py-4 bg-secondary text-white rounded-full"
          data-on:click:debounce.50ms="count = 0"
        >
          Reset Counter
        </button>
      </div>

      <!-- Agentic Resolution Beacon Demo -->
      <div
        class="opacity-50 blur-sm hover:blur-none transition-all cursor-pointer"
        data-on:click="$('#missing-target').focus()"
      >
        Click to Trigger Agent Beacon (See Console)
      </div>
    </div>
  </body>
</html>
```

---

## 🛡️ License

Nexus-UX is released under the **MIT License**. Created with ❤️ by the Nexus-UX
Authors.
