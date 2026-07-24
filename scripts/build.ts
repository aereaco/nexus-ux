import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";
import * as path from "std/path";
import { minify as swcMinify } from "@swc/core";
import { compress } from "brotli";
import { walk } from "https://deno.land/std@0.212.0/fs/walk.ts";
import { join as _joinPath } from "https://deno.land/std@0.224.0/path/mod.ts";
import { parseArgs as _parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

// esbuild-deno-loader has a Windows path bug: it produces backslash paths
// like "\Users\verno\..." instead of "C:\Users\verno\..." or file:// URLs.
// This pre-resolve plugin fixes them before esbuild processes them.
function fixWindowsPathsPlugin(): esbuild.Plugin {
  return {
    name: "fix-windows-paths",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (!args.path.includes("\\")) return undefined;
        const fixed = args.path.replace(/\\/g, "/");
        let url: string;
        if (fixed.startsWith("/") && fixed.length > 2 && fixed[2] === ":") {
          url = "file:///" + fixed;
        } else if (fixed.startsWith("//")) {
          url = "file:" + fixed;
        } else {
          url = fixed;
        }
        return {
          path: url,
          namespace: args.namespace,
        };
      });
    },
  };
}

const AUTO_INJECTED_SPRITES = ["el", "id", "global", "dispatch", "nextTick"];
const MIRROR_PROVIDED_SPRITES = ["fetch", "http", "download", "clipboard", "cache", "notification", "payment", "ws"];

interface BuildOptions {
  outputName?: string;
  excludeModules?: string[];
  gitRef?: string;
  minify?: boolean;
  appDir?: string;
}

async function collectFiles(dir: string, extensions: string[] = [".html", ".ts", ".js", ".md"]): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of walk(dir, { includeDirs: false })) {
    if (extensions.includes(path.extname(entry.name))) {
      files.push(entry.path);
    }
  }
  return files;
}

async function listModuleNames(dir: string): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".ts") && entry.name !== "index.ts") {
        names.push(entry.name.replace(".ts", ""));
      }
    }
  } catch { /* ignore */ }
  return names;
}

function analyzeFile(content: string): {
  attributeDirectives: Set<string>;
  spriteNames: Set<string>;
  modifiers: Set<string>;
  tailwindClasses: Set<string>;
} {
  const attributeDirectives = new Set<string>();
  const spriteNames = new Set<string>();
  const modifiers = new Set<string>();
  const tailwindClasses = new Set<string>();

  const attrRegex = /data-([a-z]+(?:[.:-][a-zA-Z0-9-]+)*)/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(content)) !== null) {
    const base = match[1].split(/[.:-]/)[0];
    if (base) attributeDirectives.add(base);
  }

  const exprRegex = /\$([a-zA-Z_$][\w$]*)/g;
  while ((match = exprRegex.exec(content)) !== null) {
    spriteNames.add(match[1]);
  }

  const classRegex = /(?:class|data-drag-class|data-drag-ghost-class)\s*=\s*["']([^"']+)["']/g;
  while ((match = classRegex.exec(content)) !== null) {
    for (const cls of match[1].split(/\s+/)) {
      let cleaned = cls.trim();
      if (cleaned.startsWith('!')) cleaned = cleaned.slice(1);
      if (
        cleaned &&
        !cleaned.includes("{") &&
        !cleaned.includes("}") &&
        !cleaned.includes("$") &&
        !cleaned.includes("?") &&
        !cleaned.includes("<") &&
        !cleaned.includes(">") &&
        !cleaned.includes("&") &&
        !cleaned.includes("=")
      ) {
        tailwindClasses.add(cleaned);
      }
    }
  }

  const modRegex = /:([a-zA-Z_$][\w$]*)(?:\([^)]*\))?/g;
  while ((match = modRegex.exec(content)) !== null) {
    modifiers.add(match[1]);
  }

  return { attributeDirectives, spriteNames, modifiers, tailwindClasses };
}

async function analyzeAppFiles(appDir: string): Promise<{
  attributeDirectives: Set<string>;
  spriteNames: Set<string>;
  modifiers: Set<string>;
  tailwindClasses: Set<string>;
  autoInjectedSprites: string[];
  mirrorProvidedSprites: string[];
}> {
  const absAppDir = path.resolve(Deno.cwd(), appDir);
  const files = await collectFiles(absAppDir);

  const attributeDirectives = new Set<string>();
  const spriteNames = new Set<string>();
  const modifiers = new Set<string>();
  const tailwindClasses = new Set<string>();

  for (const file of files) {
    try {
      const content = await Deno.readTextFile(file);
      const analysis = analyzeFile(content);
      analysis.attributeDirectives.forEach(d => attributeDirectives.add(d));
      analysis.spriteNames.forEach(s => spriteNames.add(s));
      analysis.modifiers.forEach(m => modifiers.add(m));
      analysis.tailwindClasses.forEach(c => tailwindClasses.add(c));
    } catch (e) {
      console.warn(`  Skipping ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    attributeDirectives,
    spriteNames,
    modifiers,
    tailwindClasses,
    autoInjectedSprites: Array.from(spriteNames).filter(s => AUTO_INJECTED_SPRITES.includes(s)),
    mirrorProvidedSprites: Array.from(spriteNames).filter(s => MIRROR_PROVIDED_SPRITES.includes(s)),
  };
}

async function buildBundle(options: BuildOptions = {}) {
  const { outputName = "nexus-ux", excludeModules = [], gitRef, minify = false, appDir } = options;

  let originalCwd = Deno.cwd();
  if (gitRef) {
    const result = await new Deno.Command("git", {
      args: ["rev-parse", "--verify", gitRef],
      cwd: originalCwd,
    }).output();
    if (!result.success) throw new Error(`Git ref '${gitRef}' not found`);
  }

  try {
    await Deno.mkdir("./dist", { recursive: true });

    const cwd = Deno.cwd();
    const outFile = path.resolve(cwd, "dist", `${outputName}.js`);
    const configPath = path.resolve(cwd, "deno.json");
    const manifestPath = path.resolve(cwd, "src", "manifest.ts");
    const manifestJsonPath = path.resolve(cwd, "dist", "manifest.json");

    let analysisResult: any = null;

    // AOT Style Layer Fetch — generates framework-specific constants
    // (PACKED_COMPONENTS, PACKED_KEYFRAMES). Theme/preflight CSS is
    // fetched at runtime from CDN so it never inflates the bundle.
    console.log("\n🎨 Generating AOT style layer constants...");
    const packedStyleLayers = await fetchStyleLayerPrimitives();

    if (appDir) {
      console.log(`\n🔍 Analyzing app: ${appDir}`);
      analysisResult = await analyzeAppFiles(appDir);
      console.log(`   Attributes: ${Array.from(analysisResult.attributeDirectives).join(", ")}`);
      console.log(`   Sprites: ${Array.from(analysisResult.spriteNames).join(", ")}`);
      console.log(`   Modifiers: ${Array.from(analysisResult.modifiers).join(", ")}`);
      console.log(`   Tailwind class count: ${analysisResult.tailwindClasses.size}`);
      console.log(`   Auto-injected sprites: ${analysisResult.autoInjectedSprites.join(", ") || "none"}`);
      console.log(`   Mirror-provided sprites: ${analysisResult.mirrorProvidedSprites.join(", ") || "none"}`);
    }

    const manifestLines = ["// AUTO-GENERATED", "import type { AttributeModule } from './engine/modules.ts';"];
    let counter = 0;
    const manifestJsonData: Record<string, any> = {
      attributes: [],
      sprites: [],
      scopes: [],
      modifiers: [],
      observers: [],
      listeners: [],
      // Include analysis data for app-specific builds
      ...(appDir && analysisResult ? {
        analysis: {
          attributeDirectives: Array.from(analysisResult.attributeDirectives),
          spriteNames: Array.from(analysisResult.spriteNames),
          modifiers: Array.from(analysisResult.modifiers),
          tailwindClassCount: analysisResult.tailwindClasses.size,
          autoInjectedSprites: analysisResult.autoInjectedSprites,
          mirrorProvidedSprites: analysisResult.mirrorProvidedSprites,
        }
      } : {})
    };

    // Load available module names
    const availableAttrs = await listModuleNames(path.resolve(cwd, "src", "modules", "attributes"));
    const availableSprites = await listModuleNames(path.resolve(cwd, "src", "modules", "sprites"));
    const availableModifiers = await listModuleNames(path.resolve(cwd, "src", "modules", "modifiers"));

    async function generateRegistry(
      dir: string,
      exportName: string,
      jsonKey: string,
      whitelist: string[] | undefined
    ) {
      const arr: string[] = [];
      try {
        const fullPath = path.resolve(cwd, "src", dir);
        for await (const entry of Deno.readDir(fullPath)) {
          if (entry.isFile && entry.name.endsWith(".ts") && entry.name !== "index.ts") {
            const nameWithoutExt = entry.name.replace(".ts", "");
            // Apply whitelist filter if provided
            if (whitelist && !whitelist.includes(nameWithoutExt)) {
              console.log(`  [Tree-shaken] ${dir}/${entry.name}`);
              continue;
            }
            const modName = `mod_${counter++}`;
            manifestLines.push(`import * as ${modName} from './${dir}/${entry.name}';`);
            arr.push(`{ name: '${nameWithoutExt}', module: ${modName} }`);
            manifestJsonData[jsonKey].push(nameWithoutExt);
          }
        }
      } catch { /* ignore */ }

      manifestLines.push(`export const ${exportName}: any[] = [${arr.map(a => `  ${a}`).join(',\n')}];`);
    }

    // Determine whitelists for app-specific builds
    let attrWhitelist: string[] | undefined;
    let spriteWhitelist: string[] | undefined;
    let modWhitelist: string[] | undefined;

    if (appDir && analysisResult) {
      attrWhitelist = (Array.from(analysisResult.attributeDirectives) as string[]).filter(a => availableAttrs.includes(a));
      spriteWhitelist = (Array.from(analysisResult.spriteNames) as string[])
        .filter(s => !AUTO_INJECTED_SPRITES.includes(s) && !MIRROR_PROVIDED_SPRITES.includes(s) && availableSprites.includes(s));
      modWhitelist = (Array.from(analysisResult.modifiers) as string[]).filter(m => availableModifiers.includes(m));
    }

    await generateRegistry("modules/attributes", "autoAttributes", "attributes", attrWhitelist);
    await generateRegistry("modules/sprites", "autoSprites", "sprites", spriteWhitelist);
    await generateRegistry("modules/scopes", "autoScopes", "scopes", undefined);
    await generateRegistry("modules/modifiers", "autoModifiers", "modifiers", modWhitelist);
    await generateRegistry("modules/listeners", "autoListeners", "listeners", undefined);

    // Mutation observer
    const mutationPath = path.resolve(cwd, "src", "engine", "mutation.ts");
    try {
      const stat = await Deno.stat(mutationPath);
      if (stat.isFile && !excludeModules.includes("mutation")) {
        manifestLines.push("import * as mod_mutation from './engine/mutation.ts';");
        manifestLines.push("export const autoObservers: any[] = [{ name: 'mutation', module: mod_mutation }];");
        manifestJsonData["observers"].push("mutation");
      } else {
        manifestLines.push("export const autoObservers: any[] = [];");
      }
    } catch {
      manifestLines.push("export const autoObservers: any[] = [];");
    }

    // Only PACKED_COMPONENTS and PACKED_KEYFRAMES go into the bundle.
    // Theme/preflight CSS is fetched at runtime from CDN.
    manifestLines.push(`export const PACKED_COMPONENTS = "${packedStyleLayers.components}";`);
    manifestLines.push(`export const PACKED_KEYFRAMES = "${packedStyleLayers.keyframes}";`);

    await Deno.writeTextFile(manifestPath, manifestLines.join("\n"));
    console.log("Generated manifest:", manifestPath);

    await Deno.writeTextFile(manifestJsonPath, JSON.stringify(manifestJsonData, null, 2));
    console.log("Generated JSON manifest:", manifestJsonPath);

    const entryPointPath = path.resolve(cwd, "src", "index.ts");
    const entryPointUrl = new URL(`file:///${entryPointPath.replace(/\\/g, "/")}`).href;

    const esbuildOptions: esbuild.BuildOptions = {
      plugins: [fixWindowsPathsPlugin(), ...denoPlugins({ configPath })],
      entryPoints: [entryPointUrl],
      outfile: outFile,
      bundle: true,
      format: "iife",
      globalName: "UX",
      target: "es2022",
      legalComments: "none",
      minify,
    };

    console.log("Starting esbuild...");
    await esbuild.build(esbuildOptions);
    console.log(`Build complete: ${outFile}`);

    if (minify) {
      const minFile = outFile.replace(".js", ".min.js");
      const brFile = `${minFile}.br`;

      console.log("Minifying with SWC...");
      const code = await Deno.readTextFile(outFile);
      const result = await swcMinify(code, {
        compress: { passes: 3, unused: true, dead_code: true, drop_console: true },
        mangle: { toplevel: true, reserved: ["UX"] }
      });
      const minified = result.code || code;
      await Deno.writeTextFile(minFile, minified);
      console.log(`Minified: ${minFile} (${(minified.length / 1024).toFixed(2)} KB)`);

      const compressed = compress(new TextEncoder().encode(minified), 11);
      await Deno.writeFile(brFile, compressed);
      console.log(`Brotli compressed: ${brFile} (${(compressed.length / 1024).toFixed(2)} KB)`);
    }

  } catch (e) {
    console.error("Build failed:", e);
    throw e;
  } finally {
    esbuild.stop();
  }
}
/**
 * fetchStyleLayerPrimitives
 *
 * Fetches the official Tailwind v4 preflight and theme CSS from jsDelivr CDN
 * (or a local monorepo checkout via --local-tailwind flag), strips all
 * comments and whitespace, and returns the four packed string payloads.
 *
 * These strings are written into manifest.ts as generated exports so that
 * stylesheet.ts holds zero raw CSS in source — only an import reference.
 * The minifier can therefore fully mangle all surrounding JS execution logic.
 *
 * Usage: deno task build                                (CDN)
 *        deno task build --local-tailwind=/path/to/tw  (local monorepo)
 */
export async function fetchStyleLayerPrimitives(): Promise<{
  components: string;
  keyframes: string;
}> {
  /** Compact raw CSS into a minifier-safe escaped single-line string. */
  function pack(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/;\s*/g, ";")
      .replace(/,\s*/g, ",")
      .replace(/\{\s*/g, "{")
      .replace(/\s*\}\s*/g, "}")
      .replace(/"/g, '\\"')
      .trim();
  }

  // ── PACKED_COMPONENTS — Nexus-UX sortable/drag-drop class overrides ──
  const componentsCss =
    `.draggable-chosen{background-color:var(--color-base-300,#d4d4d8);box-shadow:inset 0 0 0 2px var(--color-primary,#3b82f6)}` +
    `.draggable-drag{opacity:1;background-color:var(--color-base-300,#d4d4d8);box-shadow:0 25px 50px -12px rgba(0,0,0,.25);transform:scale(1.05);cursor:grabbing;z-index:9999}` +
    `.draggable-ghost{opacity:1;background-color:var(--color-base-300,#d4d4d8);border:2px solid var(--color-primary,#3b82f6);box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}` +
    `.draggable-selected{box-shadow:inset 0 0 0 2px var(--color-accent,var(--color-secondary,#ec4899))}` +
    `.draggable-swap-highlight{background-color:color-mix(in srgb,var(--color-warning,#eab308) 20%,transparent);box-shadow:inset 0 0 0 2px var(--color-warning,#eab308)}` +
    `.drop-target-before{background:linear-gradient(to bottom,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%);box-shadow:inset 0 2px 0 0 var(--color-primary,#3b82f6)}` +
    `.drop-target-after{background:linear-gradient(to top,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%);box-shadow:inset 0 -2px 0 0 var(--color-pri  // ── PACKED_KEYFRAMES — Framework animation keyframes ──
  const keyframesCss =
    `@keyframes spin{to{transform:rotate(360deg)}}` +
    `@keyframes ping{75%,100%{transform:scale(2);opacity:0}}` +
    `@keyframes pulse{50%{opacity:.5}}` +
    `@keyframes bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:none;animation-timing-function:cubic-bezier(0,0,.2,1)}}`;

  const result = {
    components: pack(componentsCss),
    keyframes: pack(keyframesCss),
  };

  console.log(`   ✓ PACKED_COMPONENTS (${result.components.length} chars)`);
  console.log(`   ✓ PACKED_KEYFRAMES  (${result.keyframes.length} chars)`);
  console.log(`   ✅ Style layer constants ready — emitting into manifest.ts.`);

  return result;
} ready — emitting into manifest.ts.`);

  return result;
}

// Deprecated: kept for backward-compat. Use fetchStyleLayerPrimitives() instead.
export const compileStyleLayerPrimitives = fetchStyleLayerPrimitives;

async function batchBuild(configs: BuildOptions[]) {
  for (const config of configs) {
    console.log(`\n=== Building: ${config.outputName || 'default'} ===`);
    await buildBundle(config);
  }
}

// ── Git commit + push helpers ──────────────────────────────────────────────

function git(args: string[], cwd = Deno.cwd()): { ok: boolean; out: string; err: string } {
  const r = new Deno.Command("git", { args, cwd }).outputSync();
  const out = new TextDecoder().decode(r.stdout).trim();
  const err = new TextDecoder().decode(r.stderr).trim();
  return { ok: r.success, out, err };
}

async function gitPush(opts: { remote?: string; branch?: string }) {
  const remote = opts.remote ?? "origin";
  const branch = opts.branch ?? (git(["rev-parse", "--abbrev-ref", "HEAD"]).out || "main");

  console.log(`🚀 Pushing ${branch} → ${remote}...`);
  const push = git(["push", remote, branch]);
  if (!push.ok) {
    const msg = push.err || push.out;
    if (/everything up[- ]to[- ]date/i.test(msg)) {
      console.log("ℹ️  Already up to date with remote.");
      return;
    }
    console.error("❌ Push failed:", msg);
    Deno.exit(1);
  }
  console.log("✓ Pushed to remote.");
}

// CLI
const args = Deno.args;
if (args.includes("--batch")) {
  const configFile = args.find(a => a.startsWith("--config="))?.split("=")[1];
  if (configFile) {
    const configData = JSON.parse(await Deno.readTextFile(configFile)) as { configs?: BuildOptions[] };
    await batchBuild(configData.configs || []);
  } else {
    console.error("Batch mode requires --config=file.json");
    Deno.exit(1);
  }
} else {
  const outputName = args.find(a => a.startsWith("--name="))?.split("=")[1];
  const appDir = args.find(a => a.startsWith("--app="))?.split("=")[1];
  const excludes = args.find(a => a.startsWith("--exclude="))?.split("=")[1]?.split(",") || [];
  const gitRef = args.find(a => a.startsWith("--ref="))?.split("=")[1];
  const minify = args.includes("--minify") || args.includes("--app");

  await buildBundle({ outputName, appDir, excludeModules: excludes, gitRef, minify });

  if (args.includes("--push")) {
    const remote = args.find(a => a.startsWith("--remote="))?.split("=")[1];
    const branch = args.find(a => a.startsWith("--branch="))?.split("=")[1];
    await gitPush({ remote, branch });
  }
}

export { buildBundle, batchBuild, gitPush };