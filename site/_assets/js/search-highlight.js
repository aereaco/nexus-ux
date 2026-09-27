/**
 * Nexus-UX Native Search Highlight & TreeWalker Helpers
 * Offloads DOM text scanning and CSS Custom Highlight API registration
 * from reactive signal memory.
 */

(function () {
  'use strict';

  function getSearchTokens(query) {
    const q = (query || '').trim();
    if (!q) return [];
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const seg = new Intl.Segmenter('en', { granularity: 'word' });
        return Array.from(seg.segment(q))
          .filter(function (s) { return s.isWordLike; })
          .map(function (s) { return s.segment.toLowerCase(); });
      }
    } catch (_) { /* fallback */ }
    return q.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function syncHighlights(container, tokens) {
    if (typeof window === 'undefined' || typeof window.CSS === 'undefined' || !window.CSS.highlights || typeof window.Highlight === 'undefined') return;
    if (!container) return;
    if (!tokens || tokens.length === 0) {
      window.CSS.highlights.delete('search-match');
      return;
    }
    window.setTimeout(() => {
      try {
        const ranges = [];
        const filter = window.NodeFilter ? window.NodeFilter.SHOW_TEXT : 4;
        const walker = window.document.createTreeWalker(container, filter, null);
        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent;
          if (!text || !text.trim()) continue;
          const lowerText = text.toLowerCase();
          for (const token of tokens) {
            if (!token || token.length < 2) continue;
            let pos = 0;
            while ((pos = lowerText.indexOf(token, pos)) !== -1) {
              const range = new window.Range();
              range.setStart(node, pos);
              range.setEnd(node, pos + token.length);
              ranges.push(range);
              pos += token.length;
            }
          }
        }
        if (ranges.length !== 0) {
          window.CSS.highlights.set('search-match', new window.Highlight(...ranges));
        } else {
          window.CSS.highlights.delete('search-match');
        }
      } catch (_) { /* ignore range calculation errors */ }
    }, 60);
  }

  function syncPageHighlights(container, tabId, tokens) {
    if (typeof window === 'undefined' || typeof window.CSS === 'undefined' || !window.CSS.highlights || typeof window.Highlight === 'undefined') return;
    if (!container) return;
    const g = window.Nexus?.coordinator?.runtimeContext?.globalSignals?.() || {};
    const effectiveTabId = tabId || (typeof g.router !== 'undefined' ? g.router.activePageTabId : '');

    if (!tokens || tokens.length === 0 || !g.searchTabs || !g.searchTabs[effectiveTabId]) {
      window.CSS.highlights.delete('page-match');
      if (g.setGlobalSignal) {
        g.setGlobalSignal('searchHighlightCount', 0);
        g.setGlobalSignal('searchTicks', []);
      }
      return;
    }

    window.setTimeout(() => {
      try {
        if (!g.searchTabs || !g.searchTabs[effectiveTabId] || !g.searchTabs[effectiveTabId].tokens || g.searchTabs[effectiveTabId].tokens.length === 0) {
          window.CSS.highlights.delete('page-match');
          return;
        }
        const ranges = [];
        const filter = window.NodeFilter ? window.NodeFilter.SHOW_TEXT : 4;
        const walker = window.document.createTreeWalker(container, filter, null);
        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent;
          if (!text || !text.trim()) continue;
          const lowerText = text.toLowerCase();
          for (const token of tokens) {
            if (!token || token.length < 2) continue;
            let pos = 0;
            while ((pos = lowerText.indexOf(token, pos)) !== -1) {
              const range = new window.Range();
              range.setStart(node, pos);
              range.setEnd(node, pos + token.length);
              ranges.push(range);
              pos += token.length;
            }
          }
        }

        if (ranges.length !== 0) {
          window.CSS.highlights.set('page-match', new window.Highlight(...ranges));

          const scrollEl = container.closest('.overflow-y-auto') || container;
          const ticks = [];
          if (scrollEl) {
            const scrollRect = scrollEl.getBoundingClientRect();
            const scrollH = scrollEl.scrollHeight;
            const scrollT = scrollEl.scrollTop;

            for (const r of ranges) {
              const rect = r.getBoundingClientRect();
              if (!rect || (rect.width === 0 && rect.height === 0)) continue;
              const topInScroll = (rect.top - scrollRect.top) + scrollT;
              const pct = Math.min(99.5, Math.max(0.5, (topInScroll / scrollH) * 100));
              if (!ticks.some(t => Math.abs(t - pct) < 0.8)) {
                ticks.push(Number(pct.toFixed(1)));
              }
            }
          }

          if (g.searchTabs && g.searchTabs[effectiveTabId]) {
            g.searchTabs[effectiveTabId].count = ranges.length;
            g.searchTabs[effectiveTabId].ticks = ticks;
          }
          if (g.setGlobalSignal) {
            g.setGlobalSignal('searchHighlightCount', ranges.length);
            g.setGlobalSignal('searchTicks', ticks);
          }
        } else {
          window.CSS.highlights.delete('page-match');
          if (g.searchTabs && g.searchTabs[effectiveTabId]) {
            g.searchTabs[effectiveTabId].count = 0;
            g.searchTabs[effectiveTabId].ticks = [];
          }
          if (g.setGlobalSignal) {
            g.setGlobalSignal('searchHighlightCount', 0);
            g.setGlobalSignal('searchTicks', []);
          }
        }
      } catch (_) { /* ignore range errors */ }
    }, 120);
  }

  window.getSearchTokens = getSearchTokens;
  window.syncHighlights = syncHighlights;
  window.syncPageHighlights = syncPageHighlights;
  window.NexusHighlights = { getSearchTokens, syncHighlights, syncPageHighlights };
})();
