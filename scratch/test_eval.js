import { JSDOM } from 'npm:jsdom';
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div class="container" data-var="{ swapList: [{id: 'W1', n: 'Alpha'}] }">
    <div id="dropzone" class="list-group">
      <div id="forloop" data-for="item in swapList" class="item">
        <span data-bind="item.n"></span>
      </div>
    </div>
  </div>
</body>
</html>
`, { runScripts: "dangerously" });
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
import '../dist/nexus-ux.js';

setTimeout(() => {
    console.log("INNER HTML:", document.querySelector('.list-group').innerHTML);
}, 200);
