async function downloadTailwindCore() {
  const themeUrl = 'https://unpkg.com/tailwindcss@4.2.2/theme.css';
  const preflightUrl = 'https://unpkg.com/tailwindcss@4.2.2/preflight.css';
  
  const [themeRes, preflightRes] = await Promise.all([
    fetch(themeUrl),
    fetch(preflightUrl)
  ]);
  
  const themeCss = await themeRes.text();
  const preflightCss = await preflightRes.text();
  
  const combined = `
export const THEME_CSS = \`${themeCss.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
export const PREFLIGHT_CSS = \`${preflightCss.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
`.trim() + '\n';
  
  Deno.writeTextFileSync("/home/aerea/development/nexus-ux/src/engine/tailwind-theme.ts", combined);
  console.log("Successfully extracted theme and preflight to tailwind-theme.ts");
}

downloadTailwindCore();
