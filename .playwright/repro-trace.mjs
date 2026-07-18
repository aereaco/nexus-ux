import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1000);

// Install a tabs-change + hovered-change watcher in the REAL page
await page.evaluate(() => {
  window.__log = [];
  const g = window._NEXUS_RUNTIME.globalSignals();
  let prevTabs = JSON.stringify(g.tabs.map(t=>t.id));
  let prevHov = g.hovered;
  const tick = () => {
    const t = JSON.stringify(g.tabs.map(x=>x.id));
    if (t !== prevTabs) { window.__log.push(`tabs ${prevTabs} -> ${t}`); prevTabs = t; }
    if (g.hovered !== prevHov) { window.__log.push(`hovered ${prevHov} -> ${g.hovered}`); prevHov = g.hovered; }
  };
  window.__tick = tick;
  setInterval(tick, 50);
  // also observe tablist DOM childList
  const tl = document.querySelector('[role="tablist"]');
  const mo = new MutationObserver(muts => {
    for (const m of muts) if (m.type==='childList') {
      const added=[...m.addedNodes].map(n=>n.textContent?.slice(0,12)).filter(Boolean);
      const removed=[...m.removedNodes].map(n=>n.textContent?.slice(0,12)).filter(Boolean);
      if (added.length||removed.length) window.__log.push(`DOM tablist childList +${JSON.stringify(added)} -${JSON.stringify(removed)}`);
    }
  });
  mo.observe(tl, { childList: true });
});

const rt = () => page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  return { activeTabId: g.activeTabId, tabs: (g.tabs||[]).map(t=>t.id), hovered: g.hovered, collapsed: g.collapsed };
});

// Add 3 tabs with explicit hovered/collapsed capture right after
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i=0;i<3;i++){ g.tabSeq = g.tabSeq+1; const id='tab-'+g.tabSeq; g.tabs.push({id,title:'Tab'+i,icon:'material-symbols-light:article-outline',content:'_components/tab-new.html'}); g.activeTabId=id; }
});
await sleep(150);
console.log('right after push signals:', JSON.stringify(await rt()));
console.log('log so far:', JSON.stringify(await page.evaluate(()=>window.__log)));

const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
console.log('sidebar box:', JSON.stringify(box));

await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(500);
console.log('after hoverIn signals:', JSON.stringify(await rt()));
console.log('log:', JSON.stringify(await page.evaluate(()=>window.__log)));
await page.mouse.move(3,3); await sleep(500);
console.log('after hoverOut signals:', JSON.stringify(await rt()));
console.log('log:', JSON.stringify(await page.evaluate(()=>window.__log)));

console.log('\nLOGS:', logs.join('\n') || '(none)');
await browser.close();
