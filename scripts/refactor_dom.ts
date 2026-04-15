import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { walk } from "https://deno.land/std/fs/walk.ts";

const START_DIR = "./examples/dashboard/pages";

async function main() {
    let touched = 0;
    const parser = new DOMParser();

    for await (const entry of walk(START_DIR, { exts: [".html"] })) {
        if (entry.path.includes('teleport.html')) continue;

        let content = await Deno.readTextFile(entry.path);
        
        // Skip files already refactored 
        if (content.includes('data-class-tab-active="activeTab === \'preview\'"')) {
            continue;
        }

        const doc = parser.parseFromString(content, "text/html");
        if (!doc) continue;

        const mockupCode = doc.querySelector('pre.mockup-code');
        if (!mockupCode) {
            console.log("No mockup-code found in:", entry.path);
            continue;
        }
        
        // Try to find the Syntax card (the parent of mockupCode)
        let syntaxCard = mockupCode.parentElement;
        while (syntaxCard && !syntaxCard.classList.contains('card')) {
             syntaxCard = syntaxCard.parentElement;
        }

        // Try to find the interactive demo container. 
        const h2s = doc.querySelectorAll('h2.card-title');
        let demoH2 = null;
        for (const h2 of h2s) {
            if (h2.textContent.includes('Interactive Demonstration') || 
                h2.textContent.includes('Event Propagation') ||
                h2.textContent.includes('Self Execution') ||
                h2.textContent.includes('Network Payload') ||
                h2.textContent.includes('System Preference') ||
                h2.textContent.includes('Ingest Matrix') ||
                h2.textContent.includes('State Expiry')) {
                demoH2 = h2;
                break;
            }
        }

        // If not found by custom text, try to just pick the second card's title
        if (!demoH2 && h2s.length >= 2) {
             demoH2 = h2s[1];
        }

        if (!demoH2 || !syntaxCard) {
            console.log("Missing interactive container or syntax card in:", entry.path);
            continue;
        }

        let demoCard = demoH2.parentElement;
        while (demoCard && !demoCard.classList.contains('card')) {
            demoCard = demoCard.parentElement;
        }
        
        if (!demoCard) continue;

        let demoContainer = demoCard.querySelector('.bg-base-200.rounded-box');
        if (!demoContainer) {
            demoContainer = demoH2.nextElementSibling as any;
            if (!demoContainer) {
                 console.log("Failed to locate demo inner container:", entry.path);
                 continue;
            }
        }
        
        const originalDemoHTML = demoContainer.innerHTML;
        const originalDemoClasses = (demoContainer as any).className || "mt-4 p-8 bg-base-200 rounded-box border shadow-inner";
        
        const mockupHtml = mockupCode.outerHTML.replace(/mt-4|mb-8/g, 'mt-0 mb-0');

        const newUI = `
            <div class="card bg-base-100 shadow-xl border border-base-300 mb-8 mt-8" data-signal="{ activeTab: 'preview' }">
                <div class="card-body">
                    <div class="flex flex-col md:flex-row justify-between md:items-center border-b border-base-300 pb-4 mb-4 gap-4">
                        <h2 class="card-title text-secondary">Interactive Demonstration</h2>
                        <div class="tabs tabs-boxed bg-base-200">
                            <a class="tab" data-class-tab-active="activeTab === 'preview'" data-on-click="activeTab = 'preview'">Preview</a> 
                            <a class="tab" data-class-tab-active="activeTab === 'code'" data-on-click="activeTab = 'code'">Code</a> 
                        </div>
                    </div>

                    <div data-show="activeTab === 'preview'">
                        <div class="${originalDemoClasses}">
                            ${originalDemoHTML}
                        </div>
                    </div>
                    
                    <div data-show="activeTab === 'code'" style="display: none;">
                        ${mockupHtml}
                    </div>
                </div>
            </div>`;

        // Replace syntaxCard entirely with the new UI wrapper
        syntaxCard.outerHTML = newUI;
        // Delete the redundant demo card
        demoCard.remove();

        const updatedHTML = "<!DOCTYPE html>\n" + doc.documentElement!.outerHTML;
        
        await Deno.writeTextFile(entry.path, updatedHTML);
        touched++;
        console.log("AST Refactored:", entry.path);
    }
    console.log(`Finished AST refactoring ${touched} demo files!`);
}

main();
