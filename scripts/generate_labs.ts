// scripts/generate_labs.ts
// Generates interactive Lab pages for all Nexus-UX framework modules.

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

const LABS_DIR = join(Deno.cwd(), "site", "_pages", "labs");

interface LabSpec {
  id: string;
  name: string;
  category: "attributes" | "modifiers" | "scopes" | "sprites";
  parent: string;
  order: number;
  icon: string;
  title: string;
  modulePath: string;
  description: string;
  syntax: string;
  params: Array<{ name: string; type: string; default?: string; description: string }>;
  extensibility: string;
  snippet: string;
}

const remainingAttributes: LabSpec[] = [
  {
    id: "lab-attr-assert",
    name: "assert",
    category: "attributes",
    parent: "/labs/attributes",
    order: 9,
    icon: "material-symbols-light:rule-settings-outline",
    title: "data-assert",
    modulePath: "src/modules/attributes/assert.ts",
    description: "Evaluates runtime invariant assertion expressions against element scope. Emits system diagnostics on failure.",
    syntax: '<div data-assert="count >= 0">...</div>',
    params: [
      { name: "data-assert", type: "Expression", default: "true", description: "Boolean expression that must evaluate to truthy; otherwise logs an invariant violation." }
    ],
    extensibility: "<p>The <code>assert</code> directive monitors reactive dependencies and logs error invariants when falsy conditions occur, facilitating early MCP self-healing.</p>",
    snippet: '<div data-signal="{ val: 5 }" class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <p class="text-sm">Value must be &gt;= 0:</p>\n  <div class="flex items-center gap-3">\n    <button class="btn btn-sm btn-outline" data-on-click="val--">Decrement (-1)</button>\n    <span class="font-mono text-lg font-bold" data-bind="val"></span>\n    <button class="btn btn-sm btn-outline" data-on-click="val++">Increment (+1)</button>\n  </div>\n  <div data-assert="val >= 0" class="text-xs text-success font-mono">Invariant active: val &gt;= 0</div>\n</div>'
  },
  {
    id: "lab-attr-build",
    name: "build",
    category: "attributes",
    parent: "/labs/attributes",
    order: 10,
    icon: "material-symbols-light:package-2-outline",
    title: "data-build",
    modulePath: "src/modules/attributes/build.ts",
    description: "In-browser bundler and asset packager compiling live DOM elements into IndexedDB binary payloads.",
    syntax: '<div data-build="idb://my-app-bundle">...</div>',
    params: [
      { name: "data-build", type: "URI String", default: "idb://default", description: "Target IndexedDB namespace for in-browser serialized tree packaging." }
    ],
    extensibility: "<p>The <code>build</code> directive executes ZCZS binary serialization to cache pre-compiled component trees offline without JSON serialization overhead.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-primary">data-build Active</div>\n  <p class="text-sm">Serializes element subtrees into high-performance binary memory storage.</p>\n</div>'
  },
  {
    id: "lab-attr-component",
    name: "component",
    category: "attributes",
    parent: "/labs/attributes",
    order: 11,
    icon: "material-symbols-light:web-asset",
    title: "data-component",
    modulePath: "src/modules/attributes/component.ts",
    description: "Asynchronously fetches, caches, and compiles external HTML or Markdown component files into Light or Shadow DOM.",
    syntax: '<div data-component="\'_components/header.html\'"></div>',
    params: [
      { name: "data-component", type: "URL String", default: "''", description: "Relative or absolute path to the HTML fragment or Markdown document to mount." },
      { name: "data-component:shadow", type: "Modifier", default: "false", description: "Mounts the template inside an isolated ShadowRoot with encapsulated styles." }
    ],
    extensibility: "<p>The <code>component</code> loader implements deduplicated HTTP request streaming, constructable stylesheet extraction, and seamless Markdown rendering via <code>data-markdown</code>.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <p class="text-xs font-bold text-accent">Dynamic Component Host:</p>\n  <div data-component="\'_components/tab-new.html\'" class="border border-base-content/10 rounded-lg p-2 max-h-48 overflow-y-auto"></div>\n</div>'
  },
  {
    id: "lab-attr-computed",
    name: "computed",
    category: "attributes",
    parent: "/labs/attributes",
    order: 12,
    icon: "material-symbols-light:calculate-outline",
    title: "data-computed",
    modulePath: "src/modules/attributes/computed.ts",
    description: "Declares memoized derived getters using unifiedComputed and fine-grained reactive dependency tracking.",
    syntax: '<div data-computed="{ double: () => count * 2 }">...</div>',
    params: [
      { name: "data-computed", type: "Object Literal", default: "{}", description: "Dictionary of getter functions that re-evaluate only when their reactive dependencies change." }
    ],
    extensibility: "<p>Computed values evaluate lazily and are cached using Vue 3-compatible dependency sets. They bridge directly into the element's local data stack.</p>",
    snippet: '<div data-signal="{ price: 25, quantity: 2 }"\n     data-computed="{ total: () => price * quantity, tax: () => price * quantity * 0.08 }"\n     class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <div class="flex gap-4">\n    <div><span class="text-xs opacity-70">Price:</span> <input type="number" data-bind-value="price" class="input input-bordered input-xs w-20" /></div>\n    <div><span class="text-xs opacity-70">Qty:</span> <input type="number" data-bind-value="quantity" class="input input-bordered input-xs w-20" /></div>\n  </div>\n  <div class="stat bg-base-100 rounded-lg p-3 border border-base-content/10">\n    <div class="stat-title text-xs">Total with Tax</div>\n    <div class="stat-value text-primary text-xl font-mono">$<span data-bind="(total + tax).toFixed(2)"></span></div>\n    <div class="stat-desc text-xs font-mono">Subtotal: $<span data-bind="total"></span> | Tax: $<span data-bind="tax.toFixed(2)"></span></div>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-debug",
    name: "debug",
    category: "attributes",
    parent: "/labs/attributes",
    order: 13,
    icon: "material-symbols-light:bug-report-outline",
    title: "data-debug",
    modulePath: "src/modules/attributes/debug.ts",
    description: "Enables verbose diagnostic telemetry, lifecycle profiling, and Model Context Protocol (MCP) auto-repair logging on an element.",
    syntax: '<div data-debug>...</div>',
    params: [
      { name: "data-debug", type: "Boolean / String", default: "true", description: "Activates diagnostic logs and inspects property resolutions across the DOM stack." }
    ],
    extensibility: "<p>Directly interfaces with the browser DevTools Console and engine diagnostics tracker for real-time reactivity introspection.</p>",
    snippet: '<div data-debug class="p-4 bg-base-200/50 rounded-xl space-y-2 border border-warning/30">\n  <div class="badge badge-warning text-xs font-bold">Debug Mode Active</div>\n  <p class="text-xs font-mono opacity-80">Element lifecycle changes, state diffs, and evaluations are logged to the console.</p>\n</div>'
  },
  {
    id: "lab-attr-drag",
    name: "drag",
    category: "attributes",
    parent: "/labs/attributes",
    order: 14,
    icon: "material-symbols-light:drag-pan",
    title: "data-drag",
    modulePath: "src/modules/attributes/drag.ts",
    description: "Zero-configuration drag-and-drop list and Kanban reordering engine with 60fps FLIP animations and spatial collision detection.",
    syntax: '<div data-drag-container="items"><div data-drag>...</div></div>',
    params: [
      { name: "data-drag-container", type: "Expression", default: "undefined", description: "Array or collection to mutate upon drag completion." },
      { name: "data-drag", type: "Boolean / String", default: "true", description: "Declares an element as a draggable item inside a container." },
      { name: "data-drag-group", type: "String", default: "''", description: "Optional group identifier allowing cross-container dragging." }
    ],
    extensibility: "<p>Powered by native pointer events and GPU-accelerated Web Animations API FLIP calculations. Mutates underlying reactive arrays without serialization.</p>",
    snippet: '<div data-signal="{ tasks: [\'Architecture review\', \'Performance audit\', \'Release bundle\'] }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <p class="text-xs font-bold opacity-70">Drag items to reorder:</p>\n  <div data-drag-container="tasks" class="space-y-2">\n    <template data-for="t in tasks" data-key="t">\n      <div data-drag class="p-2.5 bg-base-100 rounded-lg shadow-sm border border-base-content/10 flex items-center justify-between cursor-grab active:cursor-grabbing">\n        <span class="text-sm font-medium" data-bind="t"></span>\n        <iconify-icon icon="material-symbols-light:drag-indicator" class="text-xl opacity-40"></iconify-icon>\n      </div>\n    </template>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-effect",
    name: "effect",
    category: "attributes",
    parent: "/labs/attributes",
    order: 15,
    icon: "material-symbols-light:auto-awesome-outline",
    title: "data-effect",
    modulePath: "src/modules/attributes/effect.ts",
    description: "Executes an automatic reactive side effect that automatically tracks accessed signal dependencies and re-executes on mutations.",
    syntax: '<div data-effect="console.log(\'Count changed:\', count)">...</div>',
    params: [
      { name: "data-effect", type: "Expression", default: "undefined", description: "JavaScript expression containing signals to track and execute as side-effects." }
    ],
    extensibility: "<p>Tied directly to element lifecycle via <code>elementBoundEffect</code>. Deterministically disposed when the host element leaves the DOM.</p>",
    snippet: '<div data-signal="{ msg: \'Hello\', logs: [] }"\n     data-effect="logs = [...logs.slice(-3), \'Updated: \' + msg]"\n     class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <div class="flex items-center gap-2">\n    <input type="text" data-bind-value="msg" class="input input-bordered input-sm font-mono" />\n  </div>\n  <div class="text-xs font-mono space-y-1">\n    <div class="font-bold opacity-70">Recent Reactive Runs:</div>\n    <template data-for="l in logs" data-key="l">\n      <div class="badge badge-sm badge-outline font-mono" data-bind="l"></div>\n    </template>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-flow",
    name: "flow",
    category: "attributes",
    parent: "/labs/attributes",
    order: 16,
    icon: "material-symbols-light:account-tree-outline",
    title: "data-flow",
    modulePath: "src/modules/attributes/flow.ts",
    description: "Reactive node-graph workspace canvas featuring zoom, pan, node dragging, and dynamic SVG Bezier edge connections.",
    syntax: '<div data-flow="viewport">...</div>',
    params: [
      { name: "data-flow", type: "String / Object", default: "'viewport'", description: "Configures graph viewport parameters, minimum/maximum zoom scale, and node snapping." }
    ],
    extensibility: "<p>Zero-dependency xyflow-inspired engine built natively into the declarative runtime. Uses GPU CSS transforms for 120fps infinite canvas panning.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-accent">Node Canvas Host</div>\n  <p class="text-sm">Embeds interactive state machine and topology workflows directly into HTML.</p>\n</div>'
  },
  {
    id: "lab-attr-html",
    name: "html",
    category: "attributes",
    parent: "/labs/attributes",
    order: 17,
    icon: "material-symbols-light:code",
    title: "data-html",
    modulePath: "src/modules/attributes/html.ts",
    description: "Injects raw HTML markup into the element and runs processElement on all injected child elements.",
    syntax: '<div data-html="rawMarkup"></div>',
    params: [
      { name: "data-html", type: "Expression", default: "''", description: "Expression evaluating to an HTML string to render inside the element." }
    ],
    extensibility: "<p>Unlike innerHTML, <code>data-html</code> integrates with the Reactive Ownership Graph, compiling any child directives inside the injected markup.</p>",
    snippet: '<div data-signal="{ tag: \'badge badge-secondary\', text: \'Dynamically Injected HTML\' }"\n     class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <div data-html="\'<span class=\\\'\' + tag + \'\\\'>\' + text + \'</span>\'"></div>\n  <div class="flex gap-2">\n    <button class="btn btn-xs btn-outline" data-on-click="tag = \'badge badge-primary\'">Primary</button>\n    <button class="btn btn-xs btn-outline" data-on-click="tag = \'badge badge-accent\'">Accent</button>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-import",
    name: "import",
    category: "attributes",
    parent: "/labs/attributes",
    order: 18,
    icon: "material-symbols-light:download-for-offline-outline",
    title: "data-import",
    modulePath: "src/modules/attributes/import.ts",
    description: "Universal declarative asset loader for external JavaScript modules, constructable stylesheets, and Iconify font libraries.",
    syntax: '<div data-import="{ script: \'https://cdn.example.com/lib.js\' }">...</div>',
    params: [
      { name: "data-import", type: "Object / String", default: "{}", description: "Manifest of external scripts or stylesheet links to load and cache." }
    ],
    extensibility: "<p>Manages deduplicated script loading, global symbol injection, and link stylesheet compilation with Promise-based completion signals.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-info">Universal Import Active</div>\n  <p class="text-sm">Loads scripts, stylesheets, and icons declaratively on-demand.</p>\n</div>'
  },
  {
    id: "lab-attr-markdown",
    name: "markdown",
    category: "attributes",
    parent: "/labs/attributes",
    order: 19,
    icon: "material-symbols-light:markdown-outline",
    title: "data-markdown",
    modulePath: "src/modules/attributes/markdown.ts",
    description: "Inlines a zero-dependency streaming Markdown parser into the DOM, formatting markdown text into Tailwind prose typography.",
    syntax: '<article data-markdown="docContent" class="prose"></article>',
    params: [
      { name: "data-markdown", type: "Expression / Text", default: "undefined", description: "Markdown text string or binding to parse into formatted HTML." }
    ],
    extensibility: "<p>Supports GFM tables, alerts (<code>[!NOTE]</code>, <code>[!TIP]</code>, <code>[!WARNING]</code>), code blocks, and syntax tokens without external heavyweight libraries.</p>",
    snippet: '<div data-signal="{ mdText: \'### Interactive Markdown\\n- Fast **zero-dependency** parsing\\n- Tailwind *prose* styling\\n- Live reactive updates!\' }"\n     class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <textarea data-bind-value="mdText" class="textarea textarea-bordered w-full h-24 font-mono text-xs"></textarea>\n  <div class="divider my-1 text-xs">Preview</div>\n  <article data-markdown="mdText" class="prose max-w-none text-sm"></article>\n</div>'
  },
  {
    id: "lab-attr-mask",
    name: "mask",
    category: "attributes",
    parent: "/labs/attributes",
    order: 20,
    icon: "material-symbols-light:pin-outline",
    title: "data-mask",
    modulePath: "src/modules/attributes/mask.ts",
    description: "Real-time input pattern masking for telephone numbers, currency, credit cards, dates, and postal codes.",
    syntax: '<input data-mask="\'(999) 999-9999\'" />',
    params: [
      { name: "data-mask", type: "Pattern String", default: "''", description: "Mask template using 9 (digit), a (letter), * (alphanumeric)." }
    ],
    extensibility: "<p>Intercepts native input events, preserves cursor position, and seamlessly writes clean unmasked or masked values to the bound signal.</p>",
    snippet: '<div data-signal="{ phone: \'\' }" class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <label class="text-xs font-bold opacity-70">Phone Number Mask:</label>\n  <input type="text" data-mask="\'(999) 999-9999\'" data-bind-value="phone" placeholder="(555) 000-0000" class="input input-bordered input-sm font-mono w-48" />\n  <p class="text-xs font-mono">Bound state: <span class="font-bold text-primary" data-bind="phone"></span></p>\n</div>'
  },
  {
    id: "lab-attr-preserve",
    name: "preserve",
    category: "attributes",
    parent: "/labs/attributes",
    order: 21,
    icon: "material-symbols-light:shield-outline",
    title: "data-preserve",
    modulePath: "src/modules/attributes/preserve.ts",
    description: "Shields an element and its subtree from being overwritten, morphed, or torn down during DOM diff reconciliation passes.",
    syntax: '<div data-preserve>...</div>',
    params: [
      { name: "data-preserve", type: "Boolean", default: "true", description: "Instructs morphDOM and component reconcilers to preserve this element entirely." }
    ],
    extensibility: "<p>Ideal for embedding persistent third-party widgets (e.g. Google Maps, Canvas, WebGL contexts) inside dynamic reactive templates.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div data-preserve class="p-3 bg-base-100 rounded-lg border border-success/30 flex items-center gap-2">\n    <iconify-icon icon="material-symbols-light:shield" class="text-success text-xl"></iconify-icon>\n    <span class="text-sm font-medium">Protected against DOM morphing passes</span>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-pwa",
    name: "pwa",
    category: "attributes",
    parent: "/labs/attributes",
    order: 22,
    icon: "material-symbols-light:install-desktop",
    title: "data-pwa",
    modulePath: "src/modules/attributes/pwa.ts",
    description: "Injects the $pwa reactive global signal for offline readiness, cache updates, and native PWA installation prompts.",
    syntax: '<div data-pwa="{ sw: \'/sw.js\' }">...</div>',
    params: [
      { name: "data-pwa", type: "Object", default: "{}", description: "PWA options including service worker URL and registration scopes." }
    ],
    extensibility: "<p>Exposes <code>$pwa.canInstall</code>, <code>$pwa.install()</code>, <code>$pwa.isOnline</code>, and <code>$pwa.update()</code> globally to any template expression.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="flex items-center gap-3">\n    <div class="badge badge-success gap-1"><span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Online</div>\n    <span class="text-xs font-mono opacity-70">Service Worker Active</span>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-raf",
    name: "raf",
    category: "attributes",
    parent: "/labs/attributes",
    order: 23,
    icon: "material-symbols-light:speed-outline",
    title: "data-on-raf",
    modulePath: "src/modules/attributes/raf.ts",
    description: "High-frequency animation loop callback injecting $time and $delta timestamps synchronized with screen refresh rates.",
    syntax: '<div data-on-raf="angle += $delta * 0.1">...</div>',
    params: [
      { name: "data-on-raf", type: "Expression", default: "undefined", description: "Expression evaluated every animation frame. Injects $time and $delta." }
    ],
    extensibility: "<p>Automatically halts when the host element becomes hidden or leaves the DOM to avoid unnecessary battery drain.</p>",
    snippet: '<div data-signal="{ rotation: 0 }"\n     data-on-raf="rotation = (rotation + 2) % 360"\n     class="p-4 bg-base-200/50 rounded-xl flex items-center gap-4">\n  <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-content shadow-lg"\n       data-bind-style="\'transform: rotate(\' + rotation + \'deg);\'">\n    <iconify-icon icon="material-symbols-light:refresh" class="text-2xl"></iconify-icon>\n  </div>\n  <div>\n    <div class="text-sm font-bold">60fps RAF Loop</div>\n    <div class="text-xs font-mono opacity-70">Rotation: <span data-bind="Math.round(rotation)"></span>°</div>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-route",
    name: "route",
    category: "attributes",
    parent: "/labs/attributes",
    order: 24,
    icon: "material-symbols-light:alt-route",
    title: "data-route",
    modulePath: "src/modules/attributes/route.ts",
    description: "Declaratively registers a route record and component association into the Nexus-UX client routing table.",
    syntax: '<div data-route="/dashboard" data-component="\'_pages/dash.html\'"></div>',
    params: [
      { name: "data-route", type: "Path String", default: "''", description: "URL path pattern matching incoming routes (supports parameters like :id)." }
    ],
    extensibility: "<p>Integrates with the central Router module, allowing static and dynamically compiled page views to register without manual configuration.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-outline font-mono">data-route=\"/labs/attributes/route\"</div>\n  <p class="text-sm">Registers URL routes into the client SPA routing manifest.</p>\n</div>'
  },
  {
    id: "lab-attr-router",
    name: "router",
    category: "attributes",
    parent: "/labs/attributes",
    order: 25,
    icon: "material-symbols-light:route",
    title: "data-router",
    modulePath: "src/modules/attributes/router.ts",
    description: "Comprehensive SPA routing engine with multi-tab workspaces, automatic page discovery, and browser history synchronization.",
    syntax: '<html data-router="{ mode: \'hybrid\', pagesDir: \'_pages\' }">',
    params: [
      { name: "data-router", type: "Object Literal", default: "{}", description: "Router configuration object supporting mode, pagesDir, manifest, and error route." }
    ],
    extensibility: "<p>Exposes #router reactive state app-wide with pageTabs, navigate(), createPageTab(), switchPageTab(), and lineage breadcrumb helpers.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <p class="text-xs font-bold opacity-70">Active Route:</p>\n  <div class="font-mono text-primary text-sm font-bold" data-bind="router.path">/labs/attributes/router</div>\n  <div class="text-xs opacity-70 font-mono">Open tabs: <span data-bind="router.pageTabs.length">1</span></div>\n</div>'
  },
  {
    id: "lab-attr-scrollbar",
    name: "scrollbar",
    category: "attributes",
    parent: "/labs/attributes",
    order: 26,
    icon: "material-symbols-light:view-stream-outline",
    title: "data-scrollbar",
    modulePath: "src/modules/attributes/scrollbar.ts",
    description: "GPU-accelerated overlay scrollbar engine with smooth inertia physics, auto-hide fading, and custom styling.",
    syntax: '<div data-scrollbar="{ mode: \'overlay\', autoHide: true }">...</div>',
    params: [
      { name: "data-scrollbar", type: "Object", default: "{ mode: 'overlay' }", description: "Configures scrollbar mode, autoHide behavior, and thumb sizes." }
    ],
    extensibility: "<p>Eliminates layout shifts caused by native platform scrollbars while maintaining full accessibility and touch compatibility.</p>",
    snippet: '<div data-scrollbar class="h-32 overflow-y-auto p-4 bg-base-200/50 rounded-xl space-y-2 border border-base-content/10">\n  <p class="text-xs font-bold opacity-70">Custom Overlay Scrollbar Demo:</p>\n  <div class="space-y-2 text-sm font-mono opacity-80">\n    <p>Scroll down to inspect smooth inertia physics...</p>\n    <p>Item 1 - High performance non-blocking scrolling</p>\n    <p>Item 2 - Clean modern aesthetic</p>\n    <p>Item 3 - Full touch &amp; mouse wheel support</p>\n    <p>Item 4 - Zero layout shift</p>\n  </div>\n</div>'
  },
  {
    id: "lab-attr-stylesheet",
    name: "stylesheet",
    category: "attributes",
    parent: "/labs/attributes",
    order: 27,
    icon: "material-symbols-light:css",
    title: "data-stylesheet",
    modulePath: "src/modules/attributes/stylesheet.ts",
    description: "Manages on-demand Tailwind v4 JIT compilation and native CSS @import inlining into constructable stylesheets.",
    syntax: '<style data-stylesheet>@import "tailwindcss";</style>',
    params: [
      { name: "data-stylesheet", type: "Boolean / String", default: "true", description: "Marks a style tag for runtime compilation and constructable CSSOM adoption." }
    ],
    extensibility: "<p>Adopts compiled CSS across Light DOM and all active Shadow DOM component instances with zero duplicate stylesheets in memory.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-primary">CSSOM Constructable Stylesheet</div>\n  <p class="text-sm">Inlines and compiles styles with zero duplicate memory footprint.</p>\n</div>'
  },
  {
    id: "lab-attr-switcher",
    name: "switcher",
    category: "attributes",
    parent: "/labs/attributes",
    order: 28,
    icon: "material-symbols-light:toggle-on-outline",
    title: "data-switcher",
    modulePath: "src/modules/attributes/switcher.ts",
    description: "State-cycling helper exposing $switch(), $isActive(), and $activeItem for tabs, carousels, and multi-step wizards.",
    syntax: '<div data-switcher="activeTab" data-switcher-options="[\'One\', \'Two\', \'Three\']">...</div>',
    params: [
      { name: "data-switcher", type: "Signal Name", default: "''", description: "State property name to cycle through." },
      { name: "data-switcher-options", type: "Array", default: "[]", description: "List of options to cycle through sequentially." }
    ],
    extensibility: "<p>Provides out-of-the-box keyboard navigation, wrapping indices, and state synchronizations for segmented controllers.</p>",
    snippet: '<div data-signal="{ activeMode: \'Design\' }"\n     class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <div class="flex gap-2">\n    <button class="btn btn-sm" data-class="{ \'btn-primary\': activeMode === \'Design\', \'btn-outline\': activeMode !== \'Design\' }" data-on-click="activeMode = \'Design\'">Design</button>\n    <button class="btn btn-sm" data-class="{ \'btn-primary\': activeMode === \'Code\', \'btn-outline\': activeMode !== \'Code\' }" data-on-click="activeMode = \'Code\'">Code</button>\n    <button class="btn btn-sm" data-class="{ \'btn-primary\': activeMode === \'Preview\', \'btn-outline\': activeMode !== \'Preview\' }" data-on-click="activeMode = \'Preview\'">Preview</button>\n  </div>\n  <p class="text-xs font-mono">Current mode: <span class="font-bold text-accent" data-bind="activeMode"></span></p>\n</div>'
  },
  {
    id: "lab-attr-teleport",
    name: "teleport",
    category: "attributes",
    parent: "/labs/attributes",
    order: 29,
    icon: "material-symbols-light:move-group",
    title: "data-teleport",
    modulePath: "src/modules/attributes/teleport.ts",
    description: "Transports DOM subtrees to another target selector or defines native drag-and-drop drop zones.",
    syntax: '<div data-teleport="body">...</div>',
    params: [
      { name: "data-teleport", type: "Target CSS Selector", default: "'body'", description: "Target element selector where the DOM subtree should be appended." }
    ],
    extensibility: "<p>Maintains full reactive scope continuity: teleported elements retain access to their original parent data stack and signals.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-info">DOM Teleportation</div>\n  <p class="text-sm">Renders modals, popovers, and tooltips at root level without breaking reactive signal ancestry.</p>\n</div>'
  },
  {
    id: "lab-attr-theme",
    name: "theme",
    category: "attributes",
    parent: "/labs/attributes",
    order: 30,
    icon: "material-symbols-light:palette-outline",
    title: "data-theme",
    modulePath: "src/modules/attributes/theme.ts",
    description: "Manages DaisyUI and Tailwind CSS theme states, exposing $theme, $themeIcon, $switchTheme(), and $setTheme().",
    syntax: '<html data-theme="{ default: \'dark\' }">',
    params: [
      { name: "data-theme", type: "Object / String", default: "'dark'", description: "Initial theme and available theme palette declarations." }
    ],
    extensibility: "<p>Persists theme selections to localStorage automatically and updates data-theme on documentElement without layout thrashing.</p>",
    snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-3">\n  <div class="flex items-center gap-2">\n    <button class="btn btn-sm btn-outline" data-on-click="document.documentElement.setAttribute(\'data-theme\', \'synthwave\')">Synthwave</button>\n    <button class="btn btn-sm btn-outline" data-on-click="document.documentElement.setAttribute(\'data-theme\', \'luxury\')">Luxury</button>\n    <button class="btn btn-sm btn-outline" data-on-click="document.documentElement.setAttribute(\'data-theme\', \'dark\')">Dark</button>\n  </div>\n  <p class="text-xs opacity-70">Click above to dynamically test theme switching.</p>\n</div>'
  }
];

const modifiersList: LabSpec[] = [
  { id: "lab-mod-prevent", name: "prevent", category: "modifiers", parent: "/labs/modifiers", order: 1, icon: "material-symbols-light:block", title: ":prevent", modulePath: "src/modules/modifiers/prevent.ts", description: "Invokes event.preventDefault() to halt native browser default action.", syntax: '<form data-on-submit:prevent="save()">...</form>', params: [], extensibility: "<p>Prevents form submissions, page jumps from anchor clicks, and native scrolling where custom handlers are preferred.</p>", snippet: '<form data-signal="{ submitted: false }" data-on-submit:prevent="submitted = true" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button type="submit" class="btn btn-sm btn-primary">Submit Form (:prevent)</button>\n  <span data-show="submitted" class="badge badge-success ms-2">Prevented page reload!</span>\n</form>' },
  { id: "lab-mod-stop", name: "stop", category: "modifiers", parent: "/labs/modifiers", order: 2, icon: "material-symbols-light:stop-circle-outline", title: ":stop", modulePath: "src/modules/modifiers/stop.ts", description: "Calls event.stopPropagation() to prevent event bubbling up the DOM tree.", syntax: '<button data-on-click:stop="handleClick()">...</button>', params: [], extensibility: "<p>Isolates inner interactive controls inside clickable cards or container rows.</p>", snippet: '<div data-signal="{ parentClicked: 0, childClicked: 0 }" data-on-click="parentClicked++" class="p-4 bg-base-200/50 rounded-xl space-y-2 cursor-pointer">\n  <div class="text-xs">Parent clicks: <span data-bind="parentClicked" class="font-bold"></span></div>\n  <button data-on-click:stop="childClicked++" class="btn btn-sm btn-accent">Child Button (:stop)</button>\n  <span class="text-xs ms-2">Child clicks: <span data-bind="childClicked" class="font-bold"></span></span>\n</div>' },
  { id: "lab-mod-self", name: "self", category: "modifiers", parent: "/labs/modifiers", order: 3, icon: "material-symbols-light:person-pin-circle-outline", title: ":self", modulePath: "src/modules/modifiers/self.ts", description: "Executes handler only if event.target is the element itself, ignoring child bubbled events.", syntax: '<div data-on-click:self="close()">...</div>', params: [], extensibility: "<p>Standard pattern for modal backdrop dismissals.</p>", snippet: '<div data-signal="{ selfClicks: 0 }" data-on-click:self="selfClicks++" class="p-6 bg-base-200/50 rounded-xl border border-dashed border-base-content/20 text-center space-y-2 cursor-pointer">\n  <p class="text-xs font-bold">Click outside the inner box (:self trigger only)</p>\n  <div class="inline-block p-3 bg-base-100 rounded-lg shadow pointer-events-auto cursor-default">\n    <span class="text-xs">Inner element (clicks here won\'t trigger :self)</span>\n  </div>\n  <div class="text-xs font-mono">Self clicks: <span data-bind="selfClicks" class="font-bold text-primary"></span></div>\n</div>' },
  { id: "lab-mod-outside", name: "outside", category: "modifiers", parent: "/labs/modifiers", order: 4, icon: "material-symbols-light:open-in-new", title: ":outside", modulePath: "src/modules/modifiers/outside.ts", description: "Fires handler only when a pointer click occurs outside the target element boundary.", syntax: '<div data-on-click:outside="dropdownOpen = false">...</div>', params: [], extensibility: "<p>Listens on window or document and verifies event target containment.</p>", snippet: '<div data-signal="{ open: false }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button class="btn btn-sm btn-primary" data-on-click="open = !open">Toggle Dropdown</button>\n  <div data-show="open" data-on-click:outside="open = false" class="p-3 bg-base-100 rounded-lg shadow-lg border border-base-content/10 max-w-xs">\n    <p class="text-xs font-bold">Click anywhere outside to close me!</p>\n  </div>\n</div>' },
  { id: "lab-mod-once", name: "once", category: "modifiers", parent: "/labs/modifiers", order: 5, icon: "material-symbols-light:looks-one-outline", title: ":once", modulePath: "src/modules/modifiers/once.ts", description: "Executes event listener exactly once, automatically unbinding itself afterwards.", syntax: '<button data-on-click:once="runInit()">Initialize</button>', params: [], extensibility: "<p>Passes { once: true } to addEventListener.</p>", snippet: '<div data-signal="{ fired: 0 }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button data-on-click:once="fired++" class="btn btn-sm btn-secondary">Click Me (:once)</button>\n  <span class="text-xs ms-2 font-mono">Fired times: <span data-bind="fired" class="font-bold text-primary">0</span> (max 1)</span>\n</div>' },
  { id: "lab-mod-debounce", name: "debounce", category: "modifiers", parent: "/labs/modifiers", order: 6, icon: "material-symbols-light:hourglass-empty", title: ":debounce.<ms>", modulePath: "src/modules/modifiers/debounce.ts", description: "Delays execution until specified milliseconds have elapsed since the last invocation.", syntax: '<input data-on-input:debounce.300="search($newValue)" />', params: [], extensibility: "<p>Caches timer handle per element, clearing previous pending calls.</p>", snippet: '<div data-signal="{ query: \'\', runs: 0 }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <input type="text" data-on-input:debounce.400="runs++; query = $newValue" placeholder="Type fast..." class="input input-bordered input-sm w-48 font-mono" />\n  <p class="text-xs font-mono">Debounced handler runs: <span class="font-bold text-primary" data-bind="runs"></span> | Value: <span data-bind="query"></span></p>\n</div>' },
  { id: "lab-mod-throttle", name: "throttle", category: "modifiers", parent: "/labs/modifiers", order: 7, icon: "material-symbols-light:speed", title: ":throttle.<ms>", modulePath: "src/modules/modifiers/throttle.ts", description: "Enforces a maximum execution rate, firing at most once per specified millisecond window.", syntax: '<div data-on-scroll:throttle.100="onScroll()">...</div>', params: [], extensibility: "<p>Ensures smooth high-frequency interactions during resize and scroll.</p>", snippet: '<div data-signal="{ count: 0 }" data-on-mousemove:throttle.250="count++" class="p-6 bg-base-200/50 rounded-xl text-center space-y-1 cursor-crosshair">\n  <p class="text-xs font-bold">Move mouse over this box (:throttle.250ms)</p>\n  <p class="text-xs font-mono text-primary font-bold">Throttled calls: <span data-bind="count">0</span></p>\n</div>' },
  { id: "lab-mod-hold", name: "hold", category: "modifiers", parent: "/labs/modifiers", order: 8, icon: "material-symbols-light:touch-app", title: ":hold.<ms>", modulePath: "src/modules/modifiers/hold.ts", description: "Fires only when user presses and holds the pointer for the specified duration.", syntax: '<button data-on-pointerdown:hold.500="confirmAction()">Hold to Delete</button>', params: [], extensibility: "<p>Monitors pointerdown and pointerup/cancel to trigger press-and-hold gestures.</p>", snippet: '<div data-signal="{ confirmed: false }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button data-on-pointerdown:hold.600="confirmed = true" class="btn btn-sm btn-error">Press &amp; Hold for 600ms</button>\n  <span data-show="confirmed" class="badge badge-success ms-2 font-mono">Action confirmed!</span>\n</div>' },
  { id: "lab-mod-window", name: "window", category: "modifiers", parent: "/labs/modifiers", order: 9, icon: "material-symbols-light:fullscreen", title: ":window", modulePath: "src/modules/modifiers/window.ts", description: "Attaches event listener to window rather than the local HTMLElement.", syntax: '<div data-on-resize:window="onResize()">...</div>', params: [], extensibility: "<p>Allows declarative handling of global window resize and scroll events.</p>", snippet: '<div data-signal="{ width: window.innerWidth }" data-on-resize:window="width = window.innerWidth" class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <p class="text-xs font-mono">Window width: <span class="font-bold text-accent" data-bind="width"></span>px (resize browser to test)</p>\n</div>' },
  { id: "lab-mod-document", name: "document", category: "modifiers", parent: "/labs/modifiers", order: 10, icon: "material-symbols-light:description", title: ":document", modulePath: "src/modules/modifiers/document.ts", description: "Attaches event listener to document root.", syntax: '<div data-on-visibilitychange:document="onTabVisible()">...</div>', params: [], extensibility: "<p>Useful for document-wide visibility change and keyboard shortcuts.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">data-on-*:document</div>\n  <p class="text-xs font-mono opacity-80">Listens on document root target directly.</p>\n</div>' },
  { id: "lab-mod-keys", name: "keys", category: "modifiers", parent: "/labs/modifiers", order: 11, icon: "material-symbols-light:keyboard", title: ":enter / :escape / :ctrl", modulePath: "src/modules/modifiers/keys.ts", description: "Filters keyboard events by key code or combination (:enter, :escape, :space, :ctrl, :shift).", syntax: '<input data-on-keydown:enter="save()" data-on-keydown:escape="cancel()" />', params: [], extensibility: "<p>Inspects $evt.key and modifier keys ($evt.ctrlKey, $evt.shiftKey).</p>", snippet: '<div data-signal="{ message: \'\' }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <input type="text" placeholder="Type and press Enter..." data-on-keydown:enter="message = \'Submitted: \' + $el.value; $el.value = \'\'" class="input input-bordered input-sm font-mono w-64" />\n  <p class="text-xs font-mono text-success" data-bind="message"></p>\n</div>' },
  { id: "lab-mod-morph", name: "morph", category: "modifiers", parent: "/labs/modifiers", order: 12, icon: "material-symbols-light:autorenew", title: ":morph", modulePath: "src/modules/modifiers/morph.ts", description: "Morphs return string from evaluation directly into the element using morphDOM.", syntax: '<button data-on-click:morph="fetchNext()">Next</button>', params: [], extensibility: "<p>Diffs new DOM nodes while preserving focus and scroll positions.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-primary">:morph</div>\n  <p class="text-xs opacity-70">Executes morphDOM reconciliation on return string.</p>\n</div>' },
  { id: "lab-mod-zoom", name: "zoom", category: "modifiers", parent: "/labs/modifiers", order: 13, icon: "material-symbols-light:zoom-in", title: ":zoom", modulePath: "src/modules/modifiers/zoom.ts", description: "Injects normalized delta zoom coordinate ($zoom) into wheel and pinch handlers.", syntax: '<div data-on-wheel:zoom="zoomScale += $zoom">...</div>', params: [], extensibility: "<p>Normalizes trackpad pinch gestures and mouse wheel tick deltas.</p>", snippet: '<div data-signal="{ scale: 1 }" data-on-wheel:zoom:prevent="scale = Math.max(0.5, Math.min(2, scale + $zoom * 0.1))" class="p-6 bg-base-200/50 rounded-xl text-center space-y-2 cursor-zoom-in">\n  <p class="text-xs font-bold">Scroll mouse wheel here to zoom (:zoom)</p>\n  <div class="inline-block p-2 bg-primary text-primary-content rounded-lg font-mono text-sm" data-bind-style="\'transform: scale(\' + scale + \');\'">Scale: <span data-bind="scale.toFixed(2)"></span>x</div>\n</div>' },
  { id: "lab-mod-drag", name: "drag", category: "modifiers", parent: "/labs/modifiers", order: 14, icon: "material-symbols-light:open-with", title: ":drag", modulePath: "src/modules/modifiers/drag.ts", description: "Injects delta movement coordinates ($drag) into pointer handlers.", syntax: '<div data-on-pointermove:drag="x += $drag.dx; y += $drag.dy">...</div>', params: [], extensibility: "<p>Tracks pointer delta movement across frames.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-accent">:drag</div>\n  <p class="text-xs opacity-70">Injects $drag coordinates into pointer handlers.</p>\n</div>' },
  { id: "lab-mod-delay", name: "delay", category: "modifiers", parent: "/labs/modifiers", order: 15, icon: "material-symbols-light:timer", title: ":delay.<ms>", modulePath: "src/modules/modifiers/delay.ts", description: "Delays handler execution by fixed millisecond timeout.", syntax: '<button data-on-click:delay.500="proceed()">Proceed</button>', params: [], extensibility: "<p>Schedules execution via setTimeout without blocking main thread.</p>", snippet: '<div data-signal="{ status: \'Idle\' }" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button data-on-click:delay.500="status = \'Executed after 500ms delay!\'" class="btn btn-sm btn-outline">Click (:delay.500ms)</button>\n  <span class="text-xs font-mono ms-2" data-bind="status">Idle</span>\n</div>' }
];

const scopesList: LabSpec[] = [
  { id: "lab-scope-media", name: "media", category: "scopes", parent: "/labs/scopes", order: 1, icon: "material-symbols-light:devices", title: "@media", modulePath: "src/modules/scopes/media.ts", description: "Evaluates responsive viewport media queries dynamically in expressions.", syntax: '@media(\'(min-width: 768px)\') { ... }', params: [], extensibility: "<p>Uses matchMedia API to trigger reactive re-evaluations when viewport crosses breakpoints.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <p class="text-xs font-bold opacity-70">Responsive Viewport Scope:</p>\n  <div class="badge badge-primary">@media(\'(min-width: 768px)\')</div>\n</div>' },
  { id: "lab-scope-container", name: "container", category: "scopes", parent: "/labs/scopes", order: 2, icon: "material-symbols-light:aspect-ratio", title: "@container", modulePath: "src/modules/scopes/container.ts", description: "Evaluates container size queries relative to immediate parent element dimensions.", syntax: '@container(\'(min-width: 400px)\') { ... }', params: [], extensibility: "<p>Leverages native CSS container queries and ResizeObserver callbacks.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-accent">@container Query</div>\n  <p class="text-xs opacity-70">Inspects parent container bounds.</p>\n</div>' },
  { id: "lab-scope-auth", name: "auth", category: "scopes", parent: "/labs/scopes", order: 3, icon: "material-symbols-light:lock", title: "@auth", modulePath: "src/modules/scopes/auth.ts", description: "Enforces role-based authentication rules in NEG grammar expressions.", syntax: '@auth(\'admin\') { ... }', params: [], extensibility: "<p>Queries current user claims from security context.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-warning">@auth Scope Gate</div>\n  <p class="text-xs opacity-70">Controls declarative visibility by user role.</p>\n</div>' },
  { id: "lab-scope-os", name: "os", category: "scopes", parent: "/labs/scopes", order: 4, icon: "material-symbols-light:computer", title: "@os", modulePath: "src/modules/scopes/os.ts", description: "Platform and operating system detection (macos, windows, linux, ios, android).", syntax: '@os(\'macos\') ? \'Cmd\' : \'Ctrl\'', params: [], extensibility: "<p>Detects navigator.userAgentData and platform strings.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-info">@os Platform Detection</div>\n  <p class="text-xs opacity-70">Detects desktop vs mobile and OS platform.</p>\n</div>' },
  { id: "lab-scope-view", name: "view", category: "scopes", parent: "/labs/scopes", order: 5, icon: "material-symbols-light:crop", title: "@view", modulePath: "src/modules/scopes/view.ts", description: "Live viewport dimensions and orientation tracking ($view.width, $view.height, $view.isPortrait).", syntax: '@view.width > 1024', params: [], extensibility: "<p>Reactive viewport dimensions without manual resize listeners.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-success">@view Geometry</div>\n  <p class="text-xs opacity-70">Provides live width, height, and orientation metrics.</p>\n</div>' },
  { id: "lab-scope-native", name: "native", category: "scopes", parent: "/labs/scopes", order: 6, icon: "material-symbols-light:mobile-friendly", title: "@native", modulePath: "src/modules/scopes/native.ts", description: "Checks for native app shell bridges (Capacitor, Electron, WebKit message handlers).", syntax: '@native ? \'App\' : \'Browser\'', params: [], extensibility: "<p>Bridges web runtime with native host capabilities.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">@native Bridge Check</div>\n  <p class="text-xs opacity-70">Verifies native mobile/desktop container existence.</p>\n</div>' }
];

const spritesList: LabSpec[] = [
  { id: "lab-sprite-el", name: "el", category: "sprites", parent: "/labs/sprites", order: 1, icon: "material-symbols-light:code-blocks", title: "$el", modulePath: "src/modules/sprites/selector.ts", description: "Direct reference to the current HTMLElement within any expression.", syntax: '$el.focus()', params: [], extensibility: "<p>Injected into all NEG evaluation contexts.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button class="btn btn-sm btn-primary" data-on-click="$el.classList.toggle(\'btn-outline\')">Toggle My Class via $el</button>\n</div>' },
  { id: "lab-sprite-selector", name: "selector", category: "sprites", parent: "/labs/sprites", order: 2, icon: "material-symbols-light:search", title: "$(selector)", modulePath: "src/modules/sprites/selector.ts", description: "Contextual DOM selector engine with directional combinators (^ closest, > child, + next, - prev).", syntax: "$('^.card > .title')", params: [], extensibility: "<p>Extended micro-selector engine without DOM traversal boilerplate.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <div class="badge badge-outline">$(selector) Engine</div>\n  <p class="text-xs opacity-70">Directional combinators for context-aware queries.</p>\n</div>' },
  { id: "lab-sprite-dispatch", name: "dispatch", category: "sprites", parent: "/labs/sprites", order: 3, icon: "material-symbols-light:send", title: "$dispatch", modulePath: "src/modules/sprites/selector.ts", description: "Dispatches bubbling CustomEvent with custom payload.", syntax: "$dispatch('my-event', { id: 123 })", params: [], extensibility: "<p>Bubbles through DOM hierarchy and notifies registered listeners.</p>", snippet: '<div data-signal="{ received: \'\' }" data-on-custom-ping="received = $evt.detail" class="p-4 bg-base-200/50 rounded-xl space-y-2">\n  <button class="btn btn-sm btn-accent" data-on-click="$dispatch(\'custom-ping\', \'Hello from $dispatch!\')">Dispatch Ping Event</button>\n  <p class="text-xs font-mono text-success" data-bind="received"></p>\n</div>' },
  { id: "lab-sprite-animate", name: "animate", category: "sprites", parent: "/labs/sprites", order: 4, icon: "material-symbols-light:animation", title: "$animate", modulePath: "src/modules/sprites/animate.ts", description: "Web Animations API runner with spring physics and FLIP calculations.", syntax: '$animate($el, { opacity: [0, 1] }, 300)', params: [], extensibility: "<p>GPU accelerated transitions tied to element lifecycle.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-primary">$animate / flip()</div>\n  <p class="text-xs opacity-70">Hardware-accelerated animation runner.</p>\n</div>' },
  { id: "lab-sprite-sql", name: "sql", category: "sprites", parent: "/labs/sprites", order: 5, icon: "material-symbols-light:database", title: "$sql", modulePath: "src/modules/sprites/sql.ts", description: "SurrealDB live WebSocket query runner and real-time subscription client.", syntax: "$sql('SELECT * FROM user')", params: [], extensibility: "<p>Maintains persistent WebSocket channel for live multi-user sync.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-secondary">$sql SurrealDB Client</div>\n  <p class="text-xs opacity-70">Real-time WebSocket database subscriptions.</p>\n</div>' },
  { id: "lab-sprite-gql", name: "gql", category: "sprites", parent: "/labs/sprites", order: 6, icon: "material-symbols-light:schema", title: "$gql", modulePath: "src/modules/sprites/gql.ts", description: "Zero-dependency GraphQL query and mutation client.", syntax: "$gql('{ users { id name } }')", params: [], extensibility: "<p>Executes optimized HTTP POST GraphQL queries.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-accent">$gql Client</div>\n  <p class="text-xs opacity-70">Declarative GraphQL request runner.</p>\n</div>' },
  { id: "lab-sprite-sw", name: "sw", category: "sprites", parent: "/labs/sprites", order: 7, icon: "material-symbols-light:offline-bolt", title: "$sw", modulePath: "src/modules/sprites/sw.ts", description: "Service Worker lifecycle manager, registration, and cache controller.", syntax: '$sw.register()', params: [], extensibility: "<p>Manages background caches and offline sync triggers.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-info">$sw Service Worker</div>\n  <p class="text-xs opacity-70">Offline storage and worker lifecycle controller.</p>\n</div>' },
  { id: "lab-sprite-push", name: "push", category: "sprites", parent: "/labs/sprites", order: 8, icon: "material-symbols-light:notifications-active", title: "$push", modulePath: "src/modules/sprites/push.ts", description: "Web Push notification subscription and permission manager.", syntax: '$push.subscribe()', params: [], extensibility: "<p>Manages VAPID keys and PushSubscription tokens.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-warning">$push Manager</div>\n  <p class="text-xs opacity-70">Web Push subscription controller.</p>\n</div>' },
  { id: "lab-sprite-bgfetch", name: "bgfetch", category: "sprites", parent: "/labs/sprites", order: 9, icon: "material-symbols-light:cloud-download", title: "$bgFetch", modulePath: "src/modules/sprites/bgFetch.ts", description: "Background Fetch API wrapper for large file downloads.", syntax: "$bgFetch.download(url)", params: [], extensibility: "<p>Executes persistent downloads across tab closures.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">$bgFetch</div>\n  <p class="text-xs opacity-70">Background offline download manager.</p>\n</div>' },
  { id: "lab-sprite-bgsync", name: "bgsync", category: "sprites", parent: "/labs/sprites", order: 10, icon: "material-symbols-light:sync", title: "$bgSync", modulePath: "src/modules/sprites/bgSync.ts", description: "Background Sync API for deferred offline requests.", syntax: "$bgSync.register('sync-orders')", params: [], extensibility: "<p>Guarantees request delivery once network connectivity returns.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">$bgSync</div>\n  <p class="text-xs opacity-70">Offline sync queue manager.</p>\n</div>' },
  { id: "lab-sprite-periodicsync", name: "periodicsync", category: "sprites", parent: "/labs/sprites", order: 11, icon: "material-symbols-light:update", title: "$periodicSync", modulePath: "src/modules/sprites/periodicSync.ts", description: "Periodic Background Sync manager for background data polling.", syntax: "$periodicSync.register('check-news')", params: [], extensibility: "<p>Allows apps to refresh content periodically in the background.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">$periodicSync</div>\n  <p class="text-xs opacity-70">Background content polling scheduler.</p>\n</div>' },
  { id: "lab-sprite-mask", name: "mask", category: "sprites", parent: "/labs/sprites", order: 12, icon: "material-symbols-light:tag", title: "$mask", modulePath: "src/modules/sprites/mask.ts", description: "Programmatic string formatting utility.", syntax: "$mask('(999) 999-9999', rawVal)", params: [], extensibility: "<p>Formats raw strings according to masks without DOM input bindings.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">$mask Utility</div>\n  <p class="text-xs opacity-70">Pure functional string formatter.</p>\n</div>' },
  { id: "lab-sprite-svg", name: "svg", category: "sprites", parent: "/labs/sprites", order: 13, icon: "material-symbols-light:polyline", title: "$svg", modulePath: "src/modules/sprites/svg.ts", description: "Reactive SVG Bezier curve and path generator for node graph connectors.", syntax: '$svg.bezier(x1, y1, x2, y2)', params: [], extensibility: "<p>Calculates cubic and quadratic Bezier curves for node graph links.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-outline">$svg Path Generator</div>\n  <p class="text-xs opacity-70">Cubic Bezier curve generator for visual links.</p>\n</div>' },
  { id: "lab-sprite-mcp", name: "mcp", category: "sprites", parent: "/labs/sprites", order: 14, icon: "material-symbols-light:smart-toy", title: "$mcp", modulePath: "src/modules/sprites/mcp.ts", description: "Model Context Protocol AI assistant client for runtime diagnostics and code synthesis.", syntax: "$mcp.sample('Analyze element state')", params: [], extensibility: "<p>Direct bridge connecting user interface with AI Copilot agents.</p>", snippet: '<div class="p-4 bg-base-200/50 rounded-xl space-y-1">\n  <div class="badge badge-primary">$mcp AI Client</div>\n  <p class="text-xs opacity-70">Direct bridge to Model Context Protocol AI models.</p>\n</div>' }
];

function escapeHtml(str: string): string {
  return str.replace(/"/g, '&quot;');
}

function generateHtml(spec: LabSpec): string {
  const route = `/labs/${spec.category}/${spec.name}`;
  const docObj = {
    Title: spec.title,
    Category: spec.category.charAt(0).toUpperCase() + spec.category.slice(1),
    Icon: spec.icon,
    ModulePath: spec.modulePath,
    Description: spec.description,
    Syntax: spec.syntax,
    Params: spec.params,
    Extensibility: spec.extensibility,
    Snippet: spec.snippet
  };

  const jsonStr = JSON.stringify({ doc: docObj }, null, 2);

  return `<title>${spec.title}</title>
<meta name="id" content="${spec.id}">
<meta name="route" content="${route}">
<meta name="icon" content="${spec.icon}">
<meta name="order" content="${spec.order}">
<meta name="category" content="Labs">
<meta name="parent" content="${spec.parent}">

<div data-signal='${jsonStr.replace(/'/g, "&#39;")}'>
  <div data-component="'_components/lab-viewer.html'"></div>
</div>
`;
}

async function main() {
  const allGroups = [
    { dir: join(LABS_DIR, "attributes"), list: remainingAttributes },
    { dir: join(LABS_DIR, "modifiers"), list: modifiersList },
    { dir: join(LABS_DIR, "scopes"), list: scopesList },
    { dir: join(LABS_DIR, "sprites"), list: spritesList },
  ];

  for (const grp of allGroups) {
    try {
      await Deno.mkdir(grp.dir, { recursive: true });
    } catch { /* ignore */ }

    for (const spec of grp.list) {
      const filePath = join(grp.dir, `${spec.name}.html`);
      const content = generateHtml(spec);
      await Deno.writeTextFile(filePath, content);
      console.log(`Generated: ${filePath}`);
    }
  }

  console.log("All Lab pages generated successfully!");
}

main();
