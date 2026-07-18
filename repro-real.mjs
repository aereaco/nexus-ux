import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// REAL (headed) browser on DISPLAY=:0 — not headless.
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1000);

const rt = () => page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  return { activeTabId: g.activeTabId, tabs: (g.tabs||[]).map(t=>t.id), hovered: g.hovered, collapsed: g.collapsed };
});
const domTabs = () => page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t=>t.textContent.trim().slice(0,30)));

console.log('INITIAL signals:', JSON.stringify(await rt()), 'dom:', JSON.stringify(await domTabs()));

// Create 3 tabs via real signals set
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i=0;i<3;i++){ g.tabSeq = g.tabSeq+1; const id='tab-'+g.tabSeq; g.tabs.push({id,title:'Tab'+i,icon:'material-symbols-light:article-outline',content:'_components/tab-new.html'}); g.activeTabId=id; }
});
await sleep(500);
console.log('AFTER ADD 3 tabs signals:', JSON.stringify(await rt()), 'dom:', JSON.stringify(await domTabs()));

const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
async function hoverIn() { await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(500); }
async function hoverOut() { await page.mouse.move(3,3); await sleep(500); }

console.log('\n=== REAL BROWSER HOVER CYCLES (4 tabs open) ===');
for (let i=0;i<8;i++){
  await hoverIn();  const sIn = await rt();  const dIn = await domTabs();
  await hoverOut(); const sOut = await rt(); const dOut = await domTabs();
  const dropped = sIn.tabs.length !== 4 || sOut.tabs.length !== 4;
  console.log(`cycle ${i+1}: IN tabs=${JSON.stringify(sIn.tabs)} dom=${JSON.stringify(dIn)} | OUT tabs=${JSON.stringify(sOut.tabs)} dom=${JSON.stringify(dOut)} ${dropped?'<<< TAB DROP!':''}`);
}

// Navigate + hover
console.log('\n=== REAL BROWSER NAVIGATE + HOVER ===');
for (const p of ['/settings','/profile','/']){
  await page.evaluate((pp)=>{ const g=window._NEXUS_RUNTIME.globalSignals(); if(g.router?.navigate) g.router.navigate(pp,{tabId:g.activeTabId}); }, p);
  await hoverIn(); await hoverOut();
}
console.log('after nav+hover signals:', JSON.stringify(await rt()), 'dom:', JSON.stringify(await domTabs()));

console.log('\nLOGS:', logs.join('\n') || '(none)');
await browser.close();
