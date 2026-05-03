import { JSDOM } from "jsdom";

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html data-debug>
  <body>
    <div id="app" data-var="{ list1: [{id: 1, n: 'A'}, {id: 2, n: 'B'}] }">
      <div id="dropzone" data-teleport:drop="list1">
        <div id="item-tpl" data-for="item in list1" class="item">
           <span data-bind="item.n"></span>
        </div>
      </div>
    </div>
  </body>
  </html>
`, { url: "http://localhost" });

globalThis.window = dom.window as any;
globalThis.document = dom.window.document as any;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.HTMLTemplateElement = dom.window.HTMLTemplateElement;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.Text = dom.window.Text;
globalThis.Comment = dom.window.Comment;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.SharedArrayBuffer = undefined as any;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0) as any;
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { ModuleCoordinator } = await import("./src/engine/modules.ts");
const varModule = (await import("./src/modules/attributes/var.ts")).default;
const forModule = (await import("./src/modules/attributes/for.ts")).default;
const teleportModule = (await import("./src/modules/attributes/teleport.ts")).default;
const bindModule = (await import("./src/modules/attributes/bind.ts")).default;
const mutationObserverModule = (await import("./src/engine/observers/mutation.ts")).default;
const { EFFECT_RUNNERS_KEY } = await import("./src/engine/consts.ts");

const coordinator = new ModuleCoordinator();
coordinator.registerAttributeModule('var', varModule);
coordinator.registerAttributeModule('for', forModule);
coordinator.registerAttributeModule('teleport', teleportModule);
coordinator.registerAttributeModule('bind', bindModule);
coordinator.registerObserverModule('mutationObserver', mutationObserverModule);

coordinator.initializeModules(document.body);

setTimeout(() => {
    const tpl = document.getElementById("item-tpl");
    console.log("Template element:", tpl?.outerHTML);
    console.log("Template effect runners:", tpl ? (tpl as any)[EFFECT_RUNNERS_KEY] : "null");
    
    const state = coordinator.runtimeContext.localSignals(document.getElementById("dropzone") as any);
    console.log("Current state:", state.list1.map((i: any) => i.n));
    
    // Simulate drag from index 0 to index 1 (same list)
    // sourceList = state.list1, targetList = state.list1
    // fromIndex = 0, toIndex = 2 (dragging A below B)
    const fromIndex = 0;
    const toIndex = 2; // End of list
    const sourceList = state.list1;
    
    console.log(`Simulating drag from ${fromIndex} to ${toIndex}...`);
    const [item] = sourceList.splice(fromIndex, 1);
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    sourceList.splice(insertIndex, 0, item);
    
    setTimeout(() => {
        console.log("State after splice:", state.list1.map((i: any) => i.n));
        const spans = Array.from(document.querySelectorAll("span")).map(s => s.innerHTML);
        console.log("DOM spans order:", spans);
        Deno.exit(0);
    }, 100);
}, 100);
