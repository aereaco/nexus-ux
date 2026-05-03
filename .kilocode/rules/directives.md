---
trigger: always_on
---

# WORKSPACE DIRECTIVES

### Core Architecture & Memory Directives

- **Zero-Copy Zero-Serialization (ZCZS) Mandate:** All development must strictly
  eliminate overhead by avoiding data serialization and deserialization across
  boundaries.
- **Shared Memory Heap Utilization:** To prevent ZCZS violations and resolve
  implementation stagnation, maximize the use of the shared memory heap (e.g.,
  SharedArrayBuffer, atomic operations, and direct memory references).
- **Rust-Inspired Borrowing:** Enforce clear memory ownership and strict
  borrowing patterns for optimal performance and memory safety.
- **Reactive Orchestration Pattern:** All orchestration must adhere to the
  Singleton -> Registration -> Dispatch -> Callback -> Cleanup sequence for
  high-efficiency reactive systems.

### Framework-Specific Directives

- **Deno Project Integrity:** Never pollute Deno projects with non-Deno tooling,
  build scripts, or configurations.
- **Nexus-UX Implementation:**
  - Adhere strictly to core architectural rules, the local specification, and
    reference .md files within the nexus-ux directory.
  - **Strict Limit:** Never instantiate a secondary MutationObserver. Maintain a
    single observer context.
- **Nexus-IO Implementation:**
  - Adhere strictly to core architectural rules, the local specification, and
    reference .md files within the nexus-io directory.

### Workflow & Documentation Management

- **Pre-Code Implementation Plan:** Always draft a comprehensive Implementation
  Plan before modifying any code. This plan must detail the underlying thought
  process and proposed changes, providing an opportunity to review, align
  development with specific insights and expectations, and approve the direction
  of implementation prior to execution.
- **Documentation-Driven Development (DDD):** Documentation must always remain
  updated and ahead of the codebase. It serves as the single source of truth for
  development direction, incorporating a living development roadmap and an
  active TODO list.
- **Direct Focus over Tool Sprawl:** During periods of development stagnation,
  stop building or troubleshooting internal tools and test suites. Focus
  immediately on fixing core framework functionality and stability. Do not get
  sidetracked repairing self-engineered tooling.
- **Granular Version Control:** Always update the git repository after all code
  edit batches. This ensures that every aspect of both functional and
  non-functional code is fully referenced in the git history for clear tracking,
  debugging, and review if issues arise.

### Browser Testing & System Interaction

- **Stuck Process Mitigation:** When testing in the browser, if a process or
  thread hangs, do not reopen the same browser URL without modifying the
  codebase. A hanging process requires an explicit code fix; waiting for the
  hang to clear without changes stalls implementation indefinitely.
- **System Commands:** Never use xdg-open or similar environment-specific
  opening commands.
