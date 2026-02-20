import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode } from '../../engine/scope.ts';
import { initError } from '../../engine/errors.ts';

/**
 * data-ux-theme="{ default: 'auto', auto: {}, light: {}, dark: {} }"
 * Orchestrates light/dark/auto states, abstract media query listeners, and mapping UI themes.
 */
const themeModule: AttributeModule = {
  name: 'ux-theme',
  attribute: 'ux-theme',
  metadata: {
    before: ['signal', 'switcher', 'class', 'style', 'attr', 'on', 'text', 'html']
  },
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let rawConfig: any;
    try {
      rawConfig = runtime.evaluate(el, expression);
    } catch (e) {
      console.error(`Nexus Theme: Failed to evaluate data-ux-theme expression`, e);
      return;
    }

    if (!rawConfig || typeof rawConfig !== 'object') {
       rawConfig = { default: 'auto', auto: {}, light: {}, dark: {} };
    }

    let initialMode = rawConfig.default || 'auto';
    // If we're on the document element, give localStorage priority if exists
    if (el === document.documentElement && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ux_themeMode');
        if (stored) initialMode = stored;
    }

    if (!rawConfig.modes || typeof rawConfig.modes !== 'object') {
       rawConfig.modes = { auto: {}, light: {}, dark: {} };
    }

    const modes = Object.keys(rawConfig.modes);

    const themeState = runtime.reactive({
        mode: initialMode,
        config: rawConfig.modes,
        modes: modes
    });

    let mq: MediaQueryList | null = null;
    let listener: ((e: MediaQueryListEvent) => void) | null = null;
    const systemDark = runtime.ref(false);

    if (typeof window !== 'undefined' && window.matchMedia) {
        mq = window.matchMedia('(prefers-color-scheme: dark)');
        systemDark.value = mq.matches;
        listener = (e: MediaQueryListEvent) => {
            systemDark.value = e.matches;
        };
        mq.addEventListener('change', listener);
    }

    const activeMode = runtime.computed(() => {
        let m = themeState.mode as string;
        if (m === 'auto') {
            m = systemDark.value ? 'dark' : 'light';
        }
        return m;
    });

    const activeUiTheme = runtime.computed(() => {
        const m = activeMode.value;
        const modeConfig = (themeState.config as any)[m];
        return modeConfig?.theme || m;
    });

    const themeIcon = runtime.computed(() => {
        return (themeState.config as any)[themeState.mode as string]?.icon || '';
    });

    const helpers = {
        $theme: themeState,
        $switchTheme: () => {
            const currentIdx = themeState.modes.indexOf(themeState.mode as string);
            let nextIdx = currentIdx + 1;
            if (nextIdx >= themeState.modes.length) nextIdx = 0;
            const newMode = themeState.modes[nextIdx] || 'auto';
            themeState.mode = newMode;
            if (el === document.documentElement && typeof localStorage !== 'undefined') {
               localStorage.setItem('ux_themeMode', newMode);
            }
        },
        $setTheme: (m: string) => {
            if (themeState.modes.includes(m)) {
                themeState.mode = m;
                if (el === document.documentElement && typeof localStorage !== 'undefined') {
                   localStorage.setItem('ux_themeMode', m);
                }
            }
        },
        get $activeTheme() { return activeUiTheme.value; },
        get $activeMode() { return activeMode.value; },
        get $themeIcon() { return themeIcon.value; }
    };

    addScopeToNode(el, helpers);

    try {
        const [_runner, cleanupEffect] = runtime.elementBoundEffect(el, () => {
            const themeToApply = activeUiTheme.value;
            const modeValue = activeMode.value;
            
            if (themeToApply && themeToApply !== 'auto') {
                el.setAttribute('data-theme', themeToApply);
            } else {
                el.removeAttribute('data-theme');
            }
            
            if (modeValue === 'dark') {
                el.classList.add('dark');
                el.classList.remove('light');
            } else {
                el.classList.add('light');
                el.classList.remove('dark');
            }
        });

        return () => {
            if (mq && listener) mq.removeEventListener('change', listener);
            cleanupEffect();
        };
    } catch (e) {
        initError('ux-theme', `Failed to bind theme: ${e instanceof Error ? e.message : String(e)}`, el, expression);
    }
  }
};

export default themeModule;
