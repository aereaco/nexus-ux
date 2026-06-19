import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('CONSOLE LOG:', msg.text());
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:4507/site/dashboard/pages/interaction/drag.html', { waitUntil: 'networkidle0' });
  
  console.log('Page loaded successfully.');
  
  // Try to find the simpleList and its items
  const items = await page.$$('[data-teleport\\:drop="simpleList"] > div');
  console.log('Found draggable items:', items.length);

  await browser.close();
})();
