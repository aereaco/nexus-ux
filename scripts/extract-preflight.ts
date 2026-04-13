const text = Deno.readTextFileSync('/home/aerea/development/nexus-ux/tailwind-browser.js');
// The CSS block starts with /*! tailwindcss v4
const startIndex = text.indexOf("/*! tailwindcss v4");
if (startIndex !== -1) {
  // Let's find the end. It's usually followed by backticks or quote.
  const rootIndex = text.indexOf(":root", startIndex);
  if (rootIndex !== -1) {
    let endIndex = text.indexOf("`;", rootIndex);
    if (endIndex === -1) endIndex = text.indexOf('";', rootIndex);
    if (endIndex === -1) endIndex = text.indexOf('\\nbuild(', rootIndex);

    let cssText = text.substring(startIndex, endIndex);

    Deno.writeTextFileSync("/home/aerea/development/nexus-ux/src/engine/tailwind-theme.ts", `export const DEFAULT_TAILWIND_CSS = \`${cssText.replace(/`/g, '\\`')}\`;\n`);
    console.log("Extraction successful! Wrote to tailwind-theme.ts. CSS length:", cssText.length);
  } else {
    console.error("Could not find :root block within the text.");
  }
} else {
  console.error("Could not find starting tag: /*! tailwindcss v4");
}
