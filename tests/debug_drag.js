import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:8080/dashboard/pages/interaction/drag.html', { waitUntil: 'networkidle2' });
  
  const dragCount = await page.evaluate(() => {
    return document.querySelectorAll('[data-drag]').length;
  });
  console.log('Draggable items count:', dragCount);
  
  await browser.close();
})();
