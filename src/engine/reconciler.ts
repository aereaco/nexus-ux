import { DATA_PRESERVE_ATTR, CLEANUP_FUNCTIONS_KEY, MARKER_KEY } from './consts.ts';
import { NexusEnhancedElement } from './reactivity.ts';
import { stylesheet } from '../modules/attributes/stylesheet.ts';

// Default configuration options
const noOp = () => true;
const defaults = {
  morphStyle: 'innerHTML',
    ignoreActiveValue: true, // Never clobber what the user is currently typing
  callbacks: {
    beforeNodeAdded: noOp,
    afterNodeAdded: noOp,
    beforeNodeMorphed: (from: Node, to: Node) => {
      // Respect data-preserve attribute
      if (from instanceof Element && from.hasAttribute(DATA_PRESERVE_ATTR)) {
        return false; // Skip morphing this node
      }

      // State Preservation Logic for Form Elements
      if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement || from instanceof HTMLSelectElement) {
        if (from === document.activeElement) {
          // Carry over the current value and selection to the 'to' node before morphing
          // so the reconciler sees them as identical and doesn't trigger unnecessary updates.
          if (to instanceof HTMLInputElement || to instanceof HTMLTextAreaElement || to instanceof HTMLSelectElement) {
             (to as any).value = (from as any).value;
             if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement) {
               (to as any).selectionStart = from.selectionStart;
               (to as any).selectionEnd = from.selectionEnd;
             }
          }
        }
      }
      
      // Preserve VT and Nexus Keys across patches
      if (from instanceof HTMLElement && to instanceof HTMLElement) {
        if (from.style.viewTransitionName) {
          to.style.viewTransitionName = from.style.viewTransitionName;
        }
        if ('_nexus_key' in from) {
          (to as any)._nexus_key = (from as any)._nexus_key;
        }
      }
      
      // Deterministic Teardown: If the node is about to be morphed, 
      // instantly execute and sever all its "borrowed" teardown leases.
      if (from instanceof Element) {
        const enhancedFrom = from as NexusEnhancedElement;
        if (enhancedFrom[CLEANUP_FUNCTIONS_KEY]) {
          enhancedFrom[CLEANUP_FUNCTIONS_KEY].forEach((cleanup: () => void) => cleanup());
          enhancedFrom[CLEANUP_FUNCTIONS_KEY].clear();
        }
        // Nuke the initialization marker so processElement() can safely re-bind
        // new attributes if necessary.
        delete enhancedFrom[MARKER_KEY];
      }
      return true;
    },
    afterNodeMorphed: noOp,
    beforeNodeRemoved: (node: Node) => {
      // Execute teardowns synchronously before departure, avoiding race conditions
      // with delayed generic MutationObserver unmounts.
      if (node instanceof Element) {
        const enhancedNode = node as NexusEnhancedElement;
        if (enhancedNode[CLEANUP_FUNCTIONS_KEY]) {
          enhancedNode[CLEANUP_FUNCTIONS_KEY].forEach((cleanup: () => void) => cleanup());
          enhancedNode[CLEANUP_FUNCTIONS_KEY].clear();
        }
      }
      return true;
    },
    afterNodeRemoved: noOp,
    beforeAttributeUpdated: noOp,
  }
};

function runCallback(config: any, name: string, ...args: any[]): any {
  if (config.callbacks && typeof config.callbacks[name] === 'function') {
    return config.callbacks[name](...args);
  }
  return true;
}

function parseHTML(html: string): Node {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  if (html.includes('<html') || html.includes('<body') || html.includes('<head')) {
    return doc.documentElement;
  }
  const fragment = document.createDocumentFragment();
  const body = doc.body;
  while (body.firstChild) {
    fragment.appendChild(body.firstChild);
  }
  return fragment;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function getHeadElementKey(node: Node): string | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    if (el.tagName === 'LINK') {
      return `link:${el.getAttribute('href') || ''}:${el.getAttribute('rel') || ''}`;
    }
    if (el.tagName === 'STYLE') {
      return `style:${hashString(el.textContent || '')}`;
    }
    if (el.tagName === 'SCRIPT') {
      return `script:${el.getAttribute('src') || ''}:${hashString(el.textContent || '')}`;
    }
    if (el.tagName === 'TITLE') {
      return 'title';
    }
  }
  return null;
}

function morphHead(fromHead: HTMLHeadElement, toHead: HTMLHeadElement, config: any): void {
  const toTitle = toHead.querySelector('title');
  if (toTitle) {
    document.title = toTitle.textContent || '';
  }

  const fromChildren = Array.from(fromHead.childNodes);
  const toChildren = Array.from(toHead.childNodes);
  const fromMap = new Map<string, Node>();

  fromChildren.forEach(child => {
    const key = getHeadElementKey(child);
    if (key) fromMap.set(key, child);
  });

  toChildren.forEach(toChild => {
    const key = getHeadElementKey(toChild);
    if (!key) return;

    if (fromMap.has(key)) {
      const fromChild = fromMap.get(key)!;
      fromMap.delete(key);
      if (fromChild.nodeType === Node.ELEMENT_NODE && toChild.nodeType === Node.ELEMENT_NODE) {
        if (fromChild.textContent !== toChild.textContent) {
          fromChild.textContent = toChild.textContent;
        }
      }
    } else {
      const newNode = toChild.cloneNode(true);
      if (newNode instanceof HTMLScriptElement) {
        const activeScript = document.createElement('script');
        Array.from(newNode.attributes).forEach(attr => activeScript.setAttribute(attr.name, attr.value));
        activeScript.textContent = newNode.textContent;
        fromHead.appendChild(activeScript);
      } else {
        fromHead.appendChild(newNode);
      }
    }
  });

  fromMap.forEach(node => {
    if (node instanceof HTMLLinkElement || node instanceof HTMLStyleElement) {
      node.parentNode?.removeChild(node);
    }
  });
}

function morphScript(fromScript: HTMLScriptElement, toScript: HTMLScriptElement): void {
  if (fromScript.textContent === toScript.textContent && fromScript.getAttribute('src') === toScript.getAttribute('src')) {
    return;
  }
  const activeScript = document.createElement('script');
  Array.from(toScript.attributes).forEach(attr => activeScript.setAttribute(attr.name, attr.value));
  activeScript.textContent = toScript.textContent;
  fromScript.parentNode?.replaceChild(activeScript, fromScript);
}

function getElementKey(node: Node): string | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    return el.getAttribute('data-key') || el.getAttribute('key') || el.id || null;
  }
  return null;
}

function removeNode(node: Node, config: any): void {
  if (runCallback(config, 'beforeNodeRemoved', node) === false) return;
  node.parentNode?.removeChild(node);
  runCallback(config, 'afterNodeRemoved', node);
}

function morphChildren(fromParent: HTMLElement, toParent: HTMLElement, config: any): void {
  const fromChildren = Array.from(fromParent.childNodes);
  const toChildren = Array.from(toParent.childNodes);

  const fromKeyMap = new Map<string, Node>();
  const fromNoKeyList: Node[] = [];

  fromChildren.forEach(child => {
    const key = getElementKey(child);
    if (key) {
      fromKeyMap.set(key, child);
    } else {
      fromNoKeyList.push(child);
    }
  });

  let currentFromChild = fromParent.firstChild;

  toChildren.forEach((toChild) => {
    const isIframe = toChild instanceof HTMLIFrameElement;
    const key = getElementKey(toChild);
    let matchedFromChild: Node | null = null;

    if (key) {
      matchedFromChild = fromKeyMap.get(key) || null;
      if (matchedFromChild) {
        fromKeyMap.delete(key);
      }
    } else {
      const matchIdx = fromNoKeyList.findIndex(node => 
        node.nodeType === toChild.nodeType && 
        (node.nodeType !== Node.ELEMENT_NODE || (node as Element).tagName === (toChild as Element).tagName)
      );
      if (matchIdx !== -1) {
        matchedFromChild = fromNoKeyList.splice(matchIdx, 1)[0];
      }
    }

    if (matchedFromChild) {
      if (isIframe && matchedFromChild instanceof HTMLIFrameElement) {
        const fromEl = matchedFromChild;
        const toEl = toChild as HTMLIFrameElement;
        Array.from(fromEl.attributes).forEach(attr => {
          if (!toEl.hasAttribute(attr.name)) fromEl.removeAttribute(attr.name);
        });
        Array.from(toEl.attributes).forEach(attr => {
          if (attr.name === 'src' && fromEl.getAttribute('src') === attr.value) return;
          fromEl.setAttribute(attr.name, attr.value);
        });
      } else {
        if (matchedFromChild !== currentFromChild) {
          fromParent.insertBefore(matchedFromChild, currentFromChild);
        } else {
          currentFromChild = currentFromChild.nextSibling;
        }
        morphNodes(matchedFromChild, toChild, config);
      }
    } else {
      const newNode = toChild.cloneNode(true);
      if (runCallback(config, 'beforeNodeAdded', newNode) !== false) {
        fromParent.insertBefore(newNode, currentFromChild);
        runCallback(config, 'afterNodeAdded', newNode);

        if (newNode instanceof HTMLElement) {
          const scripts = newNode.querySelectorAll('script');
          scripts.forEach(script => {
            const activeScript = document.createElement('script');
            Array.from(script.attributes).forEach(attr => activeScript.setAttribute(attr.name, attr.value));
            activeScript.textContent = script.textContent;
            script.parentNode?.replaceChild(activeScript, script);
          });
        }
      }
    }
  });

  fromKeyMap.forEach(node => {
    removeNode(node, config);
  });
  fromNoKeyList.forEach(node => {
    removeNode(node, config);
  });
}

function morphNodes(from: Node, to: Node, config: any): void {
  if (runCallback(config, 'beforeNodeMorphed', from, to) === false) {
    return;
  }

  if (from instanceof HTMLHeadElement && to instanceof HTMLHeadElement) {
    morphHead(from, to, config);
    return;
  }

  if (from instanceof HTMLScriptElement && to instanceof HTMLScriptElement) {
    morphScript(from, to);
    return;
  }

  if (from.nodeType !== to.nodeType) {
    from.parentElement?.replaceChild(to.cloneNode(true), from);
    return;
  }

  if (from.nodeType === Node.TEXT_NODE || from.nodeType === Node.COMMENT_NODE) {
    if (from.nodeValue !== to.nodeValue) {
      from.nodeValue = to.nodeValue;
    }
    return;
  }

  if (from.nodeType !== Node.ELEMENT_NODE) return;

  const fromEl = from as HTMLElement;
  const toEl = to as HTMLElement;

  if (fromEl.tagName !== toEl.tagName) {
    fromEl.parentElement?.replaceChild(toEl.cloneNode(true), fromEl);
    return;
  }

  const fromAttrs = fromEl.attributes;
  const toAttrs = toEl.attributes;

  for (let i = fromAttrs.length - 1; i >= 0; i--) {
    const attr = fromAttrs[i];
    if (!toEl.hasAttribute(attr.name)) {
      fromEl.removeAttribute(attr.name);
    }
  }

  for (let i = 0; i < toAttrs.length; i++) {
    const attr = toAttrs[i];
    if (fromEl.getAttribute(attr.name) !== attr.value) {
      fromEl.setAttribute(attr.name, attr.value);
    }
  }

  if (fromEl instanceof HTMLInputElement && toEl instanceof HTMLInputElement) {
    if (fromEl.type === 'checkbox' || fromEl.type === 'radio') {
      fromEl.checked = toEl.checked;
    } else if (fromEl.type !== 'file') {
      if (fromEl !== document.activeElement || !config.ignoreActiveValue) {
        fromEl.value = toEl.value;
      }
    }
  } else if (fromEl instanceof HTMLTextAreaElement && toEl instanceof HTMLTextAreaElement) {
    if (fromEl !== document.activeElement || !config.ignoreActiveValue) {
      fromEl.value = toEl.value;
    }
  } else if (fromEl instanceof HTMLSelectElement && toEl instanceof HTMLSelectElement) {
    fromEl.value = toEl.value;
  }

  morphChildren(fromEl, toEl, config);

  runCallback(config, 'afterNodeMorphed', fromEl, toEl);
}

export function morphDOM(from: Element, to: Element | string, options: Record<string, unknown> = {}): void {
  const config = { ...defaults, ...options };
  
  let toNode: Node;
  if (typeof to === 'string') {
    toNode = parseHTML(to);
  } else {
    toNode = to;
  }

  if (from === document.documentElement || from.tagName === 'HTML') {
    const fromHTML = from as HTMLElement;
    const toHTML = toNode as HTMLElement;
    
    const fromHead = fromHTML.querySelector('head');
    const toHead = toHTML.querySelector('head');
    if (fromHead && toHead) {
      morphHead(fromHead, toHead, config);
    }
    
    const fromBody = fromHTML.querySelector('body');
    const toBody = toHTML.querySelector('body');
    if (fromBody && toBody) {
      morphNodes(fromBody, toBody, config);
    }
    
    const fromAttrs = fromHTML.attributes;
    const toAttrs = toHTML.attributes;
    for (let i = fromAttrs.length - 1; i >= 0; i--) {
      const attr = fromAttrs[i];
      if (!toHTML.hasAttribute(attr.name)) fromHTML.removeAttribute(attr.name);
    }
    for (let i = 0; i < toAttrs.length; i++) {
      const attr = toAttrs[i];
      fromHTML.setAttribute(attr.name, attr.value);
    }
  } else {
    if (config.morphStyle === 'innerHTML') {
      const toParent = (toNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE || toNode.nodeType === Node.ELEMENT_NODE) 
        ? toNode as HTMLElement 
        : parseHTML(`<div>${to}</div>`) as HTMLElement;
        
      morphChildren(from as HTMLElement, toParent, config);
    } else {
      const targetNode = toNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE 
        ? (toNode.firstChild || toNode) 
        : toNode;
      morphNodes(from, targetNode, config);
      
      if (toNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE && toNode.childNodes.length > 1) {
        let sibling = from.nextSibling;
        const parent = from.parentNode;
        if (parent) {
          Array.from(toNode.childNodes).slice(1).forEach(node => {
            parent.insertBefore(node.cloneNode(true), sibling);
          });
        }
      }
    }
  }
  
  from.dispatchEvent(new CustomEvent('nexus:dom-morphed', { bubbles: true }));
}

// ─── Visual Reconciliation ───

/**
 * Tracks classes added by Nexus to avoid clobbering manually set classes.
 */
export const nexusClassMap = new WeakMap<Element, Set<string>>();

/**
 * Reconciles an element's class list against a reactive value.
 * @param el The target element
 * @param value The value to reconcile (Object, Array, or String)
 */
export function reconcileClass(el: HTMLElement, value: unknown): void {
  const currentAdded = nexusClassMap.get(el) || new Set<string>();
  const toAdd = new Set<string>();

  const process = (val: unknown) => {
    if (!val) return;
    if (typeof val === 'string') {
      val.split(/\s+/).filter(Boolean).forEach(c => toAdd.add(c));
    } else if (Array.isArray(val)) {
      val.forEach(process);
    } else if (typeof val === 'object') {
      Object.entries(val).forEach(([cls, cond]) => {
        let isMatch = false;
        if (typeof cond === 'object' && cond !== null) {
          // Conditional AND Nesting: every key in the sub-object must be truthy
          isMatch = Object.values(cond).every(v => !!v);
        } else {
          isMatch = !!cond;
        }
        if (isMatch) cls.split(/\s+/).filter(Boolean).forEach(c => toAdd.add(c));
      });
    }
  };

  process(value);

  // Remove classes that are no longer present in the new set but were added by Nexus
  currentAdded.forEach(cls => {
    if (!toAdd.has(cls)) {
      el.classList.remove(cls);
      currentAdded.delete(cls);
    }
  });

  // Add new classes
  toAdd.forEach(cls => {
    if (!el.classList.contains(cls)) {
      el.classList.add(cls);
      currentAdded.add(cls);
      stylesheet.adoptClass(cls, el);
    }
  });

  if (currentAdded.size > 0) nexusClassMap.set(el, currentAdded);
}

/**
 * Tracks style properties added by Nexus.
 */
export const nexusStyleMap = new WeakMap<Element, Set<string>>();

/**
 * Reconciles an element's inline styles against a reactive object.
 * @param el The target element
 * @param value The style map (Object)
 */
export function reconcileStyle(el: HTMLElement, value: unknown): void {
  if (!value) return;

  const currentAdded = nexusStyleMap.get(el) || new Set<string>();
  const toAdd = new Set<string>();
  let styleObj: Record<string, unknown> = {};

  if (typeof value === 'string') {
    value.split(';').forEach(pair => {
      const [prop, val] = pair.split(':').map(s => s.trim());
      if (prop && val) styleObj[prop] = val;
    });
  } else if (typeof value === 'object' && value !== null) {
    styleObj = value as Record<string, unknown>;
  } else {
    return;
  }

  Object.entries(styleObj).forEach(([prop, val]) => {
    const cssProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    if (val !== null && val !== undefined && val !== false) {
      el.style.setProperty(cssProp, String(val));
      toAdd.add(cssProp);
      currentAdded.add(cssProp);
    } else {
       el.style.removeProperty(cssProp);
       currentAdded.delete(cssProp);
    }
  });

  // Cleanup properties that were previously set by Nexus but are now missing
  currentAdded.forEach(prop => {
    if (!(prop in styleObj) && !(prop.replace(/-([a-z])/g, (_m, c) => c.toUpperCase()) in styleObj)) {
      el.style.removeProperty(prop);
      currentAdded.delete(prop);
    }
  });

  if (currentAdded.size > 0) nexusStyleMap.set(el, currentAdded);
}

/**
 * ZCZS-compliant deep equality check for reactive state diffing.
 * Avoids JSON.stringify to minimize GC pressure.
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}
