/**
 * Nexus-UX Service Worker & Virtual Search API
 * Zero-backend client-side virtual API engine for `/api/search?q=...`.
 */

const CACHE_NAME = 'nexus-cache-v1';
const SEARCH_CACHE = 'nexus-search-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Handle virtual `/api/search?q=...` requests by streaming and ranking
 * results from prefix search shards without server runtime dependencies.
 */
async function handleSearchRequest(request) {
  const url = new URL(request.url);
  const rawQ = url.searchParams.get('q') || '';
  const q = rawQ.trim();

  if (!q) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  const prefix = q.charAt(0).toLowerCase();
  const shardPath = `/_pages/search-shards/${encodeURIComponent(prefix)}.json`;
  const manifestPath = `/_pages/search-shards/manifest.json`;

  let entries = [];
  const searchCache = await caches.open(SEARCH_CACHE).catch(() => null);

  // 1. Try prefix shard
  try {
    let shardRes = searchCache ? await searchCache.match(shardPath) : null;
    if (!shardRes) {
      shardRes = await fetch(shardPath);
      if (shardRes.ok && searchCache) {
        searchCache.put(shardPath, shardRes.clone()).catch(() => {});
      }
    }
    if (shardRes && shardRes.ok) {
      entries = await shardRes.json();
    }
  } catch (_) {
    // Shard fetch failed, proceed to fallback
  }

  // 2. Fallback to lightweight manifest if shard was empty/failed
  if (!Array.isArray(entries) || entries.length === 0) {
    try {
      let manRes = searchCache ? await searchCache.match(manifestPath) : null;
      if (!manRes) {
        manRes = await fetch(manifestPath);
        if (manRes.ok && searchCache) {
          searchCache.put(manifestPath, manRes.clone()).catch(() => {});
        }
      }
      if (manRes && manRes.ok) {
        entries = await manRes.json();
      }
    } catch (_) {}
  }

  if (!Array.isArray(entries)) {
    entries = [];
  }

  const navMatches = [];
  const contentMatches = [];
  const seenPaths = new Set();
  const lowerQ = q.toLowerCase();

  // Multi-factor ranking:
  // Domain 1: Titles, Categories, Routes, Keywords
  for (const entry of entries) {
    if (!entry) continue;
    const title = (entry.title || entry.id || '').toLowerCase();
    const route = (entry.route || entry.path || '').toLowerCase();
    const cat = (entry.category || 'General').toLowerCase();
    const id = (entry.id || '').toLowerCase();
    const kws = Array.isArray(entry.keywords) ? entry.keywords.join(' ').toLowerCase() : '';
    const searchable = `${title} ${route} ${cat} ${id} ${kws}`;

    if (terms.every(term => searchable.includes(term))) {
      let score = 0;
      if (title === lowerQ) score += 100;
      else if (title.startsWith(lowerQ)) score += 50;
      else if (title.includes(lowerQ)) score += 30;
      if (terms.every(t => title.includes(t))) score += 20;

      for (const t of terms) {
        if (title.includes(t)) score += 10;
        if (route.includes(t)) score += 5;
        if (cat.includes(t)) score += 3;
        if (kws.includes(t)) score += 4;
      }

      navMatches.push({
        id: entry.route || entry.path,
        path: entry.route || entry.path,
        component: entry.path,
        name: entry.id,
        meta: {
          title: entry.title || entry.id,
          icon: entry.icon || 'material-symbols-light:description-outline'
        },
        category: entry.category || 'General',
        score
      });
      seenPaths.add(entry.route || entry.path);
    }
  }

  navMatches.sort((a, b) => b.score - a.score);

  // Domain 2: Deep Content Snippets
  for (const entry of entries) {
    if (!entry || seenPaths.has(entry.route || entry.path)) continue;
    const text = entry.content || '';
    if (!text) continue;
    const lowerText = text.toLowerCase();

    if (terms.every(term => lowerText.includes(term))) {
      let bestPos = -1;
      for (const t of terms) {
        const p = lowerText.indexOf(t);
        if (p !== -1) {
          bestPos = (bestPos === -1) ? p : Math.min(bestPos, p);
        }
      }

      if (bestPos !== -1) {
        const start = Math.max(0, bestPos - 35);
        const end = Math.min(text.length, bestPos + 45);
        let snippet = text.slice(start, end).trim();
        if (start !== 0) snippet = '…' + snippet;
        if (end !== text.length) snippet = snippet + '…';

        contentMatches.push({
          id: 'content_' + (entry.route || entry.path),
          path: entry.route || entry.path,
          component: entry.path,
          name: entry.id,
          meta: {
            title: entry.title || entry.id,
            icon: entry.icon || 'material-symbols-light:description-outline'
          },
          category: entry.category || 'General',
          snippet
        });
      }
    }
  }

  const groups = [];
  if (navMatches.length > 0) {
    groups.push({
      id: 'nav_' + q,
      type: 'nav',
      title: 'Pages & Navigation',
      icon: 'material-symbols-light:navigation-outline',
      items: navMatches
    });
  }
  if (contentMatches.length > 0) {
    groups.push({
      id: 'content_' + q,
      type: 'content',
      title: 'Page Content Matches',
      icon: 'material-symbols-light:description-outline',
      items: contentMatches
    });
  }

  return new Response(JSON.stringify(groups), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/search') {
    event.respondWith(handleSearchRequest(event.request));
  }
});
