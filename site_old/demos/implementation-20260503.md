# Plan: Aligning Documentation & Stabilizing Reactivity

This plan focuses on bringing the `nexus-ux-spec.md` and `nexus-ux-reference.md` into alignment with the actual implementation and the project's core directives, while simultaneously fixing the critical drag-and-drop failure and introducing a global async process loop.

## Architectural Sanity Check

> [!IMPORTANT]
> **Nexus-UX** is a modern, HTML declarative-first reactive UX framework that coordinates HTML directives with modern web-native APIs. The following contract governs all file-level design decisions:
>
> - **Engine-level files** (`src/engine/*`) wrap modern web APIs within the reactive ownership tracker. They provide the foundational infrastructure — reactivity, scheduling, observation, evaluation, reconciliation, and diagnostics. Engine files own the lifecycle of web-native primitives and expose them through the ownership/borrowing system.
>
> - **Module-level files** (`src/modules/*`) serve exclusively as small wrappers designed to schedule their specific semantically aligned directives (attributes, listeners, modifiers, scopes, sprites, etc.). Modules must **never** instantiate web API primitives directly (e.g., `MutationObserver`, `IntersectionObserver`, `ResizeObserver`). They register with the engine and receive callbacks through the reactive ownership graph.
>
> **All development on Nexus-UX must follow the workspace directives defined in `.agent/rules/directives.md`.** This is a non-negotiable requirement for all contributors — human and AI alike.

## User Review Required

> [!IMPORTANT]
> **MutationObserver Policy (Final)**: The framework permits exactly **two** MutationObserver contexts:
>
> 1. **Framework Observer** (`engine/observers/mutation.ts`) — The singular reactive observer. All element-scoped observation needs must utilize the **ownership tracking** system (`reactivity.ts` borrowing/ownership). Reactivity is expressed as isolated processes — no special-case logic is injected into the observer for individual directives.
> 2. **Sanitizing Observer** (`engine/debug.ts` — NEW) — A **lazy, conditional** debug engine that only boots when the `data-debug` attribute is invoked on an element. In production (no `data-debug`), only basic `console.error` is thrown to indicate further observation is needed. When a developer invokes `data-debug`, the full browser-based debug engine deploys with crash beacons, logging, and optional MCP interaction.
>
> **MCP Independence**: `engine/mcp.ts` remains an **independent module** — it is the omni-directional primitive serving both runtime features AND debug functionality. It is NOT consolidated into `debug.ts`. The debug engine consumes `mcp.ts` as a transport layer when an MCP endpoint is configured via `data-debug="{ mcp: '<endpoint>' }"`.
>
> **Current Violations**:
> - `modules/attributes/bind.ts:67` — Spawns a scoped MutationObserver per `<select>` element. **Must be removed**. The `<select>` sync must be refactored to use ownership-tracked reactivity as an isolated process.
> - `engine/modules.ts:260` — The `debugObserver` is defined inline. **Must be extracted** into `engine/debug.ts`.
> - `engine/errors.ts` — Error reporting with MCP diagnostic routing is scattered. **Must be consolidated** into `engine/debug.ts`.
> - `engine/logger.ts` — Logging utility is a separate file. **Must be consolidated** into `engine/debug.ts`.
>
> **Documentation Priority**: Per the DDD directive, `.md` files are updated *before* code fixes.

---

## Proposed Changes

### 1. Documentation Audit & Alignment

#### [MODIFY] [nexus-ux-spec.md](file:///home/aerea/development/nexus-ux/nexus-ux-spec.md)
- Add a new **Architecture Contract** section defining the engine-level vs module-level responsibility boundary:
  - Engine files wrap web APIs within the reactive ownership tracker.
  - Module files are small directive wrappers that schedule through the engine — never instantiate web primitives directly.
- Add a **Development Compliance** section stating that all development must follow `.agent/rules/directives.md`, including:
  - ZCZS mandate, ownership tracking, single framework MutationObserver rule.
  - Conversational alignment, pre-code implementation plans, DDD workflow.
  - Direct focus over tool sprawl, granular version control.
- Update the **ZCZS** section to document `MARKER_KEY` and `EFFECT_RUNNERS_KEY` Symbol patterns.
- Clarify the **MutationObserver architecture** with the two-observer policy:
  - **Framework Observer**: Singular reactive observer — all element needs use ownership tracking as isolated processes.
  - **Sanitizing Observer**: Singular debug/error observer in `engine/debug.ts` — crash-isolated, houses the complete error reporting + MCP diagnostic system.
- Synchronize the **Directive List** with current `src/modules/attributes`.
- Add documentation for the **Global Async Process Loop** integrated into `scheduler.ts`.
- Add documentation for the **Integrated Sanitizing Engine** (`engine/debug.ts`).

#### [MODIFY] [nexus-ux-reference.md](file:///home/aerea/development/nexus-ux/nexus-ux-reference.md)
- Add a **Contributing & Compliance** preface stating that all development (human and AI) must adhere to `.agent/rules/directives.md`.
- Update code examples for `data-drag` and `data-teleport:drop`.
- Add a "Debugging" section explaining `element.nexus.effectRunners`.
- Document the Sanitizing Engine's crash-isolated MCP diagnostic pipeline.
- Document the engine-vs-module contract with practical examples of correct (engine-delegated) vs incorrect (direct web API) patterns.

---

### 2. Core Framework Stabilization (Fixing Drag-and-Drop)

#### [MODIFY] [mutation.ts](file:///home/aerea/development/nexus-ux/src/engine/observers/mutation.ts)
- Ensure the `MARKER_KEY` skip logic handles "re-insertion" correctly without breaking initial bindings.
- No special-case logic added — all element-level observation needs are expressed via ownership tracking in the reactive layer.

#### [MODIFY] [bind.ts](file:///home/aerea/development/nexus-ux/src/modules/attributes/bind.ts)
- **Remove the scoped MutationObserver** (line 67-69).
- Refactor `<select>` value synchronization to use **ownership-tracked reactivity** as an isolated process. When `data-for` populates `<option>` children, the `for.ts` effect runner already triggers through the ownership graph — `bind.ts` registers as a borrower of the `<select>` element so that childList mutations propagate through the existing `RUN_EFFECT_RUNNERS_KEY` pulse in `mutation.ts` (line 70), re-evaluating the bound value without a dedicated observer.

#### [MODIFY] [drag.ts](file:///home/aerea/development/nexus-ux/src/modules/attributes/drag.ts)
- **Robust Resolution**: Update the `sourceList` resolution to climb the DOM tree if the immediate parent lacks `data-teleport:drop`.
- **ZCZS Pointer**: Verify that `_dragState` correctly holds the reactive proxy of the list, not a serialized copy.

#### [MODIFY] [teleport.ts](file:///home/aerea/development/nexus-ux/src/modules/attributes/teleport.ts)
- **Index Precision**: Refine the `toIndex` calculation to account for hidden template elements and `$spatial` hit-testing.
- **View Transitions**: Ensure `startViewTransition` is handled gracefully when unavailable.

---

### 3. Global Async Process Loop (Scheduler Integration)

> [!NOTE]
> **Rationale**: The current `scheduler.ts` uses `requestAnimationFrame` for its 4-phase flush cycle. This frame-locks all reactive operations to ~16ms budgets. A Node.js/Deno-inspired async process loop on the shared memory heap decouples computation from the paint cycle, preventing runtime stalls.

#### [MODIFY] [scheduler.ts](file:///home/aerea/development/nexus-ux/src/engine/scheduler.ts)
- **Integrate the async process loop directly** into the existing scheduler (no separate `loop.ts`).
- Replace the `requestAnimationFrame`-based `requestFlush()` with a **SharedArrayBuffer + Atomics** backed event loop:
  - `Capture` → Microtask queue (immediate signal flagging via `queueMicrotask`)
  - `Evaluate` → Async task queue (effect evaluation, can yield to browser via `MessageChannel`)
  - `Resolve` → Microtask queue (instruction translation)
  - `Paint` → `requestAnimationFrame` (DOM mutations only — kept frame-aligned)
- **Stall Detection**: If any phase exceeds a configurable threshold (default: 8ms), yield control back to the browser via `MessageChannel` or `scheduler.yield()` (where available), then resume on the next microtask.
- **SharedArrayBuffer Integration**: Phase state flags and queue lengths are stored in a shared `Int32Array` for zero-copy cross-context coordination (main thread ↔ workers).
- Preserve the existing 4-phase queue API (`enqueueCapture`, `enqueueEvaluate`, `enqueueResolve`, `enqueuePaint`, `nextTick`) as the public interface.

---

### 4. Integrated Sanitizing Engine (Lazy Debug Engine)

> [!NOTE]
> **Design Principle**: The debug engine maximizes production performance by remaining completely dormant until explicitly invoked. In production, the framework throws basic `console.error` messages to indicate areas needing observation. A developer invokes the full debug engine by adding `data-debug` to a target element, scoping diagnostic efforts precisely. MCP server interaction is opt-in via `data-debug="{ mcp: '<MCP-compliant endpoint>' }"`.

#### [NEW] [debug.ts](file:///home/aerea/development/nexus-ux/src/engine/debug.ts)
**Lazy, conditional debug engine that only boots when `data-debug` is detected.** This is the crash-isolated companion to the framework observer.

**Activation modes:**

| Usage | Effect |
|:---|:---|
| `data-debug` (no value) | Boots the full debug engine scoped to the element subtree. Enables crash beacons, verbose logging, and `element.nexus` DevTools surface. |
| `data-debug="{ mcp: 'http://...' }"` | Same as above, plus connects to the specified MCP server (via `engine/mcp.ts`) for AI-assisted diagnostics, crash reporting, and remote action definitions. |
| No `data-debug` (production) | Debug engine is **never instantiated**. Only basic `console.error` fires for critical failures. Zero overhead. |

**Consolidates the following existing modules:**

| Current Location | What Moves | Role in `debug.ts` |
|:---|:---|:---|
| `engine/errors.ts` | `UXError`, `reportError`, `initError`, `runtimeError`, `syntaxError`, `evaluationError` | **Error Reporting API** — all error class definitions and reporting functions |
| `engine/logger.ts` | `logger` object (`log`, `warn`, `info`, `debug`, `error`) | **Logging Subsystem** — dev-mode gated console output |
| `engine/modules.ts:259-268` | `debugObserver` MutationObserver | **Sanitizing MutationObserver** — watches `data-debug` attribute, survives framework crashes |

**Capabilities (when active):**
- **Crash Beacons**: When the framework observer in `mutation.ts` throws, `debug.ts` captures the failure context (element, expression, stack) and routes it through MCP (via `engine/mcp.ts`) for AI-assisted repair suggestions.
- **Action Definitions**: Centralized registry of diagnostic actions that AI agents can invoke via MCP (e.g., `nexus/inspect-element`, `nexus/dump-reactive-graph`, `nexus/force-reconcile`).
- **Crash Isolation**: The sanitizing MutationObserver runs in its own `try/catch` boundary completely independent of the framework. If `mutation.ts` dies, `debug.ts` keeps capturing.
- **DevTools Surface**: Manages the `element.nexus.effectRunners` introspection API.
- **Scoped Targeting**: Debug diagnostics are scoped to the element subtree where `data-debug` is declared, not the entire document.

#### [KEEP] [mcp.ts](file:///home/aerea/development/nexus-ux/src/engine/mcp.ts)
- **Remains independent.** `mcp.ts` is the omni-directional primitive providing standardized MCP transport for both runtime features (e.g., `$sql`, server-driven actions) and debug diagnostics. `debug.ts` imports and uses `mcp.ts` when an MCP endpoint is configured — it does not own it.

#### [DELETE] [errors.ts](file:///home/aerea/development/nexus-ux/src/engine/errors.ts)
- Consolidated into `debug.ts`.

#### [DELETE] [logger.ts](file:///home/aerea/development/nexus-ux/src/engine/logger.ts)
- Consolidated into `debug.ts`.

#### [MODIFY] [modules.ts](file:///home/aerea/development/nexus-ux/src/engine/modules.ts)
- Remove the inline `debugObserver` (lines 259-268, 284) and its `dispose()` cleanup.
- Replace with a conditional initialization call to `engine/debug.ts` — only invoked if `data-debug` is detected during `initializeModules()`.
- Update imports from `errors.ts` and `logger.ts` to point to `debug.ts`.
- `mcp.ts` imports remain unchanged.

#### [MODIFY] All files importing from `errors.ts` or `logger.ts`
- Redirect imports to `engine/debug.ts`.

---

### 5. Tooling Cleanup

#### [DELETE] [test-nexus.ts](file:///home/aerea/development/nexus-ux/test-nexus.ts)
- **Direct Focus over Tool Sprawl**: Remove the broken headless JSDOM test suite.

---

## Verification Plan

### Automated Tests
- Run `deno task build` to ensure no regression in the build pipeline.

### Manual Verification
1. Open `site/dashboard/pages/interaction/drag.html`.
2. Perform "Simple List" sorting — items must reorder and maintain reactive bindings.
3. Perform "Shared Transfer" between containers — items must move between lists cleanly.
4. Inspect an item in console: `document.querySelector('.item').nexus.effectRunners` must show active runners.
5. Verify `<select>` elements with dynamic `<option>` children sync correctly via ownership tracking (no scoped observer).
6. Inject a deliberate error into `mutation.ts` and confirm `debug.ts` sanitizing observer continues operating.
7. Verify MCP diagnostic routing fires on framework errors in dev mode.
8. Verify `data-ingest` loads assets without FOUC.
