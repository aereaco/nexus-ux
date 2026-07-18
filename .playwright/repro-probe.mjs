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

// Discover globals
const keys = await page.evaluate(() => Object.keys(window).filter(k => /nexus|Nexus|runtime|Runtime/i.test(k)));
console.log('nexus-like globals:', JSON.stringify(keys));

// Try to find globalSignals accessor anywhere
const probe = await page.evaluate(() => {
  const out = {};
  for (const k of Object.keys(window)) {
    const v = window[k];
    if (v && typeof v === 'object') {
      if (typeof v.globalSignals === 'function') out[k + '.globalSignals'] = 'fn';
      if (v.runtime && typeof v.runtime.globalSignals === 'function') out[k + '.runtime.globalSignals'] = 'fn';
    }
  }
  return out;
});
console.log('globalSignals probe:', JSON.stringify(probe));

// Dump tab-related DOM thoroughly
const dom = await page.evaluate(() => {
  const tablist = document.querySelector('[role="tablist"]');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  return {
    tablistFound: !!tablist,
    tabCount: tabs.length,
    tabs: tabs.map(t => ({
      text: t.textContent.trim().slice(0,40),
      ariaSelected: t.getAttribute('aria-selected'),
    })),
  };
});
console.log('DOM:', JSON.stringify(dom, null, 2));
console.log('LOGS:', logs.join('\n'));
await browser.close();
