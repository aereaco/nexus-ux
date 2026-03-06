const files = ['nexus-ux-reference.md', 'nexus-ux-spec.md'];
const knownSprites = new Set(['fetch', 'get', 'post', 'put', 'patch', 'delete', 'sql', 'fs', 'device', 'ws', 'gql', 'el', 'refs', 'nextTick', 'dispatch', 'store', 'watch', 'clipboard', 'download', 'nexus', 'global', 'router', 'pwa']);

for (const file of files) {
  let content = Deno.readTextFileSync(file);
  
  // Regex to match $ followed by identifier.
  // We use a replacer function to check if the identifier is in knownSprites.
  content = content.replace(/\$([a-zA-Z_]\w*)/g, (match, id) => {
    if (knownSprites.has(id)) {
      return match; // Keep sprite
    }
    // Check if it looks like a variable prefix, e.g. $count -> count.
    return id; 
  });
  
  // also fix {$count} -> {count} which might have been changed to {count} cleanly
  Deno.writeTextFileSync(file, content);
}
console.log("Done fixing prefixes");
