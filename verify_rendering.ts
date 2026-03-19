import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const html = await Deno.readTextFile("examples/dashboard/pages/attributes/signal.html");
const doc = new DOMParser().parseFromString(html, "text/html");

if (!doc) {
  console.error("Failed to parse HTML");
  Deno.exit(1);
}

// 1. Verify FOUC Styles
const style = doc.querySelector("style")?.textContent;
const hasFoucStyle = style?.includes("main { opacity: 0;") && style?.includes(".nexus-ready main { opacity: 1;");
console.log(`[Verification] FOUC Prevention CSS Present: ${hasFoucStyle}`);

// 2. Verify Initial State
const signal = doc.querySelector("html")?.getAttribute("data-signal");
const hasInitialAppReadyFalse = signal?.includes("appReady: false");
console.log(`[Verification] Initial appReady state is false: ${hasInitialAppReadyFalse}`);

// 3. Verify Class Toggling
const bodyClassSignal = doc.querySelector("body")?.getAttribute("data-class-nexus-ready");
const hasClassSignal = bodyClassSignal === "appReady";
console.log(`[Verification] Body has nexus-ready class toggle linked to appReady: ${hasClassSignal}`);

// 4. Verify Late Event Ignition logic in bundle
const bundle = await Deno.readTextFile("dist/nexus-ux.js");
const hasLateEventIgnition = bundle.includes("readyState === \"complete\"") || bundle.includes("readyState === 'complete'");
console.log(`[Verification] Late Event Ignition logic in bundle: ${hasLateEventIgnition}`);

if (hasFoucStyle && hasInitialAppReadyFalse && hasClassSignal && hasLateEventIgnition) {
  console.log("--- RENDERING ORCHESTRATION VERIFIED (STRUCTURAL PROOF) ---");
} else {
  console.error("--- VERIFICATION FAILED ---");
  Deno.exit(1);
}
