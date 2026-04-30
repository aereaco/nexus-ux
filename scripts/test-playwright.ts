import { chromium } from "npm:playwright";

(async () => {
    console.log("Launching headless Playwright browser...");
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let logs: string[] = [];

    page.on('console', msg => {
        logs.push(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', error => {
        logs.push(`[PAGE ERROR] ${error.message}`);
    });
    page.on('requestfailed', request => {
        logs.push(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('crash', () => {
        logs.push(`[CRASH] The page has crashed!`);
    });

    console.log("Navigating to signal.html...");
    try {
        await page.goto('http://localhost:4507/site/dashboard/pages/attributes/signal.html', {
            waitUntil: 'networkidle',
            timeout: 10000 
        });
        console.log("Navigation complete.");
    } catch (e) {
        console.log("Navigation timed out or failed:", e.message);
    }
    
    console.log("--- BROWSER LOGS ---");
    logs.forEach(l => console.log(l));
    console.log("--------------------");

    await browser.close();
})();
