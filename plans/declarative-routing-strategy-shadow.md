# Declarative Routing Strategy + Shadow Internal Routing

## Goal
Make the Nexus-UX router strategy **declarative and signal-driven** instead of buried in
imperative `cfg` parsing, expose an intuitive user-facing API surface, and add **shadow
internal** routing (files the app can render but are never advertised to the client).

## Decisions (locked with user)
- Extend the existing `data-router="{ ... }"` object (do NOT add a separate `$router.config` signal).
- Shadow = **router-only resolution**: shadow files load via the router's existing `data-component`
  fetch path but are never listed in any public manifest and only resolve through the router.
  No server-side enforcement change (per `serveDir` staying untouched).
- Scope: router module + spec/reference docs together.

## API Surface

### data-router object (extended)
```html
<html data-router="{
  mode: 'hybrid',          // existing: signal | static | hybrid
  default: '/home',        // existing: redirect base path
  basePath: '/site/',      // existing override
  manifest: '/routes.json',// NEW: static auto/manifest source (build- or user-served)
  dynamic: true,           // NEW: dynamic manifest — scan served dirs at runtime
  shadow: '/_internal/**', // NEW: shadow route glob(s) — browsable, never client-served
  notFound: '/404.html'    // NEW: override 404 component
}">
```

### New $router members
- `$router.config` — reactive snapshot of the parsed strategy object (read-only view; changes
  re-trigger a soft re-init of resolution, no DOM teardown).
- `$router.manifest` — the resolved route manifest (from `manifest` file, `dynamic` scan, and/or
  declared `data-route` elements merged).
- `$router.isActive(path, exact?)` — reactive active check (today it's a method; keep method, also
  expose reactive-friendly).
- `$router.match(path?)` — returns the RouteInfo that *would* match a given path (default: current).
- `$router.go(target, opts?)` — intuitive navigate: accepts a name (→ navigateByName) or a path
  (→ navigate). `opts` = `{ replace, tabId, title, icon }`.

### Route declaration additions (data-route)
- `data-route-shadow` — boolean. Marks the route (and its `data-component` file) as shadow-internal:
  resolved/rendered by the router, excluded from `$router.manifest` public listing, and never
  produced as a navigable link target by auto-manifest helpers.

## Implementation

### 1. `src/modules/attributes/router.ts`
- Parse new `cfg` keys: `manifest`, `dynamic`, `shadow`, `notFound`.
- Add `state.config = { mode, default, basePath, manifest, dynamic, shadow, notFound }`.
- Add `state.manifest: RouteRecord[]` (merged: declared `data-route` + manifest file + dynamic scan).
- `shadowMatch(path)` — test a path against the `shadow` glob(s); used by manifest builder to
  exclude shadow routes from `$router.manifest` and by `resolveStaticComponent` to allow shadow
  resolution even though the file isn't "public".
- `buildManifest()`:
  - Include all declared `data-route` routes (respecting `data-route-shadow` → tag `internal: true`
    and exclude from public `manifest` array unless debug).
  - If `cfg.manifest`: `runtime.fetch` the JSON, merge its entries (tag `source: 'manifest'`).
  - If `cfg.dynamic`: the router requests the served directory listing via a designated manifest
    endpoint (the framework provides `/__nexus/manifest` that `serveDir` already can serve as a
    directory index; we read `index.json`/directory entries). For now, dynamic scan reads a
    sibling `<dir>/manifest.json` produced by the build or listed by the server.
- Expose `state.config`, `state.manifest`, `state.match`, `state.go`.
- `addRoute`/`removeRoute`: keep pushing to `routeList`; also refresh `state.manifest`.
- Keep `$router.route`/`outlet`/per-tab history exactly as-is (already working).

### 2. `src/modules/attributes/route.ts`
- Read `data-route-shadow`; pass `internal: !!shadowAttr` into `RouteRecord` passed to `addRoute`.

### 3. `src/modules/attributes/router.ts` — shadow resolution
- `resolveStaticComponent` and the manifest merge consult `shadowMatch` so a shadow path
  (`/_internal/...`) resolves to its component via the router's internal fetch, but is excluded
  from `$router.manifest` public entries. This satisfies "browses files but stops files from being
  served to the client" at the routing layer (no manifest => client has no discoverable URL; the
  actual fetch still works because `data-component` uses `runtime.fetch`).

### 4. Docs
- `docs/nexus-ux-spec.md` §3.6.8 / §9.1 / §9.2: document `data-router` new keys, `$router.config`,
  `$router.manifest`, `$router.match`, `$router.go`, and `data-route-shadow` (shadow internal routing).
- `docs/nexus-ux-reference.md` §9: add the new config keys table, the new signal members, and a
  "Shadow Internal Routing" subsection.

## Verification
- `deno task build --minify` (src/ edited).
- Create a demo route marked `data-route-shadow` and a `/_internal/...` file; confirm it renders via
  the outlet but does NOT appear in `$router.manifest`.
- Confirm `$router.go('/name' or '/path')`, `$router.config`, `$router.match()` behave as documented.
- No regressions to existing hybrid/static navigation, per-tab history, or `data-component` rendering.

## Out of scope (this pass)
- Server-enforced blocking of shadow paths in `serve.ts` (user chose router-only).
- Pinned-tab persistence / favorites UI (separate session work).
- Rebuild of the in-progress panel-swap (`outletContent`) fix — keep current approach intact.
