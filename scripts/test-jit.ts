import { compile } from "tailwindcss";

const inputClasses = Deno.args[0] || 'flex-1';
const classList = inputClasses.split(/\s+/);

console.log("🚀 Initializing official compiler for test...");
const baseDir = "/home/aerea/development/tailwindcss/packages/tailwindcss";
const indexCss = await Deno.readTextFile(`${baseDir}/index.css`);
const preflightCss = await Deno.readTextFile(`${baseDir}/preflight.css`);
const themeCss = await Deno.readTextFile(`${baseDir}/theme.css`);
const utilitiesCss = await Deno.readTextFile(`${baseDir}/utilities.css`);

const compiler = await compile('@import "tailwindcss";', {
  base: '/',
  async loadStylesheet(id) {
    if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
      return { path: 'tailwindcss/index.css', base: '/', content: indexCss };
    }
    if (id === './theme.css' || id === 'tailwindcss/theme.css') {
      return { path: 'tailwindcss/theme.css', base: '/', content: themeCss };
    }
    if (id === './preflight.css' || id === 'tailwindcss/preflight.css') {
      return { path: 'tailwindcss/preflight.css', base: '/', content: preflightCss };
    }
    if (id === './utilities.css' || id === 'tailwindcss/utilities.css') {
      return { path: 'tailwindcss/utilities.css', base: '/', content: utilitiesCss };
    }
    throw new Error(`Not found: ${id}`);
  }
});

console.log(`\nCompiling classes: ${classList.join(", ")}`);
const compiled = compiler.build(classList);
console.log("\n--- Compiled CSS Output ---");
console.log(compiled);
Deno.exit(0);
