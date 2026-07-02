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
 * Fetches the Tailwind v4 base layer CSS from esm.sh CDN or a local checkout,
 * strips comments and whitespace, and overwrites the PACKED_PREFLIGHT constant
 * inside src/engine/stylesheet.ts in-place.
 *
 * Usage: deno task build                         (CDN fetch)
 *        deno task build --local-tailwind=/path  (local checkout)
 */
export async function compileStyleLayerPrimitives(targetModulePath: string): Promise<void> {
  const args = _parseArgs(Deno.args, {
    string: ["local-tailwind"],
    default: { "local-tailwind": "" }
  });

  let rawCssContent = "";

  if (args["local-tailwind"]) {
    const targetedFilePath = _joinPath(args["local-tailwind"], "dist", "index.css");
    console.log(`   ⚡ Resolving local Tailwind primitives from: ${targetedFilePath}`);
    try {
      rawCssContent = await Deno.readTextFile(targetedFilePath);
    } catch (err) {
      throw new Error(`Failed to read local style path ${targetedFilePath}: ${(err as Error).message}`);
    }
  } else {
    const remoteCdnEndpoint = "https://esm.sh/@tailwindcss/browser/dist/index.css";
    console.log(`   ⚡ Streaming Tailwind v4 primitives from CDN...`);
    const networkPayload = await fetch(remoteCdnEndpoint);
    if (!networkPayload.ok) {
      throw new Error(`CDN fetch failed: ${networkPayload.statusText}`);
    }
    rawCssContent = await networkPayload.text();
  }

  // Isolate the @layer base block — that's the preflight we want
  const layerStartMarker = "/* @layer base */";
  const layerEndMarker   = "/* @layer theme */";
  let targetedBaseRules  = rawCssContent;

  if (rawCssContent.includes(layerStartMarker)) {
    const sectionSplits = rawCssContent.split(layerStartMarker);
    if (sectionSplits[1]) {
      targetedBaseRules = sectionSplits[1].split(layerEndMarker)[0] || rawCssContent;
    }
  }

  // Compact: strip comments, collapse whitespace, trim separator spacing
  const packed = targetedBaseRules
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/;\s*/g, ";")
    .replace(/,\s*/g, ",")
    .replace(/\{\s*/g, "{")
    .replace(/\s*\}\s*/g, "}")
    .replace(/"/g, '\\"')
    .trim();

  let sourceText = await Deno.readTextFile(targetModulePath);
  const constantRegex     = /const PACKED_PREFLIGHT\s*=\s*["'][\s\S]*?["'];/;
  const replacementLine   = `const PACKED_PREFLIGHT = "${packed}";`;

  if (constantRegex.test(sourceText)) {
    sourceText = sourceText.replace(constantRegex, replacementLine);
    await Deno.writeTextFile(targetModulePath, sourceText);
    console.log("   ✓ PACKED_PREFLIGHT updated in stylesheet.ts.");
  } else {
    console.warn("   ⚠ PACKED_PREFLIGHT constant not found in stylesheet.ts — skipping injection.");
  }
}