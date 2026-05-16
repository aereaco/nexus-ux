import { JSDOM } from "npm:jsdom";

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html data-ux-init>
    <body>
      <div id="app" data-var="{ items: [{id: 1, n: 'A'}, {id: 2, n: 'B'}] }">
        <div id="list" data-teleport:drop="items">
          <div data-for="item in items" class="item">
            <span data-bind="item.n"></span>
          </div>
        </div>
      </div>
    </body>
  </html>
`, { runScripts: "dangerously" });

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Text = dom.window.Text;
globalThis.Comment = dom.window.Comment;
globalThis.Node = dom.window.Node;
globalThis.HTMLTemplateElement = dom.window.HTMLTemplateElement;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.HTMLScriptElement = dom.window.HTMLScriptElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.screen = { orientation: { type: 'landscape-primary' } };
globalThis.matchMedia = () => ({ matches: false });

await import("./dist/nexus-ux.js");

setTimeout(() => {
  const itemsBefore = document.querySelectorAll('.item').length;
  console.log("Initial items:", itemsBefore);
  
  const forEl = document.querySelector('.item:not([data-ux-template])');
  const stack = forEl[Symbol.for('__data_stack__')];
  if (stack && stack.length > 1) {
    console.log("Pushing new item...");
    stack[1].items.push({id: 3, n: 'C'});
    
    setTimeout(() => {
      const itemsAfter = document.querySelectorAll('.item').length;
      console.log("Items after push:", itemsAfter);
      if (itemsAfter > itemsBefore) {
          console.log("PASS: Reactivity successfully updated the DOM.");
      } else {
          console.log("FAIL: Reactivity failed to update the DOM.");
      }
      Deno.exit(0);
    }, 200);
  } else {
    console.log("Could not find data stack!");
    Deno.exit(1);
  }
}, 1000);
