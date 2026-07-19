# Resolved: Hovering sidebar wiped newly-added tabs (global `tabs` signal clobbered)

## STATUS: RESOLVED — fix applied in source (`8ff53fb`, `1cfab3a`), verified working by user.

## The issue (user, on-screen)
1. Load `http://127.0.0.1:8081/site/index.html` → one `Home` tab, sidebar collapsed.
2. Click `+` in the tab bar (`.btn.btn-circle.shrink-0`) to add tabs.
3. Hover the sidebar → expands (`data-on-mouseenter="hovered = true"`).
4. On hover-end/collapse, **all newly-added tabs vanished and the view reset to
   `Home`** — the global `tabs` signal was wiped to its initial 1-element literal.

This is a **state reset**, not a `data-if` DOM tear-down. `src/modules/attributes/if.ts`
only mounts/disposes its OWN dock clones (layout.html L530/L535) and cannot touch
the tab bar — the culprit is the global-signal effect in `signal.ts`.

## Root cause (from git diff `b7ab463 → 8ff53fb`)
`data-signal:global` kept `lastEvaluatedState` with a *shallow* reference to the
`tabs` array. `tabs.push()` (clicking `+`) mutated that snapshot in place. When the
sidebar hover toggled a `data-if` and re-ran the global effect, the freshly
evaluated `tabs` literal (length 1) was compared against the mutated snapshot
(length N) → "changed" → framework overwrote global `tabs` with the 1-element
literal, deleting the user's tabs.

## The fix (committed; do NOT re-implement)
- `src/modules/attributes/signal.ts` (`8ff53fb`):
  - `cloneValue()` deep-clone helper (L8–20) so `lastEvaluatedState` is isolated
    from global mutations.
  - init-if-absent guard (L91–99): globals seeded only for keys that do not already
    exist; a re-run never clobbers live state.
- `src/modules/attributes/component.ts` (`1cfab3a`): memoize `data-component` by
  resolved path (`if (config.path === __lastPath) return;`) so an unrelated hover
  does not remorph the panel.

## Build/deploy note (learned from `serve.ts`)
- `scripts/serve.ts` has **no build step** — it only serves static files;
  `--autocommit` only commits. Source edits reach the browser ONLY after an
  explicit `deno task build --minify`. (HTML-only `site/` changes need no rebuild.)
- The fix went live via the other agent's `deno task build --minify` run.

## Validation (user-performed, passed)
Hard-refresh → add tabs via `+` → hover sidebar (expand) → move away (collapse) →
tabs REMAIN; view does not reset to Home. Repeated hover cycles: stable.

## Rejected theories (do not pursue)
- Missing `</template>` at layout.html L535 — FALSE; both `data-if` templates at
  L530/L535 are properly closed (confirmed in current file + git history).
- `if.ts` removing the tab bar — FALSE; `data-if` only toggles its own dock clones.

## Notes
- Standalone repro scripts landed as `repro-*.mjs` (gitignored `.playwright/`).
- No further code change required. Nothing pending.
