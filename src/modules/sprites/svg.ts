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
      connect: (elA: HTMLElement, elB: HTMLElement, options: { type?: string } = {}) => {
        const type = options.type || 'bezier';
        const pathData = reactive({ d: '' });

        // Update loop synced to reconciler/animation frames
        const update = () => {
          if (!elA || !elB) return;
          const rA = elA.getBoundingClientRect();
          const rB = elB.getBoundingClientRect();
          
          // Calculate anchors (center to center or ports)
          const x1 = rA.left + rA.width / 2;
          const y1 = rA.top + rA.height / 2;
          const x2 = rB.left + rB.width / 2;
          const y2 = rB.top + rB.height / 2;

          const generator = generators[type] || generators.bezier;
          pathData.d = generator(x1, y1, x2, y2);
        };

        // Hook into the engine's resize/mutation bus if possible, or simple RAF for now
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
       * Orchestrates path-based animations (e.g. drawing lines).
       */
      animate: (pathEl: SVGPathElement, options: { duration?: number, ease?: string } = {}) => {
        const length = pathEl.getTotalLength();
        pathEl.style.strokeDasharray = `${length}`;
        pathEl.style.strokeDashoffset = `${length}`;
        
        // Integration with animate sprite
        if (context.$animate) {
           context.$animate(pathEl, {
              strokeDashoffset: 0,
              duration: options.duration || 1000,
              ease: options.ease || 'power2.out'
           });
        }
      }
    };
  }
};
