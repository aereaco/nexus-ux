import { directive } from '../engine/directives'

// A global cache to store promises for component definitions. This prevents the same
// component from being fetched and processed multiple times, ensuring custom elements
// are defined only once.
const componentDefinitionCache = new Map<string, Promise<void>>()

// #region Base Component Class
/**
 * Base class for all Nexus-UX components. Provides lifecycle hooks, scoped utilities,
 * and integration with the Nexus-UX reactivity system.
 */
export class BaseComponent extends HTMLElement {
  // --- Internal properties for Nexus-UX management ---
  // Functions to execute when the component is disconnected from the DOM.
  _cleanupFunctions: (() => void)[] = []
  // A unique ID for each component instance, used for scoped IDs.
  _instanceId: number = Date.now() + Math.random()
  // Flag to ensure content is attached only once, especially important for hydration.
  _contentAttached = false
  // The source URL or inline HTML of the component.
  _componentSrc: string | null = null
  // Indicates if the component uses Shadow DOM.
  _isShadowDOM = false
  // Stores the Nexus-UX context for use in lifecycle methods.
  _stateCtx?: any
  // Flag to prevent double rendering
  _isRendered = false

  // --- Public properties ---
  // The root where the component's content is rendered (ShadowRoot or the element itself).
  root: ShadowRoot | this
  // Provides access to the element's form-associated capabilities.
  internals: ElementInternals

  // These properties hold the parsed content, styles, and scripts from the component's template.
  // They are populated during the component definition phase and used in connectedCallback.
  _templateContent?: DocumentFragment
  _styles?: (HTMLStyleElement | HTMLLinkElement)[]
  _scripts?: HTMLScriptElement[]

  $props: any;

  constructor(stateCtx: any, templateContent?: DocumentFragment, styles?: (HTMLStyleElement | HTMLLinkElement)[], scripts?: HTMLScriptElement[], isShadowDOM?: boolean, props?: any) {
    super()
    this.internals = this.attachInternals()
    this._stateCtx = stateCtx

    this._templateContent = templateContent
    this._styles = styles
    this._scripts = scripts
    this._isShadowDOM = !!isShadowDOM
    this.$props = props;

    this.root = this._isShadowDOM ? this.attachShadow({ mode: 'open' }) : this
  }

  // --- Public Methods for Component Authors ---

  /**
   * Registers a function to be called when the component is removed from the DOM.
   * Essential for cleaning up event listeners, timers, or third-party libraries.
   * @param fn The cleanup function to execute.
   */
  registerCleanup(fn: () => void) {
    if (typeof fn === 'function') {
      this._cleanupFunctions.push(fn)
    }
  }

  /**
   * Generates a unique, scoped ID for an element within this component instance.
   * Prevents ID conflicts when multiple instances of the same component are on the page.
   * @param baseId The base ID to make unique (e.g., 'my-input').
   * @returns A globally unique ID string (e.g., 'my-component-1678886400000-my-input').
   */
  generateScopedId(baseId: string) {
    return `${this.tagName.toLowerCase()}-${this._instanceId}-${baseId}`
  }

  /**
   * Dispatches a custom event from the component's root. Events are configured
   * to bubble up and cross Shadow DOM boundaries by default.
   * @param eventName The name of the custom event.
   * @param detail The data to pass with the event, accessible via `event.detail`.
   */
  emit(eventName: string, detail: any) {
    if (!this.root) return
    const event = new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail,
    })
    this.root.dispatchEvent(event)
  }

  /**
   * Sets a CSS custom property (variable) on the component's host element.
   * @param name The name of the CSS variable (e.g., '--primary-color').
   * @param value The value to set.
   */
  setCssVariable(name: string, value: string) {
    this.style.setProperty(name, value)
  }

  /**
   * Gets the computed value of a CSS custom property from the component's host element.
   * @param name The name of the CSS variable.
   * @returns The computed value of the CSS variable.
   */
  getCssVariable(name: string) {
    return getComputedStyle(this).getPropertyValue(name).trim()
  }

  /**
   * A lifecycle hook intended for developers to override in their component's script.
   * It's called after the component's template has been attached and all initial
   * Nexus-UX attributes within it have been processed.
   */
  contentReadyCallback() {
    // To be implemented by the component author.
  }

  /**
   * Loads, parses, and renders the component's content from the given source.
   * This method handles clearing existing content and attaching new content, styles, and scripts.
   * It's designed to be called both on initial connection and when the component's source changes dynamically.
   * @param source The URL or inline HTML string for the component.
   */
  async _loadAndRender(source: string) {
    if (!this._stateCtx) {
      console.error(`[component] State context not available for <${this.tagName}>. Cannot load component source.`) 
      return
    }

    try {
      // Clear existing content before rendering new content
      if (this.root) {
        while (this.root.firstChild) {
          this.root.removeChild(this.root.firstChild)
        }
      }

      this._componentSrc = source

      if (this._templateContent) {
        this.root.appendChild(this._templateContent.cloneNode(true))
      }

      if (this._styles) {
        applyStyles(this.root, this._styles, this.tagName.toLowerCase(), this._isShadowDOM)
      }

      // Initialize State within the new content
      this._stateCtx.State.initTree(this.root)

      if (this._scripts) {
        const scriptCleanup = await executeScripts(this._scripts, this, this.root)
        this.registerCleanup(scriptCleanup)
      }

      try {
        this.contentReadyCallback()
      } catch (e) {
        console.error(`[component] Error in contentReadyCallback for <${this.tagName}>:`, e)
      }
      this._isRendered = true
    } catch (error) {
      console.error(`[component] Error loading and rendering component <${this.tagName}> from source "${source}":`, error)
    }
  }

  // --- Lifecycle Callbacks ---

  connectedCallback() {
    // Handle declarative `data-component:connected` attribute.
    const connectedExpr = this.getAttribute('data-component:connected');
    if (connectedExpr && this._stateCtx) {
        try {
            this._stateCtx.evaluate(connectedExpr);
        } catch (e) {
            console.error(`[component] Error in data-component:connected for <${this.tagName}>:`, e);
        }
    }

    if (this._contentAttached || this._isRendered) return
    this._contentAttached = true

    if (this._componentSrc) {
      this._loadAndRender(this._componentSrc)
    }
  }

  disconnectedCallback() {
    // Handle declarative cleanup via `data-component:disconnected` attribute.
    const disconnectExpr = this.getAttribute('data-component:disconnected');
    if (disconnectExpr && this._stateCtx) {
        try {
            this._stateCtx.evaluate(disconnectExpr);
        } catch (e) {
            console.error(`[component] Error in data-component:disconnected for <${this.tagName}>:`, e);
        }
    }

    this._cleanupFunctions.forEach((fn) => {
      try {
        fn()
      } catch (e) {
        console.error(`[component] Error during cleanup for <${this.tagName}>:`, e)
      }
    })
    this._cleanupFunctions = []
  }
}
// #endregion

// #region Helper Functions

async function getTemplateHtml(evaluateFn: (expr: string) => any, source: string): Promise<string> {
     let evaluatedSource = source;

     if (typeof evaluatedSource !== 'string' || !evaluatedSource) {
       throw new Error('data-component attribute must resolve to a non-empty string (URL, inline template, or ID reference).')
     }

     const hashIndex = evaluatedSource.indexOf('#');
     let urlPart = evaluatedSource;
     let fragmentId: string | null = null;

     if (hashIndex !== -1) {
       urlPart = evaluatedSource.substring(0, hashIndex);
       fragmentId = evaluatedSource.substring(hashIndex + 1);
     }

     let htmlContent: string;

     if (urlPart.trim() === '') {
       if (!fragmentId) {
         throw new Error('Fragment identifier required for same-page template reference (e.g., "#my-template-id").');
       }
       const templateElement = document.getElementById(fragmentId);
       if (!templateElement || !(templateElement instanceof HTMLTemplateElement)) {
          throw new Error(`[component] Template element with ID "${fragmentId}" not found or is not a <template> element.`);
       }
       htmlContent = templateElement.outerHTML;
     } else if (urlPart.trim().startsWith('<template>')) {
       htmlContent = urlPart;
     } else if (urlPart.trim().startsWith('data:')) {
       const parts = urlPart.split(',');
       if (parts.length < 2) throw new Error(`[component] Invalid Data URL format: ${urlPart}`);
       const metadata = parts[0].substring(5);
       const data = parts.slice(1).join(',');

       if (metadata.includes('base64')) {
         try {
           htmlContent = atob(data);
         } catch (e) {
           throw new Error(`[component] Failed to decode base64 data from Data URL: ${e}`);
         }
       } else {
         htmlContent = decodeURIComponent(data);
       }
     } else {
       const response = await fetch(urlPart);
       if (!response.ok) {
         throw new Error(`[component] Failed to fetch component from ${urlPart}: ${response.statusText}`);
       }
       htmlContent = await response.text();
     }

     if (fragmentId && urlPart.trim() !== '') {
       const tempDoc = new DOMParser().parseFromString(htmlContent, 'text/html');
       // Find the main template element in the fetched document
       const mainTemplate = tempDoc.querySelector('template');
       if (!mainTemplate) {
         throw new Error(`[component] No <template> element found in fetched content from ${urlPart}.`);
       }

       // Now, query within the content of that main template for the specific fragment ID
       const specificTemplate = mainTemplate.content.querySelector(`#${fragmentId}`);
       if (!specificTemplate || !(specificTemplate instanceof HTMLTemplateElement)) {
         throw new Error(`[component] Template with ID "${fragmentId}" not found or is not a <template> element within the main template in fetched content from ${urlPart}.`);
       }
       return specificTemplate.outerHTML; // Return the specific <template> element's outerHTML
     }

     return htmlContent;
   }

function parseComponentHTML(htmlString: string, tagName: string) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html')
  let templateElement = doc.querySelector('template')
  let shadowMode: string | null = null;

  if (!templateElement) {
    console.warn(`[component] No <template> tag found for <${tagName}>. Falling back to <body> content.`);
    const body = doc.body;
    if (!body || !body.hasChildNodes()) {
      throw new Error(`[component] Could not find <template> or non-empty <body> for <${tagName}>.`);
    }
    templateElement = document.createElement('template');
    while (body.firstChild) {
      templateElement.content.appendChild(body.firstChild);
    }
  }

  shadowMode = templateElement.getAttribute('shadowrootmode');
  const templateContent = templateElement.content;
  const styles = Array.from(templateContent.querySelectorAll('style, link[rel="stylesheet"]')) as (HTMLStyleElement | HTMLLinkElement)[];
  const scripts = Array.from(templateContent.querySelectorAll('script')) as HTMLScriptElement[];

  styles.forEach((s) => s.remove())
  scripts.forEach((s) => s.remove())

  return { templateContent, styles, scripts, shadowMode }
}

function applyStyles(root: ShadowRoot | HTMLElement, styles: (HTMLStyleElement | HTMLLinkElement)[], tagName: string, isShadowDOM: boolean) {
  if (isShadowDOM && 'adoptedStyleSheets' in (root as ShadowRoot)) {
    const sheets: CSSStyleSheet[] = []
    for (const node of styles) {
        if (node.tagName === 'STYLE') {
            try {
                const sheet = new CSSStyleSheet()
                sheet.replaceSync(node.textContent || '')
                sheets.push(sheet)
            } catch (e) {
                const clone = node.cloneNode(true) as HTMLElement
                root.appendChild(clone)
            }
        } else {
            root.appendChild(node.cloneNode(true))
        }
    }
    try { (root as ShadowRoot).adoptedStyleSheets = [...(root as ShadowRoot).adoptedStyleSheets, ...sheets] } catch (e) {}
  } else {
    styles.forEach((styleNode) => {
      const nodeClone = styleNode.cloneNode(true) as HTMLStyleElement | HTMLLinkElement
      if (nodeClone.nodeName === 'STYLE' && !isShadowDOM) {
        nodeClone.textContent = (nodeClone.textContent || '').replace(/:host/g, tagName)
      }
      root.appendChild(nodeClone)
    })
  }
}

async function executeScripts(scripts: HTMLScriptElement[], componentInstance: BaseComponent, rootEl: HTMLElement | ShadowRoot): Promise<() => void> {
    const contextId = `__component_ctx_${componentInstance._instanceId}`
    const stateCtx = componentInstance._stateCtx;

    (window as any)[contextId] = {
        // The component instance itself
        el: componentInstance,
        root: rootEl,
        // Nexus-UX functions
        State: stateCtx.State,
        evaluate: stateCtx.evaluate,
        evaluateLater: stateCtx.evaluateLater,
        effect: stateCtx.effect,
        cleanup: stateCtx.cleanup,
        // BaseComponent methods
        registerCleanup: componentInstance.registerCleanup.bind(componentInstance),
        generateScopedId: componentInstance.generateScopedId.bind(componentInstance),
        emit: componentInstance.emit.bind(componentInstance),
        // A place for scripts to export functions
        actions: {}
    };

    const cleanupFns: (() => void)[] = []

    const captureExports = (ns: any) => {
        if (!ns) return
        Object.keys(ns).forEach(k => {
            if (k === 'default') return
            try { (window as any)[contextId].actions[k] = ns[k] }
            catch (e) { }
        })
    }

    for (const script of scripts) {
        if (script.type && script.type.includes('module')) {
            if (script.src) {
                try {
                    const ns = await import(script.src)
                    captureExports(ns)
                } catch (e) {
                    console.error('[component] Failed to import module script', e)
                }
                continue
            }

            const content = script.textContent || ''
            try {
                const blob = new Blob([content], { type: 'text/javascript' })
                const url = URL.createObjectURL(blob)
                const ns = await import(url)
                captureExports(ns)
                cleanupFns.push(() => URL.revokeObjectURL(url))
            } catch (e) {
                console.error('[component] Component inline module error', e)
            }
            continue
        }

        if (script.src) {
            const s = document.createElement('script')
            s.type = script.type || 'text/javascript'
            s.src = script.src
            rootEl.appendChild(s)
            cleanupFns.push(() => s.remove())
            continue
        }

        const content = script.textContent || ''
        try {
            // In non-module scripts, `this` will be the window. We pass our context
            // as an argument to a function wrapper.
            const fn = new Function('ctx', `with(ctx) { ${content} }`);
            fn((window as any)[contextId])
        } catch (e) {
            console.error('[component] Component inline script error', e)
        }
    }

    return () => {
        delete (window as any)[contextId]
        cleanupFns.forEach(fn => fn())
    }
}


async function defineComponent(stateCtx: any, el: HTMLElement, componentSrc: string, props: any) {
  const tagName = el.tagName.toLowerCase()
  if (customElements.get(tagName)) return

  const formAssociated = el.hasAttribute('data-component:formAssociated');

  // Use a cache key that includes the source, in case the same tag
  // is used with different sources on the page.
  const definitionCacheKey = `${tagName}-${componentSrc}`;
  if (componentDefinitionCache.has(definitionCacheKey)) {
      return componentDefinitionCache.get(definitionCacheKey);
  }

  const definitionPromise = (async () => {
      try {
        const htmlContent = await getTemplateHtml(stateCtx.evaluate, componentSrc)
        const { templateContent, styles, scripts, shadowMode } = parseComponentHTML(htmlContent, tagName)

        customElements.define(
          tagName,
          class extends BaseComponent {
            static formAssociated = formAssociated;
            constructor() {
              super(stateCtx, templateContent, styles, scripts, !!shadowMode, props)
              this._componentSrc = componentSrc
            }
          }
        )
      } catch (error) {
        console.error(`[component] Error defining component <${tagName}> from source "${componentSrc}":`, error);
        // Don't re-throw, just log the error.
      }
  })();

  componentDefinitionCache.set(definitionCacheKey, definitionPromise);
  return definitionPromise;
}

// #endregion

// #region Main Plugin Logic

directive('component', (el, { expression }, { evaluate, effect, cleanup, initTree, State }) => {
    if (!(el instanceof HTMLElement)) {
        console.warn('[component] directive can only be used on HTML Elements.');
        return;
    }

    const stateCtx = { evaluate, effect, cleanup, initTree, State };

    // Create a reactive object for props from data-props-* attributes.
    const reactiveProps = State.reactive({});
    (el as any).$props = reactiveProps;

    const propAttributes = Array.from(el.attributes).filter(attr => attr.name.startsWith('data-props-'));
    for (const attr of propAttributes) {
        const propName = attr.name.substring('data-props-'.length);
        effect(() => {
            reactiveProps[propName] = evaluate(attr.value);
        });
    }

    // Ensure $router.state is reactive and auto-inject router params into props
    if ((window as any).$router && (window as any).$router.state) {
        if (!(window as any).$router.state.__isReactive) {
            const routerState = (window as any).$router.state;
            (window as any).$router.state = State.reactive(routerState);
            Object.defineProperty((window as any).$router.state, '__isReactive', { value: true, enumerable: false });
        }

        effect(() => {
            if ((window as any).$router.state.params) {
                Object.assign(reactiveProps, (window as any).$router.state.params);
            }
        });
    }

    const renderComponent = async (src: string | null) => {
        if (!src) return;

        try {
            // Ensure the custom element is defined.
            await defineComponent(stateCtx, el, src, (el as any).$props);

            // If the element has been defined and upgraded, it will be an instance of BaseComponent.
            // The browser's custom element lifecycle (connectedCallback) will handle the rendering.
            // If the element is already connected and we're just changing the source,
            // we might need to trigger a re-render manually.
            if (el instanceof BaseComponent) {
                if (el._componentSrc !== src || !el._isRendered) {
                    // The source has changed, we need to fetch new content and re-render.
                    const html = await getTemplateHtml(evaluate, src);
                    const { templateContent, styles, scripts, shadowMode } = parseComponentHTML(html, el.tagName.toLowerCase());
                    // Update the instance's properties with the new content
                    el._templateContent = templateContent;
                    el._styles = styles;
                    el._scripts = scripts;
                    el._isShadowDOM = !!shadowMode;
                    // Manually trigger the render process.
                    await el._loadAndRender(src);
                }
            } else {
                // The element is not yet a BaseComponent. This can happen if the `defineComponent`
                // call is still in progress. We might need to wait for the upgrade.
                // A simple way is to wait for the definition promise from the cache.
                const definitionCacheKey = `${el.tagName.toLowerCase()}-${src}`;
                if (componentDefinitionCache.has(definitionCacheKey)) {
                    await componentDefinitionCache.get(definitionCacheKey);
                }
                // After awaiting, the element should be upgraded, and its connectedCallback will fire.
            }
        } catch (e) {
            console.error('[component] render failed', e);
        }
    };

    effect(() => {
        const expr = expression.trim();
        let resolvedSource: string | undefined;

        // First, check for unambiguous literal prefixes
        if (expr.startsWith('#') || expr.startsWith('<template>') || expr.startsWith('data:')) {
            resolvedSource = expr;
        } else {
            // Now, for the rest, decide if it's an expression or a literal path/name.
            const isQuoted = (expr.startsWith("'" ) && expr.endsWith("'" )) || (expr.startsWith('"') && expr.endsWith('"'));
            // Regex for chars that indicate an expression.
            // Note: '/', '.', '-' are NOT included as they are common in paths.
            const hasExpressionChars = /[()\\\[\\\]{}+*=<>&|!?,;:\s$]/.test(expr);

            if (isQuoted || hasExpressionChars) {
                try {
                    const result = evaluate(expr);
                    if (typeof result === 'string') {
                        resolvedSource = result;
                    } else {
                        console.warn(`[component] Expression "${expr}" evaluated to a non-string value:`, result);
                    }
                } catch (e) {
                    // Nexus-UX will log the error.
                }
            } else {
                // It's a path or a bare component name.
                resolvedSource = expr;
            }
        }

        if (resolvedSource && resolvedSource.trim()) {
            renderComponent(resolvedSource.trim());
        }
    });

    cleanup(() => {
        if (el instanceof BaseComponent) {
            el.disconnectedCallback();
        }
    });
});
// #endregion
