import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode } from '../../engine/scope.ts';
import { COMPONENT_CONTEXT_KEY } from '../../engine/consts.ts';
import { initError } from '../../engine/errors.ts';

export interface ComponentConfig {
  path: string;
  lazy?: boolean;
  shadowrootmode?: 'open' | 'closed';
  fallback?: string;
}

export interface ComponentContext {
  props: Record<string, unknown>;
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
      // Initialize Context
      const componentState = runtime.reactive({
        isConnected: false,
        isLoading: false,
        hasError: false,
        errorMessage: '',
        templateContent: '',
        props: {} as Record<string, unknown>
      });

      const ctx: ComponentContext = {
        element: el,
        ...componentState
      };

      el[COMPONENT_CONTEXT_KEY] = ctx;
      addScopeToNode(el, ctx);

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

        const load = async () => {
          componentState.isLoading = true;
          componentState.hasError = false;
          try {
            // 1. Resolve Props (data-signals-*)
            // This satisfies the "Zenith-Class" specification for parent-to-child isolation.
            Array.from(el.attributes).forEach(attr => {
              const parsed = runtime.parseAttribute(attr.name, runtime, el);
              if (parsed?.directive === 'prop' && parsed.argument) {
                const propName = parsed.argument;
                // Support both direct signal names and $(...) universal selectors
                runtime.effect(() => {
                  const val = runtime.evaluate(el, attr.value);
                  componentState.props[propName] = val;
                });
              }
            });

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
              runtime.morphDOM(el.shadowRoot! as unknown as HTMLElement, html);
              runtime.processElement(el.shadowRoot! as unknown as HTMLElement);
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
