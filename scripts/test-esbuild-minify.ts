const esbuild = await import("esbuild");
const { denoPlugins } = await import("esbuild-deno-loader");
const path = await import("std/path");

const cwd = Deno.cwd();
const entryPoint = path.resolve(cwd, "src", "index.ts");
const outFile = path.resolve(cwd, "dist", "nexus-ux.esbuild-min.js");
const configPath = path.resolve(cwd, "deno.json");

await esbuild.build({
  plugins: [...denoPlugins({ configPath })],
  entryPoints: [entryPoint],
  outfile: outFile,
  bundle: true,
  format: "iife",
  globalName: "NexusLib",
  target: "es2022",
  minify: true,
});

const stats = await Deno.stat(outFile);
console.log(`esbuild minify size: ${(stats.size / 1024).toFixed(2)} KB`);
