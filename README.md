# 🌌 Nexus-UX

**Signal-Driven Universal Reactivity. Omni-State (DOM-as-State) Framework.**

Nexus-UX is a "Zenith-Class" reactive framework designed for developers who
demand absolute performance, granular control, and a **zero-build** experience.
It collapses the traditional frontend stack by treating the DOM as a queryable,
reactive state graph.

---

## 🏛️ The Five Pillars

1. **Omni-State (DOM-as-State)**: We assert that the DOM _is_ the primary state
   graph. No phantom Virtual DOM. No reconciliation tax. This unified model
   handles both client-side interactivity and server-side persistence
   seamlessly.
2. **HTML-First Renaissance**: Logic lives in your HTML. Use standard `data-*`
   attributes to define industrial-grade reactivity.
3. **Universal Reactivity**: Atomic updates via a Unified Signal Graph. Changes
   propagate instantly (<10ms) across the entire system.
4. **Zero-Allocation Engineering**: A value-pooling reactive core designed for
   120fps animations and garbage-free execution.
5. **Decentralized Auto-Discovery**: An automated build-step (`manifest.ts`)
   enables infinite plugin extensibility. Drop modules into `src/modules/*` and
   they instantly wire into the 4-Phase pipeline; no central imports required.

---

## 🛰️ The NEG Grammar (Nexus Expression Grammar)

Nexus-UX utilizes a deterministic, token-based grammar for high-baud efficiency.

| Token   | Designation       | Purpose                                             | Example                    |
| :------ | :---------------- | :-------------------------------------------------- | :------------------------- |
| **`.`** | Native Access     | Unwrapped, raw JS/DOM property access.              | `user.name`                |
| **`#`** | Global Signal     | The Global Registry of reactive sources.            | `#auth.user`               |
| **`_`** | Env Mirror        | Read-only snapshots of Browser/OS APIs.             | `_window.innerWidth`       |
| **`:`** | Modifier          | Pipeline anchors and interceptors.                  | `data-on:click:once`       |
| **`$`** | Sprite / Selector | Framework tools, Sprites, and the DOM Query engine. | `$(^card).$save()`         |
| **`@`** | Scope Rule        | Context-aware boundary rules (Media, OS, Auth).     | `@media(min-width: 600px)` |

---

## 🧩 Active Directives

| Directive       | Role                | Description                                                           |
| :-------------- | :------------------ | :-------------------------------------------------------------------- |
| `data-signal`   | **State**           | Initializes reactive signals for an element and its children.         |
| `data-bind`     | **Binding**         | High-performance bidirectional binding to inputs and state.           |
| `data-text`     | **Painting**        | Injects reactive expressions directly into `textContent`.             |
| `data-on`       | **Behavior**        | Standard and high-order event listeners (`click`, `submit`, etc.).    |
| `data-for`      | **Iteration**       | Declarative list rendering with optimized DOM reuse.                  |
| `data-injest`   | **Managed Loading** | Ensures zero-flicker loading of styles, scripts, and assets.          |
| `data-progress` | **Orchestration**   | Global and localized progress bars / spinners.                        |
| `data-pwa`      | **Integration**     | Automated PWA lifecycle, theme sync, and offline signals.             |
| `data-ux-theme` | **Theming**         | Orchestrates complex layout, color-mode, and system-preference logic. |
| `data-switcher` | **Iteration**       | Automates cycling through states (e.g., Theme Toggles).               |

---

## 🧩 Zero-Config Extensibility (Plugins)

Nexus-UX supports an open runtime API. Build third-party directives or
components and attach them securely without touching the core engine:

```javascript
Nexus.register({
  type: "attribute",
  name: "my-plugin",
  attribute: "on-custom-event",
  handle: (el, value, ctx) => {/* Custom logic */},
});
```

---

## 🔍 The Unified Reactive Selector `$()`

Treat your DOM like an Omni-State graph. Traverse laterally, find state, and
trigger actions across components without "lifting state."

- **`$(^section)`**: Find the nearest matching **Ancestor**.
- **`$(+ .item)`**: Target the **Next Sibling**.
- **`$(* #main)`**: Perform a **Global Scan** for a unique ID.
- **`$(> .btn)`**: Target direct **Children**.

---

## ⚡ High-Order Sprites (`$`)

Framework-level tools available as reactive signals or action commands:

- **`$fetch`**: Managed, reactive HTTP requests.
- **`$sql`**: Direct database integration (SurrealDB LIVE queries).
- **`$store`**: Global persisted state management.
- **`$nextTick`**: Deferred execution after the next DOM update cycle.

---

## 🌓 Boundary Rules (`@`)

Contextual logic structured like CSS, enabling site-aware reactivity:

- **`@media(query) { ... }`**: Viewport-aware UI state.
- **`@os(platform) { ... }`**: Native platform-specific logic.
- **`@auth(role) { ... }`**: Permission-based UI gating.
- **`@view { ... }`**: Hook into the View Transitions API.

---

## 🚀 Get Started

No transpilant, no bundler, no delay.

```html
<html data-injest="['https://cdn.tailwindcss.com']">
  <body data-signal="{ count: 0 }">
    <h1 data-text="'Count is ' + count"></h1>
    <button data-on:click:once="count++" class="btn">Click Once</button>

    <!-- Environment Mirror -->
    <p>Viewport: <span data-text="_window.innerWidth"></span>px</p>
  </body>
</html>
```

---

## 🛡️ License

Nexus-UX is released under the **MIT License**. Created with ❤️ by the Nexus-UX
Authors.
