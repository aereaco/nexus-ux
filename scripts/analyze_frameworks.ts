import { walk } from "https://deno.land/std@0.212.0/fs/walk.ts";

async function analyze() {
    const frameworks = [
        { name: "Alpine.js", path: "/home/aerea/development/alpine/packages/alpinejs/src" },
        { name: "Datastar", path: "/home/aerea/development/datastar/library/src" },
        { name: "HTMX", path: "/home/aerea/development/htmx/src" },
        { name: "Nexus-UX", path: "/home/aerea/development/nexus-ux/src" }
    ];

    let md = "# Exhaustive Framework File Tracker\n\n";

    for (const fw of frameworks) {
        md += `## ${fw.name}\n\n`;
        let totalFiles = 0;
        let totalLines = 0;
        
        const files = [];
        try {
            for await (const entry of walk(fw.path, { exts: [".ts", ".js", ".mjs"] })) {
                if (entry.isFile) files.push(entry);
            }
        } catch (e) {
            md += `**Error traversing ${fw.name}: ${e.message}**\n\n`;
            continue;
        }
        
        files.sort((a,b) => a.path.localeCompare(b.path));

        for (const entry of files) {
            totalFiles++;
            const content = await Deno.readTextFile(entry.path);
            const lines = content.split('\n');
            totalLines += lines.length;
            
            // Extract imports/exports and function signatures (basic regex)
            const functions = [];
            const exports = [];
            for (let i=0; i<lines.length; i++) {
                const l = lines[i].trim();
                // Find exports
                if (l.startsWith("export ") || l.startsWith("export default ")) {
                    exports.push(l.substring(0, 150)); 
                }
                // Find function declarations
                if (l.match(/^(async )?function\s+[a-zA-Z0-9_]+\s*\(/)) {
                    functions.push(l.substring(0, 150));
                }
                // Find method assignments
                if (l.match(/^[a-zA-Z0-9_]+\s*:\s*(async )?function\s*\(/)) {
                    functions.push(l.substring(0, 150));
                }
            }

            // Keyword analysis to deduce core capability utilization natively
            const caps = [];
            if (content.includes("Proxy(")) caps.push("Proxy (Reactivity)");
            if (content.includes("MutationObserver")) caps.push("MutationObserver");
            if (content.match(/\bfetch\(/)) caps.push("Fetch API");
            if (content.includes("EventSource")) caps.push("EventSource (SSE)");
            if (content.includes("WebSocket")) caps.push("WebSocket");
            if (content.match(/\bXMLHttpRequest/)) caps.push("XMLHttpRequest");
            if (content.includes("localStorage") || content.includes("sessionStorage")) caps.push("Storage API");
            if (content.match(/\bhistory\./)) caps.push("History API");
            if (content.includes("innerHTML")) caps.push("innerHTML");
            if (content.includes("matchMedia")) caps.push("matchMedia");
            if (content.includes(".split(") || content.includes(".match(")) caps.push("String Allocations");
            if (content.includes("IntersectionObserver")) caps.push("IntersectionObserver");
            if (content.includes("serviceWorker")) caps.push("serviceWorker");
            if (content.includes("requestAnimationFrame")) caps.push("requestAnimationFrame");

            md += `### \`${entry.path.replace(fw.path, "")}\` (${lines.length} LOC)\n`;
            if (caps.length) md += `- **Detected Tech**: ${caps.join(", ")}\n`;
            if (exports.length) md += `- **Exports**: \n  - \`${exports.length > 5 ? exports.slice(0,5).join("`\n  - `") + "`\n  - `... (" + (exports.length - 5) + " more)" : exports.join("`\n  - `")}\`\n`;
            if (functions.length) md += `- **Functions**: \n  - \`${functions.length > 5 ? functions.slice(0,5).join("`\n  - `") + "`\n  - `... (" + (functions.length - 5) + " more)" : functions.join("`\n  - `")}\`\n`;
            md += "\n";
        }
        md += `\n**Total ${fw.name}**: ${totalFiles} files, ${totalLines} LOC.\n\n---\n\n`;
    }

    await Deno.writeTextFile("/home/aerea/development/exhaustive_gap_analysis_raw.md", md);
    console.log("Analysis Complete");
}
analyze();
