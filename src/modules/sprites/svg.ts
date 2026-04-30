import { SpriteModule } from '../index.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';

/**
 * $svg Sprite.
 * Full-blown SVG Orchestration and Animation Engine.
 * Enables reactive node-link diagrams with zero-copy performance.
 */
export const svgModule: SpriteModule = {
  name: 'svg',
  key: '$svg',
  sprites: (context: RuntimeContext) => {

    /**
     * Internal Path Generator (ZCZS Optimized)
     */
    const generators: Record<string, (x1: number, y1: number, x2: number, y2: number) => string> = {
      straight: (x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`,
      bezier: (x1, y1, x2, y2) => {
        const dx = Math.abs(x1 - x2) / 2;
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      },
      step: (x1, y1, x2, y2) => {
        const mx = x1 + (x2 - x1) / 2;
        return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
      }
    };

    return {
      /**
       * Connects two elements with a reactive SVG path.
       */
      connect: (elA: HTMLElement, elB: HTMLElement, options: { type?: string, offset?: number } = {}) => {
        const type = options.type || 'bezier';
        const pathData = reactive({ d: '' });

        const update = () => {
          // Safety guard: elA and elB might be Proxies or null during initialization
          if (!elA || !elB) return;
          
          try {
            const rA = typeof (elA as any).getBoundingClientRect === 'function' 
              ? (elA as any).getBoundingClientRect() 
              : null;
            const rB = typeof (elB as any).getBoundingClientRect === 'function' 
              ? (elB as any).getBoundingClientRect() 
              : null;

            if (!rA || !rB) return;
            
            // Calculate anchors (center to center)
            const x1 = rA.left + rA.width / 2;
            const y1 = rA.top + rA.height / 2;
            const x2 = rB.left + rB.width / 2;
            const y2 = rB.top + rB.height / 2;

            const generator = generators[type] || generators.bezier;
            pathData.d = generator(x1, y1, x2, y2);
          } catch (e) {
            // Silently fail to allow self-healing or deferred initialization
          }
        };

        // Sync with animation frame
        const ticker = () => {
           update();
           requestAnimationFrame(ticker);
        };
        ticker();

        return pathData;
      },

      /**
       * Generates a reactive path string from a point array.
       */
      path: (points: {x: number, y: number}[], closed = false) => {
        if (points.length < 2) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          d += ` L ${points[i].x} ${points[i].y}`;
        }
        if (closed) d += ' Z';
        return d;
      },

      /**
       * Animates any SVG attribute using native WAAPI.
       */
      animate: (el: SVGElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
        return el.animate(keyframes, options);
      },

      /**
       * Pulse an element using a native scale transform.
       */
      pulse: (el: SVGElement, options: { scale?: number, duration?: number } = {}) => {
        return el.animate([
          { transform: 'scale(1)' },
          { transform: `scale(${options.scale || 1.1})` },
          { transform: 'scale(1)' }
        ], {
          duration: options.duration || 1000,
          iterations: Infinity,
          easing: 'ease-in-out'
        });
      },

      /**
       * Morph one path into another.
       * Uses path() notation for WAAPI support in modern browsers.
       */
      morph: (el: SVGPathElement, targetD: string, options: { duration?: number, easing?: string } = {}) => {
        const currentD = el.getAttribute('d') || '';
        return el.animate([
          { d: `path("${currentD}")` },
          { d: `path("${targetD}")` }
        ], {
          duration: options.duration || 500,
          easing: options.easing || 'ease-in-out',
          fill: 'forwards'
        });
      }
    };
  }
};
