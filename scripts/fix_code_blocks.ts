import { walk } from "https://deno.land/std/fs/walk.ts";

const START_DIR = "./examples/dashboard/pages";

async function main() {
    let touched = 0;

    for await (const entry of walk(START_DIR, { exts: [".html"] })) {
        let content = await Deno.readTextFile(entry.path);
        
        // Find all code blocks inside the file globally, non-greedily, across multiple lines
        const codeRegex = /<pre class="mockup-code[^>]*>([\s\S]*?)<\/pre>/g;
        
        let modified = false;
        content = content.replace(codeRegex, (match, innerCode) => {
            
            // Only unescape the inner <code> contents, leaving `<pre><code>` structural tags intact.
            // First we extract the <code> block specifically
            const innerCodeRegex = /<code[^>]*>([\s\S]*?)<\/code>/g;
            
            let matchModified = false;
            const newMatch = match.replace(innerCodeRegex, (codeMatch, actualCode) => {
                
                // If it contains naked tags like <div, then we need to escape it!
                if (actualCode.includes('<') && !codeMatch.includes('&lt;')) {
                     const escaped = actualCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                     matchModified = true;
                     return codeMatch.replace(actualCode, escaped);
                }
                return codeMatch;
            });

            if (matchModified) {
                modified = true;
                return newMatch;
            }

            return match;
        });

        if (modified) {
            await Deno.writeTextFile(entry.path, content);
            touched++;
            console.log("Fixed code block in:", entry.path);
        }
    }
    console.log(`Finished fixing ${touched} demo files!`);
}

main();
