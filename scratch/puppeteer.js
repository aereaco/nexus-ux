import puppeteer from "npm:puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on("console", msg => console.log("[PAGE LOG]", msg.text()));
  page.on("pageerror", err => console.error("[PAGE ERROR]", err.message));
  
  console.log("Navigating...");
  try {
    await page.goto("http://localhost:4507/site/dashboard/pages/interaction/drag.html", { waitUntil: "networkidle2", timeout: 5000 });
    console.log("Loaded successfully");
  } catch (e) {
    console.error("Navigation error:", e.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
