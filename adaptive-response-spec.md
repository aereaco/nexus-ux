# Nexus-UX Implementation Spec: Adaptive Data Plane & Branch Isolation

This document outlines the technical requirements for implementing the
**Adaptive Response Plane** and the **Branch Isolation Directives** in the
Nexus-UX Core.

---

## 1. Adaptive Response Plane (Universal Data Ingress)

The engine must orchestrate directives against arbitrary backend responses
without requiring source modifications.

### 1.1. Structural Inferencing Patterns

The `ModuleCoordinator` and sprite dispatchers must automatically detect data
payloads in the following formats:

| Pattern              | Detection Logic                                             | Orchestration Action                 |
| :------------------- | :---------------------------------------------------------- | :----------------------------------- |
| **Direct Array**     | `Array.isArray(response)`                                   | Use as iterable for `data-for`       |
| **Global Envelope**  | Key match: `data`, `results`, `items`, `value`, `_embedded` | Ingress key contents to `SignalHeap` |
| **GraphQL/JSON API** | Top-level `data` key + query-name diving                    | Recursive ingress of nested results  |
| **OData / HAL**      | `@odata.context` or `_links` presence                       | Normalize `value` or `_embedded`     |
| **NDJSON (Stream)**  | Line-by-line JSON parsing                                   | Reactive append to existing signal   |

### 1.2. Sprite DX Wrappers

Refactor `sprites.ts` to provide semantic context while using the same
underlying "Arbitrary Text" dispatcher.

- **`$sql(query)`**: High-context wrapper for database interactions.
- **`$io(command)`**: High-context wrapper for shell/mesh system calls.
- **`$ai(prompt)`**: High-context wrapper for LLM streaming (`NDJSON`).
- **`$data(text)`**: Low-level generic accessor.

**Normalization requirement**: Every sprite must return a **Normalized Signal
Object** to the engine, ensuring directives don't need to know the original
response format.

---

## 2. Branch Isolation (data-ignore)

Provide developer-controlled firewalls to prevent the Nexus engine from
interfering with third-party DOM mutations (e.g., Google Maps, Chart.js, Legacy
Widgets).

### 2.1. Directive Specifications

- **`data-ignore`**: Total Isolation.
  - **Logic**: `ModuleCoordinator` must stop recursive walking at this element.
    No directives are processed for the branch.
  - **Cleanup**: Must maintain a `CLEANUP_FUNCTIONS_KEY` registry for the branch
    to prevent memory leaks when the element is removed.

- **`data-ignore:ux`**: Logic Bypass.
  - **Logic**: Bypasses directive and signal processing but allows the
    **DesignSystem (JIT CSS)** to continue styling the branch.

- **`data-ignore:style`**: JIT Firewall.
  - **Logic**: Prevents the DesignSystem from monitoring or applying classes to
    this branch. Used for highly-optimized or canvas-based components.

---

## 3. Signal Normalization Logic

The engine should prioritize **Performance ($O(1)$ updates)** during
normalization.

1. **Immutability-Optional**: While responses are immutable, the internal
   `SignalHeap` uses **Binary Mutation** for performance.
2. **Mapping Function**: Allow sprites to chain a `.map()` or `.path()` helper
   for manual overrides when inferencing fails.
   - _Example_: `$io("ps aux").path("processes")`

---

## 4. Operational Guardrails

- **ZCZS Mandate**: Response normalization must avoid unnecessary deep-clones.
  Use views and pointers where possible.
- **Security**: All "Arbitrary Text" passed via sprites must be validated
  against the **IAM Kernel** policies (GuardedCommand) before execution.
