import puppeteer from "npm:puppeteer";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

// Serve the directory
const ac = new AbortController();
Deno.serve({ port: 4509, signal: ac.signal }, (req) => {
    return serveDir(req, { fsRoot: "./" });
});

console.log("Server started on http://localhost:4509");

async function runTest() {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('http://localhost:4509/examples/dashboard/pages/attributes/show.html', { waitUntil: 'networkidle0' });
    console.log("Page loaded.");
    
    // Set a known state in IndexedDB directly to simulate the save without UI clicks
    console.log("Injecting test state into IDB...");
    await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('nexus-store', 2);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains('forks')) {
                    req.result.createObjectStore('forks');
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                const tx = db.transaction('forks', 'readwrite');
                const store = tx.objectStore('forks');
                store.put('test code', '/modules/attributes/show.ts_PersistenceCheck123');
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
            req.onerror = () => reject(req.error);
        });
    });
    
    console.log("State injected. Reloading page...");
    await page.reload({ waitUntil: 'networkidle0' });
    
    // Wait for the Promise in data-on-load to resolve
    await new Promise(r => setTimeout(r, 2000));
    
    // Evaluate if 'PersistenceCheck123' is in the DOM
    const dropdownHtml = await page.evaluate(() => {
        const selects = document.querySelectorAll('select[data-model="activeFork"]');
        if (selects.length > 0) {
            return selects[0].outerHTML;
        }
        return "No select found";
    });
    
    console.log("\n\n--- DROPDOWN HTML ---");
    console.log(dropdownHtml);
    console.log("---------------------\n\n");
    
    await browser.close();
    ac.abort();
    console.log("Test complete.");
}

runTest().catch(err => {
    console.error("Test failed:", err);
    ac.abort();
    Deno.exit(1);
});
