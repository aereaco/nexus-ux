/**
 * Nexus-UX Native Theme Directive Module
 *
 * Handles `data-theme` for light/dark/system theme orchestration.
 * Encapsulates mode state (0 = Light, 1 = Dark, 2 = System), DaisyUI theme mapping,
 * matchMedia system preference detection, and localStorage persistence under the hood,
 * while exposing clean, high-DX scope helpers ($theme, $themeIcon, $switchTheme, $setTheme).
 *
 * ZCZS Guarantees:
 *   - Zero-copy: Theme state uses explicit runtime.ref primitive signals.
 *   - Zero-serialization: DOM data-theme attribute is mutated directly.
 */

import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { addScopeToNode } from '../../engine/scope.ts';
import { initError } from '../../engine/debug.ts';

const ALL_DAISYUI_THEMES = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave', 'retro',
  'cyberpunk', 'valentine', 'halloween', 'garden', 'forest', 'aqua', 'lofi', 'pastel',
  'fantasy', 'wireframe', 'black', 'luxury', 'dracula', 'cmyk', 'autumn', 'business',
  'acid', 'lemonade', 'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
];

const themeModule: AttributeModule = {
  name: 'theme',
  attribute: 'theme',
  metadata: {
    before: ['signal', 'switcher', 'class', 'style', 'attr', 'on', 'text', 'html']
  },
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let rawConfig: any = {};
    if (expression && expression.trim()) {
      try {
        rawConfig = runtime.evaluate(el, expression);
      } catch (_) {
        if (expression.startsWith('{')) {
           try { rawConfig = (new Function('return (' + expression + ')'))(); } catch (_) {}
        } else {
           rawConfig = { default: expression.trim() };
        }
      }
    }

    if (!rawConfig || typeof rawConfig !== 'object') {
       rawConfig = { default: 'auto' };
    }

    let initialModeState = 2; // 0 = Light, 1 = Dark, 2 = System ('auto')
    if (rawConfig.default === 'light' || rawConfig.default === 0) initialModeState = 0;
    else if (rawConfig.default === 'dark' || rawConfig.default === 1) initialModeState = 1;

    let savedLight = rawConfig.light?.theme || 'light';
    let savedDark = rawConfig.dark?.theme || 'dark';

    if (typeof localStorage !== 'undefined') {
        try {
            const savedState = localStorage.getItem('ux_theme_state');
            if (savedState !== null) initialModeState = Number(savedState);

            const l = localStorage.getItem('ux_theme_light');
            if (l) savedLight = l;

            const d = localStorage.getItem('ux_theme_dark');
            if (d) savedDark = d;
        } catch (_) {}
    }

    // Explicit primitive reactive signals to guarantee real-time computed invalidation
    const modeState = runtime.ref(initialModeState);
    const lightSelected = runtime.ref(savedLight);
    const darkSelected = runtime.ref(savedDark);
    const systemDark = runtime.ref(false);

    let mq: MediaQueryList | null = null;
    let listener: ((e: MediaQueryListEvent) => void) | null = null;

    if (typeof window !== 'undefined' && window.matchMedia) {
        mq = window.matchMedia('(prefers-color-scheme: dark)');
        systemDark.value = mq.matches;
        listener = (e: MediaQueryListEvent) => {
            systemDark.value = e.matches;
        };
        mq.addEventListener('change', listener);
    }

    const currentTheme = runtime.computed(() => {
        const s = modeState.value;
        if (s === 2) {
            return systemDark.value ? darkSelected.value : lightSelected.value;
        }
        return s === 1 ? darkSelected.value : lightSelected.value;
    });

    const activeModeName = runtime.computed(() => {
        const s = modeState.value;
        if (s === 0) return 'light';
        if (s === 1) return 'dark';
        return 'system';
    });

    const themeIcon = runtime.computed(() => {
        const s = modeState.value;
        if (s === 0) return 'material-symbols-light:light-mode-outline';
        if (s === 1) return 'material-symbols-light:dark-mode-outline';
        return 'material-symbols-light:light-mode-auto-outline';
    });

    const themeTypesComputed = runtime.computed(() => [
        { type: 'light', title: 'Light', selected: lightSelected.value },
        { type: 'dark', title: 'Dark', selected: darkSelected.value },
        { type: 'system', title: 'System', selected: 'system' }
    ]);

    const helpers = {
        $theme: {
            get state() { return modeState.value; },
            set state(v: number) { modeState.value = v; },
            get current() { return currentTheme.value; },
            get mode() { return activeModeName.value; },
            get isSystem() { return modeState.value === 2; },
            get themes() { return ALL_DAISYUI_THEMES; },
            get types() { return themeTypesComputed.value; }
        },
        get $activeTheme() { return currentTheme.value; },
        get $activeMode() { return activeModeName.value; },
        get $themeIcon() { return themeIcon.value; },
        $switchTheme: () => {
            modeState.value = (modeState.value + 1) % 3;
            if (typeof localStorage !== 'undefined') {
               try { localStorage.setItem('ux_theme_state', String(modeState.value)); } catch (_) {}
            }
        },
        $setTheme: (t: string) => {
            const isDark = modeState.value === 1 || (modeState.value === 2 && systemDark.value);
            if (isDark) {
                darkSelected.value = t;
                if (typeof localStorage !== 'undefined') {
                   try { localStorage.setItem('ux_theme_dark', t); } catch (_) {}
                }
            } else {
                lightSelected.value = t;
                if (typeof localStorage !== 'undefined') {
                   try { localStorage.setItem('ux_theme_light', t); } catch (_) {}
                }
            }
        }
    };

    addScopeToNode(el, helpers);

    try {
        const [_runner, cleanupEffect] = runtime.elementBoundEffect(el, () => {
            const themeToApply = currentTheme.value;
            const isDark = activeModeName.value === 'dark' || (activeModeName.value === 'system' && systemDark.value);

            if (themeToApply) {
                el.setAttribute('data-theme', themeToApply);
            }

            if (isDark) {
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
        initError('theme', `Failed to bind theme: ${e instanceof Error ? e.message : String(e)}`, el, expression);
    }
  }
};

export default themeModule;
