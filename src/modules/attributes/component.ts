import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode, getDataStack } from '../../engine/scope.ts';
import { COMPONENT_CONTEXT_KEY, DATA_STACK_KEY } from '../../engine/consts.ts';
import type { NexusEnhancedElement } from '../../engine/reactivity.ts';
import { initError } from '../../engine/debug.ts';

export interface ComponentConfig {
  path: string;
  lazy?: boolean;
  shadowrootmode?: 'open' | 'closed';
  fallback?: string;
}

/**
 * Builds a single reactive-ish object that reads/writes through the host's
 * merged data stack (most-local scope wins), then layers the component ctx on
 * top. This is the "implicit inherit" scope seeded onto a shadow root so that
 * data-bind inside the shadow tree behaves exactly like light DOM.
 *
 * Reads walk the host stack front-to-back (nearest scope first); writes target
 * the nearest scope that already owns the key, otherwise the component ctx.
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
          return { configurable: true, enumerable: true, writable: true, value: scope[key as string] };
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
      // A `data-route` element's `data-component` is a route DECLARATION consumed
      // by the router (published to `$router.route`), not an inline render. Skip
      // it here to avoid double-rendering; the outlet element
      // (`<main data-component="$router.route">`, which has no data-route) renders.
      if (el.hasAttribute('data-route')) return;

      // Initialize Context
      const componentState = runtime.reactive({
        isConnected: false,
        isLoading: false,
        hasError: false,
        errorMessage: '',
        templateContent: ''
      });

      const ctx: ComponentContext = {
        element: el,
        ...componentState
      };

      el[COMPONENT_CONTEXT_KEY] = ctx;
      addScopeToNode(el, ctx);

      let __lastPath: string | undefined;
      runtime.effect(() => {
        let config: ComponentConfig;
        // Parse config
        const evaluated = runtime.evaluate(el, value);
        if (typeof evaluated === 'object' && evaluated !== null) {
          config = evaluated as ComponentConfig;
        } else if (typeof evaluated === 'string') {
          try {
            config = JSON.parse(evaluated);
          } catch {
            config = { path: evaluated };
          }
        } else {
          return;
        }

        if (!config.path || config.path === 'none') return;

        // Memoize by resolved path: only re-fetch/remorph when the target
        // actually changes. A re-run caused by an unrelated signal (e.g. hover)
        // must NOT tear down and rebuild the component, or panel state (input
        // focus, scroll, form values) is lost on every unrelated update.
        if (config.path === __lastPath) return;
        __lastPath = config.path;

        const load = async () => {
          componentState.isLoading = true;
          componentState.hasError = false;
          try {
            let html = '';
            if (config.path.trim().startsWith('<')) {
              html = config.path;
            } else if (config.path.startsWith('#')) {
              const template = document.querySelector(config.path) as HTMLTemplateElement;
              if (!template) throw new Error(`Template ${config.path} not found`);
              html = template.innerHTML;
            } else {
              if (!runtime.fetch) throw new Error('Fetch utility not available');
              html = await runtime.fetch.request(config.path, { responseType: 'text' }, el) as string;
            }

            if (runtime.isDevMode) console.log(`[Component] Template loaded for <${el.tagName}>, length: ${html.length}`);
            
            componentState.templateContent = html;

            if (config.shadowrootmode) {
              if (!el.shadowRoot) el.attachShadow({ mode: config.shadowrootmode });
              const shadow = el.shadowRoot!;

              // --- Seed the shadow root's scope ---------------------------------
              // Explicit opt-in: data-scope="{ ... }" evaluated in the HOST's
              // parent scope; its result becomes the shadow scope (layered over
              // the component ctx). This is the encapsulation boundary.
              // Implicit (default): a proxy over the host's merged data stack so
              // data-bind inside the shadow "just works" like light DOM.
              const scopeExpr = el.getAttribute('data-scope');
              let shadowScope: Record<string, unknown>;
              if (scopeExpr && scopeExpr.trim()) {
                const declared = runtime.evaluate(el, scopeExpr);
                const declaredObj =
                  declared && typeof declared === 'object'
                    ? (declared as Record<string, unknown>)
                    : {};
                // Component ctx stays available; declared keys are the crossing set.
                shadowScope = Object.assign(Object.create(null), ctx, declaredObj);
              } else {
                shadowScope = createInheritedShadowScope(el, ctx);
              }
              (shadow as unknown as NexusEnhancedElement)[DATA_STACK_KEY] = [shadowScope];

              runtime.morphDOM(shadow as unknown as HTMLElement, html);
              // Process the shadow tree by walking its top-level element children.
              // A ShadowRoot itself has no hasAttribute(), so it cannot be passed
              // to processElement directly; its children inherit the seeded scope
              // via getDataStack's ShadowRoot boundary handling.
              Array.from(shadow.children).forEach((child) => {
                if (child instanceof HTMLElement || child instanceof SVGElement) {
                  runtime.processElement(child as unknown as HTMLElement);
                }
              });
            } else {
              runtime.morphDOM(el, html);
              runtime.processElement(el);
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
          }
        };

        if (!config.lazy) {
          load();
        } else {
          load();
        }
      });

      return () => {
        // cleanup
      };

    } catch (e) {
      initError('component', `Failed to init component: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default componentModule;
