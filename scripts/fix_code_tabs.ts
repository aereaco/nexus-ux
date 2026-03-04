import { walk } from "https://deno.land/std/fs/walk.ts";

const START_DIR = "./examples/dashboard/pages";

async function main() {
    let touched = 0;

    for await (const entry of walk(START_DIR, { exts: [".html"] })) {
        let content = await Deno.readTextFile(entry.path);
        
        let modified = false;

        // Okay, the exact problem across all pages:
        // Because of my previous regexes, the structure currently looks like:
        // `                    <div data-show="activeTab === 'preview'" style="display: none;">`
        // `                        <div class="p-8 bg-base-200 ...">`
        // `                            ... `
        // `                        <div class="mt-6 text-xl"> ... </div>`  <-- This is just the inner content
        // `                    <div data-show="activeTab === 'code'" ...>`   <-- BAD! This is inside the `p-8` div AND the `preview` div!
        // `                        <pre>...</pre>`
        // `                                        </div>`                 <-- Closes Code tab
        // `                </div>`                                         <-- Closes inner content div? OR closes preview?
        // `            </div>`                                             <-- Closes card-body?
        
        // This is a disaster of regex balancing. String replacement is completely the wrong tool for this because different pages have different number of inner `<divs>` inside their Preview content.
        // I MUST use an AST parser. I will use deno-dom again, but correctly this time.
        // Wait, deno-dom is already installed.
        // Actually, since I have already butchered the HTML structure across 50 files...
        
        // Let's use deno-dom to pull out the `<pre class="mockup-code...>` element.
        // Then, completely erase `<div data-show="activeTab === 'code'"` and all its broken wrappers.
        // Then, find `<div data-show="activeTab === 'preview'">` and inject the Code tab SAFELY AFTER IT by mutating the DOM algebraically!

        // BUT deno-dom might choke on the unclosed divs and arbitrarily close them at the end of the body.
        // Yes, if I look at `model.html` dump log lines 36-39:
        // </div>
        // <div data-show="activeTab === 'code'" style="display: none;">
        // <pre>...</pre>
        // </div>
        // </div>
        // </div>
        // 
        // THIS IS JUST A STRING REPLACEMENT FIX!
        // The Code tab `<div data-show...code>` is literally inside the `preview` tab.
        // ALL I have to do is find the exact string `<div data-show="activeTab === 'code'"` and push it down!
        // Wait, NO. If it's inside `preview`, then the `</div>` that closes `preview` is below it!
        // So I just need to SWAP them!
        
        // Current:
        // `<div data-show="activeTab === 'code'"> ... </div>` (this whole block)
        // `</div>` (the one closing preview)
        
        // Target:
        // `</div>` (the one closing preview)
        // `<div data-show="activeTab === 'code'"> ... </div>`
        
        // Let's grab the Code tab block using a non-greedy regex:
        const extractCodeTab = /<div data-show="activeTab === 'code'"[^>]*>[\s\S]*?<\/pre>\s*<\/div>/g;
        
        let codeTabStored = "";
        if (extractCodeTab.test(content)) {
            content = content.replace(extractCodeTab, (match) => {
                codeTabStored = match;
                return ""; // completely erase it from its current broken nested location
            });
            
            // Now `content` is missing the code tab entirely.
            // Where should it go?
            // Right before the LAST </div></div></div> sequence of the `card-body`.
            // The structure of the surrounding card is:
            // ```
            // <div class="card bg-base-100 shadow-xl border border-base-300 mb-8 mt-8" data-signal="{ activeTab: 'preview' }">
            //     <div class="card-body">
            //         <div class="flex...tabs...">...</div>
            //         <div data-show="activeTab === 'preview'">
            //             <div class="p-8...">
            //                 ... inner demo content ...
            //             </div>
            //         </div>   <-- We want to inject EXACTLY HERE!
            //     </div>
            // </div>
            // ```
            // Because we erased the Code tab from the middle, the file now ends the card like this:
            // `                    </div>` (closes inner demo content)
            // `                </div>` (closes preview tab)
            // `            </div>` (closes card-body)
            // `        </div>` (closes card)
            
            // We can just find that sequence at the end of the first card, and inject our `codeTabStored` right before the last two `</div>`s!
            
            // Actually, because of all my regex mangling, some files might have extra `</div>`s or missing ones.
            // Let's find the `Extensibility Notes` card. The Main Interactive Demo Card strictly ends right before it.
            const splitPoint = /<\/div>\s*<\/div>(\s*<\/div>)*\s*<div class="card bg-base-100 shadow-xl border border-base-300 mt-8">/g;
            
            if (splitPoint.test(content)) {
                content = content.replace(splitPoint, (match) => {
                    // Match contains a bunch of `</div>` and then `<div class="card...Extensibility...">`
                    // We just replace the whole sequence with balanced layout:
                     return `
                    </div>
                    ${codeTabStored}
                </div>
            </div>

            <div class="card bg-base-100 shadow-xl border border-base-300 mt-8">`;
                });
                modified = true;
            }
        }

        if (modified) {
            await Deno.writeTextFile(entry.path, content);
            touched++;
            console.log("Mathematically repositioned Code Tab in:", entry.path);
        }
    }
    console.log(`Finished fixing ${touched} demo files!`);
}

main();
