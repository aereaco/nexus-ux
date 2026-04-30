const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let logs = [];

    page.on('console', msg => {
        logs.push(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', error => {
        logs.push(`[PAGE ERROR] ${error.message}`);
    });
    page.on('requestfailed', request => {
        logs.push(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('error', err => {
        logs.push(`[ERROR] ${err.message}`);
    });

    console.log("Navigating...");
    try {
        await page.goto('http://localhost:4507/site/dashboard/pages/attributes/signal.html', {
            waitUntil: 'networkidle2',
            timeout: 10000 
        });
        console.log("Navigation complete.");
    } catch (e) {
        console.log("Navigation timed out or failed:", e.message);
    }
    
    console.log("--- LOGS ---");
    logs.forEach(l => console.log(l));
    console.log("------------");

    await browser.close();
})();
