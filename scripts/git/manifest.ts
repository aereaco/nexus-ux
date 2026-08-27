/**
 * Auto-generates site/_pages/manifest.json by scanning site/_pages/ and site/_internal/
 * Extracts self-describing HTML <head> metadata:
 *   - <title>
 *   - <meta name="route" content="...">
 *   - <meta name="icon" content="...">
 *   - <meta name="order" content="...">
 *   - <meta name="internal" content="true">
 *
 * Sorts by order priority (numeric ascending), then alphanumeric fallback,
 * placing internal/shadow components at the end.
 */
const PAGES_DIR = "site/_pages";
const INTERNAL_DIR = "site/_internal";
const MANIFEST_PATH = "site/_pages/manifest.json";
const VALID_EXTENSIONS = [".html", ".htm", ".md", ".markdown"];

export interface RouteManifestEntry {
  id: string;
  route: string;
  path: string;
  title?: string;
  icon?: string;
  order?: number;
  internal?: boolean;
}

function parseHeadMetadata(content: string): {
  title?: string;
  route?: string;
  icon?: string;
  order?: number;
  internal?: boolean;
} {
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  const routeMatch = content.match(/<meta\s+[^>]*name=["']route["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']route["']/i);
  const iconMatch = content.match(/<meta\s+[^>]*name=["']icon["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']icon["']/i);
  const orderMatch = content.match(/<meta\s+[^>]*name=["']order["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']order["']/i);
  const internalMatch = content.match(/<meta\s+[^>]*name=["']internal["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']internal["']/i);

  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const route = routeMatch ? routeMatch[1].trim() : undefined;
  const icon = iconMatch ? iconMatch[1].trim() : undefined;
  const orderVal = orderMatch ? parseInt(orderMatch[1].trim(), 10) : undefined;
  const order = !isNaN(orderVal!) ? orderVal : undefined;
  const internal = internalMatch ? internalMatch[1].trim().toLowerCase() === "true" : undefined;

  return { title, route, icon, order, internal };
}

function scanDirectory(dir: string, baseWebPath: string, isInternalDefault = false): RouteManifestEntry[] {
  const list: RouteManifestEntry[] = [];
  try {
    for (const entry of Deno.readDirSync(dir)) {
      if (entry.isFile && VALID_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        const nameWithoutExt = entry.name.replace(/\.[^.]+$/, "");
        const filePath = `${dir}/${entry.name}`;
        const content = Deno.readTextFileSync(filePath);
        const meta = parseHeadMetadata(content);

        const defaultRoute = isInternalDefault ? "" : (nameWithoutExt === "home" ? "/" : `/${nameWithoutExt}`);
        const route = meta.route !== undefined ? meta.route : defaultRoute;
        const internal = meta.internal !== undefined ? meta.internal : (isInternalDefault ? true : undefined);

        const item: RouteManifestEntry = {
          id: nameWithoutExt,
          route,
          path: `${baseWebPath}/${entry.name}`,
        };

        if (meta.title) item.title = meta.title;
        if (meta.icon) item.icon = meta.icon;
        if (meta.order !== undefined) item.order = meta.order;
        if (internal) item.internal = internal;

        list.push(item);
      }
    }
  } catch (err) {
    console.warn(`[manifest] Could not scan directory ${dir}:`, err);
  }
  return list;
}

export function generateManifest(): RouteManifestEntry[] {
  const publicRoutes = scanDirectory(PAGES_DIR, "/_pages", false);
  const internalRoutes = scanDirectory(INTERNAL_DIR, "/_internal", true);
  const routes = [...publicRoutes, ...internalRoutes];

  // Deterministic sorting:
  // 1. Public routes before internal routes
  // 2. Public routes with numeric order ascending (1, 2, 3...)
  // 3. Fallback: alphabetical by id
  routes.sort((a, b) => {
    const aInternal = a.internal === true || a.route === "";
    const bInternal = b.internal === true || b.route === "";
    if (aInternal !== bInternal) return aInternal ? 1 : -1;

    if (!aInternal) {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
    }

    return a.id.localeCompare(b.id);
  });

  Deno.writeTextFileSync(MANIFEST_PATH, JSON.stringify(routes, null, 2) + "\n");
  console.log(`[manifest] Generated ${MANIFEST_PATH} with ${routes.length} route(s):`);
  routes.forEach((r) => {
    console.log(`  - [${r.order ?? "-"}] ${r.id} -> route: "${r.route}" (${r.path})${r.internal ? " [internal]" : ""}`);
  });

  return routes;
}

if (import.meta.main) {
  generateManifest();
}
