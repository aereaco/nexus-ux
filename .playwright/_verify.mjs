import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto('http://127.0.0.1:8081/site/index.html', { waitUntil:'networkidle' });
await p.waitForTimeout(2500);
const tabs = async () => p.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t=>({key: t.getAttribute('data-key'), title: t.querySelector('[data-bind]')?.textContent, wrap: getComputedStyle(t.querySelector('span')).whiteSpace})));
const addBtn = async () => { await p.click('[role="tablist"] > button'); await p.waitForTimeout(400); };
console.log('initial:', JSON.stringify(await tabs()));
await addBtn(); await addBtn(); await addBtn();
console.log('after 3 adds:', JSON.stringify(await tabs()));
const closers = await p.$$('[role="tab"] [aria-label="Close tab"]');
if (closers[1]) { await closers[1].click(); await p.waitForTimeout(400); }
console.log('after closing 2nd:', JSON.stringify(await tabs()));
await addBtn();
console.log('after 1 more add:', JSON.stringify(await tabs()));
await b.close();
