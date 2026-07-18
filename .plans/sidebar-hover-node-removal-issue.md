# Issue: Hovering the collapsed sidebar removes/destroys DOM nodes (tabs + panel)

## Reported by
User (on-screen observation in their real browser), with four screenshots as evidence:
`/home/aerea/development/01-load.png`
`/home/aerea/development/02-after-tabs.png`
`/home/aerea/development/03-hovering-sidebar.png`
`/home/aerea/development/04-after-hover.png`

## Symptom (user's words)
When the sidebar is collapsed and the user hovers it (mouse enters the thin
left strip), DOM nodes get removed/destroyed. Specifically the user observes
the **tabs and/or the active tab panel disappearing or resetting**, as if the
tab list (`tabs` signal) is being reset and the panel is being re-mounted or
torn down.

## Reproduction steps (as performed)
1. Open `http://127.0.0.1:8081/site/index.html` (dev server, `scripts/serve.ts`, `--watch --autocommit`).
2. Page loads with a single `Home` tab and a collapsed sidebar.
3. Click the new-tab button (`.btn.btn-circle.shrink-0`) 2–3 times to add tabs.
4. Move the real mouse pointer over the collapsed sidebar strip (left edge).
5. Observe which nodes vanish.

## Screenshots (user-asserted evidence — NOT yet machine-verified by assistant)
- `01-load.png` — initial load, collapsed sidebar, one `Home` tab.
- `02-after-tabs.png` — after adding 2–3 tabs; tabs + panel present.
- `03-hovering-sidebar.png` — while hovering the sidebar; user reports nodes removed.
- `04-after-hover.png` — after the hover ends; user reports state not recovered.

## Assistant's conflicting observation (must be reconciled)
Using the same real-mouse sequence via the MCP `browser_*` tools against the
served `dist/`, the live DOM snapshots showed:
- Tabs remain (even increased: Home + multiple "New Tab").
- The `tabpanel` ("Welcome / data-component") stays present.
- The sidebar correctly EXPANDS on hover (branding + Homepage/Settings/Profile
  + Menu/Favorites/Preferences appear) and collapses again after.
- No tab reset, no panel removal, no node loss was observed in the DOM.

This contradicts the user's screenshot-based report. Possible causes to rule in/out:
- Stale `dist/nexus-ux.js` served to the user's browser (server sends `etag`/
  `last-modified` but NO `Cache-Control: no-cache`; soft refresh may serve a
  cached bundle). **Hard refresh (Ctrl/Cmd+Shift+R) suspected factor.**
- The user reproduces via a different interaction path/state not yet hit
  (e.g., toggling via `toggle sidebar` button first, or a specific pointer
  position that triggers `data-on-mouseenter="hovered = true"` differently).
- A genuine framework bug that only manifests under real pointer events /
  timing that the automated tool's `hover()` does not replicate exactly.

## Relevant source (per prior investigation)
- `src/modules/attributes/signal.ts` — global signal init-if-absent fix applied
  (committed) to stop tabs resetting to initial on re-run.
- `src/modules/attributes/component.ts` — `data-component` path-memoization guard
  applied (committed) to stop remorph on unrelated signal changes.
- `src/modules/attributes/if.ts` — `data-if` clone/dispose; legitimate source of
  sidebar icon removals on hover (`collapsed && !hovered`).
- `site/_components/layout.html` — hover handlers `data-on-mouseenter="hovered = true"`
  / `data-on-mouseleave="hovered = false"` (~L398–401); dock `data-if` branches at
  (~L530 / ~L535); `data-effect` at ~L330/334/340.

## Key open questions
1. Which exact nodes does the user see disappear (tabs, panel, sidebar items)?
2. Is the user's browser running the CURRENT `dist/` (hard-refreshed) or a cached one?
3. Does the bug require the `toggle sidebar` button to be used first, or only raw hover?
4. Can a second-opinion agent (with image-input capability) confirm what the 4 PNGs show?

## Validation plan for next agent
- Independently open the 4 PNGs and describe what each shows, especially any
  missing tabs/panel in 03 and 04.
- Reproduce in a real browser: load, add tabs, hover sidebar; capture before/after
  DOM + screenshots; state definitively whether nodes are removed.
- If reproducible: isolate the directive(s) responsible (signal reset, data-if
  dispose, data-component remount, or re-navigation) and propose a fix.
- If NOT reproducible on a hard-refreshed current bundle: confirm stale-cache
  hypothesis and recommend adding `Cache-Control: no-cache` to the dev server.
