import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reportError } from '../../engine/errors.ts';
import { stylesheet } from '../../engine/stylesheet.ts';

/**
 * data-progress="{ type: 'bar', location: 'top', color: 'primary', value: '$progress' }"
 * data-progress="{ type: 'spinner', color: 'primary', value: 'isLoading' }"
 */
interface ProgressConfig {
  type?: 'bar' | 'spinner';
  location?: 'top' | 'bottom' | 'left' | 'right';
  color?: string;
  gradient?: string;
  pattern?: string;
  value?: unknown;
  spinner?: string;
  size?: string;
}

let globalStylesInjected = false;
function injectGlobalStyles() {
  if (globalStylesInjected) return;
  const css = `
    @keyframes nexus-rotate { 100% { transform: rotate(360deg); } }
    @keyframes nexus-dash { 
      0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }
    @keyframes nexus-indeterminate-horizontal {
      0% { transform: translateX(-100%) scaleX(0.2); }
      50% { transform: translateX(0) scaleX(0.5); }
      100% { transform: translateX(100%) scaleX(0.2); }
    }
    @keyframes nexus-indeterminate-vertical {
      0% { transform: translateY(-100%) scaleY(0.2); }
      50% { transform: translateY(0) scaleY(0.5); }
      100% { transform: translateY(100%) scaleY(0.2); }
    }
    .nexus-progress-indeterminate-h {
      animation: nexus-indeterminate-horizontal 1.5s infinite linear;
      transform-origin: left center;
    }
    .nexus-progress-indeterminate-v {
      animation: nexus-indeterminate-vertical 1.5s infinite linear;
      transform-origin: top center;
    }
  `;
  stylesheet.adoptCSSSync(css, 'nexus-progress-internal');
  globalStylesInjected = true;
}

const progressModule: AttributeModule = {
  name: 'progress',
  attribute: 'progress',
  handle: (el: HTMLElement, expression: string, runtime: RuntimeContext): (() => void) | void => {
    let container: HTMLElement | null = null;
    let inner: HTMLElement | null = null;

    try {
      injectGlobalStyles();
      const [_runner, cleanup] = runtime.elementBoundEffect(el, () => {
        const update = () => {
          let config: ProgressConfig;
          try {
            config = runtime.evaluate(el, expression) as ProgressConfig;
          } catch (e) {
            reportError(new Error(`Progress: Evaluation error: ${e}`), el);
            return;
          }

          if (!config) return;

          const type = config.type || 'bar';
          const val = typeof config.value === 'number' ? config.value : (runtime.evaluate(el, String(config.value)) || 0);
          const isVisible = typeof val === 'boolean' ? val : (Number(val) > 0);

          if (!isVisible) {
            if (container) {
              container.remove();
              container = null;
            }
            return;
          }

          if (!container) {
            container = document.createElement('div');
            container.style.position = (el === document.documentElement || el === document.body) ? 'fixed' : 'absolute';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '9999';
            
            inner = document.createElement('div');
            container.appendChild(inner);
            el.appendChild(container);
          }

          if (type === 'bar') {
            const loc = config.location || 'top';
            container.style.top = (loc === 'top' || loc === 'left' || loc === 'right') ? '0' : 'auto';
            container.style.bottom = loc === 'bottom' ? '0' : 'auto';
            container.style.left = (loc === 'top' || loc === 'bottom' || loc === 'left') ? '0' : 'auto';
            container.style.right = loc === 'right' ? '0' : 'auto';
            
            const size = config.size || '4px';
            const isIndeterminate = config.value === true;
            
            if (loc === 'top' || loc === 'bottom') {
              container.style.width = '100%';
              container.style.height = size;
              inner!.style.height = '100%';
              if (isIndeterminate) {
                  inner!.style.width = '100%';
                  inner!.className = 'nexus-progress-indeterminate-h';
                  inner!.style.transition = 'none';
              } else {
                  inner!.style.width = `${val}%`;
                  inner!.className = '';
                  inner!.style.transition = 'width 0.3s ease';
              }
            } else {
              container.style.height = '100%';
              container.style.width = size;
              inner!.style.width = '100%';
              if (isIndeterminate) {
                  inner!.style.height = '100%';
                  inner!.className = 'nexus-progress-indeterminate-v';
                  inner!.style.transition = 'none';
              } else {
                  inner!.style.height = `${val}%`;
                  inner!.className = '';
                  inner!.style.transition = 'height 0.3s ease';
              }
            }

            inner!.style.background = config.gradient || config.color || 'var(--p, #570df8)';
            if (config.pattern) {
              inner!.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20L0 20z' fill='%23ffffff' fill-opacity='.1'/%3E%3C/svg%3E")`;
            }
          } else if (type === 'spinner') {
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            
            if (config.spinner) {
              inner!.innerHTML = config.spinner;
            } else {
              inner!.innerHTML = `<svg class="nexus-spinner" viewBox="0 0 50 50" style="width: ${config.size || '40px'}; height: ${config.size || '40px'}; animation: nexus-rotate 2s linear infinite;">
                <circle cx="25" cy="25" r="20" fill="none" stroke="${config.color || 'currentColor'}" stroke-width="5" stroke-dasharray="90,150" stroke-linecap="round" style="animation: nexus-dash 1.5s ease-in-out infinite;"></circle>
              </svg>`;
            }
          }
        };
        update();
      });
      return () => {
        cleanup();
        if (container) container.remove();
      };
    } catch (e) {
      reportError(new Error(`Progress initialization failed: ${e}`), el);
    }
  }
};

export default progressModule;
