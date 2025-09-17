### **Nexus-UX: Proposed Syntax Specification & Outline**

This document outlines a unified, HTML-standard-compliant syntax for the Nexus-UX framework, incorporating the strengths and familiarities of AlpineJS and Datastar, while remaining extensible for HTMX-like functionality.

#### **1. Core Principles**

*   **HTML-Compliant:** All syntax is expressed via standard `data-*` attributes.
*   **Consistent Grammar:** A single, predictable set of rules for directives, modifiers, and arguments.
*   **Developer-Friendly:** Uses familiar naming (`data-signals`) and clear structure to reduce the learning curve.

#### **2. Global Naming Conventions**

*   **Attribute Prefix:**
    *   **Default:** `data-*` (e.g., `data-signals`, `data-on-click`).
    *   **Optional Namespace:** A custom prefix can be set via a meta tag (`<meta name="nexus-prefix" content="nx">`) to avoid conflicts. When set, the framework will *only* recognize the prefixed versions (e.g., `data-nx-signals`).

*   **Syntax Separators:**
| Element | Separator | Example | Description |
| :--- | :--- | :--- | :--- |
| **Directive** | `-` (hyphen) | `data-on-click` | Separates words within a directive name. |
| **Modifier** | `_` (underscore) | `data-on-click_prevent` | A **single underscore** introduces a modifier. |
| **Modifier Argument** | `:` (colon) | `data-on-click_debounce:250ms` | A **colon** separates a modifier from its argument. |
| **Plugin Hook** | `.` (period) | `data-sortable.plugin` | Reserved for invoking special plugin-specific logic. |

#### **3. State Management**

This section details the dual-mode `data-signals` directive, which is the cornerstone of state in Nexus-UX.

*   **Directive:** `data-signals`
*   **Imperative APIs:**
    *   Local Scope: `State.signals()` (provides access to the current component's reactive state)
    *   Global Scope: `State.global()` (provides access to the global reactive store)
*   **Sprite Property (Global):** `$global`

**A. Default Mode (Local Scope)**

*   **Syntax:** `data-signals="{...}"`
*   **Behavior:** Creates a new, component-scoped reactive state object, available to the element and its children. This provides encapsulation and is the direct equivalent of Alpine's `x-data`.
*   **Example:**
    ```html
    <div data-signals="{ open: false }">
      <button data-on-click="open = !open">Toggle Content</button>
      <div data-if="open">Local state is true!</div>
    </div>
    ```

**B. Global Mode (`_global` Modifier)**

*   **Syntax:** `data-signals_global="{...}"`
*   **Behavior:** Does **not** create a local scope. Instead, it merges the provided object's properties into the global reactive store, making them available to the entire application. This is the declarative way to modify the shared state.
*   **Example:**
    ```html
    <!-- Somewhere in your app, perhaps after login -->
    <div data-signals_global='{ "username": "Aerea", "loggedIn": true }'></div>

    <!-- In a completely separate navbar component -->
    <div data-if="$global.loggedIn">
      Welcome, <span data-text="$global.username"></span>!
    </div>
    ```

#### **4. Directive & Usage Examples**

| Directive | Example | Description |
| :--- | :--- | :--- |
| **`data-if`** | `<template data-if="condition">` | Conditionally renders an element. |
| **`data-for`** | `<template data-for="item in items">` | Iterates over an array to render elements. |
| **`data-text`** | `<span data-text="expression">` | Sets the `textContent` of an element. |
| **`data-html`** | `<div data-html="expression">` | Sets the `innerHTML` of an element. |
| **`data-model`** | `<input data-model="property">` | Creates a two-way binding on an input element. |
| **`data-on-[event]`** | `<button data-on-click_prevent="...">` | Attaches an event listener. |
| **`data-get`** | `<div data-get="/data" data-target="#me">` | (HTMX-like) Fetches content from a URL. |
| **`data-trigger`** | `<input data-trigger_debounce:500ms="keyup">`| (HTMX-like) Specifies the trigger for a request. |