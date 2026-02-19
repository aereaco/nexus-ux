import { AttributeModule } from '../engine/modules.ts';
import { RuntimeContext } from '../engine/composition.ts';
import { initError } from '../engine/errors.ts';

/**
 * data-theme="signal"
 * Handles theme resolution (auto/light/dark) and applies it to the element or document root.
 */
const themeModule: AttributeModule = {
  name: 'theme',
  attribute: 'theme',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    // Multi-initialization guard: 
    // The parser treats 'data-theme-options' as directive='theme', argument='options'.
    // We only want to run the core logic for the primary 'data-theme' attribute.
    const attr = Array.from(el.attributes).find(a => a.value === expression && a.name.startsWith('data-theme'));
    if (attr && attr.name !== 'data-theme') {
      return; 
    }

    const optionsAttr = el.getAttribute('data-theme-options');
    let mediaQueryCleanup: (() => void) | null = null;
    runtime.log(`Nexus Theme [${expression}]: Initializing on`, el);

    const updateTheme = (value: unknown) => {
      let activeModeId = String(value);
      let isSystemDark = false;
      
      // 1. Auto/System Resolution
      if (activeModeId === 'auto') {
        const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
        isSystemDark = mq.matches;
        activeModeId = isSystemDark ? 'night' : 'day';
        
        // Setup listener if it's the first time
        if (!mediaQueryCleanup) {
          const listener = () => {
            const currentVal = runtime.evaluate(el, expression);
            if (currentVal === 'auto') updateTheme('auto');
          };
          mq.addEventListener('change', listener);
          mediaQueryCleanup = () => mq.removeEventListener('change', listener);
        }
      } else {
        // Stop listening if we moved away from auto
        if (mediaQueryCleanup) {
          mediaQueryCleanup();
          mediaQueryCleanup = null;
        }
      }

      let resolvedTheme = activeModeId;

      // 2. Data-Driven Mapping (lookup our active mode ID in options)
      if (optionsAttr) {
        try {
          const items = runtime.evaluate(el, optionsAttr);
          if (Array.isArray(items)) {
            const item = items.find(i => (i.id || i) === activeModeId);
            if (item && item.theme) {
              resolvedTheme = String(item.theme);
            }
          }
        } catch (e) {
          console.error(`Nexus Theme: Failed to evaluate options "${optionsAttr}"`, e);
        }
      }

      // 3. Common Alias Fallbacks (if still day/night strings)
      if (resolvedTheme === 'day') resolvedTheme = 'light';
      if (resolvedTheme === 'night') resolvedTheme = 'dark';

      runtime.log(`Nexus Theme [${expression}]: Mode "${value}" (Auto: ${activeModeId}) resolved to Theme "${resolvedTheme}"`);

      // 3. Apply to Document Root (complement DaisyUI)
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      
      // 4. Apply classes (complement Tailwind CSS)
      // We use the activeModeId for dark/light class logic for consistency with system preferences
      if (activeModeId === 'night' || resolvedTheme.includes('dark')) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };

    try {
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const value = runtime.evaluate(el, expression);
        updateTheme(value);
      });

      return () => {
        cleanup();
        if (mediaQueryCleanup) mediaQueryCleanup();
      };
    } catch (e) {
      initError('theme', `Failed to bind theme: ${e instanceof Error ? e.message : String(e)}`, el, expression);
    }
  }
};

export default themeModule;
