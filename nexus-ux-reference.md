# Nexus-UX: The Exhaustive Technical Reference

**The Practical Manual: From Syntax to Zenith**

> "Theory is knowing how it works. Practice is making it work. This document
> bridges both."

This guide is the definitive practical reference for developers and AI agents
building with Nexus-UX. It is the core "Toolkit" for rapid development, focused
on outcomes and practical implementation patterns. Built on the **Omni-State
(DOM-as-State)** philosophy, it demonstrates how to use Nexus-UX as the
"Functional Soul" for modern web components.

---

## Table of Contents

1. [Preface: Quick Start](#preface-quick-start)
2. [Chapter 1: The Language (NEG Grammar & Fundamentals)](#chapter-1-the-language-neg-grammar--fundamentals)
3. [Chapter 2: Essential Directives (State & Binding)](#chapter-2-essential-directives-state--binding)
4. [Chapter 3: Control Flow & Rendering](#chapter-3-control-flow--rendering)
5. [Chapter 4: Events & Behavioral Pipelines](#chapter-4-events--behavioral-pipelines)
6. [Chapter 5: Styling, Classes & Dynamic Theming](#chapter-5-styling-classes--dynamic-theming)
7. [Chapter 6: Advanced Orchestration (Refs, Effects, Custom)](#chapter-6-advanced-orchestration-refs-effects-custom)
8. [Chapter 7: Sprites ($) & Data Integration](#chapter-7-sprites--data-integration)
   8.5 [Chapter 7.5: Environment Mirrors (_)](#chapter-75-environment-mirrors-)
9. [Chapter 8: Advanced Patterns & Real-World](#chapter-8-advanced-patterns--real-world)
10. [Chapter 9: Routing & Navigation](#chapter-9-routing--navigation)
11. [Chapter 10: Component System](#chapter-10-component-system)
12. [Chapter 11: Zenith-Class Orchestration Gallery](#chapter-11-zenith-class-orchestration-gallery)
13. [Chapter 12: Developer Experience & Performance](#chapter-12-developer-experience--performance)
14. [Chapter 13: Deployment](#chapter-13-deployment)
15. [Chapter 14: Premium Assets & Themes](#chapter-14-premium-assets--themes)

---

## Preface: Quick Start

### Your First Nexus-UX App

**Step 1: Include the Runtime**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My Nexus App</title>
    <!-- Nexus-UX runtime -->
    <script src="https://cdn.nexus.io/ux/v1.0.0/nexus-ux.min.js"></script>
  </head>
  <body>
    <!-- Your app goes here -->
  </body>
</html>
```

**Step 2: Connect to SurrealDB**

```html
<script>
  // Initialize Nexus-UX runtime
  $nexus.connect({
    endpoint: "ws://localhost:8000/rpc", // SurrealDB WebSocket
    namespace: "myapp",
    database: "production",
    auth: {
      scope: "locker", // Use Nexus Locker authentication
      email: "user@example.com",
      password: "your_password",
    },
  });
</script>
```

**Step 3: Build Your UI**

```html
<div data-signal="{ users: $sql('LIVE SELECT * FROM user') }">
  <h1>Users ({users.length})</h1>
  <ul>
    <li data-for="user in users">{user.name} ({user.email})</li>
  </ul>
</div>
```

**That's it.** No build step, no npm, no webpack. Just HTML + data bindings.

---

## Chapter 1: The Language (NEG Grammar & Fundamentals)

The **Nexus Expression Grammar (NEG)** is a high-performance, deterministic,
token-based system designed for zero-allocation execution. Built on the **ESSL**
(Element-Scope-Signal-Logic) standard, it eliminates the "Magic Parsing" tax of
legacy frameworks by utilizing direct token-to-function mapping.

### 1.1. Symbol Reference (The Token Set)

| Symbol | Designation          | Technical Role                                                                             | Practical Example                                                 |
| :----- | :------------------- | :----------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `.`    | **Native Access**    | **Unwrapped Integrity**. Bypasses the Reactive Proxy for high-frequency/raw JS/DOM access. | `<div data-bind="user.name"></div>`                               |
| `#`    | **Global Signal**    | **Reactive Source**. Accesses user-defined Global Signals managed by the Binary Heap.      | `<div data-bind="#auth.user"></div>`                              |
| `_`    | **Env Mirror**       | **API Snapshot**. Read-only access to reactive wrappers of Browser/OS APIs.                | `<div data-bind="_window.innerWidth"></div>`                      |
| `:`    | **Modifier**         | **Pipeline Anchor**. Defines interceptors, wrappers, and pipeways for logical execution.   | `<button data-on-click:once="save()"></button>`                   |
| `$`    | **Logic / Selector** | **Sprite / Command**. Framework-level tools (tools) and the Unified Selector engine.       | `<button data-on-click="$(^form).save()"></button>`               |
| `@`    | **Scope Rule**       | **Boundary Rule**. Site-aware logic based on environment, OS, or security state.           | `<div data-bind="@media(min-width: 1024px) { 'Desktop' }"></div>` |

### 1.2. The Unified Reactive Selector $(path)

Nexus-UX treats the DOM as a queryable state graph. The `$(...)` engine enables
**Lateral State Traversal**, allowing components to communicate across the DOM
without centralized stores.

#### 1.2.1. Combinator Registry

| Combinator | Name             | Technical Intent                                      | Example       |
| :--------- | :--------------- | :---------------------------------------------------- | :------------ |
| `^`        | **Ancestor**     | Moves up to the nearest parent matching the selector. | `$(^section)` |
| `-`        | **Prev Sibling** | Selects the immediate previous matching sibling.      | `$(- .item)`  |
| `+`        | **Next Sibling** | Selects the immediate next matching sibling.          | `$(+ .item)`  |
| `~`        | **Siblings**     | Selects all siblings matching the selector.           | `$(~ .btn)`   |
| `>`        | **Child**        | Selects direct child nodes matching the selector.     | `$(> .card)`  |
| `*`        | **Global Scan**  | Escapes current scoping to find a globally unique ID. | `$(* #main)`  |

> [!IMPORTANT]
> **State Discovery**: Targets returned by `$(...)` are live Reactive Node
> Proxies. You can read, write, or inject actions directly. _Example_:
> `$(^card).count++` increments state on a parent without "lifting" logic.

### 1.3. Native JS-Native Transforms

Nexus-UX bypasses custom parsers by treating directive values as native JS
template strings. This allows for zero-overhead visual logic.

- **Dynamic Properties**: `data-style="{ width: percent + '%' }"`
- **Logical Branching**: `data-class="{ active: status === 'ready' }"`
- **Complex Templates**:
  `data-style="{ background: \`linear-gradient(\${angle}deg, #f06, #4a9)\` }"`

### 1.4. Scope Rules (@)

Scope Rules define logical boundaries and environment awareness within the
reactive context, mirroring CSS syntax for familiar structure.

#### 1.4.1. The Scope Rule Registry (ESSL)

| Rule           | Behavioral Outcome | Typical Use Case                                     |
| :------------- | :----------------- | :--------------------------------------------------- |
| **@media**     | Env Logic          | Responding to viewport dimensions.                   |
| **@container** | Contextual Logic   | Component-specific responsiveness.                   |
| **@os(plat)**  | Host Awareness     | Native platform logic (e.g., Mac vs Linux).          |
| **@native**    | Native API Sync    | Interoperating with Nexus-IO runtime signals.        |
| **@auth**      | Security Scope     | UI-gating based on active permission signals.        |
| **@view**      | Transition Link    | Hooking into the View Transitions API during morphs. |

### 1.5. The `data-*` / `dataset` Foundation

Nexus-UX directives are standard HTML `data-*` attributes. The browser natively
provides a bidirectional JavaScript API — the `dataset` property — to read and
write them. This is the operational primitive of the entire framework.

#### 1.5.1. Declarative vs. Imperative Patterns

| Pattern                 | Syntax                                        | When to Use                                                |
| :---------------------- | :-------------------------------------------- | :--------------------------------------------------------- |
| **Declarative (HTML)**  | `<input data-bind="name">`                    | Defining the UI structure and binding map                  |
| **Imperative Read**     | `el.dataset.bindValue`                        | Inspecting a directive's expression at runtime             |
| **Imperative Write**    | `el.dataset.bindValue = "email"`              | Dynamically reassigning a binding (triggers re-evaluation) |
| **Raw Attribute Read**  | `el.getAttribute('data-bind-value')`          | High-frequency reads where marginal perf matters           |
| **Raw Attribute Write** | `el.setAttribute('data-bind-value', 'email')` | Equivalent to `dataset` write; updates both sides          |

#### 1.5.2. Naming Convention: Automatic Kebab ↔ CamelCase

The browser converts `data-*` kebab-case to `dataset` camelCase automatically:

```javascript
// HTML: <div data-signal="{ count: 0 }" data-on-click="count++">
const el = document.querySelector("div");
el.dataset.signal; // "{ count: 0 }"
el.dataset.onClick; // "count++"
el.dataset.bindValue; // corresponds to data-bind-value
el.dataset.onSignalChange; // corresponds to data-on-signal-change
```

#### 1.5.3. Data Type Handling

All `data-*` attribute values are **strings**. Nexus-UX handles type conversion
internally:

```html
<!-- These are string values in the DOM attribute... -->
<div data-signal="{ count: 0, items: ['a','b'], user: { name: 'Ada' } }">
```

```javascript
// ...but Nexus-UX parses them once into reactive values:
// count → number (0) — stored in binary signal heap (Float64Array)
// items → array (['a','b']) — stored as @vue/reactivity proxy
// user  → object ({ name: 'Ada' }) — stored as @vue/reactivity proxy
```

> [!IMPORTANT]
> **Zero-Copy Performance**: Once parsed at initialization, signal values are
> **never serialized back** to `data-*` attribute strings. The HTML attribute is
> the declaration; the reactive signal heap is the runtime truth. DOM updates
> flow directly from signal values to element properties (`el.textContent`,
> `el.style`, `el.className`) — never through attribute serialization. This is
> the foundation of Nexus-UX's zero-allocation reactive loop.

---

## Chapter 2: Essential Directives (State & Binding)

### 2.1. `data-signal` — Declare Reactive State

**Syntax**: `data-signal="{ signalName: initialValue, ... }"`

**Purpose**: Creates a reactive scope with signals.

**Examples**:

```html
<!-- Simple value -->
<div data-signal="{ count: 0 }">
  <p>{count}</p>
</div>

<!-- Object -->
<div data-signal="{ user: { name: 'John', age: 30 } }">
  <p>{user.name} is {user.age} years old</p>
</div>

<!-- Array -->
<div data-signal="{ items: ['Apple', 'Banana', 'Cherry'] }">
  <ul>
    <li data-for="item in items">{item}</li>
  </ul>
</div>

<!-- Live query (SurrealDB) -->
<div
  data-signal="{ todos: $sql('LIVE SELECT * FROM todo WHERE owner = auth.id') }"
>
  <p>You have {todos.length} todos</p>
</div>

<!-- Computed signal (derived from other signals) -->
<div data-signal="{ firstName: 'John', lastName: 'Doe' }">
  <div data-signal="{ fullName: firstName + ' ' + lastName }">
    <p>{fullName}</p>
  </div>
</div>
```

**Scoping**: Signals are scoped to the element they're declared on and all
descendants.

```html
<div data-signal="{ count: 10 }">
  <p>{count}</p>
  <!-- ✅ Accessible -->
  <div>
    <p>{count}</p>
    <!-- ✅ Accessible (child element) -->
  </div>
</div>
<p>{count}</p>
<!-- ❌ Not accessible (outside scope) -->
```

**Signal naming**: Must start with `$` when referenced in expressions.

#### 2.1.1. State Management Directives

| Directive                | Designation           | Behavioral Outcome                                         |
| :----------------------- | :-------------------- | :--------------------------------------------------------- |
| **`data-signal`**        | **State Root**        | Initializes a local reactive proxy.                        |
| **`data-signal-global`** | **Beacon**            | Links the element to the shared Global Binary Heap.        |
| **`data-computed`**      | **Logic Derivative**  | Creates a read-only signal that caches expression results. |
| **`data-preserve`**      | **Structural Shield** | Prevents node/identity loss during server-driven morphs.   |

#### 2.1.2. Logic Inheritance (`--`)

Nexus-UX supports **Signal Inheritance** for theme-level logic. Signals prefixed
with `--` automatically cascade to all descendants.

- **Source**: `<div data-signal="{ --theme: 'dark' }">`
- **Target**: `<span data-text="--theme"></span>` (Accesses inherited value).

#### 2.1.3. Practical Data Patterns

- **Initial Fetch**:
  ```html
  <div
    data-signal="{ users: [] }"
    data-on-load="users = await $get('/api/users')"
  >
  </div>
  ```
- **Shared Application State**:
  ```html
  <body data-signal-global="appState"> <!-- All children can now use #appState -->
  ```

### 2.2. `data-bind` — Two-Way Data Binding

**Syntax**: `data-bind-property="signalExpression"`

**Purpose**: Binds an element property to a signal, updating both when either
changes.

**Supported properties**:

- `value` (input, textarea, select)
- `checked` (checkbox, radio)
- `disabled` (any element)
- `hidden` (any element)
- Any custom property

**Examples**:

```html
<!-- Text input -->
<div data-signal="{ name: '' }">
  <input type="text" data-bind="name">
  <p>Hello, {name}!</p>
</div>

<!-- Checkbox -->
<div data-signal="{ agreed: false }">
  <input type="checkbox" data-bind="agreed">
  <p data-if="agreed">Thank you for agreeing!</p>
</div>

<!-- Select dropdown -->
<div data-signal="{ color: 'red' }">
  <select data-bind="color">
    <option value="red">Red</option>
    <option value="green">Green</option>
    <option value="blue">Blue</option>
  </select>
  <p>Selected: {color}</p>
</div>

<!-- Disabled state -->
<div data-signal="{ loading: false }">
  <button
    data-bind-disabled="loading"
    data-on-click="loading = true; setTimeout(() => loading = false, 2000)"
  >
    {loading ? 'Loading...' : 'Click Me'}
  </button>
</div>
```

**Advanced**: Bind to nested object properties

```html
<div
  data-signal="{ user: { profile: { name: 'John', email: 'john@example.com' } } }"
>
  <input type="text" data-bind="user.profile.name">
  <input type="email" data-bind="user.profile.email">
</div>
```

#### 2.2.1. Content & Attribute Binding

| **`data-bind`** | **Auto-Detect** | **The Unified Binding Engine**.
Auto-detects target property (text, value, checked) based on element type.
Absorbs legacy `data-text` and `data-model`. | | **`data-html`** | **HTML
Content** | Sets `innerHTML`. **CAUTION**: Use only for trusted content. | |
**`data-var-[name]`** | **Variable Sync** | **CSS Custom Property Bridge**.
Direct synchronization of state to CSS variables (`--[name]`). | |
**`data-bind-[attr]`** | **Attribute Sync** | Reactively syncs a signal to any
native HTML attribute. |

#### 2.2.2. Form Two-Way Binding

Nexus-UX provides robust two-way binding for all standard form elements via
`data-bind`.

- **Input/Textarea**: `<input data-bind="username">`
- **Select**:
  ```html
  <select data-bind="selectedId">
    <template data-for="opt in options">
      <option data-bind="opt.id" data-bind="opt.label"></option>
    </template>
  </select>
  ```
- **Checkbox**: `<input type="checkbox" data-bind="isActive">` (Binds to
  Boolean).

#### 2.2.3. Automatic Unit Appending (data-style)

When numeric signals are used in `data-style`, the engine automatically appends
the appropriate CSS unit (e.g., `px`), bypassing string parsing for 60fps
fluidity.

- **Automatic Optimization**: `data-style-left="val"` (Raw number sync).

#### 2.2.4. "Data Painting" with `data-var`

Directly sync state to CSS Custom Properties. Essential for DaisyUI integration.

- **Pattern**: `<div class="radial-progress" data-var-value="percent"></div>`

#### 2.2.5. "Data Progress" for Site-wide Loading

- **Linear Determinate**:
  `<html data-progress="{ type: 'bar', location: 'top', color: 'primary', value: 'progress' }">`
- **Linear Indeterminate (Sweeping Mode)**: Evaluate to a boolean `true` for
  continuous animation.
  `<html data-progress="{ type: 'bar', location: 'top', color: 'primary', value: 'isLoading === true' }">`
- **Spinner**:
  `<div data-progress="{ type: 'spinner', size: '20px', value: 'isBusy' }"></div>`

#### 2.2.6. "Data Injest" 2.0 — Reactive Grouped Namespaces

**Syntax**: `data-injest="{ groupName: { type: 'url' } }"`

**Purpose**: Defers HTML rendering until critical external assets (like tailwind
CDN or custom fonts) are fully loaded, parsed, and adopted via Constructable
Stylesheets. Supports reactive updates and multiple asset types per namespace.

- **Standard Pattern**:
  `<html data-injest="{ tailwind: { link: 'https://cdn.tailwindcss.com' } }"> ... </html>`

- **Reactive Theme Switcher**:
  ```html
  <div data-injest="{ theme: { theme: 'themes/' + currentTheme + '.css' } }">
  ```

---

## Chapter 3: Control Flow & Rendering

### 3.1. Conditional Rendering Specification

| Directive       | Rendering Mode       | Technical Implication                                            |
| :-------------- | :------------------- | :--------------------------------------------------------------- |
| **`data-if`**   | **Physical Removal** | Element is added/removed from the DOM. Requires `<template>`.    |
| **`data-show`** | **Visual Toggle**    | Toggles `display: none`. Item remains in the accessibility tree. |

> [!IMPORTANT]
> **Performance**: Use `data-show` for elements that toggle frequently (e.g.,
> dropdowns) to avoid the layout cost of DOM insertion/removal. Use `data-if`
> for heavy components that should only exist when active.

### 3.2. `data-if` — Conditional Rendering

**Syntax**: `data-if="condition"`

**Purpose**: Shows/hides element based on condition. Element is **removed from
DOM** when false (not just hidden with CSS).

**Examples**:

```html
<!-- Simple boolean -->
<div data-signal="{ loggedIn: false }">
  <div data-if="loggedIn">
    <p>Welcome back!</p>
  </div>
  <div data-if="!loggedIn">
    <p>Please log in.</p>
  </div>
</div>

<!-- Comparison -->
<div data-signal="{ age: 16 }">
  <p data-if="age >= 18">You can vote!</p>
  <p data-if="age < 18">You're too young to vote.</p>
</div>

<!-- Complex expression -->
<div data-signal="{ user: { role: 'admin', active: true } }">
  <div data-if="user.role === 'admin' && user.active">
    <p>Admin dashboard</p>
  </div>
</div>

<!-- Null/undefined checks -->
<div data-signal="{ data: null }">
  <p data-if="data">Data loaded: {data}</p>
  <p data-if="!data">Loading...</p>
</div>
```

**Performance note**: `data-if` is more performant than CSS `display: none`
because the browser doesn't have to calculate layout/paint for hidden elements.

**`data-if` with `<template>` Example**:

```html
<template data-if="isPremium">
  <div class="badge badge-gold">VIP Content</div>
</template>
```

### 3.3. `data-for` — List Rendering

**Syntax**: `data-for="item in arrayExpression"`\
**Optional key**: `data-key="item.id"`

**Purpose**: Repeats element for each item in an array.

**Examples**:

```html
<!-- Simple array -->
<div data-signal="{ fruits: ['Apple', 'Banana', 'Cherry'] }">
  <ul>
    <li data-for="fruit in fruits">{fruit}</li>
  </ul>
</div>

<!-- Array of objects -->
<div data-signal="{ users: $sql('SELECT * FROM user') }">
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody>
      <tr data-for="user in users" data-key="user.id">
        <td>{user.name}</td>
        <td>{user.email}</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Indexed access -->
<div data-signal="{ items: ['First', 'Second', 'Third'] }">
  <div data-for="(item, index) in items">
    <p>{index + 1}. {item}</p>
  </div>
</div>

<!-- Nested loops -->
<div
  data-signal="{ categories: [
  { name: 'Fruits', items: ['Apple', 'Banana'] },
  { name: 'Vegetables', items: ['Carrot', 'Broccoli'] }
] }"
>
  <div data-for="category in categories">
    <h3>{category.name}</h3>
    <ul>
      <li data-for="item in category.items">{item}</li>
    </ul>
  </div>
</div>
```

**Keyed reconciliation**: Use `data-key` for efficient DOM updates when array
changes.

```html
<!-- Without key: Entire list re-renders on change -->
<div data-for="user in users">
  <p>{user.name}</p>
</div>

<!-- With key: Only changed items re-render -->
<div data-for="user in users" data-key="user.id">
  <p>{user.name}</p>
</div>
```

**Performance**: Always use `data-key="item.id"` for large lists (>100 items).

**With `<template>` (canonical form)**:

```html
<template data-for="user in users" data-key="user.id">
  <li data-bind="user.name"></li>
</template>
```

---

## Chapter 4: Events & Behavioral Pipelines

### 4.1. `data-on` — Event Handlers

**Syntax**: `data-on-eventName="expression"`\
**Modifiers**: `:prevent`, `:stop`, `:once`, `:key`

**Supported events**: `click`, `input`, `change`, `submit`, `keydown`, `keyup`,
`mouseenter`, `mouseleave`, `focus`, `blur`, etc.

**Examples**:

```html
<!-- Basic click handler -->
<div data-signal="{ count: 0 }">
  <button data-on-click="count++">Increment</button>
  <p>{count}</p>
</div>

<!-- Multiple statements -->
<button data-on-click="console.log('Clicked!'); alert('Hello!')">
  Click me
</button>

<!-- Event object access -->
<input type="text" data-on-input="console.log(event.target.value)">

<!-- Prevent default -->
<form data-on-submit:prevent="handleSubmit()">
  <input type="text" name="email">
  <button type="submit">Submit</button>
</form>

<!-- Stop propagation -->
<div data-on-click="console.log('Outer')">
  <button data-on-click:stop="console.log('Inner')">
    Click me (won't bubble up)
  </button>
</div>

<!-- Once modifier (handler only fires once) -->
<button data-on-click:once="console.log('This will only log once')">
  Click me
</button>

<!-- Key modifiers -->
<input type="text" data-on-keydown:enter="submitForm()">
<input type="text" data-on-keydown:escape="clearInput()">
<input type="text" data-on-keydown:ctrl.s="saveDocument()">
```

**Event modifiers summary**:

- `.prevent` - calls `event.preventDefault()`
- `.stop` - calls `event.stopPropagation()`
- `.once` - handler only fires once, then removes itself
- `.enter`, `.escape`, `.space` - keyboard key filters
- `.ctrl`, `.shift`, `.alt`, `.meta` - modifier key combinations

### 4.2. Event Listener Modifiers (Extended)

Modifiers composed with `data-on-[event]` to alter the native event behavior.

| Modifier   | Behavioral Outcome                                           |
| :--------- | :----------------------------------------------------------- |
| `:prevent` | Calls `event.preventDefault()`.                              |
| `:stop`    | Calls `event.stopPropagation()`.                             |
| `:once`    | Listener is automatically removed after the first execution. |
| `:outside` | Executes only when a click occurs outside the element.       |
| `:snap`    | Synchronizes the execution to the next animation frame.      |

### 4.3. Specialized Lifecycle Directives

| Directive                   | Execution Point                | Primary Use Case                                    |
| :-------------------------- | :----------------------------- | :-------------------------------------------------- |
| **`data-on-load`**          | Element entry to DOM.          | Fetching initial data, initializing 3rd party libs. |
| **`data-on-raf`**           | Every `requestAnimationFrame`. | Zero-allocation animations, canvas updates.         |
| **`data-on-intersect`**     | Viewport entry/exit.           | Infinite scroll beacons, spatial triggers.          |
| **`data-on-signal-change`** | On specific signal mutate.     | Side-effects: saving to localStorage, logging.      |

### 4.4. High-Performance Timing

- **Debounce**: `<input data-on-input:debounce(500ms)="query = $el.value">`
- **Throttle**:
  `<div data-on-scroll:throttle(16ms)="scrollY = _window.scrollY">`

### 4.5. Universal Behavioral Composition (Pipelines)

Behaviors in Nexus-UX are decoupled from specific directives. They are composed
into a **Pipeline** using the modifier (`:`) syntax, creating a deterministic
chain of execution.

#### 4.5.1. Modifier Classification

| Category         | Role           | Execution Phase | Examples                                                   |
| :--------------- | :------------- | :-------------- | :--------------------------------------------------------- |
| **Interceptors** | **Guards**     | Pre-Execution   | `:confirm`, `:auth`, `:validate`, `:debounce`, `:throttle` |
| **Wrappers**     | **Lifecycles** | Execution Frame | `:indicator`, `:transition`, `:busy`                       |
| **Pipeways**     | **Outcomes**   | Post-Execution  | `:morph`, `:log`, `:toast`, `:dispatch`, `:preserve`       |

#### 4.5.2. Pipeline Execution Logic

1. **Intercept**: The engine runs all interceptors. If any fail (e.g.,
   `:confirm` is rejected), the pipeline terminates.
2. **Wraps**: Active wrappers are initialized (e.g., an `#indicator` is shown).
3. **Execute**: The core directive logic or sprite (e.g., `$post`) is executed.
4. **Resolve**: Post-execution handlers (Pipeways) process the result (e.g.,
   `:morph` the response into the DOM).
5. **Finalize**: Wrappers are cleaned up (e.g., the indicator is hidden).

#### 4.5.3. Detailed Modifier Reference

- **`:confirm('msg')`**: Pauses execution for a native window confirmation.
- **`:auth('role')`**: Gates execution based on the `#auth` signal state.
- **`:indicator(selector)`**: Shows the target element during async operations
  and hides it after.
- **`:morph`**: Essential for Hypermedia. It morphs the result of an async
  sprite into the current element's children.
- **`:transition`**: Wraps the update in the browser's native View Transitions
  API.
- **`:preserve`**: **The Behavioral Anchor**. Buffers the directive's value
  before a morph and restores it after to prevent data loss.

#### 4.5.4. Practical Composition Examples

- **The Secure Auto-Saver**:
  ```html
  <input
    data-bind-value:debounce(1000ms):indicator(#sync-icon):post:preserve="/api/save"
  >
  ```
  _Logic_: Wait 1s (debounce), show sync icon, post data, preserve the input's
  focus/value during the morph.

- **The Guarded Operation**:
  ```html
  <button data-on-click:confirm('Burn state?'):auth('admin'):morph="$post('/api/reset')">
     Wipe Data
  </button>
  ```
  _Logic_: Confirm with user, check admin rights, then post and morph the
  result.

---

## Chapter 5: Styling, Classes & Dynamic Theming

### 5.1. `data-style` — Dynamic Styles

**Syntax**: `data-style="{ property: expression, ... }"`

**Purpose**: Dynamically bind CSS properties to signal values using object
mapping. Suffix-based binding (e.g. `data-style-color`) is deprecated in favor
of the unified object syntax.

**Examples**:

```html
<!-- Background color -->
<div data-signal="{ color: 'red' }">
  <div data-style-background-color="color" style="width: 100px; height: 100px">
  </div>
  <button data-on-click="color = 'blue'">Make Blue</button>
</div>

<!-- Width/height (Object syntax) -->
<div data-signal="{ width: 50 }">
  <div
    data-style="{ width: width + '%' }"
    style="background: blue; height: 50px"
  >
  </div>
  <input type="range" min="0" max="100" data-bind-value="width">
</div>

<!-- Conditional styles -->
<div data-signal="{ active: false }">
  <button
    data-style-background-color="active ? 'green' : 'gray'"
    data-on-click="active = !active"
  >
    {active ? 'Active' : 'Inactive'}
  </button>
</div>

<!-- Multiple style properties (Cleanest Pattern) -->
<div data-signal="{ theme: { bg: '#222', fg: '#fff', size: '16px' } }">
  <div
    data-style="{
      backgroundColor: theme.bg,
      color: theme.fg,
      fontSize: theme.size
    }"
  >
    Themed content
  </div>
</div>
```

**Units**: Nexus-UX automatically adds `px` for numeric values on properties
that need units (width, height, padding, margin, etc.).

```html
<!-- These are equivalent -->
<div data-style-width="100">...</div>
<div data-style-width="'100px'">...</div>
```

**Logical Styles**:

```html
<div
  data-style-margin-block-start="spacing + 'px'"
  data-style-opacity="isPending ? 0.5 : 1"
>
</div>
```

### 5.2. `data-class` — Dynamic CSS Classes

**Syntax**: `data-class="{ className: booleanExpression, ... }"` or
`data-class="['cls1', ... ]"`

**Purpose**: Toggle CSS classes based on object or array conditions.
Suffix-based binding (e.g. `data-class-active`) is deprecated in favor of the
unified reconciliation engine.

**Examples**:

```html
<!-- Single class toggle -->
<div data-signal="{ active: false }">
  <button
    data-class-active="active"
    data-on-click="active = !active"
  >
    Toggle
  </button>
</div>

<!-- Multiple conditional classes -->
<div data-signal="{ status: 'warning' }">
  <div
    data-class-success="status === 'success'"
    data-class-warning="status === 'warning'"
    data-class-error="status === 'error'"
  >
    Status: {status}
  </div>
</div>

<!-- Combine with static classes -->
<button
  class="btn"
  data-class-btn-primary="!loading"
  data-class-btn-disabled="loading"
>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

**CSS**:

```css
.active {
  background-color: green;
  color: white;
}
.success {
  color: green;
}
.warning {
  color: orange;
}
.error {
  color: red;
}
```

### 5.3. Bridging UI Libraries with `data-var`

Modern CSS libraries (e.g., DaisyUI) utilize CSS Custom Properties for internal
logic.

- **Taming DaisyUI Progress**:
  ```html
  <div class="radial-progress" data-var-value="percent" role="progressbar">
    <span data-text="percent + '%'"></span>
  </div>
  ```
- **Dynamic Theming**:
  ```html
  <body data-var-primary-color="#auth.theme.primary">
    <button class="btn btn-primary">Themed Button</button>
  </body>
  ```

### 5.4. `data-ux-theme` — Intelligent Theme Orchrestration

**Syntax**: `data-ux-theme="{ default: 'mode', themes: { mode: { config } } }"`

**Purpose**: Automates complex layout, color-mode, and system-preference
(`prefers-color-scheme`) logic, automatically lifting the resolved theme mapping
(e.g., `'cupcake'`) to the root HTML `data-theme` attribute for library
compatibility (DaisyUI).

**Examples**:

```html
<html data-ux-theme="{
    default: 'auto',
    modes: {
        auto: { icon: 'auto-mode-icon' },
        light: { icon: 'sun-icon', theme: 'cupcake' },
        dark: { icon: 'moon-icon', theme: 'synthwave' }
    }
}">
```

**Access**: Use the globally injected `#theme` signal to read the resolved
configuration anywhere in the app (e.g., `<span data-class="#theme.icon">`).

### 5.5. `data-switcher` — State Iteration

**Syntax**: `data-switcher-signalName="['val1', 'val2', 'val3']"`

Automates iterating through an array of states upon user interaction without
logic overhead. Used heavily alongside `data-ux-theme` for building native
"Theme Toggle" buttons.

**Example**:

```html
<button data-switcher-mode="['light', 'dark', 'auto']">
  Toggle Mode
</button>
```

````
> [!TIP]
> **Data Painting**: Use `data-var-icon="'\2713'"` combined with CSS
> `content: var(--icon)` for high-performance icon toggling without DOM
> mutations.

---

## Chapter 6: Advanced Orchestration (Refs, Effects, Custom)

### 6.1. `data-ref` — Element References

**Syntax**: `data-ref="refName"`

**Purpose**: Create a reference to a DOM element for programmatic access.

**Examples**:

```html
<!-- Focus an input -->
<div>
<input type="text" data-ref="emailInput">
<button data-on-click="$refs.emailInput.focus()">
  Focus Email Input
</button>
</div>

<!-- Scroll to element -->
<div>
<div style="height: 2000px"></div>
<div data-ref="section2">
  <h2>Section 2</h2>
</div>
<button data-on-click="$refs.section2.scrollIntoView({ behavior: 'smooth' })">
  Scroll to Section 2
</button>
</div>

<!-- Get element dimensions -->
<div>
<div data-ref="box" style="width: 200px; height: 100px; background: blue">
</div>
<button data-on-click="alert('Width: ' + $refs.box.offsetWidth)">
  Get Width
</button>
</div>
````

**Access**: All refs are available via `$refs.refName` within the scope.

### 6.2. `data-effect` — Side Effects

**Syntax**: `data-effect="expression"`

**Purpose**: Run code whenever signals change (similar to React's `useEffect`).

**Examples**:

```html
<!-- Log to console when signal changes -->
<div data-signal="{ count: 0 }">
  <div data-effect="console.log('Count changed:', count)"></div>
  <button data-on-click="count++">Increment</button>
</div>

<!-- Update document title -->
<div data-signal="{ pageTitle: 'Home' }">
  <div data-effect="document.title = 'My App - ' + pageTitle"></div>
  <input type="text" data-bind-value="pageTitle">
</div>

<!-- Save to localStorage -->
<div data-signal="{ settings: { theme: 'dark', fontSize: 14 } }">
  <div
    data-effect="localStorage.setItem('settings', JSON.stringify(settings))"
  >
  </div>
  <select data-bind-value="settings.theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</div>

<!-- Auto-scroll chat to bottom -->
<div data-signal="{ messages: $sql('LIVE SELECT * FROM message') }">
  <div class="message-container" data-ref="container">
    <div data-for="msg in messages">{msg.text}</div>
  </div>
  <div data-effect="$refs.container.scrollTop = $refs.container.scrollHeight">
  </div>
</div>
```

**Cleanup**: Effects run after DOM updates. For cleanup logic (e.g., removing
event listeners), return a cleanup function:

```html
<div
  data-effect="
  const handler = () => console.log('Resized');
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
"
>
</div>
```

---

## Chapter 7: Sprites (`$`) & Data Integration

### 7.1. `$sql()` Function

**Syntax**: `$sql(queryString, [bindings])`

**Purpose**: Execute SurrealDB queries from Nexus-UX.

**Examples**:

```html
<!-- Simple SELECT -->
<div data-signal="{ users: $sql('SELECT * FROM user') }">
  <p>{users.length} users</p>
</div>

<!-- Parameterized query -->
<div data-signal="{ userId: 'user:123' }">
  <div
    data-signal="{ user: $sql('SELECT * FROM userId', { userId: userId }) }"
  >
    <p>{user.name}</p>
  </div>
</div>

<!-- INSERT on button click -->
<div data-signal="{ name: '' }">
  <input type="text" data-bind-value="name">
  <button
    data-on-click="$sql('CREATE user CONTENT { name: name, created_at: time::now() }')"
  >
    Add User
  </button>
</div>

<!-- UPDATE -->
<div data-signal="{ user: $sql('SELECT * FROM user:auth.id') }">
  <input type="text" data-bind-value="user.email">
  <button data-on-click="$sql('UPDATE user:auth.id SET email = user.email')">
    Save
  </button>
</div>

<!-- DELETE -->
<button data-on-click="$sql('DELETE user:userId'); window.location.reload()">
  Delete User
</button>
```

**Async behavior**: `$sql()` returns a Promise. Use `data-signal` to handle
loading state:

```html
<div data-signal="{ loading: false }">
  <div data-signal="{ users: [] }">
    <button
      data-on-click="loading = true; $sql('SELECT * FROM user').then(r => { users = r; loading = false; })"
    >
      Load Users
    </button>
    <p data-if="loading">Loading...</p>
    <ul data-if="!loading">
      <li data-for="user in users">{user.name}</li>
    </ul>
  </div>
</div>
```

### 7.2. LIVE Queries (Real-Time)

**Syntax**: `$sql('LIVE SELECT ...')`

**Purpose**: Subscribe to real-time updates from SurrealDB.

**How it works**:

1. Browser opens WebSocket to SurrealDB
2. `LIVE SELECT` creates a server-side subscription
3. When table rows change, server pushes **diffs** (not full data)
4. Nexus-UX applies diffs to signal automatically

**Examples**:

```html
<!-- Real-time user list -->
<div data-signal="{ users: $sql('LIVE SELECT * FROM user') }">
  <ul>
    <li data-for="user in users">{user.name}</li>
  </ul>
</div>

<!-- Filtered live query -->
<div
  data-signal="{ myTodos: $sql('LIVE SELECT * FROM todo WHERE owner = auth.id AND completed = false') }"
>
  <p>You have {myTodos.length} active todos</p>
</div>

<!-- Multi-user chat -->
<div
  data-signal="{ messages: $sql('LIVE SELECT * FROM message WHERE room = roomId ORDER BY timestamp DESC LIMIT 50') }"
>
  <div data-for="msg in messages">
    <strong>{msg.author.name}:</strong> {msg.text}
  </div>
</div>
```

**Performance**: LIVE queries are highly efficient because:

- Server sends only **diffs** (e.g., "row with id X was updated, field Y changed
  to Z")
- No polling (WebSocket is persistent)
- SurrealDB indexes ensure fast change detection

### 7.3. Parameterized Queries

**Why**: Prevent SQL injection and make queries reusable.

```html
<!-- ❌ BAD (vulnerable to injection) -->
<div data-signal="{ search: '' }">
  <input type="text" data-bind-value="search">
  <div
    data-signal="{ results: $sql('SELECT * FROM product WHERE name CONTAINS ' + search) }"
  >
    <!-- If user types: '; DELETE FROM product; -- -->
  </div>
</div>

<!-- ✅ GOOD (safe parameterized query) -->
<div data-signal="{ search: '' }">
  <input type="text" data-bind-value="search">
  <div
    data-signal="{ results: $sql('SELECT * FROM product WHERE name CONTAINS search', { search: search }) }"
  >
    <div data-for="product in results">{product.name}</div>
  </div>
</div>
```

**Built-in parameters**:

- `auth.id` - Current user's locker ID
- `auth.email` - Current user's email
- `auth.role` - Current user's role

### 7.4. External APIs (`$fetch`)

**Syntax**: `$fetch(url, options)`

**Purpose**: Call external (non-SurrealDB) APIs.

```html
<div data-signal="{ weather: null }">
  <button
    data-on-click="$fetch('https://api.weather.com/v1/london').then(res => res.json()).then(data => weather = data)"
  >
    Get Weather
  </button>
  <p data-if="weather">Temp: {weather.temp}</p>
</div>
```

### 7.5. Filesystem (`$fs`)

**Purpose**: Runtime capability for accessing the sandboxed filesystem (provided
by Nexus-IO).

**Methods**:

- `read(path)`: Returns Promise<string>
- `write(path, content)`: Returns Promise<void>
- `list(path)`: Returns Promise<string[]>

```html
<button data-on-click="$fs.write('log.txt', 'Clicked at ' + new Date())">
  Log Click
</button>
```

### 7.6. Device Capabilities (`$device`)

**Purpose**: Runtime capability for hardware interaction (provided by Nexus-IO).

**Capabilities**: `$device.battery`, `$device.location`, `$device.camera`

```html
<div
  data-effect="
  $device.location.getCurrentPosition().then(pos => console.log(pos.coords))
"
>
</div>
```

### 7.7. WebSocket (`$ws`)

**Syntax**: `$ws(url, [protocols])`

**Purpose**: Open a managed WebSocket connection with reactive state tracking
and automatic cleanup.

```html
<div data-signal="{ socket: null, messages: [] }">
  <button data-on-click="socket = $ws('wss://chat.example.com')">
    Connect
  </button>

  <!-- Reactive connection state -->
  <p data-text="socket?.state"></p>
  <!-- 'connecting' | 'open' | 'closed' -->

  <!-- Listen for messages -->
  <div
    data-effect="if (socket?.lastMessage) { messages = [...messages, socket.lastMessage] }"
  >
  </div>

  <!-- Send message -->
  <input
    data-signal="{ draft: '' }"
    data-bind-value="draft"
    data-on-keydown-enter="socket?.send(draft); draft = ''"
  >

  <!-- Message list -->
  <div data-for="msg in messages">{msg}</div>

  <button data-on-click="socket?.close()">Disconnect</button>
</div>
```

**Key Properties**:

- `.state`: Reactive — `'connecting'`, `'open'`, `'closing'`, `'closed'`
- `.lastMessage`: Reactive — last received message (string or parsed JSON)
- `.send(data)`: Send data through the connection
- `.close()`: Close the connection
- Auto-reconnects on unexpected disconnection with exponential backoff
- Automatically closed when the owning element is removed from the DOM

### 7.8. GraphQL (`$gql`)

**Syntax**: `$gql(query, [variables])`

**Purpose**: Execute GraphQL queries and mutations against a configured
endpoint.

```html
<!-- Query -->
<div
  data-signal="{ users: [] }"
  data-on-load="users = (await $gql('query { users { id name email } }')).data.users"
>
  <div data-for="user in users">{user.name} ({user.email})</div>
</div>

<!-- Mutation -->
<div data-signal="{ name: '', email: '' }">
  <input data-bind-value="name" placeholder="Name">
  <input data-bind-value="email" placeholder="Email">
  <button
    data-on-click="
    await $gql('mutation(name: String!, email: String!) { createUser(name: name, email: email) { id } }', { name: name, email: email });
    name = ''; email = '';
  "
  >
    Create User
  </button>
</div>

<!-- With variables -->
<div
  data-signal="{ userId: 'user:1', profile: null }"
  data-on-load="profile = (await $gql('query(id: ID!) { user(id: id) { name avatar bio } }', { id: userId })).data.user"
>
  <h2 data-text="profile?.name"></h2>
  <p data-text="profile?.bio"></p>
</div>
```

**Returns**: `Promise<{ data: T, errors?: GraphQLError[] }>`

**Configuration**: The GraphQL endpoint is configured via
`$nexus.config.graphql.endpoint` or set per-call with
`$gql(query, variables, { endpoint: '...' })`.

### 7.9. HTTP Convenience Methods

Shorthand wrappers around `$fetch` that auto-serialize request bodies and
auto-parse JSON responses.

#### 7.9.1. `$get(url, [options])`

```html
<div
  data-signal="{ users: [] }"
  data-on-load="users = await $get('/api/users')"
>
  <div data-for="user in users">{user.name}</div>
</div>
```

#### 7.9.2. `$post(url, body, [options])`

```html
<button
  data-on-click="await $post('/api/users', { name: name, email: email })"
>
  Create User
</button>
```

#### 7.9.3. `$put(url, body, [options])`

```html
<button
  data-on-click="await $put('/api/users/' + userId, { name: name, email: email })"
>
  Replace User
</button>
```

#### 7.9.4. `$patch(url, body, [options])`

```html
<button
  data-on-click="await $patch('/api/users/' + userId, { email: newEmail })"
>
  Update Email
</button>
```

#### 7.9.5. `$delete(url, [options])`

```html
<button data-on-click="await $delete('/api/users/' + userId)">
  Delete User
</button>
```

**Common options** (all HTTP sprites):

- `headers`: Object of additional headers
- `timeout`: Request timeout in ms (default: 30000)
- `signal`: AbortSignal for cancellation

### 7.10. DOM Sprites

#### 7.10.1. `$el`

Reference to the current element the directive is attached to.

```html
<input data-on-focus="$el.classList.add('ring')" data-on-blur="$el.classList.remove('ring')">
<div data-on-load="$el.style.opacity = '1'">
```

#### 7.10.2. `$nextTick([callback])`

Schedules execution after the current reactive flush completes and the DOM has
updated.

```html
<!-- Wait for DOM to update, then scroll -->
<button
  data-on-click="messages = [...messages, msg]; $nextTick(() => $refs.container.scrollTop = $refs.container.scrollHeight)"
>
  Send
</button>

<!-- Promise form -->
<button
  data-on-click="count++; await $nextTick(); console.log('DOM updated, count is now:', $refs.counter.textContent)"
>
  Increment
</button>
```

#### 7.10.3. `$dispatch(eventName, [detail])`

Dispatches a `CustomEvent` on the current element. Bubbles by default.

```html
<!-- Child dispatches event -->
<button data-on-click="$dispatch('item-selected', { id: itemId })">
  Select
</button>

<!-- Parent listens -->
<div data-on-item-selected="handleSelection(event.detail.id)">
  <!-- child buttons here -->
</div>
```

### 7.11. State Sprites

#### 7.11.1. `$store(name, [initialValue])`

Access a named, cross-component reactive store. Creates it with `initialValue`
on first access.

```html
<!-- Component A: writes to store -->
<div data-signal="{ cart: $store('cart', []) }">
  <button data-on-click="cart = [...cart, { id: product.id, qty: 1 }]">
    Add to Cart
  </button>
</div>

<!-- Component B: reads same store (anywhere in the DOM) -->
<div data-signal="{ cart: $store('cart') }">
  <p data-text="cart.length + ' items in cart'"></p>
</div>
```

#### 7.11.2. `$watch(expression, callback)`

Observe a reactive expression and invoke a callback when it changes.

```html
<div
  data-signal="{ searchQuery: '' }"
  data-on-load="$watch('searchQuery', (newVal, oldVal) => {
       console.log('Search changed from', oldVal, 'to', newVal);
       results = await $get('/api/search?q=' + newVal);
     })"
>
  <input data-bind-value="searchQuery" placeholder="Search...">
</div>
```

**Returns**: An `unwatch()` function to stop observing.

### 7.12. Utility Sprites

#### 7.12.1. `$clipboard`

Clipboard API wrapper. Returns reactive containers.

```html
<!-- Copy text to clipboard -->
<button data-on-click="$clipboard.write(sourceCode)">
  📋 Copy
</button>

<!-- Read from clipboard (requires user gesture + permission) -->
<div data-signal="{ pasted: null }">
  <button data-on-click="pasted = $clipboard.read()">Paste</button>
  <p data-show="pasted?.status === 'ready'" data-text="pasted.data"></p>
</div>
```

**Methods**:

- `$clipboard.write(text)` → `{ status, error }`
- `$clipboard.read()` → `{ data: string, status, error }`

#### 7.12.2. `$download(filename, content, [mimeType])`

Triggers a browser file download. Synchronous — creates a Blob URL and clicks an
anchor element.

```html
<button data-on-click="$download('app.ts', sourceCode, 'text/typescript')">
  ⬇ Download
</button>

<!-- Download JSON data -->
<button
  data-on-click="$download('data.json', JSON.stringify(myData, null, 2), 'application/json')"
>
  Export JSON
</button>
```

**Parameters**:

- `filename` — Name of the downloaded file
- `content` — `string | Blob | ArrayBuffer`
- `mimeType` — Optional MIME type (default: `'text/plain'`)

### 7.13. Cache Sprites

#### 7.13.1. `cache`

Cache Storage API wrapper. Returns reactive containers.

```html
<!-- Cache a fetch response -->
<button data-on-click="cache.put('assets', '/api/config')">
  Cache Config
</button>

<!-- Read from cache -->
<div
  data-signal="{ config: null }"
  data-on-load="config = cache.match('assets', '/api/config')"
>
  <span data-show="config.status === 'loading'">Loading...</span>
  <pre data-show="config.status === 'ready'" data-text="config.data"></pre>
</div>

<!-- Check if URL is cached -->
<div
  data-signal="{ isCached: null }"
  data-on-load="isCached = cache.has('assets', '/api/config')"
>
  <span data-text="isCached.data ? 'Cached ✓' : 'Not cached'"></span>
</div>

<!-- List cached URLs -->
<div data-signal="{ urls: null }" data-on-load="urls = cache.keys('assets')">
  <template data-for="u in urls.data">
    <li data-text="u"></li>
  </template>
</div>

<!-- Clear cache -->
<button data-on-click="cache.clear('assets')">Clear Cache</button>
```

**Methods**:

- `cache.put(name, url, [response])` → `{ status, error }` — caches a URL
  (fetches if no response given)
- `cache.match(name, url)` → `{ data: string, status, error }` — lookup +
  auto-extract text
- `cache.has(name, url)` → `{ data: boolean, status, error }`
- `cache.delete(name, url)` → `{ status, error }`
- `cache.keys(name)` → `{ data: string[], status, error }`
- `cache.clear(name)` → `{ status, error }`

### 7.14. Application & Background Sprites

#### 7.14.1. `sw`

Service Worker lifecycle management.

```html
<div data-on-load="sw.register('/sw.js')">
  <span data-text="'SW: ' + sw.status"></span>
  <button data-show="sw.updateAvailable" data-on-click="sw.skipWaiting()">
    Update Available — Reload
  </button>
</div>
```

**Properties**: `sw.status` (reactive), `sw.controller`, `sw.updateAvailable`
**Methods**: `.register(url, opts)`, `.update()`, `.unregister()`,
`.postMessage(data)`, `.skipWaiting()`

#### 7.14.2. `notification`

Web Notifications with auto-permission handling.

```html
<button data-on-click="notification.send('Hello!', { body: 'World' })">
  Notify
</button>
<span data-text="'Permission: ' + notification.permission"></span>
```

**Properties**: `notification.permission` (reactive), `notification.supported`
**Methods**: `.send(title, opts)`, `.requestPermission()`, `.closeAll()`

#### 7.14.3. `push`

Push Messaging subscription management.

```html
<button data-on-click="push.subscribe(vapidPublicKey)">Enable Push</button>
<button
  data-show="push.status === 'active'"
  data-on-click="push.unsubscribe()"
>
  Disable Push
</button>
```

**Properties**: `push.subscription` (reactive), `push.status` **Methods**:
`.subscribe(vapidKey)`, `.unsubscribe()`

#### 7.14.4. `bgFetch`

Background Fetch for large downloads.

**Methods**: `.fetch(id, urls, opts)`, `.get(id)`, `.abort(id)`

#### 7.14.5. `bgSync`

One-time Background Sync.

**Methods**: `.register(tag)` — returns `{ status, error }` **Properties**:
`.tags` — returns `{ data: string[], status, error }`

#### 7.14.6. `periodicSync`

Periodic Background Sync.

**Methods**: `.register(tag, { minInterval })`, `.unregister(tag)`
**Properties**: `.tags` — returns `{ data: string[], status, error }`

#### 7.14.7. `payment`

Payment Request API.

```html
<button data-on-click="result = payment.request(methods, details)">
  Pay Now
</button>
<span data-show="result?.status === 'done'">✓ Payment Complete</span>
<span data-show="result?.status === 'cancelled'">Payment Cancelled</span>
```

**Methods**: `.request(methods, details, opts)`, `.canMakePayment(methods)`

---

## Chapter 7.5: Environment Mirrors (`_`) — The Unified JIT Proxy

Mirrors are **reactive wrappers** mapped directly to the `globalThis.window`
object. They use the `_` prefix, triggering the framework's lazy JIT proxy
engine that directly binds browser capabilities to visual state without
requiring static module wrappers or framework updates for novel browser APIs.

- **Lazy Reactivity Allocation (ZCZS)**: Memory for synchronization (like
  `resize`, `storage`, or `hashchange` event listeners) is only allocated to the
  runtime heap if an HTML template explicitly registers a read dependency on
  that property. If your application never accesses `_localStorage`, no tracking
  payload or system listener is booted.

### 7.5.1. `_window` (read-write)

Because `_` proxies `window` natively, any global state point is directly
accessible without specialized syntax.

```html
<!-- Read: responsive layout info tracked lazily on native 'resize' -->
<p data-text="'Viewport: ' + _window.innerWidth + 'x' + _window.innerHeight">
</p>

<!-- Read: scroll-linked animation wrapped securely around native scroll properties -->
<div data-style-opacity="Math.max(0, 1 - _window.scrollY / 300)">
  Hero Content
</div>

<!-- Write: update native document title directly -->
<div
  data-effect="_window.document.title = 'Dashboard (' + notifications.length + ')'"
>
</div>
```

### 7.5.2. `_localStorage` (read-write)

Because `window.localStorage` is globally accessible, `_localStorage` maps to it
seamlessly. Reads are reactive, and writes persist immediately while syncing
across tabs via dynamic JIT `storage` event bindings.

```html
<!-- Read: initialize from stored value -->
<div data-signal="{ theme: _localStorage.theme || 'light' }">
  <button data-on-click="theme = theme === 'light' ? 'dark' : 'light'">
    Toggle Theme ({theme})
  </button>
</div>

<!-- Write: persist directly -->
<button data-on-click="_localStorage.theme = 'dark'">Force Dark Mode</button>
```

### 7.5.3. `_sessionStorage` (read-write)

Functions exactly like `_localStorage`, mapping dynamically to `sessionStorage`.
Values do not sync across tabs and are cleared when the tab closes.

```html
<!-- Persist draft state across page reloads (within the same tab) -->
<div
  data-signal="{ draft: '' }"
  data-on-load="draft = _sessionStorage['editor:draft'] || ''"
>
  <textarea
    data-model="draft"
    data-on-input="_sessionStorage['editor:draft'] = draft"
  >
  </textarea>
</div>
```

### 7.5.4. Future-Proof Forward Compatibility

Because the `_` identifier resolves universally to the `globalThis.window`
object, **literally any Global API (existing or future) is supported instantly
without framework updates.**

If the W3C releases a new `window.ai` Native LLM API tomorrow, Nexus-UX natively
supports declarative tracking of it today.

```html
<!-- Experimental or custom properties exposed by plugins / host OS -->
<div data-text="_experimentalAPI.status"></div>
```

---

## Chapter 8: Advanced Patterns & Real-World

### 8.1. Form Handling

**Basic form**:

```html
<div data-signal="{ formData: { email: '', password: '' } }">
  <form
    data-on-submit:prevent="$sql('CREATE session CONTENT { user: formData.email, password: formData.password }').then(r => window.location = '/dashboard')"
  >
    <input type="email" data-bind-value="formData.email" required>
    <input type="password" data-bind-value="formData.password" required>
    <button type="submit">Log In</button>
  </form>
</div>
```

**Form with validation**:

```html
<div data-signal="{ form: { email: '', password: '', errors: {} } }">
  <form
    data-on-submit:prevent="
    form.errors = {};
    if (!form.email.includes('@')) form.errors.email = 'Invalid email';
    if (form.password.length < 8) form.errors.password = 'Password too short';
    if (Object.keys(form.errors).length === 0) {
      $sql('CREATE user CONTENT form').then(() => alert('Registered!'));
    }
  "
  >
    <div>
      <input type="email" data-bind-value="form.email">
      <p data-if="form.errors.email" style="color: red">
        {form.errors.email}
      </p>
    </div>
    <div>
      <input type="password" data-bind-value="form.password">
      <p data-if="form.errors.password" style="color: red">
        {form.errors.password}
      </p>
    </div>
    <button type="submit">Register</button>
  </form>
</div>
```

### 8.2. Pagination

**Client-side pagination** (all data loaded):

```html
<div data-signal="{ page: 1 }">
  <div data-signal="{ pageSize: 10 }">
    <div data-signal="{ users: $sql('SELECT * FROM user') }">
      <div
        data-signal="{ paginatedUsers: users.slice((page - 1) * pageSize, page * pageSize) }"
      >
        <ul>
          <li data-for="user in paginatedUsers">{user.name}</li>
        </ul>
        <button data-on-click="page--" data-bind-disabled="page === 1">
          Previous
        </button>
        <span>Page {page} of {Math.ceil(users.length / pageSize)}</span>
        <button
          data-on-click="page++"
          data-bind-disabled="page >= Math.ceil(users.length / pageSize)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</div>
```

**Server-side pagination** (fetch only current page):

```html
<div data-signal="{ page: 1 }">
  <div data-signal="{ pageSize: 10 }">
    <div
      data-signal="{ users: $sql('SELECT * FROM user LIMIT pageSize START (page - 1) * pageSize', { page: page, pageSize: pageSize }) }"
    >
      <ul>
        <li data-for="user in users">{user.name}</li>
      </ul>
      <button data-on-click="page--; users = $sql('SELECT...')">
        Previous
      </button>
      <button data-on-click="page++; users = $sql('SELECT...')">Next</button>
    </div>
  </div>
</div>
```

### 8.3. Infinite Scroll

```html
<div data-signal="{ page: 1 }">
  <div data-signal="{ users: [] }">
    <div data-signal="{ loading: false }">
      <div
        data-ref="container"
        data-on-scroll="
      if ($refs.container.scrollTop + $refs.container.clientHeight >= $refs.container.scrollHeight - 100 && !loading) {
        loading = true;
        $sql('SELECT * FROM user LIMIT 20 START page * 20', { page: page }).then(newUsers => {
          users = users.concat(newUsers);
          page++;
          loading = false;
        });
      }
    "
        style="height: 500px; overflow-y: auto"
      >
        <div data-for="user in users">{user.name}</div>
        <p data-if="loading">Loading more...</p>
      </div>
    </div>
  </div>
</div>
```

### 8.4. Modals / Dialogs

```html
<div data-signal="{ showModal: false }">
  <button data-on-click="showModal = true">Open Modal</button>

  <dialog data-bind-open="showModal">
    <h2>Modal Title</h2>
    <p>Modal content goes here</p>
    <button data-on-click="showModal = false">Close</button>
  </dialog>
</div>
```

**Styled modal with backdrop**:

```html
<div data-signal="{ showModal: false }">
  <button data-on-click="showModal = true">Open</button>

  <!-- Backdrop -->
  <div
    data-if="showModal"
    data-on-click="showModal = false"
    style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999"
  >
  </div>

  <!-- Modal -->
  <div
    data-if="showModal"
    style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; z-index: 1000"
  >
    <h2>Modal Title</h2>
    <p>Content</p>
    <button data-on-click="showModal = false">Close</button>
  </div>
</div>
```

### 8.5. Tabs

```html
<div data-signal="{ activeTab: 'profile' }">
  <!-- Tab headers -->
  <div class="tab-headers">
    <button
      data-class-active="activeTab === 'profile'"
      data-on-click="activeTab = 'profile'"
    >
      Profile
    </button>
    <button
      data-class-active="activeTab === 'settings'"
      data-on-click="activeTab = 'settings'"
    >
      Settings
    </button>
    <button
      data-class-active="activeTab === 'billing'"
      data-on-click="activeTab = 'billing'"
    >
      Billing
    </button>
  </div>

  <!-- Tab content -->
  <div class="tab-content">
    <div data-if="activeTab === 'profile'">
      <h2>Profile</h2>
      <p>Profile content...</p>
    </div>
    <div data-if="activeTab === 'settings'">
      <h2>Settings</h2>
      <p>Settings content...</p>
    </div>
    <div data-if="activeTab === 'billing'">
      <h2>Billing</h2>
      <p>Billing content...</p>
    </div>
  </div>
</div>
```

### 8.6. Virtual Scrolling (Large Lists)

For lists with 10,000+ items, render only visible items:

```html
<div data-signal="{ allItems: $sql('SELECT * FROM product') }">
  <div data-signal="{ scrollTop: 0 }">
    <div data-signal="{ itemHeight: 50 }">
      <div data-signal="{ containerHeight: 500 }">
        <div
          data-signal="{ visibleItems: (() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = start + Math.ceil(containerHeight / itemHeight) + 1;
    return allItems.slice(start, end).map((item, i) => ({ ...item, index: start + i }));
  })() }"
        >
          <div
            data-ref="container"
            data-on-scroll="scrollTop = $refs.container.scrollTop"
            data-style-height="containerHeight + 'px'"
            style="overflow-y: auto; position: relative"
          >
            <!-- Spacer for scroll height -->
            <div data-style-height="(allItems.length * itemHeight) + 'px'">
            </div>

            <!-- Visible items -->
            <div
              data-for="item in visibleItems"
              data-style-transform="'translateY(' + (item.index * itemHeight) + 'px)'"
              style="position: absolute; width: 100%"
            >
              {item.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 8.7. Debouncing (Search Input)

```html
<div data-signal="{ searchQuery: '' }">
  <div data-signal="{ searchResults: [] }">
    <div data-signal="{ debounceTimer: null }">
      <input
        type="text"
        data-bind-value="searchQuery"
        data-on-input="
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        $sql('SELECT * FROM product WHERE name CONTAINS q', { q: searchQuery })
          .then(r => searchResults = r);
      }, 300);
    "
      >
      <ul>
        <li data-for="result in searchResults">{result.name}</li>
      </ul>
    </div>
  </div>
</div>
```

### 8.8. Memoization (Expensive Computations)

```html
<div data-signal="{ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }">
  <div
    data-signal="{ memoizedSum: (() => {
  const cache = {};
  return (arr) => {
    const key = arr.join(',');
    if (!cache[key]) {
      console.log('Computing sum...');
      cache[key] = arr.reduce((a, b) => a + b, 0);
    }
    return cache[key];
  };
})() }"
  >
    <p>Sum: {memoizedSum(numbers)}</p>
    <button data-on-click="numbers.push(11)">Add Number</button>
  </div>
</div>
```

---

## Chapter 9: Routing & Navigation

Nexus-UX provides a declarative, HTML-first client-side routing system built on
the History API. Routes are defined as `data-*` attributes, and the entire
navigation state is exposed as a reactive `$router` signal.

### 9.1. `data-router` — Router Initialization

Place `data-router` on the `<html>` element to initialize the routing system.
This creates the global `$router` signal and sets up History API management.

```html
<html data-router>
  <!-- Or with configuration: -->
  <html data-router="{ mode: 'hybrid', default: '/home' }">
```

#### 9.1.1. The `$router` Signal

Once initialized, the `$router` signal contains the full navigation state:

| Property                 | Type             | Description                                     |
| :----------------------- | :--------------- | :---------------------------------------------- |
| `$router.path`           | `string`         | Current path (e.g., `/user/42`)                 |
| `$router.params`         | `object`         | Parameterized values (e.g., `{ id: '42' }`)     |
| `$router.query`          | `object`         | URL search params (e.g., `{ tab: 'settings' }`) |
| `$router.hash`           | `string`         | URL hash fragment                               |
| `$router.loading`        | `boolean`        | `true` while a route is resolving               |
| `$router.error`          | `object \| null` | Error state (`{ type: '404', message: '...' }`) |
| `$router.previous`       | `object`         | Previous route's `path` and `meta`              |
| `$router.layout`         | `string \| null` | Current layout component URL                    |
| `$router.route`          | `string \| null` | Current route component URL                     |
| `$router.meta`           | `object`         | Route metadata                                  |
| `$router.scrollPosition` | `object`         | `{ x, y }` scroll coordinates                   |
| `$router.routes`         | `array`          | Registered route definitions                    |
| `$router.mode`           | `string`         | `'signal'`, `'static'`, or `'hybrid'`           |
| `$router.basePath`       | `string`         | Auto-detected or manually configured base path  |

#### 9.1.2. Routing Modes

| Mode                   | Behavior                                                                                   |
| :--------------------- | :----------------------------------------------------------------------------------------- |
| **`signal`**           | Only matches routes registered via `data-route` elements                                   |
| **`static`**           | Resolves routes by fetching HTML files from the filesystem (e.g., `/about` → `about.html`) |
| **`hybrid`** (default) | Tries signal routes first, falls back to filesystem resolution                             |

#### 9.1.3. Automatic Link Interception

The router automatically intercepts clicks on `<a>` tags with same-origin `href`
attributes, converting them to client-side navigations. Links with
`target="_blank"` or `data-native` are excluded:

```html
<!-- Client-side navigation (intercepted) -->
<a href="/about">About</a>

<!-- Full page reload (excluded) -->
<a href="/about" data-native>About (full reload)</a>
<a href="https://external.com">External</a>
```

#### 9.1.4. Programmatic Navigation

The `$router` sprite provides imperative navigation:

```html
<button data-on-click="$router.navigate('/dashboard')">Go to Dashboard</button>
<button data-on-click="$router.navigate('/login', { replace: true })">
  Login (no history)
</button>
```

### 9.2. `data-route` — Route Definition

Define routes declaratively by placing `data-route` on elements. Routes are
automatically registered with `$router.routes` and cleaned up when the element
is removed.

```html
<html data-router>
  <body>
    <!-- Route definitions -->
    <div data-route="/home" data-component="/pages/home.html"></div>
    <div
      data-route="/user/:id"
      data-component="/pages/user.html"
      data-route-meta="{ title: 'User Profile', requiresAuth: true }"
    >
    </div>
    <div
      data-route="/admin/*"
      data-component="/pages/admin.html"
      data-route-before-enter="async (ctx) => ctx.signals.value('auth.role') === 'admin'"
    >
    </div>

    <!-- Route outlet (renders the matched component) -->
    <main data-component="$router.route"></main>

    <!-- Loading indicator -->
    <div data-if="$router.loading">Loading...</div>

    <!-- 404 handler -->
    <div data-if="$router.error?.type === '404'">Page not found</div>
  </body>
</html>
```

#### 9.2.1. Route Patterns

| Pattern        | Example      | Matches                                                     |
| :------------- | :----------- | :---------------------------------------------------------- |
| Static         | `/about`     | `/about` only                                               |
| Parameterized  | `/user/:id`  | `/user/42` → `params.id = '42'`                             |
| Optional param | `/user/:id?` | `/user` or `/user/42`                                       |
| Wildcard       | `/docs/*`    | `/docs/anything/here` → `params.wildcard = 'anything/here'` |

#### 9.2.2. Route Configuration Attributes

| Attribute                 | Purpose                                                         | Value                             |
| :------------------------ | :-------------------------------------------------------------- | :-------------------------------- |
| `data-route-handler`      | Expression executed when route matches                          | JS expression string              |
| `data-route-meta`         | Arbitrary metadata object                                       | `"{ title: 'Page', auth: true }"` |
| `data-route-redirect`     | Redirect to another path                                        | `"/login"`                        |
| `data-route-layout`       | Layout component URL                                            | `"/layouts/main.html"`            |
| `data-route-before-enter` | Navigation guard (return `false` to cancel, string to redirect) | Async function string             |
| `data-route-after-enter`  | Post-navigation hook                                            | Async function string             |
| `data-route-before-leave` | Exit guard (return `false` to cancel, string to redirect)       | Async function string             |
| `data-route-after-leave`  | Post-exit hook                                                  | Async function string             |

#### 9.2.3. Navigation Guards Example

```html
<!-- Protected route with auth guard -->
<div
  data-route="/dashboard"
  data-component="/pages/dashboard.html"
  data-route-before-enter="async (ctx) => {
       if (!ctx.signals.value('auth.user')) return '/login';
       return true;
     }"
  data-route-before-leave="async (ctx) => {
       if (ctx.signals.value('hasUnsavedChanges')) {
         return confirm('Discard changes?');
       }
       return true;
     }"
  data-route-meta="{ title: 'Dashboard', requiresAuth: true }"
>
</div>
```

### 9.3. Scroll Restoration

The router automatically saves and restores scroll positions during navigation:

- **Back/forward**: Restores the exact `scrollY` from `history.state`
- **Hash navigation**: Scrolls to the element matching the hash `#id`
- **New navigation**: Scrolls to top

### 9.4. Complete Routing Example

```html
<html data-router="{ mode: 'hybrid', default: '/home' }">
  <body data-signal="{ auth: { user: null, role: 'guest' } }">
    <!-- Navigation -->
    <nav>
      <a href="/home">Home</a>
      <a href="/products">Products</a>
      <a href="/account" data-if="auth.user">Account</a>
      <a href="/login" data-if="!auth.user">Login</a>
    </nav>

    <!-- Route definitions -->
    <div data-route="/home" data-component="/pages/home.html"></div>
    <div data-route="/products" data-component="/pages/products.html"></div>
    <div data-route="/products/:id" data-component="/pages/product-detail.html">
    </div>
    <div
      data-route="/login"
      data-component="/pages/login.html"
      data-route-before-enter="async (ctx) => ctx.signals.value('auth.user') ? '/account' : true"
    >
    </div>
    <div
      data-route="/account"
      data-component="/pages/account.html"
      data-route-before-enter="async (ctx) => ctx.signals.value('auth.user') ? true : '/login'"
    >
    </div>

    <!-- Route outlet -->
    <main data-component="$router.route"></main>

    <!-- Loading state -->
    <div data-if="$router.loading" class="loading-overlay">Loading...</div>
  </body>
</html>
```

---

## Chapter 10: Component System

Nexus-UX components are **Custom Elements** powered by `data-component`. They
combine HTML templates, scoped styles, isolated scripts, and reactive props into
reusable, encapsulated units.

### 10.1. `data-component` — Component Declaration

The `data-component` attribute defines a Custom Element by specifying its
template source:

```html
<!-- From URL -->
<my-counter data-component="/_components/counter.html"></my-counter>

<!-- From same-page template -->
<my-card data-component="#card-template"></my-card>

<!-- Dynamic source (signal-driven) -->
<dynamic-view data-component="$router.route"></dynamic-view>
```

#### 10.1.1. Template Sources

| Source Type      | Syntax              | Example                                              |
| :--------------- | :------------------ | :--------------------------------------------------- |
| **URL**          | Path string         | `data-component="/_components/nav.html"`             |
| **Same-page ID** | `#id` reference     | `data-component="#my-template"`                      |
| **Inline**       | `<template>` string | `data-component="<template><p>Hello</p></template>"` |
| **Data URI**     | `data:` URL         | `data-component="data:text/html;base64,..."`         |
| **Signal**       | `signal` expression | `data-component="currentView"`                       |

### 10.2. Component Template Structure

A component template file (`/_components/counter.html`):

```html
<template>
  <style>
    :host {
      display: block;
      padding: 1rem;
    }
    .count {
      font-size: 2rem;
      font-weight: bold;
    }
  </style>

  <div data-signal="{ count: 0 }">
    <p class="count">{count}</p>
    <button data-on-click="count++">Increment</button>
    <button data-on-click="count--">Decrement</button>
  </div>

  <script>
    // Script executes with component context
    console.log("Counter component loaded");
    registerCleanup(() => console.log("Counter destroyed"));
  </script>
</template>
```

### 10.3. Shadow DOM Support

Add `shadowrootmode="open"` to the `<template>` tag for Shadow DOM
encapsulation:

```html
<template shadowrootmode="open">
  <style>
    /* Styles are fully encapsulated — no leaking */
    p {
      color: red;
    }
  </style>
  <p>This style won't affect anything outside this component.</p>
</template>
```

**Light DOM** (default): Styles use the component's tag name instead of `:host`.
The engine automatically rewrites `:host` → `my-component` in Light DOM mode.

**Shadow DOM**: Uses Constructable Stylesheets (`adoptedStyleSheets`) for
optimal performance when available.

### 10.4. Signal Inheritance

Nexus-UX follows a **Zero-Copy Signal Inheritance** model. Components
automatically inherit the reactive scope of their parent. There is no need for
explicit "Props" or complex state passing.

```html
<!-- Parent -->
<div data-signal="{ userName: 'Ada', userAge: 30 }">
  <!-- component inherits userName and userAge automatically -->
  <user-card data-component="/_components/user-card.html"></user-card>
</div>
```

```html
<!-- /_components/user-card.html -->
<template>
  <div>
    <h2 data-bind="userName"></h2>
    <p>Age: <span data-bind="userAge"></span></p>
  </div>
</template>
```

**Two-Way Flow**: Because signals are shared by reference, a component can
modify a parent's signal directly (if permitted by the scope), enabling
seamless, zero-serialization orchestration.

### 10.5. Script Isolation & Context

Inline `<script>` blocks execute as ES modules with an injected component
context:

| Context Variable         | Description                                              |
| :----------------------- | :------------------------------------------------------- |
| `componentInstance`      | The Custom Element instance (`this` equivalent)          |
| `ds`                     | The Nexus-UX runtime context                             |
| `signals`                | Proxy for reading scoped signals (e.g., `signals.count`) |
| `props`                  | Reactive props passed via `data-signals-*`               |
| `emit(name, detail)`     | Dispatch a custom event (bubbles, composed)              |
| `registerCleanup(fn)`    | Register a function to run on component disconnect       |
| `generateScopedId(base)` | Generate a unique, instance-scoped ID                    |
| `actions`                | Object populated with exported functions from the script |

```html
<template>
  <button data-on-click="actions.handleClick()">
    Click me
  </button>

  <script>
    export function handleClick() {
      emit("button-clicked", { timestamp: Date.now() });
    }

    registerCleanup(() => {
      console.log("Component cleanup");
    });
  </script>
</template>
```

### 10.6. Lifecycle Hooks

| Hook                          | When                                     | Usage                                              |
| :---------------------------- | :--------------------------------------- | :------------------------------------------------- |
| `connectedCallback`           | Element enters the DOM                   | Auto-handled; triggers template render             |
| `disconnectedCallback`        | Element leaves the DOM                   | Auto-handled; runs cleanup functions               |
| `contentReadyCallback()`      | Template + styles + scripts fully loaded | Override in component script for post-render logic |
| `data-component-connected`    | Declarative connected hook               | `data-component-connected="onConnect()"`           |
| `data-component-disconnected` | Declarative disconnected hook            | `data-component-disconnected="onDisconnect()"`     |

### 10.7. Form-Associated Components

Components can participate in HTML forms by adding
`data-component-formAssociated`:

```html
<custom-input
  data-component="/_components/input.html"
  data-component-formAssociated
>
</custom-input>
```

This enables `ElementInternals` access via `this.internals` inside the
component, allowing custom form validation, value reporting, and form submission
participation.

### 10.8. Dynamic Components

The component source can be a reactive signal, enabling dynamic view switching:

```html
<div data-signal="{ currentView: '/_components/dashboard.html' }">
  <nav>
    <button data-on-click="currentView = '/_components/dashboard.html'">
      Dashboard
    </button>
    <button data-on-click="currentView = '/_components/settings.html'">
      Settings
    </button>
  </nav>

  <!-- Component re-renders when currentView changes -->
  <dynamic-page data-component="currentView"></dynamic-page>
</div>
```

### 10.9. Router + Component Integration

The router and component systems integrate naturally — `$router.route` drives a
dynamic component outlet:

```html
<html data-router="{ mode: 'hybrid', default: '/home' }">
  <body>
    <div data-route="/home" data-component="/pages/home.html"></div>
    <div data-route="/about" data-component="/pages/about.html"></div>

    <!-- The route outlet: renders whichever component $router.route points to -->
    <main data-component="$router.route"></main>
  </body>
</html>
```

Router params are automatically injected into the component's props, so within
`/pages/user.html` rendered by route `/user/:id`, `props.id` is available.

---

## Chapter 11: Zenith-Class Orchestration Gallery

This chapter showcases advanced, real-world patterns that demonstrate the full
power of Nexus-UX's unified architecture.

### 11.1. DaisyUI Integration Gallery

#### 11.1.1. Reactive Radial Progress

```html
<div
  data-signal="{ progress: 0 }"
  data-on-load="setInterval(() => { progress = Math.min(100, progress + 1) }, 50)"
>
  <div
    class="radial-progress text-primary"
    data-var-value="progress"
    data-var-size="12rem"
    data-var-thickness="4px"
    role="progressbar"
  >
    <span data-text="progress + '%'"></span>
  </div>
</div>
```

#### 11.1.2. Dynamic Loading Banners

```html
<div data-signal="{ status: 'loading' }">
  <div
    data-on-load="
    setTimeout(() => status = 'processing', 2000);
    setTimeout(() => status = 'complete', 4000);
  "
  >
    <div
      class="alert"
      data-class-alert-info="status === 'loading'"
      data-class-alert-warning="status === 'processing'"
      data-class-alert-success="status === 'complete'"
    >
      <span
        data-text="
        status === 'loading' ? '⏳ Loading data...' :
        status === 'processing' ? '⚙️ Processing...' :
        '✅ Complete!'
      "
      ></span>
    </div>
  </div>
</div>
```

### 11.2. Zenith-Class Showcases

#### 11.2.1. Infinite Logic Virtualization with Proximity Dashboard

```html
<div
  data-signal="{ activeSensors: $sql('LIVE SELECT * FROM sensor WHERE active = true') }"
>
  <div data-for="sensor in activeSensors" data-key="sensor.id">
    <div
      class="card bg-base-200 shadow-lg"
      data-style-border-left-width="4"
      data-style-border-left-color="sensor.status === 'ok' ? 'green' : 'red'"
      data-on-intersect:once="$sql('UPDATE sensor SET last_viewed = time::now() WHERE id = sensor.id')"
    >
      <h3 data-text="sensor.name"></h3>
      <p>Value: <span data-text="sensor.value"></span></p>
      <div
        class="radial-progress"
        data-var-value="sensor.healthPercent"
        role="progressbar"
      >
        <span data-text="sensor.healthPercent + '%'"></span>
      </div>
    </div>
  </div>
</div>
```

_Features_: `data-for` + `data-key`, `data-style` (automatic unit appending for
numeric `border-left-width`), `data-on-intersect` (lazy hydration), `data-var`
(DaisyUI bridge), `$sql` (LIVE queries).

#### 11.2.2. The "God-Mode" Auth Gateway

```html
<div data-signal-global="appAuth">
  <!-- Public View -->
  <section data-text="'Welcome, ' + (#appAuth.user?.name || 'Guest')"></section>

  <!-- User-Tier View -->
  <section data-if="#appAuth.role === 'user' || #appAuth.role === 'admin'">
    <h2>Dashboard</h2>
    <div data-signal="{ myDocs: $sql('SELECT * FROM document WHERE owner = auth.id') }">
      <div data-for="doc in myDocs" data-text="doc.title"></div>
    </div>
  </section>

  <!-- Admin-Only: "God Mode" Panel -->
  <section data-if="#appAuth.role === 'admin'">
    <h2>⚡ Admin Control Panel</h2>
    <div data-signal="{ allUsers: $sql('LIVE SELECT * FROM user') }">
      <table>
        <tr data-for="u in allUsers" data-key="u.id">
          <td data-text="u.name"></td>
          <td data-text="u.email"></td>
          <td>
            <button data-on-click:confirm('Are you sure?')="$sql('DELETE user WHERE id = u.id')">Delete</button>
          </td>
        </tr>
      </table>
    </div>
  </section>
</div>
```

_Features_: Global signals (`data-signal-global`), reactive UI gating
(`data-if`), SurrealDB permissions, `:confirm` interceptor.

---

## Chapter 12: Developer Experience & Performance

### 12.1. In-DOM Assertions

```html
<div data-signal="{ count: 5 }">
  <div data-assert="count > 0" data-assert-msg="Count must be positive!"></div>
</div>
```

### 12.2. Configuration

| Config Key       | Default        | Description                                                                        |
| :--------------- | :------------- | :--------------------------------------------------------------------------------- |
| `nexus.debug`    | `false`        | Enables verbose console logging for signal updates.                                |
| `nexus.mode`     | `'production'` | Sets the environment. `'development'` enables assertions.                          |
| `nexus.tickRate` | `'raf'`        | Controls the scheduler tick. `'raf'` = requestAnimationFrame, `'mic'` = microtask. |

### 12.3. In-DOM Debugging

```html
<div data-signal="{ count: 0 }">
  <div data-debug></div>
  <!-- Prints state to console on every change -->
</div>
```

### 12.4. Debugging Signals from Console

```javascript
$nexus.debug.signals; // View all signals
$nexus.debug.getSignal("users"); // Get specific signal
$nexus.debug.setSignal("count", 42); // Set signal value
$nexus.debug.watchSignal("users", (oldValue, newValue) => {
  console.log("Users changed:", oldValue, "->", newValue);
});
```

### 12.5. Performance Profiling

```javascript
$nexus.debug.enableProfiling();
// Logs: Signal update time, DOM update time, WebSocket latency
$nexus.debug.disableProfiling();
```

### 12.6. Unit Testing

```javascript
import { $nexus } from "nexus-ux";

test("counter increments", () => {
  const signal = $nexus.signal("count", 0);
  expect(signal.value).toBe(0);
  signal.value++;
  expect(signal.value).toBe(1);
});

test("computed signals update", () => {
  const firstName = $nexus.signal("firstName", "John");
  const lastName = $nexus.signal("lastName", "Doe");
  const fullName = $nexus.computed(() =>
    `${firstName.value} ${lastName.value}`
  );
  expect(fullName.value).toBe("John Doe");
  firstName.value = "Jane";
  expect(fullName.value).toBe("Jane Doe");
});
```

### 12.7. E2E Testing (Playwright)

```javascript
import { expect, test } from "@playwright/test";

test("can add and delete todos", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await page.fill('input[data-bind\\:value="newTodo"]', "Buy milk");
  await page.click('button:has-text("Add")');
  await expect(page.locator('li:has-text("Buy milk")')).toBeVisible();
  await page.click('li:has-text("Buy milk") button:has-text("Delete")');
  await expect(page.locator('li:has-text("Buy milk")')).not.toBeVisible();
});
```

### 12.8. Performance Patterns vs. Anti-Patterns

| Pattern              | ✅ Correct                               | ❌ Anti-Pattern                       | Reasoning                                               |
| :------------------- | :--------------------------------------- | :------------------------------------ | :------------------------------------------------------ |
| **Numeric Sync**     | `data-style-top="v"`                     | `data-style-top="v + 'px'"`           | Naked numeric signals trigger automatic unit appending. |
| **Signal Targeting** | `$(^form .field)`                        | `document.querySelector('.field')`    | Selector is scoped and reactive.                        |
| **Iteration Source** | `data-for="item in items"`               | `data-for="item in [...items]"`       | Direct reference avoids shallow copy allocation.        |
| **Async State**      | `data-on-load="state = await $get(...)"` | `data-on-load="fetch(...).then(...)"` | `await` keeps the pipeline synchronous and predictable. |

### 12.9. Tiered Environments

| Tier           | Config Key            | Behavior                                               |
| :------------- | :-------------------- | :----------------------------------------------------- |
| **Dev**        | `mode: 'development'` | Assertions active, verbose logging, zero minification. |
| **Staging**    | `mode: 'staging'`     | Assertions active, production-level performance.       |
| **Production** | `mode: 'production'`  | All assertions stripped, full engine optimization.     |

> [!TIP]
> **Production Pro-Tip**: Always ensure `nexus.mode = 'production'` in
> production. Development mode includes ~15KB of debugging infrastructure.

---

## Chapter 13: Deployment

### 13.1. Universal Deployment with Nexus-IO

```bash
nexus build --app my-app --platforms all
```

**Output (8+ platforms)**: Server (Linux/Windows/macOS binaries), Desktop
(`.exe`, `.app`, `.deb`), Mobile (`.ipa`, `.apk`), Web (PWA), TV, Watch, VR/AR.

**Selective builds**:

```bash
nexus build --app my-app --platforms desktop
nexus build --app my-app --platforms mobile
nexus build --app my-app --platform ios
```

### 13.2. Platform-Specific Features

```html
<div data-if="$nexus.platform.isDesktop">
  <button data-on-click="$nexus.systray.show()">Minimize to Tray</button>
</div>
<div data-if="$nexus.platform.isMobile">
  <button data-on-click="nexus.camera.capture()">Take Photo</button>
</div>
<div data-if="$nexus.platform.isVR">
  <a-scene><a-entity camera look-controls></a-entity><a-box
      position="0 1 -3"
    ></a-box></a-scene>
</div>
<div data-if="$nexus.platform.isWatch">
  <button data-on-click="$nexus.haptic.pulse('success')">Done</button>
</div>
```

**Platform detection**:

```javascript
$nexus.platform = {
  type: "mobile" | "desktop" | "web" | "tv" | "watch" | "vr",
  os: "ios" | "android" | "windows" | "macos" | "linux",
  hasCamera: boolean,
  hasGPS: boolean,
  hasHaptic: boolean,
  screenSize: { width: number, height: number },
};
```

### 13.3. Publishing to Sovereign App Store

```bash
nexus publish my-app --all-platforms
# Cross-platform sync via Garage
# 70% revenue to developer, 30% to platform
# Buy once, install on all devices
```

---

## Conclusion: From Theory to Practice

This reference guide covered:

- ✅ All 9 core directives (`data-signal`, `data-bind`, `data-if`, `data-for`,
  `data-on`, `data-style`, `data-class`, `data-ref`, `data-effect`)
- ✅ NEG Grammar fundamentals (token set, selectors, scope rules, pipelines)
- ✅ SurrealDB integration (`$sql()`, LIVE queries, parameterized queries)
- ✅ Advanced patterns (forms, pagination, modals, tabs, infinite scroll)
- ✅ Routing & Navigation (`data-router`, `data-route`, navigation guards,
  hybrid routing)
- ✅ Component System (`data-component`, Shadow DOM, reactive props, script
  isolation)
- ✅ Performance optimization (virtual scrolling, debouncing, memoization)
- ✅ Automatic unit appending & Zero-Allocation engineering
- ✅ Zenith-class orchestration showcases
- ✅ Testing & debugging strategies
- ✅ Universal deployment

**The Nexus-UX advantage**: You just learned an entire frontend framework in <30
minutes. Compare that to the weeks it takes to master React/Vue.

Why? Because **Nexus-UX isn't trying to be clever—it's trying to be
inevitable.**

---

## Chapter 14: Premium Assets & Themes

This chapter covers the advanced orchestration of external resources and visual
styling using the `data-injest` and `data-theme` systems.

### 14.1. `data-injest` — Asset Lifecycle Orchestration

The `data-injest` directive manages 3rd party scripts and stylesheets, ensuring
the page remains hidden via `nexus-loading` until all assets are resolved.

**Example**:

```html
<html
  data-injest='{
  "daisy": { "link": "href=\"https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css\" rel=\"stylesheet\" crossorigin=\"anonymous\"" },
  "tailwind": { "script": "src=\"https://cdn.tailwindcss.com\" crossorigin=\"anonymous\"" }
}'
>
  <head>
    <style>
      html.nexus-loading {
        visibility: hidden !important;
        opacity: 0 !important;
      }
      html.nexus-ready {
        visibility: visible !important;
        opacity: 1 !important;
        transition: opacity 0.3s ease-in;
      }
    </style>
  </head>
  <body class="nexus-loading">
    ...
  </body>
</html>
```

### 14.2. `data-theme` & `data-switcher` — Reactive Themes

Nexus-UX provides a dedicated theme switching protocol that bridges user
preference, system settings, and UI library tokens.

**Example**:

```html
<body
  data-theme="ux_theme"
  data-theme-options="{ dark: 'synthwave', light: 'retro', auto: true }"
>
  <button
    data-switcher="ux_theme"
    data-switcher-options="{
      modes: ['light', 'dark', 'auto'],
      icons: { light: 'sun', dark: 'moon', auto: 'settings' }
    }"
  >
  </button>
</body>
```

### 8.3. Progressive Web Apps (data-pwa)

**Syntax**:
`data-pwa="{ sw: '/sw.js', manifest: '/manifest.json', themeColor: '#570df8', icon: '/icon.png' }"`

**Purpose**: Automates the heavy lifting of PWA integration, including dynamic
manifest and icon injection, alongside ServiceWorker orchestration.

**Global Signal: `$pwa`** The directive initializes a reactive `$pwa` signal
accessible anywhere in your application:

- `$pwa.isOnline`: Live connectivity status.
- `$pwa.isInstalled`: True if the app is installed as a PWA.
- `$pwa.updateAvailable`: True when a new Service Worker is waiting.
- `$pwa.install()`: Async method. Triggers the browser's "Add to Homescreen"
  prompt and returns `true` if accepted.
- `$pwa.update()`: Method. Instructs the waiting ServiceWorker to take control
  and automatically reloads the page.

**Example: Install & Update UI**

```html
<div data-if="!$pwa.isInstalled && $pwa.deferredPrompt">
  <button data-on-click="$pwa.install()">Install App</button>
</div>

<div data-if="$pwa.updateAvailable">
  <button data-on-click="$pwa.update()">
    Update Available - Click to Reload
  </button>
</div>
```

---

**Nexus-UX Technical Reference v2026.02.14 (Zenith Release)**\
**Maintained by**: Aerea Co.\
**See Also**:
[nexus-ux-spec.20260214.md](file:///home/aerea/development/nexus-ux-spec.20260214.md),
[nexus-io-spec.20260204.md](file:///home/aerea/development/nexus-io-spec.20260204.md)\
**Contact**: support@aerea.co
