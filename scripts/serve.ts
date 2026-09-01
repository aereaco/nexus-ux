import { serveDir } from "https://deno.land/std@0.212.0/http/file_server.ts";
import { join, resolve } from "https://deno.land/std@0.212.0/path/mod.ts";
import { generateManifest } from "./git/manifest.ts";

export type ServerMode = "csr" | "island" | "ssr" | "progressive";

// 1. CLI Arguments & Mode Parsing
function parseArgs() {
  const args = Deno.args;
  let mode: ServerMode | null = null;
  let port = 8081;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mode" && args[i + 1]) {
      mode = args[++i].toLowerCase() as ServerMode;
    } else if (arg.startsWith("--mode=")) {
      mode = arg.split("=")[1].toLowerCase() as ServerMode;
    } else if (arg === "--port" && args[i + 1]) {
      port = parseInt(args[++i], 10) || 8081;
    } else if (arg.startsWith("--port=")) {
      port = parseInt(arg.split("=")[1], 10) || 8081;
    }
  }

  const isDevAuto = args.includes("--dev:auto");
  const isDev = args.includes("--dev") || isDevAuto;
  const isWatch = args.includes("--watch") || isDev;
  const isAutocommit = isDevAuto || args.includes("--autocommit");
  const isBuild = args.includes("--build") || isDev;

  return { mode, port, isDev, isDevAuto, isWatch, isAutocommit, isBuild };
}

const config = parseArgs();

// 2. Help Guide if run without a mode (e.g. `deno task serve`)
function printHelpGuide() {
  console.log(`
\x1b[1m\x1b[36mNexus-UX Multi-Mode Server Engine\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  deno task serve:<mode> [flags]
  deno run -A scripts/serve.ts --mode <mode> [flags]

\x1b[1mAVAILABLE MODES:\x1b[0m
  \x1b[32mserve:csr\x1b[0m          Pure Client-Side Rendering (SPA shell fallback)
  \x1b[32mserve:island\x1b[0m       Islands Architecture (SSR static layout + isolated interactive island hydration)
  \x1b[32mserve:ssr\x1b[0m          Full Server-Side Rendering (complete pre-assembled DOM tree)
  \x1b[32mserve:progressive\x1b[0m  Progressive / Universal Hydration (SSR on cold hit, CSR for in-app navigation)

\x1b[1mMODIFIER FLAGS:\x1b[0m
  \x1b[33m--watch\x1b[0m            Live-reload watcher on src/ & site/ with WebSocket client injection
  \x1b[33m--dev\x1b[0m              Watch mode + auto-build dist/ on source edits (no autocommit)
  \x1b[33m--dev:auto\x1b[0m         Watch mode + auto-build + automatic git snapshot commits
  \x1b[33m--port <number>\x1b[0m    Specify custom port (default: 8081)

\x1b[1mEXAMPLES:\x1b[0m
  deno task serve:csr
  deno task serve:progressive --dev
  deno task serve:island --watch
  deno task serve:ssr --dev:auto --port 8080
`);
}

if (!config.mode) {
  printHelpGuide();
  Deno.exit(0);
}

const validModes: ServerMode[] = ["csr", "island", "ssr", "progressive"];
if (!validModes.includes(config.mode)) {
  console.error(`\x1b[31mError: Unknown mode "${config.mode}". Valid modes: ${validModes.join(", ")}\x1b[0m`);
  printHelpGuide();
  Deno.exit(1);
}

// 3. Strict Path Resolution — All contents served strictly from /site and /dist
const REPO_ROOT = Deno.cwd();
const SITE_DIR = resolve(REPO_ROOT, "site");
const DIST_DIR = resolve(REPO_ROOT, "dist");
const DEBOUNCE_MS = 750;

const IGNORE_PATTERNS = [
  "/.git/",
  "/.agent/",
  "/.gemini/",
  "/.logs/",
  "/.chats/",
  "/.kilo/",
  "/.system_generated/",
  "/brain/",
  "/plans/",
  "/scratch/",
  "/.vscode/",
  "/.idea/",
  "deno.lock",
  ".log"
];

function isIgnored(path: string): boolean {
  const norm = path.replace(/\\/g, "/");
  return IGNORE_PATTERNS.some((p) => norm.includes(p) || norm.endsWith(p));
}

// 4. Live-reload (WebSocket)
const clients = new Set<WebSocket>();

function broadcastReload() {
  for (const sock of clients) {
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(JSON.stringify({ type: "reload" }));
    }
  }
}

const RELOAD_CLIENT = `<script>(function(){var p=location.protocol==='https:'?'wss://':'ws://';var s=new WebSocket(p+location.host+'/__reload');s.onmessage=function(){try{sessionStorage.clear();}catch(e){}location.reload();};})();</script>`;

function injectReload(bodyText: string): string {
  if (bodyText.includes("/__reload")) return bodyText;
  return bodyText.replace("</body>", `${RELOAD_CLIENT}</body>`);
}

// 5. Template Extractors & Mode Renderers
function extractHeadMetadata(htmlText: string): { title?: string; icon?: string; route?: string; order?: string } {
  const meta: { title?: string; icon?: string; route?: string; order?: string } = {};
  const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();

  const iconMatch = htmlText.match(/<meta[^>]+name=["']icon["'][^>]+content=["']([^"']+)["']/i) ||
                    htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']icon["']/i);
  if (iconMatch) meta.icon = iconMatch[1].trim();

  const routeMatch = htmlText.match(/<meta[^>]+name=["']route["'][^>]+content=["']([^"']+)["']/i) ||
                     htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']route["']/i);
  if (routeMatch) meta.route = routeMatch[1].trim();

  const orderMatch = htmlText.match(/<meta[^>]+name=["']order["'][^>]+content=["']([^"']+)["']/i) ||
                     htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']order["']/i);
  if (orderMatch) meta.order = orderMatch[1].trim();

  return meta;
}

function resolvePageFile(cleanPath: string): { fileName: string; filePath: string } {
  const clean = cleanPath.replace(/^\/+/, "");
  if (clean === "" || clean === "home") {
    return { fileName: "home.html", filePath: join(SITE_DIR, "_pages", "home.html") };
  }
  const exactPath = join(SITE_DIR, "_pages", `${clean}.html`);
  try {
    if (Deno.statSync(exactPath).isFile) return { fileName: `${clean}.html`, filePath: exactPath };
  } catch { /* fallback */ }

  const leaf = clean.split("/").pop() || clean;
  const leafPath = join(SITE_DIR, "_pages", `${leaf}.html`);
  return { fileName: `${leaf}.html`, filePath: leafPath };
}

async function renderProgressive(cleanPath: string): Promise<string> {
  const shellPath = join(SITE_DIR, "index.html");
  let shell = await Deno.readTextFile(shellPath);

  const { filePath } = resolvePageFile(cleanPath);

  try {
    const pageHtml = await Deno.readTextFile(filePath);
    const meta = extractHeadMetadata(pageHtml);

    if (meta.title) {
      shell = shell.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title} - Nexus UX</title>`);
    }
  } catch {
    // Page file does not exist on disk, serve base shell
  }

  return shell;
}

async function renderSSR(cleanPath: string): Promise<string> {
  const shellPath = join(SITE_DIR, "index.html");
  let shell = await Deno.readTextFile(shellPath);

  const { fileName: pageFileName, filePath: pagePath } = resolvePageFile(cleanPath);
  const layoutPath = join(SITE_DIR, "_components", "layout.html");

  try {
    const pageHtml = await Deno.readTextFile(pagePath);
    const layoutHtml = await Deno.readTextFile(layoutPath);
    const meta = extractHeadMetadata(pageHtml);

    if (meta.title) {
      shell = shell.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title} - Nexus UX</title>`);
    }

    // Embed pre-assembled layout and initial page content directly inside <app-layout>
    const prebuiltLayout = layoutHtml.replace(
      /<tab-content\s+data-component="tab\.source\s*\|\|\s*tab\.content"[^>]*><\/tab-content>/i,
      `<tab-content data-component="'_pages/${pageFileName}'">${pageHtml}</tab-content>`
    );

    shell = shell.replace(
      /<app-layout\s+data-component="'_components\/layout\.html'"><\/app-layout>/i,
      `<app-layout data-component="'_components/layout.html'">${prebuiltLayout}</app-layout>`
    );
  } catch {
    // Fallback to standard progressive shell on missing component
    return renderProgressive(cleanPath);
  }

  return shell;
}

async function renderIsland(cleanPath: string): Promise<string> {
  const shellPath = join(SITE_DIR, "index.html");
  let shell = await Deno.readTextFile(shellPath);

  const { filePath: pagePath } = resolvePageFile(cleanPath);

  try {
    const pageHtml = await Deno.readTextFile(pagePath);
    const meta = extractHeadMetadata(pageHtml);

    if (meta.title) {
      shell = shell.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title} - Nexus UX</title>`);
    }

    // Tag island markers for selective client hydration
    shell = shell.replace(
      /<app-layout\s+data-component="'_components\/layout\.html'"><\/app-layout>/i,
      `<app-layout data-island="layout" data-component="'_components/layout.html'"></app-layout>`
    );
  } catch {
    // Fallback to base shell
  }

  return shell;
}

// 6. Request Router & Handler
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Live-reload WebSocket endpoint
  if (config.isWatch && url.pathname === "/__reload") {
    if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    clients.add(socket);
    socket.onclose = () => clients.delete(socket);
    socket.onerror = () => clients.delete(socket);
    return response;
  }

  // A. Distribution Bundles (/dist/*) -> Served strictly from REPO_ROOT/dist
  if (url.pathname.startsWith("/dist/")) {
    const distReq = new Request(new URL(url.pathname.replace(/^\/dist\//, "/"), url.origin), req);
    const distRes = await serveDir(distReq, { fsRoot: DIST_DIR, quiet: true });
    distRes.headers.set("Cache-Control", config.isDev ? "no-cache" : "public, max-age=31536000, immutable");
    distRes.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    distRes.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    return distRes;
  }

  // B. Static Files & Component Fragments in /site
  const hasExtension = url.pathname.includes(".");
  if (hasExtension) {
    const staticRes = await serveDir(req, { fsRoot: SITE_DIR, quiet: true });
    if (staticRes.status !== 404) {
      staticRes.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      staticRes.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      return staticRes;
    }
    return new Response("404 Not Found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  // C. Route Rendering according to active mode
  let responseHtml = "";
  const cleanPath = url.pathname;

  switch (config.mode) {
    case "ssr":
      responseHtml = await renderSSR(cleanPath);
      break;
    case "island":
      responseHtml = await renderIsland(cleanPath);
      break;
    case "progressive":
      responseHtml = await renderProgressive(cleanPath);
      break;
    case "csr":
    default: {
      const shellPath = join(SITE_DIR, "index.html");
      responseHtml = await Deno.readTextFile(shellPath);
      break;
    }
  }

  if (config.isWatch) {
    responseHtml = injectReload(responseHtml);
  }

  return new Response(responseHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": config.isDev ? "no-cache" : "public, max-age=0, must-revalidate",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  });
}

// 7. Auto-Build and Git Watcher
function runBuild() {
  try {
    const p = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", "scripts/build.ts", "--minify"],
      stdout: "null",
      stderr: "inherit"
    });
    p.outputSync();
    console.log(`[serve] build: dist updated`);
  } catch (err) {
    console.error(`[serve] build failed:`, err);
  }
}

function gitCommit(paths: string[]) {
  try {
    new Deno.Command("git", { args: ["add", "dist/", ...paths] }).outputSync();
    const msg = `auto-snapshot (${paths.length} file(s) updated)`;
    new Deno.Command("git", { args: ["commit", "-m", msg] }).outputSync();
    console.log(`[serve] committed snapshot: ${msg}`);
  } catch (_) {
    // Silent recovery on commit failure
  }
}

function startWatcher() {
  const watchDirs = [join(REPO_ROOT, "src"), join(REPO_ROOT, "site")];
  const watcher = Deno.watchFs(watchDirs, { recursive: true });
  const buffer = new Set<string>();
  let timer: number | undefined;

  const flush = () => {
    timer = undefined;
    const paths = [...buffer].filter((p) => !isIgnored(p));
    buffer.clear();
    if (paths.length === 0) return;

    console.log(`[serve] detected changes in ${paths.length} file(s)`);
    if (config.isBuild) runBuild();
    if (config.isAutocommit) gitCommit(paths);
    if (config.isWatch) broadcastReload();
  };

  (async () => {
    for await (const event of watcher) {
      for (const p of event.paths) {
        if (!isIgnored(p)) buffer.add(p);
      }
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    }
  })();
}

// 8. Start Server
console.log(`
\x1b[1m\x1b[32m[Nexus Server]\x1b[0m Mode: \x1b[1m\x1b[36m${config.mode.toUpperCase()}\x1b[0m
\x1b[1m[Nexus Server]\x1b[0m Root: \x1b[33m${SITE_DIR}\x1b[0m
\x1b[1m[Nexus Server]\x1b[0m Dist: \x1b[33m${DIST_DIR}\x1b[0m
\x1b[1m[Nexus Server]\x1b[0m URL:  \x1b[34mhttp://localhost:${config.port}\x1b[0m
\x1b[1m[Nexus Server]\x1b[0m Watch: \x1b[35m${config.isWatch}\x1b[0m | Build: \x1b[35m${config.isBuild}\x1b[0m | Autocommit: \x1b[35m${config.isAutocommit}\x1b[0m
`);

if (config.isWatch) {
  startWatcher();
}

Deno.serve({ port: config.port }, handler);
