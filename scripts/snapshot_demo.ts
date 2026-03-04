import puppeteer from 'npm:puppeteer';

async function main() {
    const browser = await puppeteer.launch({
        executablePath: Deno.env.get("PUPPETEER_EXECUTABLE_PATH") || undefined,
        headless: "new",
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const url = 'http://127.0.0.1:8082/examples/dashboard/pages/attributes/model.html';
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('a.tab');
    await page.click('a.tab:nth-child(2)');
    await new Promise(r => setTimeout(r, 1000));
    
    // Dump the absolute outerHTML of the entire Card containing activeTab
    const cardHtml = await page.evaluate(() => {
        const card = document.querySelector('div[data-signal*="activeTab"]');
        return card ? card.outerHTML : 'CARD NOT FOUND';
    });
    console.log("--- FULL CARD HTML DUMP ---");
    console.log(cardHtml);
    
    await browser.close();
}
main();
