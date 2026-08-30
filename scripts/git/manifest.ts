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
  parent?: string | null;
  category?: string;
}

interface RawManifestEntry {
  id: string;
  explicitRoute?: string;
  path: string;
  title?: string;
  icon?: string;
  order?: number;
  internal?: boolean;
  parent?: string | null;
  category?: string;
}

function parseHeadMetadata(content: string): {
  id?: string;
  title?: string;
  route?: string;
  icon?: string;
  order?: number;
  internal?: boolean;
  parent?: string | null;
  category?: string;
} {
  const idMatch = content.match(/<meta\s+[^>]*name=["']id["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']id["']/i);
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  const routeMatch = content.match(/<meta\s+[^>]*name=["']route["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']route["']/i);
  const iconMatch = content.match(/<meta\s+[^>]*name=["']icon["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']icon["']/i);
  const orderMatch = content.match(/<meta\s+[^>]*name=["']order["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']order["']/i);
  const internalMatch = content.match(/<meta\s+[^>]*name=["']internal["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']internal["']/i);
  const parentMatch = content.match(/<meta\s+[^>]*name=["']parent["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']parent["']/i);
  const categoryMatch = content.match(/<meta\s+[^>]*name=["']category["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']category["']/i);

  const id = idMatch ? idMatch[1].trim() : undefined;
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const route = routeMatch ? routeMatch[1].trim() : undefined;
  const icon = iconMatch ? iconMatch[1].trim() : undefined;
  const orderVal = orderMatch ? parseInt(orderMatch[1].trim(), 10) : undefined;
  const order = !isNaN(orderVal!) ? orderVal : undefined;
  const internal = internalMatch ? internalMatch[1].trim().toLowerCase() === "true" : undefined;
  const parent = parentMatch ? (parentMatch[1].trim() === "null" ? null : parentMatch[1].trim()) : undefined;
  const category = categoryMatch ? categoryMatch[1].trim() : undefined;

  return { id, title, route, icon, order, internal, parent, category };
}

function scanDirectory(dir: string, baseWebPath: string, isInternalDefault = false): RawManifestEntry[] {
  const list: RawManifestEntry[] = [];
  try {
    for (const entry of Deno.readDirSync(dir)) {
      if (entry.isFile && VALID_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        const nameWithoutExt = entry.name.replace(/\.[^.]+$/, "");
        const filePath = `${dir}/${entry.name}`;
        const content = Deno.readTextFileSync(filePath);
        const meta = parseHeadMetadata(content);

        const id = meta.id || nameWithoutExt;
        const internal = meta.internal !== undefined ? meta.internal : (isInternalDefault ? true : undefined);

        const item: RawManifestEntry = {
          id,
          explicitRoute: meta.route,
          path: `${baseWebPath}/${entry.name}`,
        };

        if (meta.title) item.title = meta.title;
        if (meta.icon) item.icon = meta.icon;
        if (meta.order !== undefined) item.order = meta.order;
        if (internal) item.internal = internal;
        if (meta.parent !== undefined) item.parent = meta.parent;
        if (meta.category !== undefined) item.category = meta.category;

        list.push(item);
      }
    }
  } catch (err) {
    console.warn(`[manifest] Could not scan directory ${dir}:`, err);
  }
  return list;
}

function resolveLineage(item: RawManifestEntry, rawMap: Map<string, RawManifestEntry>): { route: string; parent: string | null } {
  if (item.internal) return { route: "", parent: null };

  // Explicit route override always takes absolute precedence
  if (item.explicitRoute) {
    return {
      route: item.explicitRoute,
      parent: item.parent ?? null,
    };
  }

  // Root item (no parent) -> canonical root route
  if (!item.parent) {
    return {
      route: item.id === "home" ? "/" : `/${item.id}`,
      parent: null,
    };
  }

  // Traverse upward to assemble full lineage chain
  const chain: RawManifestEntry[] = [item];
  const visited = new Set<string>([item.id]);
  let current: RawManifestEntry = item;

  while (current.parent) {
    const parentKey = current.parent.replace(/^\//, "");
    const parentEntry = rawMap.get(parentKey) || rawMap.get(current.parent);

    if (!parentEntry || visited.has(parentEntry.id)) {
      break;
    }

    visited.add(parentEntry.id);
    chain.unshift(parentEntry);
    current = parentEntry;
  }

  // Synthesize canonical chained route
  let canonicalRoute = "";
  if (chain[0].explicitRoute && chain[0].explicitRoute !== "/" && chain[0] !== item) {
    const subSegments = chain.slice(1).map((x) => x.id);
    canonicalRoute = `${chain[0].explicitRoute.replace(/\/$/, "")}/${subSegments.join("/")}`;
  } else {
    const segments = chain.map((x) => (x.id === "home" ? "" : x.id)).filter(Boolean);
    canonicalRoute = "/" + segments.join("/");
  }

  // Synthesize canonical parent route
  let canonicalParent: string | null = null;
  if (chain.length > 1) {
    const parentChain = chain.slice(0, -1);
    const parentSegments = parentChain.map((x) => (x.id === "home" ? "" : x.id)).filter(Boolean);
    canonicalParent = "/" + parentSegments.join("/");
  } else {
    canonicalParent = item.parent.startsWith("/") ? item.parent : "/" + item.parent;
  }

  return {
    route: canonicalRoute,
    parent: canonicalParent,
  };
}

export function generateManifest(): RouteManifestEntry[] {
  const publicRaw = scanDirectory(PAGES_DIR, "/_pages", false);
  const internalRaw = scanDirectory(INTERNAL_DIR, "/_internal", true);
  const allRaw = [...publicRaw, ...internalRaw];

  const rawMap = new Map<string, RawManifestEntry>();
  allRaw.forEach((r) => {
    rawMap.set(r.id, r);
    rawMap.set("/" + r.id, r);
    if (r.explicitRoute) {
      rawMap.set(r.explicitRoute, r);
    }
  });

  const routes: RouteManifestEntry[] = allRaw.map((raw) => {
    const { route, parent } = resolveLineage(raw, rawMap);
    const entry: RouteManifestEntry = {
      id: raw.id,
      route,
      path: raw.path,
    };
    if (raw.title) entry.title = raw.title;
    if (raw.icon) entry.icon = raw.icon;
    if (raw.order !== undefined) entry.order = raw.order;
    if (raw.internal) entry.internal = raw.internal;
    if (parent !== undefined) entry.parent = parent;
    if (raw.category !== undefined) entry.category = raw.category;
    return entry;
  });

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
    console.log(`  - [${r.order ?? "-"}] ${r.id} -> route: "${r.route}" (${r.path})${r.internal ? " [internal]" : ""}${r.parent ? ` (parent: ${r.parent})` : ""}`);
  });

  return routes;
}

if (import.meta.main) {
  generateManifest();
}
