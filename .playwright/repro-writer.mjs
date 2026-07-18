import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  let backing = g.tabs;
  Object.defineProperty(g, 'tabs', {
    get(){ return backing; },
    set(v){ const st = new Error().stack.split('\n').slice(1,8).join('\\n'); console.log('[TABSSET] len '+ (Array.isArray(backing)?backing.length:'?')+' -> '+(Array.isArray(v)?v.length:'?')+'\\n'+st); backing = v; }
  });
  // trap router.route too
  let rb = g.router?.route;
  if (g.router) Object.defineProperty(g.router, 'route', {
    get(){ return rb; }, set(v){ console.log('[ROUTESET] '+JSON.stringify(rb)+' -> '+JSON.stringify(v)); rb=v; }
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
console.log('\n=== ALL TRACE LINES ===');
console.log(logs.filter(l => l.includes('TABSSET') || l.includes('ROUTESET')).join('\n\n') || '(none)');
await browser.close();
