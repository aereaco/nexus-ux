import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
let navCount=0; p.on('framenavigated', ()=>navCount++);
await p.goto('http://127.0.0.1:8081/site/index.html', { waitUntil:'networkidle' });
await p.waitForTimeout(2500);
const active = async () => p.evaluate(()=>{const t=[...document.querySelectorAll('[role=tab]')].find(x=>x.getAttribute('aria-selected')==='true');return t?t.textContent.trim():null;});
console.log('initial active:', await active());
// confirm no full navigation occurred loading
console.log('navigations so far (expect 1):', navCount);
// inject a test internal link into the active panel and click it
await p.evaluate(()=>{
  const panel=[...document.querySelectorAll('[role=tabpanel]')].find(x=>getComputedStyle(x).display!=='none');
  const a=document.createElement('a'); a.href='/settings.html'; a.textContent='Go to Settings'; a.id='testlink'; panel.appendChild(a);
});
await p.click('#testlink');
await p.waitForTimeout(600);
console.log('active after clicking /settings.html link:', await active());
console.log('total navigations (should still be 1):', navCount);
// test external link is NOT intercepted
await p.evaluate(()=>{const panel=[...document.querySelectorAll('[role=tabpanel]')].find(x=>getComputedStyle(x).display!=='none');const a=document.createElement('a');a.href='https://example.com';a.textContent='ext';a.id='extlink';panel.appendChild(a);});
const beforeNav=navCount; await p.click('#extlink',{timeout:2000}).catch(()=>{});
console.log('external link caused navigation (nav delta):', navCount-beforeNav);
await b.close();
