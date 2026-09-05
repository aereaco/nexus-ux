import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, getDataStack } from '../../engine/scope.ts';
import { COMPONENT_CONTEXT_KEY, DATA_STACK_KEY } from '../../engine/consts.ts';
import { cacheEngine } from '../../engine/cache.ts';
import type { NexusEnhancedElement } from '../../engine/reactivity.ts';
import { initError } from '../../engine/debug.ts';
import { stylesheet } from './stylesheet.ts';

export interface ComponentConfig {
  path: string;
  lazy?: boolean;
  shadowrootmode?: 'open' | 'closed';
  fallback?: string;
}

const ElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as typeof HTMLElement);

/**
 * Base class for all Web Component elements managed by Nexus-UX.
 * Provides native custom element capabilities, Shadow DOM / Light DOM root
 * isolation, form-association hooks, and cleanup registration.
 */
export class BaseComponent extends ElementBase {
  root: ShadowRoot | this;
  internals?: ElementInternals;
  _templateContent?: DocumentFragment;
  _styles?: (HTMLStyleElement | HTMLLinkElement)[];
  _scripts?: HTMLScriptElement[];
  _cleanupFunctions: (() => void)[] = [];
  _componentSrc: string | null = null;
  _isRendered = false;

  constructor(isShadowDOM?: boolean) {
    super();
    if (isShadowDOM) {
      this.root = this.attachShadow({ mode: 'open' });
    } else {
      this.root = this;
    }
    if (typeof this.attachInternals === 'function') {
      try {
        this.internals = this.attachInternals();
      } catch {
        // Ignored if not form-associated
      }
    }
  }

  connectedCallback() {
    this._isRendered = true;
  }

  disconnectedCallback() {
    this._cleanupFunctions.forEach((fn) => fn());
    this._cleanupFunctions = [];
  }

  registerCleanup(fn: () => void) {
    this._cleanupFunctions.push(fn);
  }
}

/**
 * Extracts resource metadata (<title>, <meta name="..." content="...">)
 * from fetched component HTML text and publishes it to the global router signal.
 */
function extractResourceMetadata(
  htmlText: string,
  path: string,
  runtime: RuntimeContext
): Record<string, string> {
  const meta: Record<string, string> = {};
  if (!htmlText || typeof htmlText !== 'string') return meta;

  try {
    // Check YAML frontmatter for .md components
    const fmMatch = htmlText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let hasFmTitle = false;
    if (fmMatch) {
      const lines = fmMatch[1].split(/\r?\n/);
      for (const l of lines) {
        const idx = l.indexOf(':');
        if (idx > 0) {
          const k = l.substring(0, idx).trim().toLowerCase();
          const v = l.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          meta[k] = v;
          if (k === 'title') hasFmTitle = true;
        }
      }
    }

    if (!hasFmTitle) {
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlText, 'text/html');

      const titles = Array.from(parsedDoc.querySelectorAll('title'));
      const titleEl = titles.find((t) => !t.closest('svg'));
      if (titleEl && titleEl.textContent) {
        meta.title = titleEl.textContent.trim();
      }

      parsedDoc.querySelectorAll('meta').forEach((metaEl) => {
        const key = metaEl.getAttribute('name') || metaEl.getAttribute('property');
        const content = metaEl.getAttribute('content');
        if (key && content && !meta[key]) {
          meta[key] = content.trim();
        }
      });
    }

    const globals = runtime.globalSignals ? runtime.globalSignals() : {};
    if (globals) {
      const norm = path.startsWith('/') ? path : '/' + path;
      const unnorm = path.startsWith('/') ? path.slice(1) : path;
      const curMeta = globals.meta || {};
      const nextMeta = {
        ...curMeta,
        [path]: meta,
        [norm]: meta,
        [unnorm]: meta
      };
      if (runtime.setGlobalSignal) {
        runtime.setGlobalSignal('meta', nextMeta);
      }
      const routerState = (globals.router || globals.appRouter) as any;
      if (routerState) {
        routerState.meta = nextMeta;
        if (Array.isArray(routerState.routes)) {
          const routeRecord = routerState.routes.find((r: any) => r.path === path || r.path === norm || r.path === unnorm);
          if (routeRecord) {
            routeRecord.meta = { ...(routeRecord.meta || {}), ...meta };
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Component] Failed to extract metadata for ${path}:`, e);
  }
  return meta;
}

/**
 * Dynamically registers custom element tag if not already registered.
 */
function ensureCustomElementRegistered(tagName: string): void {
  if (typeof customElements === 'undefined') return;
  const tag = tagName.toLowerCase();
  if (tag.includes('-') && !customElements.get(tag)) {
    try {
      customElements.define(
        tag,
        class extends BaseComponent {
          constructor() {
            super();
          }
        }
      );
    } catch {
      // Custom element already registered or name conflict
    }
  }
}

/**
 * Builds a single reactive-ish object that reads/writes through the host's
 * merged data stack (most-local scope wins), then layers the component ctx on
 * top. This is the "implicit inherit" scope seeded onto a shadow root so that
 * data-bind inside the shadow tree behaves exactly like light DOM.
 */
function createInheritedShadowScope(
  host: HTMLElement,
  ctx: ComponentContext
): Record<string, unknown> {
  return new Proxy(ctx, {
    has(target, key) {
      if (key in target) return true;
      return getDataStack(host).some((scope) => key in scope);
    },
    get(target, key) {
      if (key in target) return Reflect.get(target, key);
      const stack = getDataStack(host);
      for (const scope of stack) {
        if (key in scope) return scope[key as string];
      }
      return undefined;
    },
    set(target, key, value) {
      const stack = getDataStack(host);
      for (const scope of stack) {
        if (key in scope) {
          scope[key as string] = value;
          return true;
        }
      }
      return Reflect.set(target, key, value);
    },
    ownKeys(target) {
      const keys = new Set<string | symbol>(Reflect.ownKeys(target));
      for (const scope of getDataStack(host)) {
        for (const k of Object.keys(scope)) keys.add(k);
      }
      return Array.from(keys);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key in target) return Reflect.getOwnPropertyDescriptor(target, key);
      for (const scope of getDataStack(host)) {
        if (key in scope) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: scope[key as string]
          };
        }
      }
      return undefined;
    }
  });
}

export interface ComponentContext {
  element: HTMLElement | ShadowRoot;
  isConnected: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  templateContent: string;
  [key: string]: unknown;
}

declare global {
  interface HTMLElement {
    [COMPONENT_CONTEXT_KEY]?: ComponentContext;
  }
}

const componentModule: AttributeModule = {
  name: 'component',
  attribute: 'component',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    try {
      if (el.hasAttribute('data-route')) return;
      if (el.hasAttribute('data-nx-cmp-done')) return;

      ensureCustomElementRegistered(el.tagName);

      const componentState = runtime.reactive({
        isConnected: false,
        isLoading: false,
        hasError: false,
        errorMessage: '',
        templateContent: '',
        meta: {} as Record<string, string>
      });

      const ctx: ComponentContext = componentState as unknown as ComponentContext;
      ctx.element = el;

      el[COMPONENT_CONTEXT_KEY] = ctx;

      let tabObj: Record<string, unknown> | null = null;
      const isTabOutlet = el.tagName.toLowerCase() === 'tab-content';
      if (isTabOutlet) {
        const dataStack = getDataStack(el);
        for (const scope of dataStack) {
          if (scope && typeof scope === 'object' && 'tab' in scope) {
            const t = (scope as any).tab;
            if (t && typeof t === 'object') {
              tabObj = t;
            }
            break;
          }
        }
      }
      let scopeAttached = false;

      let __lastPath: string | undefined;
      runtime.effect(() => {
        let config: ComponentConfig;
        const evaluated = runtime.evaluate(el, value);
        if (!scopeAttached) {
          addScopeToNode(el, ctx);
          scopeAttached = true;
        }
        if (typeof evaluated === 'object' && evaluated !== null) {
          config = evaluated as ComponentConfig;
        } else if (typeof evaluated === 'string') {
          try {
            config = JSON.parse(evaluated);
          } catch {
            if (evaluated.trim().startsWith('{')) {
              try {
                config = (new Function('return (' + evaluated + ')'))();
              } catch {
                config = { path: evaluated };
              }
            } else {
              config = { path: evaluated };
            }
          }
        } else {
          return;
        }

        if (!config.path || config.path === 'none' || config.path === 'undefined' || config.path === 'null') return;

        if (config.path === __lastPath) return;
        __lastPath = config.path;

        const load = async () => {
          componentState.isLoading = true;
          componentState.hasError = false;
          if (isTabOutlet && tabObj && typeof tabObj === 'object') {
            (tabObj as any).isLoading = true;
          }
          try {
            let html = '';
            let targetPath = config.path.trim();
            if ((targetPath.startsWith("'") && targetPath.endsWith("'")) || (targetPath.startsWith('"') && targetPath.endsWith('"'))) {
              targetPath = targetPath.slice(1, -1).trim();
            }
            if (targetPath.startsWith('<')) {
              html = targetPath;
            } else if (targetPath.startsWith('#')) {
              const rootNode = el.getRootNode() as Document | ShadowRoot | HTMLElement;
              const template = (rootNode?.querySelector ? rootNode.querySelector(targetPath) : null) || document.querySelector(targetPath);
              if (!template) throw new Error(`Template ${targetPath} not found`);
              html = (template as HTMLTemplateElement).innerHTML;
            } else {
              const result = await cacheEngine.fetchWithCache(targetPath, {
                storage: 'session',
                responseType: 'text',
                onUpdate: (fresh) => {
                  if (typeof fresh === 'string' && fresh !== componentState.templateContent) {
                    componentState.templateContent = fresh;
                    const extracted = extractResourceMetadata(fresh, targetPath, runtime);
                    componentState.meta = extracted;
                    if (tabObj && extracted) {
                      tabObj.meta = Object.assign(tabObj.meta || {}, extracted);
                    }
                  }
                }
              });
              html = typeof result === 'string' ? result : String(result);
            }

            const rawText = html;
            const extracted = extractResourceMetadata(rawText, config.path, runtime);
            componentState.meta = extracted;

            const isMarkdown = targetPath.endsWith('.md') || targetPath.endsWith('.markdown');
            if (isMarkdown) {
              const fmMatch = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
              let cleanMd = rawText;
              if (fmMatch) {
                cleanMd = rawText.slice(fmMatch[0].length).trim();
              }
              html = `<div class="p-6 max-w-5xl mx-auto"><article data-markdown class="prose max-w-none">${cleanMd}</article></div>`;
            } else if (rawText.includes('<!DOCTYPE') || (rawText.includes('data-init') && el.tagName.toLowerCase() !== 'html')) {
              throw new Error(`Invalid component fragment returned for "${targetPath}": received full HTML shell.`);
            }

            if (runtime.isDevMode) {
              console.log(`[Component] Template loaded for <${el.tagName}>, length: ${html.length}`);
            }

            componentState.templateContent = html;

            // Sync resolved metadata back to the reactive tab object so the tab
            // header binding (tab.meta?.title / tab.meta?.icon) updates immediately.
            if (tabObj && extracted && (extracted.title || extracted.icon)) {
              tabObj.meta = { ...(tabObj.meta || {}), ...extracted };
            }

            if (config.shadowrootmode) {
              if (!el.shadowRoot) el.attachShadow({ mode: config.shadowrootmode });
              const shadow = el.shadowRoot!;

              const scopeExpr = el.getAttribute('data-scope');
              let shadowScope: Record<string, unknown>;
              if (scopeExpr && scopeExpr.trim()) {
                const declared = runtime.evaluate(el, scopeExpr);
                const declaredObj =
                  declared && typeof declared === 'object'
                    ? (declared as Record<string, unknown>)
                    : {};
                shadowScope = createInheritedShadowScope(el, declaredObj as ComponentContext);
              } else {
                shadowScope = createInheritedShadowScope(el, ctx);
              }
              (shadow as unknown as NexusEnhancedElement)[DATA_STACK_KEY] = [shadowScope];

              runtime.morphDOM(shadow as unknown as HTMLElement, html);
              stylesheet.adoptShadowSubtree(shadow);
              Array.from(shadow.children).forEach((child) => {
                if (child instanceof HTMLElement || child instanceof SVGElement) {
                  runtime.processElement(child as unknown as HTMLElement);
                }
              });
            } else {
              runtime.morphDOM(el, html);
              stylesheet.adoptElementSubtree(el);
              Array.from(el.children).forEach((child) => {
                if (child instanceof HTMLElement || child instanceof SVGElement) {
                  runtime.processElement(child as unknown as HTMLElement);
                }
              });
              el.setAttribute('data-nx-cmp-done', 'true');
              runtime.processElement(el);
            }

            const focusable = (config.shadowrootmode ? el.shadowRoot : el)?.querySelector('[autofocus], [data-autofocus]');
            if (focusable instanceof HTMLElement) {
              focusable.focus();
            }
          } catch (e) {
            componentState.hasError = true;
            componentState.errorMessage = e instanceof Error ? e.message : String(e);
            initError('component', componentState.errorMessage, el, value);
            if (config.fallback) {
              const fb = runtime.evaluate(el, config.fallback);
              runtime.morphDOM(el, String(fb));
            }
          } finally {
            componentState.isLoading = false;
            if (isTabOutlet && tabObj && typeof tabObj === 'object') {
              (tabObj as any).isLoading = false;
              if (componentState.meta?.title && (!tabObj.meta || !(tabObj.meta as any).title)) {
                tabObj.meta = Object.assign(tabObj.meta || {}, { title: componentState.meta.title });
              }
              if (componentState.meta?.icon && (!tabObj.meta || !(tabObj.meta as any).icon)) {
                tabObj.meta = Object.assign(tabObj.meta || {}, { icon: componentState.meta.icon });
              }
            }
          }
        };

        load();
      });

      return () => {
        if (el instanceof BaseComponent) {
          el.disconnectedCallback();
        }
      };
    } catch (e) {
      initError(
        'component',
        `Failed to init component: ${e instanceof Error ? e.message : String(e)}`,
        el,
        value
      );
    }
  }
};

export default componentModule;
