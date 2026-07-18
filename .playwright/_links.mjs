import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
let navCount=0; p.on('framenavigated', ()=>navCount++);
await p.goto('http://127.0.0.1:8081/site/index.html', { waitUntil:'networkidle' });
await p.waitForTimeout(2500);
const active = async () => p.evaluate(()=>{const t=[...document.querySelectorAll('[role=tab]')].find(x=>x.getAttribute('aria-selected')==='true');return t?t.textContent.trim():null;});
console.log('initial active:', await active(), '| navigations(1):', navCount);
// dispatch a real click event on an internal link (bypasses mouse-overlay interception)
async function clickLink(href){
  return p.evaluate((h)=>{
    const panel=[...document.querySelectorAll('[role=tabpanel]')].find(x=>getComputedStyle(x).display!=='none');
    const a=document.createElement('a'); a.href=h; a.textContent='L'; panel.appendChild(a);
    a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    a.remove();
  }, href);
}
await clickLink('/settings.html'); await p.waitForTimeout(500);
console.log('after /settings.html link -> active:', await active(), '| navigations:', navCount);
await clickLink('/profile.html'); await p.waitForTimeout(500);
console.log('after /profile.html link -> active:', await active(), '| navigations:', navCount);
await clickLink('/home.html'); await p.waitForTimeout(500);
console.log('after /home.html link -> active:', await active(), '| navigations:', navCount);
// external link should NOT be intercepted (navigation count rises)
const before=navCount;
await p.evaluate(()=>{const a=document.createElement('a');a.href='https://example.com';a.id='ext';document.body.appendChild(a);a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));a.remove();});
await p.waitForTimeout(300);
console.log('external link navigation delta (should be >0):', navCount-before);
await b.close();
