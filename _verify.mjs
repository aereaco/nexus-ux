import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto('http://127.0.0.1:8081/site/index.html', { waitUntil:'networkidle' });
await p.waitForTimeout(2500);
const tabs = async () => p.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t=>({id:t.getAttribute('data-key')||t.__nexusKey, title:t.querySelector('[data-bind]')?.textContent, wrap: getComputedStyle(t.querySelector('span')).whiteSpace, rectW: Math.round(t.getBoundingClientRect().width)})));
console.log('initial:', JSON.stringify(await tabs()));
// click + three times
for (let i=0;i<3;i++){ await p.click('[data-class*="hidden: !pageTabs"]'); await p.waitForTimeout(300); }
console.log('after 3 adds:', JSON.stringify(await tabs()));
// close the 2nd tab (index1)
const closers = await p.$$('[role="tab"] [aria-label="Close tab"]');
if (closers[1]) { await closers[1].click(); await p.waitForTimeout(400); }
console.log('after closing 2nd:', JSON.stringify(await tabs()));
// add again -> must not collide
await p.click('[data-class*="hidden: !pageTabs"]'); await p.waitForTimeout(400);
console.log('after 1 more add:', JSON.stringify(await tabs()));
await b.close();
