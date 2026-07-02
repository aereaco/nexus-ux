import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";
import * as path from "std/path";
import { minify as swcMinify } from "@swc/core";
import { compress } from "brotli";
import { walk } from "https://deno.land/std@0.212.0/fs/walk.ts";
import { join as _joinPath } from "https://deno.land/std@0.224.0/path/mod.ts";
import { parseArgs as _parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

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

  const classRegex = /class\s*=\s*["']([^"']+)["']/g;
  while ((match = classRegex.exec(content)) !== null) {
    for (const cls of match[1].split(/\s+/)) {
      if (cls && !cls.startsWith("{") && !cls.includes(":")) {
        tailwindClasses.add(cls);
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
    const entryPoint = path.resolve(cwd, "src", "index.ts");
    const outFile = path.resolve(cwd, "dist", `${outputName}.js`);
    const configPath = path.resolve(cwd, "deno.json");
    const manifestPath = path.resolve(cwd, "src", "manifest.ts");
    const manifestJsonPath = path.resolve(cwd, "dist", "manifest.json");
    const stylesheetPath = path.resolve(cwd, "src", "engine", "stylesheet.ts");

    // AOT Preflight Injection — runs before esbuild so PACKED_PREFLIGHT
    // is up-to-date from the Tailwind v4 CDN before the bundle is compiled.
    console.log("\n🎨 Running AOT preflight injection...");
    await compileStyleLayerPrimitives(stylesheetPath);

    let analysisResult: any = null;
    
    if (appDir) {
      console.log(`\n🔍 Analyzing app: ${appDir}`);
      analysisResult = await analyzeAppFiles(appDir);
      console.log(`   Attributes: ${Array.from(analysisResult.attributeDirectives).join(", ")}`);
      console.log(`   Sprites: ${Array.from(analysisResult.spriteNames).join(", ")}`);
      console.log(`   Modifiers: ${Array.from(analysisResult.modifiers).join(", ")}`);
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

    await Deno.writeTextFile(manifestPath, manifestLines.join("\n"));
    console.log("Generated manifest:", manifestPath);

    await Deno.writeTextFile(manifestJsonPath, JSON.stringify(manifestJsonData, null, 2));
    console.log("Generated JSON manifest:", manifestJsonPath);

    const esbuildOptions: esbuild.BuildOptions = {
      plugins: [...denoPlugins({ configPath })],
      entryPoints: [entryPoint],
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

async function batchBuild(configs: BuildOptions[]) {
  for (const config of configs) {
    console.log(`\n=== Building: ${config.outputName || 'default'} ===`);
    await buildBundle(config);
  }
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
}

export { buildBundle, batchBuild };


// ============================================================================
// AOT STYLE LAYER PRIMITIVES — Preflight Ingestion Pipeline
// ============================================================================



/**
 * Lane A: AOT Preflight Ingestion
 * Fetches the official Tailwind v4 preflight CSS from jsDelivr CDN or a local
 * monorepo checkout, strips comments and whitespace, and overwrites the
 * PACKED_PREFLIGHT placeholder constant inside src/engine/stylesheet.ts.
 *
 * Usage: deno task build                                (CDN fetch)
 *        deno task build --local-tailwind=/path/to/tw  (local monorepo checkout)
 */
export async function compileStyleLayerPrimitives(targetModulePath: string): Promise<void> {
  const args = _parseArgs(Deno.args, {
    string: ["local-tailwind"],
    default: { "local-tailwind": "" }
  });

  // ── Helper: compact raw CSS into an opaque minifier-safe string literal ──
  function pack(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "")  // strip comments
      .replace(/\s+/g, " ")               // collapse whitespace
      .replace(/;\s*/g, ";")
      .replace(/,\s*/g, ",")
      .replace(/\{\s*/g, "{")
      .replace(/\s*\}\s*/g, "}")
      .replace(/"/g, '\\"')               // escape double quotes for string literal
      .trim();
  }

  // ── Helper: write a packed constant back into the source file ──
  async function inject(src: string, constName: string, content: string): Promise<string> {
    const regex = new RegExp(`(const|export const) ${constName}\\s*=\\s*"[\\s\\S]*?";`);
    const packed = pack(content);
    if (regex.test(src)) {
      const updated = src.replace(regex, (_m, kw) => `${kw} ${constName} = "${packed}";`);
      console.log(`   ✓ ${constName} injected (${packed.length} chars).`);
      return updated;
    } else {
      console.warn(`   ⚠ ${constName} placeholder not found in stylesheet.ts — skipping.`);
      return src;
    }
  }

  // ── A. PACKED_PREFLIGHT — fetched from official Tailwind v4 CDN ──
  let preflightCss = "";
  if (args["local-tailwind"]) {
    const localPath = _joinPath(args["local-tailwind"], "packages", "tailwindcss", "preflight.css");
    console.log(`   ⚡ Reading local Tailwind preflight from: ${localPath}`);
    preflightCss = await Deno.readTextFile(localPath);
  } else {
    const cdnUrl = "https://cdn.jsdelivr.net/npm/tailwindcss@4/preflight.css";
    console.log(`   ⚡ Fetching Tailwind v4 preflight from jsDelivr CDN...`);
    const res = await fetch(cdnUrl);
    if (!res.ok) throw new Error(`CDN fetch failed (${res.status}): ${res.statusText}`);
    preflightCss = await res.text();
  }

  // ── B. PACKED_THEME — Nexus-UX framework design tokens (source of truth lives here) ──
  const themeCss = `:root{` +
    `--font-sans:ui-sans-serif,system-ui,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji';` +
    `--font-serif:ui-serif,Georgia,Cambria,'Times New Roman',Times,serif;` +
    `--font-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;` +
    `--color-transparent:transparent;--color-current:currentColor;--color-white:#fff;--color-black:#000;` +
    `--color-slate-50:oklch(98.4% 0.003 247.858);--color-slate-100:oklch(96.8% 0.007 247.858);` +
    `--color-slate-200:oklch(92.9% 0.013 255.508);--color-slate-300:oklch(88.1% 0.021 259.75);` +
    `--color-slate-400:oklch(82.3% 0.031 259.75);--color-slate-500:oklch(70.7% 0.022 261.325);` +
    `--color-slate-600:oklch(52.6% 0.03 264.767);--color-slate-700:oklch(43.9% 0.027 268.808);` +
    `--color-slate-800:oklch(37% 0.025 268.808);--color-slate-900:oklch(31.3% 0.02 268.808);` +
    `--color-slate-950:oklch(21.3% 0.014 268.808);` +
    `--color-gray-500:oklch(70.7% 0.022 261.325);--color-zinc-500:oklch(70.7% 0.022 261.325);` +
    `--color-neutral-500:oklch(70.7% 0.022 261.325);--color-stone-500:oklch(70.7% 0.022 261.325);` +
    `--color-red-500:oklch(63.7% 0.237 25.331);--color-orange-500:oklch(70.5% 0.213 47.604);` +
    `--color-amber-500:oklch(76.9% 0.188 70.08);--color-yellow-500:oklch(85.2% 0.199 91.936);` +
    `--color-lime-500:oklch(86.8% 0.189 124.166);--color-green-500:oklch(72.7% 0.192 149.33);` +
    `--color-emerald-500:oklch(69.6% 0.17 162.48);--color-teal-500:oklch(66.1% 0.125 182.018);` +
    `--color-cyan-500:oklch(71.5% 0.143 215.221);--color-sky-500:oklch(71.4% 0.142 232.661);` +
    `--color-blue-500:oklch(62.3% 0.214 259.815);--color-indigo-500:oklch(58.5% 0.233 277.117);` +
    `--color-violet-500:oklch(60.6% 0.25 293.628);--color-purple-500:oklch(62.7% 0.265 303.9);` +
    `--color-fuchsia-500:oklch(66.7% 0.295 322.15);--color-pink-500:oklch(69.7% 0.274 342.55);` +
    `--color-rose-500:oklch(65.6% 0.241 354.308);` +
    `--spacing:0.25rem;--breakpoint-sm:40rem;--breakpoint-md:48rem;--breakpoint-lg:64rem;` +
    `--breakpoint-xl:80rem;--breakpoint-2xl:96rem;` +
    `--radius-xs:0.125rem;--radius-sm:0.25rem;--radius-md:0.375rem;--radius-lg:0.5rem;` +
    `--radius-xl:0.75rem;--radius-2xl:1rem;--radius-3xl:1.5rem;--radius-full:9999px;` +
    `--text-xs:0.75rem;--text-xs--line-height:1rem;--text-sm:0.875rem;--text-sm--line-height:1.25rem;` +
    `--text-base:1rem;--text-base--line-height:1.5rem;--text-lg:1.125rem;--text-lg--line-height:1.75rem;` +
    `--text-xl:1.25rem;--text-xl--line-height:1.75rem;--text-2xl:1.5rem;--text-2xl--line-height:2rem;` +
    `--text-3xl:1.875rem;--text-3xl--line-height:2.25rem;--text-4xl:2.25rem;--text-4xl--line-height:2.5rem;` +
    `--text-5xl:3rem;--text-5xl--line-height:1;--text-6xl:3.75rem;--text-6xl--line-height:1;` +
    `--text-7xl:4.5rem;--text-7xl--line-height:1;--text-8xl:6rem;--text-8xl--line-height:1;` +
    `--text-9xl:8rem;--text-9xl--line-height:1;` +
    `--tracking-tighter:-0.05em;--tracking-tight:-0.025em;--tracking-normal:0em;` +
    `--tracking-wide:0.025em;--tracking-wider:0.05em;--tracking-widest:0.1em;` +
    `--blur-sm:4px;--blur-md:8px;--blur-lg:12px;--blur-xl:16px;--blur-2xl:24px;--blur-3xl:40px;` +
    `--shadow-sm:0 1px 3px 0 rgb(0 0 0/0.1),0 1px 2px -1px rgb(0 0 0/0.1);` +
    `--shadow-md:0 4px 6px -1px rgb(0 0 0/0.1),0 2px 4px -2px rgb(0 0 0/0.1);` +
    `--shadow-lg:0 10px 15px -3px rgb(0 0 0/0.1),0 4px 6px -4px rgb(0 0 0/0.1);` +
    `--shadow-xl:0 20px 25px -5px rgb(0 0 0/0.1),0 8px 10px -6px rgb(0 0 0/0.1);` +
    `--shadow-2xl:0 25px 50px -12px rgb(0 0 0/0.25);` +
    `--shadow-inner:inset 0 2px 4px 0 rgb(0 0 0/0.05);` +
    `--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono)}`;

  // ── C. PACKED_COMPONENTS — Nexus sortable/drag-drop component overrides ──
  const componentsCss =
    `.sortable-chosen{background-color:var(--color-neutral-800,#27272a)!important;box-shadow:inset 0 0 0 2px var(--color-primary,#3b82f6)!important}` +
    `.sortable-drag{opacity:1!important;box-shadow:0 25px 50px -12px rgba(0,0,0,.25)!important;transform:scale(1.05)!important;cursor:grabbing!important;z-index:9999!important}` +
    `.sortable-ghost{opacity:.4!important;background-color:var(--color-neutral-900,#18181b)!important;border:2px dashed var(--color-neutral-700,#3f3f46)!important}` +
    `.sortable-selected{box-shadow:inset 0 0 0 2px var(--color-accent,var(--color-secondary,#ec4899))!important}` +
    `.sortable-swap-highlight{background-color:color-mix(in srgb,var(--color-warning,#eab308) 20%,transparent)!important;box-shadow:inset 0 0 0 2px var(--color-warning,#eab308)!important}` +
    `.drop-target-before{background:linear-gradient(to bottom,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%)!important;box-shadow:inset 0 2px 0 0 var(--color-primary,#3b82f6)!important}` +
    `.drop-target-after{background:linear-gradient(to top,color-mix(in srgb,var(--color-primary,#3b82f6) 30%,transparent) 0%,transparent 20%)!important;box-shadow:inset 0 -2px 0 0 var(--color-primary,#3b82f6)!important}`;

  // ── D. PACKED_KEYFRAMES — Framework animation keyframes ──
  const keyframesCss =
    `@keyframes spin{to{transform:rotate(360deg)}}` +
    `@keyframes ping{75%,100%{transform:scale(2);opacity:0}}` +
    `@keyframes pulse{50%{opacity:.5}}` +
    `@keyframes bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:none;animation-timing-function:cubic-bezier(0,0,.2,1)}}`;

  // ── Inject all four constants in a single file read/write pass ──
  let src = await Deno.readTextFile(targetModulePath);
  src = await inject(src, "PACKED_PREFLIGHT", preflightCss);
  src = await inject(src, "PACKED_THEME", themeCss);
  src = await inject(src, "PACKED_COMPONENTS", componentsCss);
  src = await inject(src, "PACKED_KEYFRAMES", keyframesCss);
  await Deno.writeTextFile(targetModulePath, src);
  console.log(`   ✅ All style layer primitives injected into stylesheet.ts.`);
}