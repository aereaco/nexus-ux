/**
 * Auto-generates site/_pages/manifest.json by scanning site/_pages/
 * Supports .html, .htm, .md, and .markdown files.
 * Ensures the "/" route entry is always first.
 */
const PAGES_DIR = "site/_pages";
const MANIFEST_PATH = "site/_pages/manifest.json";
const VALID_EXTENSIONS = [".html", ".htm", ".md", ".markdown"];

export interface RouteManifestEntry {
  id: string;
  route: string;
  path: string;
  protected?: boolean;
}

export function generateManifest(): RouteManifestEntry[] {
  const routes: RouteManifestEntry[] = [];
  try {
    for (const entry of Deno.readDirSync(PAGES_DIR)) {
      if (entry.isFile && VALID_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        const nameWithoutExt = entry.name.replace(/\.[^.]+$/, "");
        const routePath = nameWithoutExt === "home" ? "/" : `/${nameWithoutExt}`;
        routes.push({
          id: nameWithoutExt,
          route: routePath,
          path: `/_pages/${entry.name}`,
        });
      }
    }

    // Sort routes: "/" always first, then alphabetically by id
    routes.sort((a, b) => {
      if (a.route === "/") return -1;
      if (b.route === "/") return 1;
      return a.id.localeCompare(b.id);
    });

    // Append internal / protected routes
    routes.push(
      {
        id: "admin",
        route: "",
        path: "/_internal/admin-console.html",
        protected: true,
      },
      {
        id: "error",
        route: "/error",
        path: "/_internal/error.html",
        protected: true,
      },
    );

    Deno.writeTextFileSync(MANIFEST_PATH, JSON.stringify(routes, null, 2) + "\n");
    console.log(`[manifest] Updated ${MANIFEST_PATH} with ${routes.length} route(s):`, routes);
  } catch (err) {
    console.warn("[manifest] Could not generate manifest:", err);
  }
  return routes;
}

if (import.meta.main) {
  generateManifest();
}
