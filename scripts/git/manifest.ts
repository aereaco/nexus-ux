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
const SEARCH_INDEX_PATH = "site/_pages/search-index.json";
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
  keywords?: string[];
}

export interface SearchIndexEntry {
  id: string;
  route: string;
  path: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
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
  keywords?: string[];
  cleanContent?: string;
}

function stripMarkup(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
  keywords?: string[];
  cleanContent?: string;
} {
  // Support YAML frontmatter for .md documents
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmMaps: Record<string, string> = {};
  if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split(/\r?\n/);
    for (const l of lines) {
      const idx = l.indexOf(":");
      if (idx > 0) {
        const k = l.substring(0, idx).trim().toLowerCase();
        const v = l.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        fmMaps[k] = v;
      }
    }
  }

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
  const keywordsMatch = content.match(/<meta\s+[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i) ||
    content.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']keywords["']/i);

  const id = fmMaps["id"] || (idMatch ? idMatch[1].trim() : undefined);
  const title = fmMaps["title"] || (titleMatch ? titleMatch[1].trim() : (content.match(/^#\s+(.+)$/m)?.[1]?.trim()));
  const route = fmMaps["route"] || (routeMatch ? routeMatch[1].trim() : undefined);
  const icon = fmMaps["icon"] || (iconMatch ? iconMatch[1].trim() : undefined);
  const orderVal = fmMaps["order"] ? parseInt(fmMaps["order"], 10) : (orderMatch ? parseInt(orderMatch[1].trim(), 10) : undefined);
  const order = !isNaN(orderVal!) ? orderVal : undefined;
  const internal = fmMaps["internal"] ? fmMaps["internal"].toLowerCase() === "true" : (internalMatch ? internalMatch[1].trim().toLowerCase() === "true" : undefined);
  const parentRaw = fmMaps["parent"] || (parentMatch ? parentMatch[1].trim() : undefined);
  const parent = parentRaw ? (parentRaw === "null" ? null : parentRaw) : undefined;
  const category = fmMaps["category"] || (categoryMatch ? categoryMatch[1].trim() : undefined);

  // Collect keywords from <meta>, frontmatter, or lab doc properties
  const kwList: string[] = [];
  const rawKw = fmMaps["keywords"] || (keywordsMatch ? keywordsMatch[1].trim() : "");
  if (rawKw) {
    rawKw.split(/[,;\s]+/).filter(Boolean).forEach(k => kwList.push(k.toLowerCase()));
  }

  // Extract lab doc metadata if present in data-signal="{ doc: ... }"
  let labContent = "";
  if (content.includes("doc:")) {
    const descMatch = content.match(/Description:\s*['"]([\s\S]*?)['"],\s*\r?\n/);
    if (descMatch) {
      const cleanDesc = stripMarkup(descMatch[1]);
      labContent += cleanDesc + " ";
    }
    const syntaxMatch = content.match(/Syntax:\s*['"]([\s\S]*?)['"],\s*\r?\n/);
    if (syntaxMatch) {
      const cleanSyntax = stripMarkup(syntaxMatch[1]);
      labContent += cleanSyntax + " ";
    }
    const paramNames = Array.from(content.matchAll(/name:\s*['"]([^'"]+)['"]/g)).map(m => m[1]);
    paramNames.forEach(p => {
      const cleanP = p
        .replace(/&quot;/g, " ")
        .replace(/&lt;/g, " ")
        .replace(/&gt;/g, " ")
        .replace(/[^a-zA-Z0-9_-]/g, " ")
        .trim();
      cleanP.split(/\s+/).filter(tok => tok.length > 2).forEach(tok => {
        const lower = tok.toLowerCase();
        if (!kwList.includes(lower)) kwList.push(lower);
      });
      labContent += p + " ";
    });
    const extMatch = content.match(/Extensibility:\s*['"]([\s\S]*?)['"],\s*\r?\n/);
    if (extMatch) {
      labContent += stripMarkup(extMatch[1]) + " ";
    }
  }

  const cleanContent = stripMarkup(content + " " + labContent).slice(0, 10000);

  return { id, title, route, icon, order, internal, parent, category, keywords: kwList.length > 0 ? kwList : undefined, cleanContent };
}

function scanDirectory(
  dir: string,
  baseWebPath: string,
  isInternalDefault = false,
  parentRoute?: string,
  inheritedCategory?: string
): RawManifestEntry[] {
  const list: RawManifestEntry[] = [];
  try {
    const entries = Array.from(Deno.readDirSync(dir));
    const fileEntries = entries.filter((e) => e.isFile);
    const dirEntries = entries.filter((e) => e.isDirectory);

    // 1. Process files in current directory
    for (const entry of fileEntries) {
      if (VALID_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        const nameWithoutExt = entry.name.replace(/\.[^.]+$/, "");
        const filePath = `${dir}/${entry.name}`;
        const content = Deno.readTextFileSync(filePath);
        const meta = parseHeadMetadata(content);

        const id = meta.id || nameWithoutExt;
        const internal = meta.internal !== undefined ? meta.internal : (isInternalDefault ? true : undefined);

        // Derive category if not explicitly declared
        let category = meta.category || inheritedCategory;
        if (!category) {
          if (baseWebPath.includes("/docs")) category = "Docs";
          else if (baseWebPath.includes("/labs")) category = "Labs";
        }

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
        else if (parentRoute && nameWithoutExt !== "index") item.parent = parentRoute;
        if (category) item.category = category;
        if (meta.keywords) item.keywords = meta.keywords;
        if (meta.cleanContent) item.cleanContent = meta.cleanContent;

        list.push(item);
      }
    }

    // 2. Process subdirectories (Filesystem Hierarchy)
    for (const subDir of dirEntries) {
      const subDirPath = `${dir}/${subDir.name}`;
      const subWebPath = `${baseWebPath}/${subDir.name}`;
      const subEntries = Array.from(Deno.readDirSync(subDirPath));

      // Determine default category for subdirectory
      const isTopCategoryDir = dir === PAGES_DIR && (subDir.name === "docs" || subDir.name === "labs");
      let subCategory = inheritedCategory;
      if (isTopCategoryDir) {
        subCategory = subDir.name === "docs" ? "Docs" : "Labs";
      }

      // Check if folder contains index.html / index.md (Case A)
      const hasIndex = subEntries.some((e) => e.isFile && (e.name === "index.html" || e.name === "index.md"));
      // Or if parent folder has a matching page file (e.g. attributes.html alongside attributes/ folder)
      const hasMatchingRootFile = fileEntries.some((e) => e.isFile && e.name.replace(/\.[^.]+$/, "") === subDir.name);

      let currentDirRoute: string | undefined = undefined;

      if (isTopCategoryDir) {
        // Top-level category folder: items inside are direct children of the category
        currentDirRoute = undefined;
      } else if (!hasIndex && !hasMatchingRootFile && subCategory !== undefined) {
        // Case B: Nested directory WITHOUT index.html -> Emit routeless DaisyUI collapsible submenu
        const submenuId = `${subDir.name}-menu`;
        const submenuTitle = subDir.name.charAt(0).toUpperCase() + subDir.name.slice(1);
        list.push({
          id: submenuId,
          explicitRoute: "",
          path: "",
          title: submenuTitle,
          icon: "material-symbols-light:folder-outline",
          parent: parentRoute || null,
          category: subCategory,
        });
        currentDirRoute = submenuId;
      } else if (hasMatchingRootFile) {
        // Current directory has a sibling page representing its root (e.g. attributes.html -> /labs/attributes)
        const rootEntry = fileEntries.find((e) => e.name.replace(/\.[^.]+$/, "") === subDir.name);
        const rootMeta = rootEntry ? parseHeadMetadata(Deno.readTextFileSync(`${dir}/${rootEntry.name}`)) : {};
        currentDirRoute = rootMeta.route || (parentRoute ? `${parentRoute}/${subDir.name}` : `/${subDir.name}`);
      } else {
        currentDirRoute = parentRoute ? `${parentRoute}/${subDir.name}` : `/${subDir.name}`;
      }

      // Recursively scan subfolder
      const subList = scanDirectory(subDirPath, subWebPath, isInternalDefault, currentDirRoute, subCategory);
      list.push(...subList);
    }
  } catch (err) {
    console.warn(`[manifest] Could not scan directory ${dir}:`, err);
  }
  return list;
}

function resolveLineage(item: RawManifestEntry, rawMap: Map<string, RawManifestEntry>): { route: string; parent: string | null } {
  if (item.internal || item.path === "") return { route: "", parent: item.parent ?? null };

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
    if (raw.keywords && raw.keywords.length > 0) entry.keywords = raw.keywords;
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

  // Generate standalone search index
  const searchIndex: SearchIndexEntry[] = allRaw
    .filter((r) => !r.internal && r.path && r.id !== "admin" && r.id !== "error")
    .map((raw) => {
      const { route } = resolveLineage(raw, rawMap);
      return {
        id: raw.id,
        route,
        path: raw.path,
        title: raw.title || raw.id,
        category: raw.category || "General",
        keywords: raw.keywords || [],
        content: raw.cleanContent || "",
      };
    });

  Deno.writeTextFileSync(SEARCH_INDEX_PATH, JSON.stringify(searchIndex, null, 2) + "\n");
  console.log(`[search-index] Generated ${SEARCH_INDEX_PATH} with ${searchIndex.length} entry(ies)`);

  return routes;
}

if (import.meta.main) {
  generateManifest();
}
