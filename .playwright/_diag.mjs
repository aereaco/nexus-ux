import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs=[];
p.on('console', m => { if(m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERR: '+e.message));
await p.goto('http://127.0.0.1:8081/site/index.html', { waitUntil:'networkidle' });
await p.waitForTimeout(3500);
const r = await p.evaluate(() => {
  const tablist = document.querySelector('[role="tablist"]');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  return {
    tabCount: tabs.length,
    tabTexts: tabs.map(t=>t.textContent.trim().slice(0,40)),
    panelCount: panels.length,
    panelInfo: panels.map(pl=>({
      show: pl.getAttribute('data-show'),
      comp: pl.getAttribute('data-component'),
      inner: pl.innerHTML.slice(0,80),
      visible: getComputedStyle(pl).display !== 'none' && pl.offsetHeight>0,
      children: pl.children.length
    })),
    activeTabId: (()=>{ const w=[...document.querySelectorAll('[data-signal]')].find(d=>d.getAttribute('data-signal')?.includes('activeTabId')); return w? w.__nexusScope||w.getAttribute('data-signal'):'?'; })()
  };
});
console.log(JSON.stringify(r,null,2));
console.log('ERRORS:', errs.slice(0,15).join('\n'));
await b.close();
