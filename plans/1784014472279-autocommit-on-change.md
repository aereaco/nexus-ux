# Plan: serve.ts — `--autocommit` + `--watch` (granular flags)

## Goal
Extend `scripts/serve.ts` (static server) so a single `Deno.watchFs` watcher, gated
by granular flags, drives on file save:
  - `--watch`      : live-reload connected browsers via WebSocket.
  - `--autocommit` : auto-commit changed file(s) to the LOCAL git repo (message names file(s)).
Flags are independent. Both share one watcher; the flush skips any disabled half.
No remote push. No new dependencies (Deno std only).

## Current `scripts/serve.ts` (preserve default behavior when no flags)
```ts
import { serveDir } from "https://deno.land/std@0.212.0/http/file_server.ts";
Deno.serve({ port: 8081 }, async (req) => {
  const res = await serveDir(req, { fsRoot: ".", showIndex: true });
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return res;
});
```

## Flag parsing (granular)
- Read `Deno.args`: `--autocommit`, `--watch`.
- `const AUTO = Deno.args.includes("--autocommit");`
- `const WATCH = Deno.args.includes("--watch");`
- If neither: server runs EXACTLY as today (no watcher, no injection).

## Watcher (only if AUTO || WATCH)
- `const watcher = Deno.watchFs(".", { recursive: true });`
- Debounce 750ms: buffer `event.paths` into a `Set<string>`; reset timer per event.
- On flush:
  - `paths = [...buffer].filter(p => !ignored(p))`
    - ignored: paths under `.git/`, `dist/`, `node_modules/`, or `=== 'deno.lock'`
  - if AUTO && paths.length:
    - `git add <each path>` (scoped, NOT `git add -A`)
    - msg = paths.length===1
        ? `${basename(paths[0])}: auto-snapshot`
        : `${paths.map(basename).join(', ')}: auto-snapshot (${paths.length} files)`
    - `git commit -m <msg>` (no-op if nothing staged)
  - if WATCH: broadcast `{type:'reload'}` to all WS clients.

## Live-reload (WebSocket) — only if WATCH
- WS endpoint at `/__reload`. On upgrade: add socket to `Set<WebSocket>`; on close: delete.
- Injected client (only when WATCH): tiny `<script>` before `</body>` of HTML
  responses that does:
  `new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/__reload')
   .onmessage = () => location.reload();`
- Injection method: wrap `serveDir` — read response body text, `replace('</body>', script+'</body>')`,
  return new `Response` with same status/headers (content-type stays text/html).
- Server routes `/__reload` to the WS upgrade; all other paths go to `serveDir`.

## `deno.json` task
- `serve` task unchanged (still plain `std/file_server.ts` on :8123 — DO NOT touch).
- `scripts/serve.ts` is the :8081 server; usage: `deno run -A scripts/serve.ts --watch --autocommit`
  (or wire a task: `"serve:dev": "deno run -A scripts/serve.ts --watch --autocommit"`).

## Multi-file / burst (locked)
`Deno.watchFs` -> `FsEvent { kind, paths: string[] }`. Burst buffered into Set during
750ms -> ONE commit listing all files; ONE reload broadcast.

## Ignore / scope (locked)
Ignore `.git`, `dist`, `node_modules`, `deno.lock`. Scoped `git add <paths>`. No push.

## Edge cases
- `--autocommit` only: commits happen, no browser reload, no script injected.
- `--watch` only: browsers reload, no commits.
- Both: commit + reload together.
- Rapid saves: debounce prevents commit-per-keystroke and reload-storm.
- WS client disconnects mid-session: removed from Set; others still reload.
- HTML injection must not double-inject if serveDir already returned modified body.

## Out of scope
- Remote push (manual `git push` stays user's call).
- Changing `deno.json` `serve` task or `scripts/serve.ts` default port/behavior.
- Tab-bar restore (separate plan: restore-tabs-ui-advances.md).

## Validation
- `deno run -A scripts/serve.ts` (no flags): server only; edit file -> NO commit, NO reload.
- `--autocommit` only: edit one file -> commit `layout.html: auto-snapshot`; browser stays.
- `--watch` only (2 tabs open): edit file -> both tabs reload; no git commit.
- `--watch --autocommit`: edit file -> commit AND both tabs reload.
- Edit two files together -> ONE commit listing both; ONE reload.
- Unrelated dirty files NOT swept into commit (scoped add).
- `.git/`,`dist/`,`node_modules/` changes: NO commits, NO reload loop.
- Ctrl-C: clean exit; no orphan process; confirm NO push occurred.
