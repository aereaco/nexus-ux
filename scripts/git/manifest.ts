/**
 * Auto-generates site/_pages/manifest.json by scanning site/_pages/
 * Supports .html, .htm, .md, and .markdown files.
 */
const PAGES_DIR = "site/_pages";
const MANIFEST_PATH = "site/_pages/manifest.json";
const VALID_EXTENSIONS = [".html", ".htm", ".md", ".markdown"];

export function generateManifest(): string[] {
  const files: string[] = [];
  try {
    for (const entry of Deno.readDirSync(PAGES_DIR)) {
      if (entry.isFile && VALID_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        files.push(entry.name);
      }
    }
    files.sort();
    Deno.writeTextFileSync(MANIFEST_PATH, JSON.stringify(files, null, 2) + "\n");
    console.log(`[manifest] Updated ${MANIFEST_PATH} with ${files.length} page(s):`, files);
  } catch (err) {
    console.warn("[manifest] Could not generate manifest:", err);
  }
  return files;
}

if (import.meta.main) {
  generateManifest();
}
