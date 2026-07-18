import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1000);

// Tag drawer-content and watch if it gets replaced (remount) vs just mutated
await page.evaluate(() => {
  window.__log = [];
  const dc = document.querySelector('.drawer-content');
  dc.setAttribute('data-dc-tag', 'ALIVE-' + Date.now());
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') {
        for (const n of m.removedNodes) {
          if (n instanceof HTMLElement && n.classList && n.classList.contains('drawer-content')) {
            window.__log.push('drawer-content REMOVED');
          }
        }
        for (const n of m.addedNodes) {
          if (n instanceof HTMLElement && n.classList && n.classList.contains('drawer-content')) {
            window.__log.push('drawer-content ADDED (remount)');
          }
        }
      }
    }
  });
  // observe parent of drawer-content
  obs.observe(dc.parentElement, { childList: true });
  // also detect if drawer-content gains a fresh data-dc-tag (means reprocessed in place)
  const tagObs = new MutationObserver(()=>{});
});

const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();

// add tabs
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i=0;i<3;i++){ g.tabSeq=g.tabSeq+1; const id='tab-'+g.tabSeq; g.tabs.push({id,title:'Tab'+i,icon:'x',content:'_components/tab-new.html'}); g.activeTabId=id; }
});
await sleep(200);

await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(500);
const tagAfter = await page.evaluate(() => document.querySelector('.drawer-content')?.getAttribute('data-dc-tag'));
console.log('drawer-content tag after hover:', tagAfter);
console.log('log:', JSON.stringify(await page.evaluate(()=>window.__log)));

// Check: is router.route changing on hover?
const routeBefore = await page.evaluate(()=>window._NEXUS_RUNTIME.globalSignals().router?.route);
await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(300);
const routeAfter = await page.evaluate(()=>window._NEXUS_RUNTIME.globalSignals().router?.route);
console.log('router.route before/after hover:', JSON.stringify(routeBefore), JSON.stringify(routeAfter));

await browser.close();
