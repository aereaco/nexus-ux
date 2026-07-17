import { serveDir } from "https://deno.land/std@0.212.0/http/file_server.ts";

const AUTO = Deno.args.includes("--autocommit");
const WATCH = Deno.args.includes("--watch");
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
function gitCommit(paths: string[]) {
  const staged = paths.filter((p) => !p.includes("/.git/") && !p.endsWith("/.git") && p !== ".git");
  if (staged.length === 0) return;
  const add = new Deno.Command("git", { args: ["add", ...staged] });
  add.outputSync();
  const msg = staged.length === 1
    ? `${basename(staged[0])}: auto-snapshot`
    : `${staged.map(basename).join(", ")}: auto-snapshot (${staged.length} files)`;
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
  console.log(`[serve] watch mode on | autocommit=${AUTO} reload=${WATCH}`);
}

Deno.serve({ port: PORT }, handler);
