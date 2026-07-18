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
  return {
    activeTabId: g.activeTabId,
    tabs: (g.tabs || []).map(t => t.id),
    hovered: g.hovered, collapsed: g.collapsed,
  };
});
const domTabs = () => page.evaluate(() =>
  [...document.querySelectorAll('[role="tab"]')].map(t => t.textContent.trim().slice(0,30)));

console.log('INITIAL signals:', JSON.stringify(await rt()));
console.log('INITIAL dom:', JSON.stringify(await domTabs()));

// Click "New Tab" button 3 times to create tabs
const newTabBtn = page.locator('[role="tablist"] button').last();
for (let i = 0; i < 3; i++) { await newTabBtn.click(); await sleep(300); }
console.log('\nAFTER 3x NEW TAB signals:', JSON.stringify(await rt()));
console.log('AFTER 3x NEW TAB dom:', JSON.stringify(await domTabs()));

// Now hover the sidebar in/out to collapse/expand
const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
async function hoverIn() { await page.mouse.move(box.x + box.width/2, box.y + 120); await sleep(400); }
async function hoverOut() { await page.mouse.move(5,5); await sleep(400); }

console.log('\n=== HOVER CYCLES (collapse sidebar while multiple tabs open) ===');
for (let i = 0; i < 6; i++) {
  await hoverIn();
  const s1 = await rt(); const d1 = await domTabs();
  await hoverOut();
  const s2 = await rt(); const d2 = await domTabs();
  console.log(`cycle ${i+1}: hovered-in tabs=${JSON.stringify(s1.tabs)} dom=${JSON.stringify(d1)} | hovered-out tabs=${JSON.stringify(s2.tabs)} dom=${JSON.stringify(d2)}`);
  if (JSON.stringify(s1.tabs) !== JSON.stringify((await rt.call()).tabs)) {} // noop
}

// Also test dragging the last tab to reorder, then hover
console.log('\n=== DRAG + HOVER ===');
const before = await rt();
const tabs = await page.locator('[role="tab"]').all();
const last = tabs[tabs.length-1];
const lb = await last.boundingBox();
const first = tabs[0];
const fb = await first.boundingBox();
await page.mouse.move(lb.x + lb.width/2, lb.y + lb.height/2);
await page.mouse.down();
await page.mouse.move(lb.x - 80, lb.y, { steps: 10 });
await page.mouse.move(fb.x + fb.width/2, fb.y + fb.height/2, { steps: 10 });
await page.mouse.up();
await sleep(400);
console.log('after drag signals:', JSON.stringify(await rt()));
console.log('after drag dom:', JSON.stringify(await domTabs()));
await hoverIn(); await hoverOut();
console.log('after drag+hover signals:', JSON.stringify(await rt()));
console.log('after drag+hover dom:', JSON.stringify(await domTabs()));

console.log('\nLOGS:', logs.join('\n') || '(none)');
await browser.close();
