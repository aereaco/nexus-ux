import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(800);

const rt = () => page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  return { activeTabId: g.activeTabId, tabs: (g.tabs||[]).map(t=>t.id), hovered: g.hovered, collapsed: g.collapsed };
});
const domTabs = () => page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t=>t.textContent.trim().slice(0,30)));

// Create 3 tabs directly via the runtime (avoids the sidebar overlap click interception)
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i=0;i<3;i++){ g.tabSeq = g.tabSeq+1; const id='tab-'+g.tabSeq; g.tabs.push({id,title:'Tab'+i,icon:'material-symbols-light:article-outline',content:'_components/tab-new.html'}); g.activeTabId=id; }
});
await sleep(400);
console.log('AFTER ADD 3 tabs signals:', JSON.stringify(await rt()));
console.log('AFTER ADD 3 tabs dom:', JSON.stringify(await domTabs()));

const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
async function hoverIn() { await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(400); }
async function hoverOut() { await page.mouse.move(5,5); await sleep(400); }

console.log('\n=== HOVER COLLAPSE/EXPAND CYCLES (3 tabs open) ===');
for (let i=0;i<8;i++){
  await hoverIn();  const sIn = await rt();  const dIn = await domTabs();
  await hoverOut(); const sOut = await rt(); const dOut = await domTabs();
  const dropped = sIn.tabs.length !== 4 || sOut.tabs.length !== 4;
  console.log(`cycle ${i+1}: IN tabs=${JSON.stringify(sIn.tabs)} dom=${JSON.stringify(dIn)} | OUT tabs=${JSON.stringify(sOut.tabs)} dom=${JSON.stringify(dOut)} ${dropped?'<<< TAB DROP!':''}`);
}

// Now navigate to trigger router.route changes while hovering
console.log('\n=== NAVIGATE + HOVER ===');
for (const p of ['/settings','/profile','/']){
  await page.evaluate((pp)=>{ const g=window._NEXUS_RUNTIME.globalSignals(); if(g.router?.navigate) g.router.navigate(pp,{tabId:g.activeTabId}); }, p);
  await hoverIn(); await hoverOut();
}
console.log('after nav+hover signals:', JSON.stringify(await rt()));
console.log('after nav+hover dom:', JSON.stringify(await domTabs()));

console.log('\nLOGS:', logs.join('\n') || '(none)');
await browser.close();
