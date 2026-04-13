const fs = require('fs');
const text = fs.readFileSync('/home/aerea/development/nexus-ux/tailwind-browser.js', 'utf8');

const startIndex = text.indexOf("/*! tailwindcss v4");
if (startIndex !== -1) {
  const rootIndex = text.indexOf(":root", startIndex);
  if (rootIndex !== -1) {
    let endIndex = text.indexOf("`;", rootIndex);
    if (endIndex === -1) endIndex = text.indexOf('";', rootIndex);
    if (endIndex === -1) endIndex = text.indexOf('\\nbuild(', rootIndex);

    let cssText = text.substring(startIndex, endIndex);

    fs.writeFileSync("/home/aerea/development/nexus-ux/src/engine/tailwind-theme.ts", `export const DEFAULT_TAILWIND_CSS = \`${cssText.replace(/`/g, '\\`')}\`;\n`);
    console.log("Extraction successful! Wrote to tailwind-theme.ts. CSS length:", cssText.length);
  } else {
    console.error("Could not find :root");
  }
} else {
  console.error("Could not find /*! tailwindcss v4");
  console.error("First 500 chars:", text.substring(0, 500));
}
