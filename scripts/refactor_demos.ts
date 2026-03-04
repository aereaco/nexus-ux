import { walk } from "https://deno.land/std/fs/walk.ts";

const START_DIR = "./examples/dashboard/pages";

const targetRegex = /<div class="card bg-base-100 shadow-xl border border-base-300 mb-8 mt-8">\s*<div class="card-body">\s*<h2 class="card-title text-secondary border-b border-base-300 pb-2">Syntax & API Usage<\/h2>\s*(<pre class="mockup-code[^>]+><code>[\s\S]*?<\/code><\/pre>)\s*<\/div>\s*<\/div>\s*<div class="card bg-base-100 shadow-xl border border-base-300">\s*<div class="card-body[^>]*">\s*<h2 class="card-title text-secondary[^>]*">.*?<\/h2>\s*<div class="mt-4 p-8 bg-base-200 rounded-box border shadow-inner[^>]*">([\s\S]*?)(?:<!-- Note: The closing div will be matched separately -->)/;

const preciseRegex = /<div class="card bg-base-100 shadow-xl border border-base-300 mb-8 mt-8">[\s\S]*?<pre class="mockup-code[^>]+><code>([\s\S]*?)<\/code><\/pre>[\s\S]*?<\/div>\s*<\/div>\s*<div class="card bg-base-100 shadow-xl border border-base-300">[\s\S]*?<h2 class="card-title text-secondary[^>]*">Interactive Demonstration<\/h2>\s*<div class="mt-4 p-8 bg-base-200 rounded-box border shadow-inner[^>]*">([\s\S]*?)\n\s*<\/div>\s*<\/div>\s*<\/div>/;

// A more robust approach: find the exact blocks and replace them.

async function main() {
    let touched = 0;
    for await (const entry of walk(START_DIR, { exts: [".html"] })) {
        if (entry.path.includes('teleport.html')) {
            console.log("Removing telehealth.html:", entry.path);
            await Deno.remove(entry.path);
            continue;
        }

        let content = await Deno.readTextFile(entry.path);
        
        // 1. Extract the code block
        const codeMatch = content.match(/(<pre class="mockup-code[^>]*><code>[\s\S]*?<\/code><\/pre>)/);
        if (!codeMatch) {
            console.log("Skipping (no mockup-code):", entry.path);
            continue;
        }
        const codeBlock = codeMatch[1];
        
        // 2. Extract the demo block
        const demoMatch = content.match(/<div class="mt-4 p-8 bg-base-200 rounded-box border shadow-inner[^>]*">([\s\S]*?)\n\s*<\/div>\s*<\/div>\s*<\/div>/);
        if (!demoMatch) {
             console.log("Skipping (no demo container):", entry.path);
             continue;
        }
        const demoContent = demoMatch[1];

        // 3. Extract the entire old syntax card and interactive demo card to replace
        const oldSyntaxCardStart = content.indexOf('<div class="card bg-base-100 shadow-xl border border-base-300 mb-8 mt-8">');
        const oldDemoCardEnd = demoMatch.index! + demoMatch[0].length;
        
        if (oldSyntaxCardStart === -1 || oldSyntaxCardStart > demoMatch.index!) {
            console.log("Skipping (order mismatch):", entry.path);
            continue; 
        }

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
                        <div class="p-8 bg-base-200 rounded-box border shadow-inner">
                            ${demoContent}
                        </div>
                    </div>
                    
                    <div data-show="activeTab === 'code'" style="display: none;">
                        ${codeBlock.replace('mt-4', 'mt-0')}
                    </div>
                </div>
            </div>`;

        const before = content.substring(0, oldSyntaxCardStart);
        const after = content.substring(oldDemoCardEnd);
        
        const newContent = before + newUI.trim() + after;
        
        await Deno.writeTextFile(entry.path, newContent);
        touched++;
        console.log("Refactored:", entry.path);
    }
    console.log(`Finished refactoring ${touched} demo files!`);
}

main();
