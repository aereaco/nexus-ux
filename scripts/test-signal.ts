import puppeteer from "npm:puppeteer";

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    let logs: string[] = [];

    page.on('console', msg => logs.push(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => logs.push(`[PAGE ERROR] ${error.message}`));

    try {
        await page.goto('http://localhost:4508/site/dashboard/pages/attributes/signal.html', { waitUntil: 'networkidle0', timeout: 5000 });
    } catch (e) {}

    logs.forEach(l => console.log(l));
    
    const status = await page.evaluate(() => {
        const main = document.querySelector('main');
        return {
           hasMain: !!main,
           opacity: main ? window.getComputedStyle(main).opacity : null,
           isNexusReady: main ? main.classList.contains('nexus-ready') : null
        };
    });
    console.log("DOM Status:", JSON.stringify(status));

    await browser.close();
})();
