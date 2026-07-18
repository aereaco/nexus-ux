import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const dc = document.querySelector('.drawer-content');
  if (dc) dc.__nexusSigInitTrace = true;
  // Trap global tabs writes
  const g = window._NEXUS_RUNTIME.globalSignals();
  let backing = g.tabs;
  Object.defineProperty(g, 'tabs', {
    get(){ return backing; },
    set(v){ console.log('[TABSSET] global tabs overwritten from len', Array.isArray(backing)?backing.length:'?', 'to len', Array.isArray(v)?v.length:'?', 'stack:', new Error().stack.split('\n').slice(1,4).join(' | ')); backing = v; }
  });
});
await sleep(1000);

const rt = () => page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  return { tabs: (g.tabs||[]).map(t=>t.id), hovered: g.hovered };
});

await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i=0;i<3;i++){ g.tabSeq=g.tabSeq+1; const id='tab-'+g.tabSeq; g.tabs.push({id,title:'Tab'+i,icon:'x',content:'_components/tab-new.html'}); g.activeTabId=id; }
});
await sleep(300);
console.log('after push:', JSON.stringify(await rt()));

const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(500);
console.log('after hoverIn:', JSON.stringify(await rt()));

console.log('\n=== TRACE LINES ===');
console.log(logs.filter(l => l.includes('TABSSET') || l.includes('SIGINIT')).join('\n') || '(none)');
await browser.close();
