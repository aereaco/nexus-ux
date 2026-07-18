import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1500);

console.log('=== PAGE ERRORS / CONSOLE (first 30) ===');
console.log(logs.slice(0,30).join('\n') || '(none)');

// Add tabs so we have something visible
await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i = 0; i < 3; i++) { g.tabSeq=(g.tabSeq||0)+1; const id='tab-'+g.tabSeq; g.tabs=[...g.tabs,{id,title:'Tab'+i,icon:'x',content:'_components/tab-new.html'}]; g.activeTabId=id; }
});
await sleep(600);

// Screenshot BEFORE
await page.screenshot({ path: '/tmp/kilo/before.png', fullPage: false });

// Capture structural state before
const before = await page.evaluate(() => {
  const bar = document.querySelector('[role="tablist"]');
  const panel = document.querySelector('[role="tabpanel"]');
  return {
    tabHeaders: bar ? [...bar.children].filter(c=>!c.hasAttribute('data-ux-template')).length : -1,
    panelHtmlLen: panel ? panel.innerHTML.length : -1,
    panelText: panel ? panel.innerText.slice(0, 60).replace(/\n/g,' ') : 'EMPTY',
  };
});
console.log('\nBEFORE hover:', JSON.stringify(before));

// Hover the sidebar
const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + 120);
await sleep(800);

// Screenshot AFTER
await page.screenshot({ path: '/tmp/kilo/after.png', fullPage: false });

const after = await page.evaluate(() => {
  const bar = document.querySelector('[role="tablist"]');
  const panel = document.querySelector('[role="tabpanel"]');
  return {
    tabHeaders: bar ? [...bar.children].filter(c=>!c.hasAttribute('data-ux-template')).length : -1,
    panelHtmlLen: panel ? panel.innerHTML.length : -1,
    panelText: panel ? panel.innerText.slice(0, 60).replace(/\n/g,' ') : 'EMPTY',
  };
});
console.log('AFTER hover: ', JSON.stringify(after));

// Did ANY error happen during hover?
console.log('\n=== console/errors AFTER hover ===');
console.log(logs.slice(30).join('\n') || '(none new)');

await browser.close();
console.log('\nScreenshots saved: /tmp/kilo/before.png /tmp/kilo/after.png');
