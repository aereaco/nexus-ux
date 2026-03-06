import puppeteer from "npm:puppeteer";

async function run() {
  console.log("Launching headless browser via Deno and Puppeteer...");
  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error(`[BROWSER EXCEPTION]: ${error.message} \n ${error.stack}`);
  });

  console.log("Navigating to show.html...");
  try {
    await page.goto("http://localhost:4507/examples/dashboard/pages/attributes/show.html", {
      waitUntil: "networkidle0",
      timeout: 10000
    });
    console.log("Page loaded successfully.");
  } catch(e) {
    console.warn("Navigation warning: ", e.message);
  }

  await browser.close();
}

run();
