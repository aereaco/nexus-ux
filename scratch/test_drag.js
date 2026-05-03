import { JSDOM } from 'npm:jsdom';

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div class="container" data-var="{ swapList: [{id: 'W1', n: 'Alpha'}, {id: 'W2', n: 'Beta'}] }">
    <div id="dropzone" class="list-group" data-teleport:drop="swapList" data-teleport-mode="swap">
      <div id="forloop" data-for="item in swapList" data-drag class="item">
        <span data-bind="item.n"></span>
      </div>
    </div>
  </div>
</body>
</html>
`, { runScripts: "dangerously" });

// Mock globals for headless testing
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.Text = dom.window.Text;
global.Comment = dom.window.Comment;
global.DocumentFragment = dom.window.DocumentFragment;
global.HTMLTemplateElement = dom.window.HTMLTemplateElement;
global.MutationObserver = dom.window.MutationObserver;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = clearTimeout;

global.CSSStyleSheet = class CSSStyleSheet {
    constructor() { this.cssRules = []; }
    replaceSync() {}
};

// Start Nexus
import '../dist/nexus-ux.js';

setTimeout(() => {
    console.log("INITIAL RENDER:", document.getElementById('dropzone').innerHTML);

    // Simulate drop
    const dropzone = document.getElementById('dropzone');
    const dragItem = dropzone.querySelector('.item');
    
    global._dragState = {
        fromIndex: 0,
        sourceContainer: dropzone,
        element: dragItem,
        sourceList: window.nexus.globalSignals().swapList // this might be empty if we don't grab it right
    };
    
    // Simulate drop event
    const dropEvent = new dom.window.Event('drop');
    dropzone.dispatchEvent(dropEvent);
    
    setTimeout(() => {
        console.log("AFTER DROP:", document.getElementById('dropzone').innerHTML);
    }, 100);
}, 200);
