import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { initError } from '../../engine/errors.ts';

const modelModule: AttributeModule = {
  name: 'model',
  attribute: 'model',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext): (() => void) | void => {
    if (!value) return;

    const cleanupFns: (() => void)[] = [];

    try {
      // 1. Reactive Effect for Downstream Binding (State -> DOM)
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const result = runtime.evaluate(el, value);
        
        if (el instanceof HTMLInputElement) {
          if (el.type === 'checkbox') {
            el.checked = Boolean(result);
          } else if (el.type === 'radio') {
            el.checked = (el.value === String(result));
          } else {
            el.value = result !== undefined && result !== null ? String(result) : '';
          }
        } else if (el instanceof HTMLSelectElement) {
          const targetValue = result !== undefined && result !== null ? String(result) : '';
          
          const syncSelect = () => {
            const options = Array.from(el.options);
            const found = options.some(opt => opt.value === targetValue);
            const isDebug = (window as unknown as { _nexusDebug?: boolean })._nexusDebug;
            if (isDebug) console.debug(`[Nexus Model Sync] <${el.tagName}> Target: "${targetValue}", Found: ${found}, Options:`, options.map(o => o.value));
            if (found || targetValue === '') {
              if (el.value !== targetValue) {
                el.value = targetValue;
                // Double check for quirky browsers
                if (el.value !== targetValue) setTimeout(() => el.value = targetValue, 0);
              }
            }
          };

          syncSelect();

          // Persistent Reconciliation: Dynamic options (data-for) may churn multiple times.
          // We attach a persistent MutationObserver for the life of this effect.
          const observer = new MutationObserver((mutations) => {
            const isDebug = (window as unknown as { _nexusDebug?: boolean })._nexusDebug;
            if (isDebug) console.debug(`[Nexus Model Mutation] <${el.tagName}> Mutation detected:`, mutations.length);
            syncSelect();
            // Also try deferred to catch late hydration
            setTimeout(syncSelect, 10);
          });
          observer.observe(el, { childList: true, subtree: true, attributes: true });
          cleanupFns.push(() => observer.disconnect());
        } else if (el instanceof HTMLTextAreaElement) {
          el.value = result !== undefined && result !== null ? String(result) : '';
        }
      });
      cleanupFns.push(cleanup);

      // 2. Event Listener for Upstream Binding (DOM -> State)
      const isLazy = el.hasAttribute('data-model:lazy');
      const eventName = isLazy ? 'change' : (
        el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') 
        || el instanceof HTMLSelectElement ? 'change' : 'input'
      );

      const inputHandler = (e: Event) => {
        let newValue: unknown;
        if (el instanceof HTMLInputElement && el.type === 'checkbox') {
          newValue = el.checked;
        } else if (el instanceof HTMLInputElement && el.type === 'radio') {
          newValue = el.checked ? el.value : undefined;
          if (newValue === undefined) return; // Ignore uncheck events for radios
        } else if ('value' in el) {
          newValue = (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
        }

        // We use a temporary scope to inject $newValue and execute assignment.
        runtime.evaluate(el, `${value} = $newValue`, { $newValue: newValue });
      };

      el.addEventListener(eventName, inputHandler);
      cleanupFns.push(() => el.removeEventListener(eventName, inputHandler));

    } catch (e) {
      initError('model', `Failed to bind model: ${e instanceof Error ? e.message : String(e)}`, el, value);
    }

    return () => cleanupFns.forEach(fn => fn());
  }
};

export default modelModule;
