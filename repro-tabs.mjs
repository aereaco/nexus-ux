import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8081/site/index.html';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(500);

async function getTabs() {
  return await page.evaluate(() => {
    const g = window.__nexusRuntime?.globalSignals?.() || window.nexus?.globalSignals?.();
    if (!g) return 'NO_GLOBAL_SIGNALS';
    return {
      activeTabId: g.activeTabId,
      tabs: (g.tabs || []).map(t => ({ id: t.id, title: t.title, content: t.content })),
      hovered: g.hovered,
      collapsed: g.collapsed,
    };
  });
}

async function getTabDom() {
  return await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    return tabs.map(t => t.querySelector('span')?.textContent?.trim());
  });
}

console.log('=== INITIAL ===');
console.log('signals:', JSON.stringify(await getTabs()));
console.log('DOM tabs:', JSON.stringify(await getTabDom()));

const sidebar = page.locator('.drawer-side');
const sidebarBox = await sidebar.boundingBox();
console.log('sidebar box:', JSON.stringify(sidebarBox));

async function hoverSidebar() {
  if (!sidebarBox) return;
  await page.mouse.move(sidebarBox.x + sidebarBox.width / 2, sidebarBox.y + 120);
  await sleep(400);
}
async function leaveSidebar() {
  await page.mouse.move(5, 5);
  await sleep(400);
}

console.log('\n=== HOVER IN ===');
await hoverSidebar();
console.log('signals after hover-in:', JSON.stringify(await getTabs()));
console.log('DOM tabs after hover-in:', JSON.stringify(await getTabDom()));

console.log('\n=== HOVER OUT (collapse) ===');
await leaveSidebar();
console.log('signals after hover-out:', JSON.stringify(await getTabs()));
console.log('DOM tabs after hover-out:', JSON.stringify(await getTabDom()));

for (let i = 0; i < 5; i++) {
  await hoverSidebar();
  await leaveSidebar();
}
console.log('\n=== AFTER 5x HOVER CYCLES ===');
console.log('signals:', JSON.stringify(await getTabs()));
console.log('DOM tabs:', JSON.stringify(await getTabDom()));

console.log('\n=== CONSOLE LOGS ===');
console.log(logs.join('\n') || '(none)');

await browser.close();
