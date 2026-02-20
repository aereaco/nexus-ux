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
    let config: ComponentConfig;
    try {
      // Parse config
      const evaluated = runtime.evaluate(el, value);
      if (typeof evaluated === 'object' && evaluated !== null) {
        config = evaluated as ComponentConfig;
      } else if (typeof evaluated === 'string') {
        try {
          config = JSON.parse(evaluated);
        } catch {
          // If simple string, assume it's the path?
          // No, Spec says it should be a config object generally, but maybe simple path is allowed?
          // 2025 implementation throws error on invalid JSON.
          // Let's support simple string as path for convenience.
          config = { path: evaluated };
        }
      } else {
        throw new Error('Invalid component config');
      }

      if (!config.path) throw new Error('Component path required');

      // Initialize Context
      const componentState = runtime.reactive({
        isConnected: false,
        isLoading: false,
        hasError: false,
        errorMessage: '',
        templateContent: '',
        props: {}
      });

      const ctx: ComponentContext = {
        element: el,
        ...componentState
      };

      el[COMPONENT_CONTEXT_KEY] = ctx;
      addScopeToNode(el, ctx);

      const load = async () => {
        componentState.isLoading = true;
        componentState.hasError = false;
        try {
          let html = '';
          if (config.path.startsWith('#')) {
            const template = document.querySelector(config.path) as HTMLTemplateElement;
            if (!template) throw new Error(`Template ${config.path} not found`);
            html = template.innerHTML;
          } else {
            if (!runtime.fetch) throw new Error('Fetch utility not available');
            html = await runtime.fetch.request(config.path, { responseType: 'text' }, el) as string;
          }

          componentState.templateContent = html;

          if (config.shadowrootmode) {
            if (!el.shadowRoot) el.attachShadow({ mode: config.shadowrootmode });
            runtime.morphDOM(el.shadowRoot! as unknown as HTMLElement, html);
            // Modules need to re-scan shadow root?
            // ModuleCoordinator currently scans passed element specifically.
            // We need to trigger scan on shadow root.
            // RuntimeContext.processElement processes specifically that element.
            // We might need a way to scan a whole tree. 
            // For now, let's assume morphDOM might handle some, or we manually scan children.
            // NOTE: Scoped styles in Shadow DOM work naturally.
          } else {
            runtime.morphDOM(el, html);
            // Recurse scan is handled by morphDOM/idiomorph usually? 
            // Or we need to re-scan the new content.
            // Since we are inside 'handle', the coordinator *will* recurse into children of 'el' 
            // AFTER handle returns (if synchronous).
            // But this is async. The coordinator recursion happens immediately.
            // So for async loaded content, we MUST manually trigger processElement on children.

            // However, processElement works on a single element.
            // We need `scan` equivalent for a subtree.
            // We can assume `runtime.processElement` handles children recursively?
            // Modules.ts: processElement -> recurse children. Yes.

            // So we just call processElement on el? No, that would re-process 'component' directive.
            // We need to process *new* children.
            Array.from(el.children).forEach(child => {
              if (child instanceof HTMLElement) runtime.processElement(child);
            });
          }

        } catch (e) {
          componentState.hasError = true;
          componentState.errorMessage = e instanceof Error ? e.message : String(e);
          initError('component', componentState.errorMessage, el, value);
          if (config.fallback) {
            // Render fallback
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
        // TODO: IntersectionObserver for lazy load
        load(); // Just load for now
      }

      return () => {
        // cleanup
      };

    } catch (e) {
      initError('component', `Failed to init component: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }
  }
};

export default componentModule;
