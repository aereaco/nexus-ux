import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const reqs=[];
p.on('response', r => { if(r.status()>=400) reqs.push(r.status()+' '+r.url()); });
p.on('requestfailed', r => reqs.push('FAIL '+r.failure()?.errorText+' '+r.url()));
await p.goto('http://127.0.0.1:8081/site/index.html', { waitUntil:'networkidle' });
await p.waitForTimeout(3500);
const r = await p.evaluate(() => {
  // find the content container div.p-6 and inspect its template + children
  const conts=[...document.querySelectorAll('div.p-6')];
  return {
    p6count: conts.length,
    p6info: conts.map(c=>({
      tmplChildren: c.children.length,
      tmplHTML: c.outerHTML.slice(0,200),
      hasDfor: !!c.querySelector('template[data-for]')
    })),
    // is there a second data-for in the doc?
    allDataFor: [...document.querySelectorAll('[data-for]')].map(e=>e.getAttribute('data-for')),
  };
});
console.log(JSON.stringify(r,null,2));
console.log('BAD REQUESTS:', reqs.join('\n')||'none');
await b.close();
