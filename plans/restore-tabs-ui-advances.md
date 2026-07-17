# Plan: Restore Tab Bar UI Advances (without breaking the codebase)

## Goal
Restore the 8 tab-bar UI advances that were lost when the tabs block was reverted
to HEAD. Restore them **one at a time**, each behind explicit user permission,
and without relocating or modifying any existing `data-signal` scope.

## Hard Constraints (from session incident)
- **DO NOT** move, add fields to, or otherwise alter the two existing
  `data-signal` blocks:
  - Drawer signal: `<div class="drawer lg:drawer-open" data-signal="...">` (line 1)
  - Tabs signal: `<div class="tabs tabs-border rounded-none" data-signal="{ tabs: [...] }">` (line 195)
- **DO NOT** relocate the content panel outside its current `data-for` template
  pairing unless the user explicitly approves a scope change first.
- **No autonomous edits.** Every change requires a separate user-approved step.
- Emblem `href` line (317) is intentionally left as-is per user instruction.

## Root-cause note (why the prior breakage happened)
The previous breakage was caused by: (a) adding `activeTabId` to the tabs signal
and moving the signal wrapper off the `.tabs` element, and (b) relocating the
content `<div class="p-6">` out of the tab strip into a separate wrapper. Both
changed where scoped bindings resolved. Restore must keep the tabs `data-signal`
on its original element and its original `tabs` field shape.

## Advances to restore (ordered, each = one permission-gated step)

### A1. Two-container tab structure
Split the tab bar (own `bg-base-300/20` background) from the content panel.
- **Constraint-safe approach:** keep `data-signal="{ tabs }"` on the original
  `.tabs` wrapper. Add the bar background as a parent wrapper, and render BOTH
  the header loop AND the content loop from the same `tabs` signal — but the
  content loop must live inside the SAME `data-signal` scope (the `.tabs`
  element), NOT a relocated wrapper. Alternatively, confirm with user whether
  moving content out (a signal-scope change) is acceptable. **Ask first.**

### A2. `activeTabId` activation model
Add `activeTabId` state. Since it must NOT be added to the tabs `data-signal`
(per constraints), options:
- (a) `activeTabId` as a module-level/shared signal, or
- (b) user-approved addition to the tabs signal.
**Must ask user which is acceptable before implementing.**

### A3. Active tab visible on page load
`border-b border-primary text-primary shadow-sm` (NOT `border-b-2` — numeric
border widths compute to 0px in this Tailwind v4 CDN setup). Use
`(activeTabId ?? tabs[0]?.id) === tab.id` fallback in `data-class` so first tab
is active even before `data-for` scope wiring. Pure framework utility, no custom CSS.

### A4. `pinned` flag
Add `pinned: true` to Home, `false` to others in the `tabs` signal array.
Hide close button via `data-class="{ 'hidden': tab.pinned }"`.
- **Note:** this edits the `tabs` array shape inside the existing tabs signal.
  That is a field-value change within the allowed signal, not a scope move.
  Still confirm with user.

### A5. Draggable + swappable tabs
On the `.tabs` wrapper (which holds the header `data-for`): add
`data-drag-container="tabs"`, `data-drag-group="tabs"`,
`data-drag-swap-threshold="0.55"`, `data-drag-direction="horizontal"`,
`data-drag-class`, `data-drag-ghost-class`. Add `data-drag` to each tab `<div>`.
These are attribute additions only — no signal change.

### A6. Drag handle
Add `<iconify-icon icon="material-symbols-light:drag-indicator" class="drag-handle cursor-grab ...">` as first child of each tab; keep `data-on-click="activeTabId = tab.id"` on the tab body so activating still works.

### A7. Horizontal scrolling tab bar
`.tabs` → `overflow-x-auto flex-nowrap`; each tab `shrink-0`; keep `+` button
inside the scroll container adjacent to the last tab.

### A8. Close logic tied to `activeTabId`
`data-on-click:stop="const wasActive = activeTabId === tab.id; tabs = tabs.filter(t => t.id !== tab.id); if (wasActive) activeTabId = tabs[0]?.id;"`

## Open Questions (must be answered before A1/A2/A4)
1. Is adding `activeTabId` (A2) and `pinned` (A4) to the EXISTING tabs signal
   acceptable, or should they live elsewhere (shared/module signal)?
2. Is the two-container split (A1) acceptable even though it may require the
   content loop to share the tabs signal scope, or do you want content to stay
   interleaved (DaisyUI `tab`+`tab-content` sibling) and only the bar background split?

## Validation (per step, in browser on :8123, then :3000 hard-refresh)
- Tabs render; first tab active on load (visible `border-b` 1px + `text-primary`).
- Click switches active correctly.
- Drag reorders; swap on overlap; content follows reorder.
- Horizontal scroll appears when tabs overflow; `+` stays adjacent.
- Close removes tab; pinned (Home) close button hidden; closing active tab
  activates `tabs[0]`.
- Sidebar collapse/hover/active-tab switching still work (regression check).

## Rollback
Each step is independently revertible. If a step breaks the sidebar or other
mechanics, revert that single step only (git checkout of the file region or
manual undo) and re-confirm before proceeding.
