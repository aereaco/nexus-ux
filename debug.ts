import puppeteer from "npm:puppeteer";

async function debug() {
  console.log("Starting Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Log all console messages
  page.on("console", (msg) => console.log(`[Browser Console]: ${msg.text()}`));
  
  // Log all page errors
  page.on("pageerror", (err) => console.error("[Browser Error]:", err.message));
  
  // Track network requests
  const pendingRequests = new Set<string>();
  
  page.on("request", (req) => {
    pendingRequests.add(req.url());
    console.log(`[Network Req]: ${req.url()}`);
  });
  
  page.on("requestfinished", (req) => {
    pendingRequests.delete(req.url());
    console.log(`[Network Res]: ${req.url()} (Status: ${req.response()?.status()})`);
  });
  
  page.on("requestfailed", (req) => {
    pendingRequests.delete(req.url());
    console.error(`[Network Fail]: ${req.url()} (${req.failure()?.errorText})`);
  });

  console.log("Navigating to signal.html...");
  try {
    await page.goto("http://localhost:4507/examples/dashboard/pages/attributes/signal.html", {
      waitUntil: "load",
      timeout: 10000,
    });
    console.log("Page loaded successfully.");
  } catch (e) {
    console.error("Navigation failed or timed out:", e.message);
    console.log("Pending requests at timeout:");
    for (const req of pendingRequests) {
      console.log(`- ${req}`);
    }
  }

  const html = await page.content();
  console.log(`Page HTML length: ${html.length}`);
  
  await browser.close();
}

debug();
