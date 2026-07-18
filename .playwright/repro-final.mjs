import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:8081/site/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1000);

await page.evaluate(() => {
  const g = window._NEXUS_RUNTIME.globalSignals();
  for (let i = 0; i < 3; i++) { g.tabSeq=(g.tabSeq||0)+1; const id='tab-'+g.tabSeq; g.tabs=[...g.tabs,{id,title:'Tab'+i,icon:'x',content:'_components/tab-new.html'}]; g.activeTabId=id; }
});
await sleep(500);

const snap = () => page.evaluate(() => {
  const bar = document.querySelector('[role="tablist"]');
  const panel = document.querySelector('[role="tabpanel"]');
  const headers = bar ? [...bar.querySelectorAll('[role="tab"]')].map(h => h.getAttribute('data-on-click') ? 'tab' : 'x') : [];
  return {
    tabHeaders: bar ? [...bar.children].filter(c=>!c.hasAttribute('data-ux-template')).length : -1,
    panelChildren: panel ? panel.children.length : -1,
    panelHtmlLen: panel ? panel.innerHTML.length : -1,
    panelFirstChild: panel && panel.firstElementChild ? panel.firstElementChild.tagName + (panel.firstElementChild.id?'#'+panel.firstElementChild.id:'') : 'EMPTY',
  };
});
const before = await snap();
console.log('BEFORE hover:', JSON.stringify(before));

const sidebar = page.locator('.drawer-side');
const box = await sidebar.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + 120); await sleep(700);
const after = await snap();
console.log('AFTER hover: ', JSON.stringify(after));
console.log(after.tabHeaders !== before.tabHeaders || after.panelChildren !== before.panelChildren || after.panelHtmlLen !== before.panelHtmlLen
  ? '>>> TAB/Panel state CHANGED on hover (potential bug)'
  : '>>> Tab/Panel state UNCHANGED on hover (OK)');
await browser.close();
