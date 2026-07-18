import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const URL = 'http://127.0.0.1:8081/site/index.html';
const UNMIN = '/home/aerea/development/nexus-ux/dist/nexus-ux.js';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const unminBody = readFileSync(UNMIN, 'utf8');

const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Serve the NON-MINIFIED bundle in place of the minified one — NO file edits.
await page.route('**/dist/nexus-ux.min.js', route =>
  route.fulfill({ status: 200, contentType: 'application/javascript', body: unminBody }));

const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  let backing = g.tabs;
  Object.defineProperty(g, 'tabs', {
    get(){ return backing; },
    set(v){ console.log('[TABSSET]\n' + new Error().stack); backing = v; }
  });
});
await sleep(1000);
const rt = () => page.evaluate(() => (window._NEXUS_RUNTIME.globalSignals().tabs||[]).map(t=>t.id));
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
console.log('\n=== TABSSET STACK (non-minified, real names) ===');
console.log(logs.filter(l => l.includes('TABSSET')).join('\n---\n') || '(none)');
await browser.close();
