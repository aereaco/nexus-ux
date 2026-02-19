import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";
import * as path from "std/path";

try {
  await Deno.mkdir("./dist", { recursive: true });

  const entryPoint = path.resolve(Deno.cwd(), "src", "index.ts");
  const outFile = path.resolve(Deno.cwd(), "dist", "nexus-ux.js");
  const configPath = path.resolve(Deno.cwd(), "deno.json");

  await esbuild.build({
    plugins: [...denoPlugins({ configPath })],
    entryPoints: [entryPoint],
    outfile: outFile,
    bundle: true,
    format: "esm",
    target: "es2022",
  });
  console.log("Build complete: dist/nexus-ux.js");
} catch (e) {
  console.error("Build failed:", e);
  Deno.exit(1);
} finally {
  esbuild.stop();
}
