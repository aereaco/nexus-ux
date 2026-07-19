import { serveDir } from "https://deno.land/std@0.212.0/http/file_server.ts";

const AUTO = Deno.args.includes("--autocommit");
const WATCH = Deno.args.includes("--watch");
const BUILD = Deno.args.includes("--build") || AUTO;
const ENABLED = AUTO || WATCH;

const PORT = 8081;
const IGNORE = [".git/", "dist/", "node_modules/", "deno.lock"];
const DEBOUNCE_MS = 750;

function isIgnored(path: string): boolean {
  let p = path.replace(/\\/g, "/").replace(/^\.\//, "");
  const cwd = Deno.cwd().replace(/\\/g, "/").replace(/\/$/, "");
  if (p.startsWith(cwd + "/")) p = p.slice(cwd.length + 1);
  return IGNORE.some((prefix) => p === prefix || p.startsWith(prefix)) || p.includes("/.git/") || p === ".git";
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

  const res = await serveDir(req, { fsRoot: ".", showIndex: true });
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  if (WATCH && req.headers.get("accept")?.includes("text/html")) {
    return injectReload(res);
  }
  return res;
}

// ---- Git auto-commit ----

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
  const cwd = Deno.cwd().replace(/\\/g, "/").replace(/\/$/, "");
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

  // Rebuild the bundle when source changed, then fold dist/ into this commit
  // so the artifact never drifts from the source that produced it.
  if (needsBuild(staged)) runBuild();
  const toCommit = BUILD && needsBuild(staged) ? [...staged, "dist/"] : staged;

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

Deno.serve({ port: PORT }, handler);
