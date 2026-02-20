// Third-party Nexus-UX Plugin Example
const CustomPlugin = {
    name: 'test-plugin',
    attribute: 'test-plugin',
    handle: (el, expression, runtime) => {
        el.style.border = '4px solid #f0f'; // Fuchsia
        el.innerHTML += `<div class="badge badge-secondary absolute -top-4 -right-4 rotate-12 z-50 shadow-xl font-bold">Dynamic Plugin Loaded: ${expression}</div>`;
        console.log(`[Plugin] Successfully applied data-test-plugin="${expression}" to ${el.tagName}`);
    }
};

// Decentralized Registration via the new Public API
if (globalThis.Nexus) {
    globalThis.Nexus.register('attribute', 'test-plugin', CustomPlugin);
} else {
    console.error("[Plugin Error] Global Nexus instance not found!");
}
