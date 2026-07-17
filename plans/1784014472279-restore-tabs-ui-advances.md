# Plan: Restore Working Tab Bar (without touching existing signals)

## Hard constraint (from user)
**DO NOT relocate, add fields to, or otherwise alter the two existing `data-signal` blocks:**
- Drawer signal: `<div class="drawer lg:drawer-open" data-signal="...">` (layout.html line 1)
- Tabs signal: `<div class="tabs tabs-border rounded-none" data-signal="{ tabs: [...] }">` (layout.html line 194-215)

The previous breakage came from adding `activeTabId` into the tabs signal and
moving its wrapper off the `.tabs` element. This plan restores all 8 advances
while leaving BOTH existing signals byte-for-byte unchanged.

## Strategy
Introduce ONE new signal wrapper (a parent `<div>` with its own `data-signal`)
that surrounds the tab bar + content panel. It carries `activeTabId` and any
new per-tab fields (`pinned`) in ITS OWN scope — never merged into the existing
tabs signal. The existing `data-signal="{ tabs }"` on `.tabs` is left intact and
continues to own the `tabs` array.

Scope interaction: the new wrapper is an ancestor of the `.tabs` element, so
its signal (`activeTabId`, `pinned`-style flags) is visible to descendants via
Nexus scope chain. The existing `tabs` signal remains the array owner.

## Current state (HEAD, lines 193-237)
```html
    <!-- name of each tab group should be unique -->
    <div class="tabs tabs-border rounded-none"
      data-signal="{
        tabs: [{
          id: 'home', title: 'Home', icon: 'material-symbols-light:home-outline',
          content: '_pages/home.html', checked: true
        }, {
          id: 'settings', title: 'Settings', icon: 'material-symbols-light:settings-outline',
          content: '_pages/settings.html', checked: false
        }, {
          id: 'profile', title: 'Profile', icon: 'material-symbols-light:person-outline',
          content: '_pages/profile.html', checked: false
        }] }"
    >
      <template data-for="tab in tabs" data-key="tab.id">
        <div role="tab" class="tab flex items-center gap-2" data-class="{ 'hidden': !pageTabs, 'tab-active': tab.checked }"
             data-on-click="tabs.forEach(t => t.checked = (t.id === tab.id))">
          <iconify-icon data-bind-icon="tab.icon" class="text-lg"></iconify-icon>
          <span data-bind="tab.title"></span>
          <button class="btn btn-ghost btn-xs btn-circle ms-2" aria-label="Close tab" title="Close tab"
                  data-on-click:stop="const wasActive = tab.checked; tabs = tabs.filter(t => t.id !== tab.id); if (wasActive && tabs[0]) tabs[0].checked = true;">
            <iconify-icon icon="material-symbols-light:close" class="text-xs"></iconify-icon>
          </button>
        </div>
        <div class="tab-content p-6 h-dvh" data-show="tab.checked" data-component="tab.content"></div>
      </template>
      <button class="btn btn-circle" data-class="{ 'hidden': !pageTabs }"
              data-on-click="const n = tabs.length + 1; tabs.forEach(t => t.checked = false); tabs.push({ id: 'tab' + n, title: 'Tab ' + n, icon: 'material-symbols-light:article-outline', content: '_components/tab-generic.html', checked: true })">
        <iconify-icon icon="material-symbols-light:add" style="font-size: 24px"></iconify-icon>
      </button>
    </div>
```

## Target implementation (replace lines 193-237)
```html
    <!-- NEW signal wrapper: owns activeTabId + pinned map. Existing tabs signal below is UNTOUCHED. -->
    <div data-signal="{ activeTabId: 'home', pinned: { home: true, settings: false, profile: false } }">

      <!-- name of each tab group should be unique -->
      <div class="tabs tabs-border rounded-none"
        data-signal="{
          tabs: [{
            id: 'home', title: 'Home', icon: 'material-symbols-light:home-outline',
            content: '_pages/home.html', checked: true
          }, {
            id: 'settings', title: 'Settings', icon: 'material-symbols-light:settings-outline',
            content: '_pages/settings.html', checked: false
          }, {
            id: 'profile', title: 'Profile', icon: 'material-symbols-light:person-outline',
            content: '_pages/profile.html', checked: false
          }] }"
      >

        <!-- TAB BAR background wrapper (advance 1: two-container) -->
        <div class="bg-base-300/20" data-class="{ 'hidden': !pageTabs }">
          <div class="tabs overflow-x-auto flex-nowrap" data-drag-container="tabs" data-drag-group="tabs" data-drag-swap-threshold="0.55" data-drag-direction="horizontal"
               data-drag-class="!opacity-100 cursor-grabbing z-[9999]"
               data-drag-ghost-class="opacity-40 bg-base-200 border-2 border-dashed border-primary/40">
            <template data-for="tab in tabs" data-key="tab.id">
              <div role="tab" class="tab transition-colors flex items-center gap-2 shrink-0" data-drag
                   data-class="{ 'border-b border-primary text-primary shadow-sm': (activeTabId ?? tabs[0]?.id) === tab.id, 'hover:bg-base-200': (activeTabId ?? tabs[0]?.id) !== tab.id }"
                   data-on-click="activeTabId = tab.id">
                <iconify-icon icon="material-symbols-light:drag-indicator" class="drag-handle cursor-grab text-base-content/40"></iconify-icon>
                <iconify-icon data-bind-icon="tab.icon" class="text-lg"></iconify-icon>
                <span data-bind="tab.title"></span>
                <span class="px-1"></span>
                <button class="btn btn-ghost btn-xs btn-circle" aria-label="Close tab" title="Close tab"
                        data-class="{ 'hidden': pinned[tab.id] }"
                        data-on-click:stop="const wasActive = activeTabId === tab.id; tabs = tabs.filter(t => t.id !== tab.id); if (wasActive) activeTabId = tabs[0]?.id;">
                  <iconify-icon icon="material-symbols-light:close" class="text-xs"></iconify-icon>
                </button>
              </div>
            </template>
            <button class="btn btn-circle shrink-0"
                    data-on-click="const n = tabs.length + 1; const id = 'tab' + n; tabs.push({ id, title: 'Tab ' + n, icon: 'material-symbols-light:article-outline', content: '_components/tab-generic.html' }); activeTabId = id; pinned[id] = false;">
              <iconify-icon icon="material-symbols-light:add" style="font-size: 24px"></iconify-icon>
            </button>
          </div>
        </div>

        <!-- CONTENT PANEL (advance 1: separate div) -->
        <div class="p-6">
          <template data-for="tab in tabs" data-key="tab.id">
            <div class="h-dvh" data-show="(activeTabId ?? tabs[0]?.id) === tab.id" data-component="tab.content"></div>
          </template>
        </div>
      </div>
    </div>
```

## Advances restored (all 8) — none require editing existing signals
1. Two-container: bar (`bg-base-300/20`) + content (`p-6`) inside the new wrapper.
2. `activeTabId` activation — lives in the NEW wrapper signal, not the tabs signal.
3. Active-on-load: `border-b border-primary` (NOT `border-b-2`; numeric widths = 0px in Tailwind v4 CDN) + `(activeTabId ?? tabs[0]?.id)` fallback.
4. `pinned` — modeled as a `pinned` map in the NEW wrapper signal (`pinned[tab.id]`), so the existing `tabs` array shape is untouched.
5. Draggable + swappable: drag attrs on `.tabs` + `data-drag` per tab.
6. Drag handle icon (`.drag-handle`) so activating the tab body still works.
7. Horizontal scroll: `overflow-x-auto flex-nowrap` + `shrink-0` per tab; `+` adjacent inside scroll container.
8. Close logic tied to `activeTabId` (activates `tabs[0]` when active closed).

## What is deliberately NOT done
- The existing `data-signal="{ tabs: [...] }"` block: unchanged (no `activeTabId`, no `pinned` field added; `checked` retained but unused by new logic).
- The drawer `data-signal` (line 1): unchanged.
- Emblem `href` line: left as-is per earlier instruction.

## Existing-signal diff guarantee
After this change, a `git diff` of layout.html must show the line
`data-signal="{` for the tabs block identical to HEAD except the surrounding new
wrapper. Verify: the `tabs: [...]` object literal is byte-for-byte the same.

## Validation (manual, browser)
- Tabs render; Home active on load (visible `border-b` 1px + `text-primary`).
- Click switches active; content panel follows.
- Drag reorders; swap on overlap; content follows reorder.
- Horizontal scroll when overflow; `+` adjacent to last tab.
- Close removes tab; Home close hidden via `pinned`; closing active activates `tabs[0]`.
- REGRESSION: sidebar collapse / hover / dock tab switching still work (signals untouched).
