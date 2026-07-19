import { serveDir } from "https://deno.land/std@0.212.0/http/file_server.ts";

const AUTO = Deno.args.includes("--autocommit");
const WATCH = Deno.args.includes("--watch");
const BUILD = Deno.args.includes("--build") || AUTO;
const ENABLED = AUTO || WATCH;

const PORT = 8081;
// Paths ignored for auto-commit/watching. `dist/` and `node_modules/`
// are only ignored when they actually live UNDER the served root — when
// the server is rooted at /site/ those dirs are siblings, not children,
// so the bundle + deps must still be served.
const IGNORE_ALWAYS = [".git/", "deno.lock"];
const IGNORE_UNDER_ROOT = ["dist/", "node_modules/"];
const DEBOUNCE_MS = 750;

// Root-aware serving. The server serves whatever directory it is started in
// (Deno.cwd()). This lets the SAME script work whether it is launched from
// the repo root (/nexus-ux) OR directly from the app dir (/nexus-ux/site).
// An explicit --root <dir> overrides cwd for both the file root and the SPA
// fallback. With a relative <base href="./"> (or "/") the whole app — shell,
// assets, and component fetches — resolves correctly against the chosen root.
function resolveRoot(): string {
  const flag = Deno.args.find((a) => a.startsWith("--root"));
  if (flag) {
    const val = flag.includes("=") ? flag.split("=")[1] : null;
    if (val) return val;
  }
  const i = Deno.args.indexOf("--root");
  if (i > -1 && Deno.args[i + 1]) return Deno.args[i + 1];
  return Deno.cwd();
}

// The directory we actually serve documents from. The app lives under /site/,
// so if the server is launched from the REPO root we transparently serve the
// /site/ subdirectory as the document root. This keeps relative <base href="./">
// resolving to _components/, _pages/ and _assets/ correctly no matter where the
// process starts, and means a clean URL like / renders the shell.
function resolveServeRoot(raw: string): string {
  const r = raw.replace(/\\/g, "/").replace(/\/$/, "");
  if (r.endsWith("/site")) return raw;
  // Repo root (or anywhere NOT already /site): serve the bundled /site dir.
  const candidate = r + "/site";
  try {
    if (Deno.statSync(candidate).isDirectory) return candidate;
  } catch { /* not present — serve raw */ }
  return raw;
}

const ROOT = resolveServeRoot(resolveRoot());
// ROOT is always the /site directory (resolved above), so the shell is /index.html.
const SHELL = "/index.html";

function isIgnored(path: string): boolean {
  let p = path.replace(/\\/g, "/").replace(/^\.\//, "");
  const cwd = ROOT.replace(/\\/g, "/").replace(/\/$/, "");
  if (p.startsWith(cwd + "/")) p = p.slice(cwd.length + 1);
  if (IGNORE_ALWAYS.some((prefix) => p === prefix || p.startsWith(prefix))) return true;
  if (p.includes("/.git/") || p === ".git") return true;
  return IGNORE_UNDER_ROOT.some((prefix) => p === prefix || p.startsWith(prefix));
}

function basename(path: string): string {
  const p = path.replace(/\\/g, "/");
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

// ---- Live-reload (WebSocket) ----
const clients = new Set<WebSocket>();

function broadcastReload() {
  for (const sock of clients) {
    if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "reload" }));
  }
}

// The document base. ROOT is always the /site directory (see resolveServeRoot),
// so the app's _components/, _pages/, _assets/ and dist/ are served directly
// under /. A single <base href="/"> keeps every relative fetch resolving to
// the right place whether the process was launched from the repo or /site/.
const BASE_HREF = "/";

// Stamp the served document's <base href> to match the active root so the
// same index.html works whether the server is rooted at the repo or /site/.
async function rewriteBase(res: Response): Promise<Response> {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return res;
  const body = await res.text();
  const next = body.replace(/<base\s+[^>]*href="[^"]*"[^>]*>/i, `<base href="${BASE_HREF}">`);
  return new Response(next, { status: res.status, headers: res.headers });
}

const RELOAD_CLIENT = `<script>(function(){var p=location.protocol==='https:'?'wss://':'ws://';var s=new WebSocket(p+location.host+'/__reload');s.onmessage=function(){location.reload();};})();</script>`;

async function injectReload(res: Response): Promise<Response> {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return res;
  const body = await res.text();
  if (body.includes("/__reload")) return res; // already injected
  const next = body.replace("</body>", `${RELOAD_CLIENT}</body>`);
  return new Response(next, {
    status: res.status,
    headers: res.headers,
  });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (WATCH && url.pathname === "/__reload") {
    if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = () => clients.add(socket);
    socket.onclose = () => clients.delete(socket);
    socket.onerror = () => clients.delete(socket);
    return response;
  }

  const res = await serveDir(req, { fsRoot: ROOT, showIndex: true });

  // SPA history-API fallback: a clean route (e.g. /profile) requested directly
  // from the address bar has no matching file on disk, so serveDir 404s. The
  // client router (data-router, hybrid mode) reads location.pathname on boot and
  // renders the matching route — but only if the shell is actually delivered.
  // Fall back to the SPA entry point (relative to the served ROOT) for
  // extension-less paths that 404, while leaving genuine missing assets
  // (files with extensions) to 404 as usual.
  if (res.status === 404 && !url.pathname.includes(".")) {
    const shell = await serveDir(new Request(new URL(SHELL, url.origin)), { fsRoot: ROOT });
    shell.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    shell.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    const based = await rewriteBase(shell);
    if (WATCH && req.headers.get("accept")?.includes("text/html")) {
      return injectReload(based);
    }
    return based;
  }

  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  const based = await rewriteBase(res);
  if (WATCH && req.headers.get("accept")?.includes("text/html")) {
    return injectReload(based);
  }
  return based;
}

// ---- Git auto-commit ----

// Files changed between the previous run and this restart (e.g. an edit to
// scripts/serve.ts made just before the server was restarted) won't be seen by
// the live watcher — the old process was killed before its debounce flushed and
// the new one starts with the file already modified. Commit any pre-existing
// working-tree changes at startup so nothing is ever stranded.
function commitPendingStartup() {
  if (!AUTO) return;
  const out = gitOut(["status", "--porcelain=v1", "-z"]);
  if (!out) return;
  const paths = out.split("\0")
    .filter((e) => e.length > 0)
    .map((e) => e.slice(3)) // drop "XY " status prefix
    .filter((p) => !isIgnored(p));
  if (paths.length > 0) gitCommit(paths);
}

// Run git and return combined stdout; empty string on failure.
function gitOut(args: string[]): string {
  try {
    const r = new Deno.Command("git", { args }).outputSync();
    return new TextDecoder().decode(r.stdout).trim();
  } catch {
    return "";
  }
}

// A change to the framework source (or its build inputs) requires a fresh
// bundle so the served `dist/` stays in lockstep with `src/`.
function needsBuild(paths: string[]): boolean {
  const cwd = ROOT.replace(/\\/g, "/").replace(/\/$/, "");
  return paths.some((p) => {
    let f = p.replace(/\\/g, "/").replace(/^\.\//, "");
    if (f.startsWith(cwd + "/")) f = f.slice(cwd.length + 1);
    return f.startsWith("src/") || f === "deno.json" || f === "scripts/build.ts";
  });
}

// Rebuild the minified payload so src/ edits are reflected in dist/.
function runBuild() {
  if (!BUILD) return;
  try {
    new Deno.Command("deno", { args: ["task", "build", "--minify"] }).outputSync();
  } catch (e) {
    console.error("[serve] build failed:", e);
  }
}

// Infer a short, human-readable category for the change from the file path and
// a peek at the staged diff hunks (offline / deterministic — no external calls).
function classify(file: string, diff: string): string {
  const f = file.toLowerCase();
  if (diff.includes("suppressNavIntercept") || diff.includes("navigate") || diff.includes("tabPaths") || diff.includes("history.")) {
    return "routing";
  }
  if (f.endsWith("signal.ts") || diff.includes("cloneValue") || diff.includes("lastEvaluatedState") || diff.includes("reactive")) {
    return "reactivity";
  }
  if (f.endsWith("layout.html") || f.endsWith("index.html") || f.includes("/_components/")) {
    return "layout/UI";
  }
  if (f.endsWith("component.ts") || f.endsWith("if.ts") || f.endsWith("for.ts")) {
    return "directive";
  }
  if (f.includes("listener") || f.endsWith("linkRewriter.ts")) {
    return "listener";
  }
  if (f.endsWith(".md")) return "docs";
  if (f.endsWith(".css") || f.endsWith(".js") || f.endsWith(".ts")) return "code";
  return "misc";
}

function gitCommit(paths: string[]) {
  const staged = paths.filter((p) => !p.includes("/.git/") && !p.endsWith("/.git") && p !== ".git");
  if (staged.length === 0) return;

  // Rebuild the bundle when source changed, then fold the regenerated bundle
  // into this commit so the artifact never drifts from the source that
  // produced it. Only the compiled outputs are tracked (the .br brotli variant
  // stays ignored as a build-of-a-build artifact).
  if (needsBuild(staged)) runBuild();
  const toCommit = BUILD && needsBuild(staged)
    ? [...staged, "dist/nexus-ux.js", "dist/nexus-ux.min.js", "dist/manifest.json"]
    : staged;

  const add = new Deno.Command("git", { args: ["add", ...toCommit] });
  add.outputSync();

  // Inspect the staged diff to infer a useful message.
  const diffAll = gitOut(["diff", "--staged", "--stat", ...staged]);
  const cats = new Set<string>();
  const detail: string[] = [];
  for (const f of staged) {
    const d = gitOut(["diff", "--staged", f]);
    const cat = classify(f, d);
    cats.add(cat);
    const adds = (d.match(/^\+(?!\+\+)/gm) ?? []).length;
    const dels = (d.match(/^-(?!--)/gm) ?? []).length;
    detail.push(`- ${basename(f)} (${cat}: +${adds}/-${dels})`);
  }

  // Subject: category-prefixed snapshot when homogeneous, else "auto-snapshot".
  let subject: string;
  if (staged.length === 1) {
    const f = staged[0];
    subject = `${basename(f)}: ${[...cats][0]} auto-snapshot`;
  } else if (cats.size === 1) {
    subject = `chore(${[...cats][0]}): auto-snapshot (${staged.length} files)`;
  } else {
    subject = `auto-snapshot (${staged.length} files: ${[...cats].join(", ")})`;
  }

  const body = detail.join("\n");
  const msg = body ? `${subject}\n\n${body}` : subject;

  const commit = new Deno.Command("git", { args: ["commit", "-m", msg] });
  commit.outputSync();
}

function startWatcher() {
  const watcher = Deno.watchFs(".", { recursive: true });
  const buffer = new Set<string>();
  let timer: number | undefined;

  const flush = () => {
    timer = undefined;
    const paths = [...buffer].filter((p) => !isIgnored(p));
    buffer.clear();
    if (paths.length === 0) return;
    if (AUTO) gitCommit(paths);
    if (WATCH) broadcastReload();
  };

  (async () => {
    for await (const event of watcher) {
      for (const p of event.paths) buffer.add(p);
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    }
  })();
}

if (ENABLED) {
  startWatcher();
  console.log(`[serve] watch mode on | autocommit=${AUTO} reload=${WATCH} build=${BUILD}`);
}

// Capture any working-tree changes that predate this process (typically edits to
// serve.ts itself made just before a restart) before the server begins serving.
commitPendingStartup();

Deno.serve({ port: PORT }, handler);
