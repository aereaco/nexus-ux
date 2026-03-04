import puppeteer from 'npm:puppeteer@22.4.0';
import { expandGlob } from 'https://deno.land/std@0.212.0/fs/expand_glob.ts';

async function main() {
    console.log("Starting browser...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    let failed = 0;
    
    console.log("Scanning demo files...");
    for await (const file of expandGlob("examples/dashboard/pages/**/*.html")) {
        const relativePath = file.path.split('examples/dashboard/pages/')[1];
        const url = `http://127.0.0.1:8082/examples/dashboard/pages/${relativePath}`;
        
        let hasErrors = false;
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`[${relativePath}] Console Error: ${msg.text()}`);
                hasErrors = true;
            }
        });
        
        page.on('pageerror', err => {
            console.error(`[${relativePath}] Uncaught Exception: ${err.message}`);
            hasErrors = true;
        });

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
            await new Promise(res => setTimeout(res, 500)); // allow mutations + fetch promises
        } catch (e) {
            console.error(`[${relativePath}] Navigation Timeout or Failure: ${e.message}`);
            hasErrors = true;
        }

        if (hasErrors) {
            failed++;
        } else {
            console.log(`[${relativePath}] PASS`);
        }
        
        page.removeAllListeners('console');
        page.removeAllListeners('pageerror');
    }
    
    console.log(`\nSummary: ${failed} pages generated console errors or failed to load.`);
    await browser.close();
    Deno.exit(failed > 0 ? 1 : 0);
}

main();
