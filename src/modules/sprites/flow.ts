import { SpriteModule } from '../index.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $flow Sprite.
 * High-performance coordinate math and graph orchestration for node-link diagrams.
 */
export const flowModule: SpriteModule = {
  name: 'flow',
  key: '$flow',
  sprites: (context: RuntimeContext) => {
    return {
      /**
       * Converts screen coordinates (e.g. from mouse event) to internal flow-space coordinates.
       */
      screenToFlow: (container: HTMLElement, x: number, y: number, state: { x: number, y: number, zoom: number }) => {
        const rect = container.getBoundingClientRect();
        return {
          x: (x - rect.left - (state.x || 0)) / (state.zoom || 1),
          y: (y - rect.top - (state.y || 0)) / (state.zoom || 1)
        };
      },

      /**
       * Calculates the bounding box of a collection of nodes.
       */
      getBounds: (nodes: any[]) => {
        if (!nodes || nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
          const x = n.x || 0;
          const y = n.y || 0;
          const w = n.w || 100; // Default width
          const h = n.h || 50;  // Default height
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
        });
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      },

      /**
       * Centers and zooms the viewport to fit all nodes.
       */
      fitView: (container: HTMLElement, state: { x: number, y: number, zoom: number }, nodes: any[], padding = 40) => {
        const bounds = (context as any).$flow.getBounds(nodes);
        const rect = container.getBoundingClientRect();
        
        const zoomX = (rect.width - padding * 2) / bounds.w;
        const zoomY = (rect.height - padding * 2) / bounds.h;
        const zoom = Math.min(zoomX, zoomY, 1.5); // Cap zoom-in to 1.5x
        
        const centerX = (rect.width - bounds.w * zoom) / 2;
        const centerY = (rect.height - bounds.h * zoom) / 2;

        state.x = centerX - bounds.x * zoom;
        state.y = centerY - bounds.y * zoom;
        state.zoom = zoom;
      },

      /**
       * Orchestrates a connection between two ports/handles.
       */
      connect: (elA: HTMLElement, elB: HTMLElement, options: { type?: string } = {}) => {
         // This can delegate to $svg.connect but with flow-space awareness
         if (context.svg) {
            return context.svg.connect(elA, elB, options);
         }
         return { d: '' };
      }
    };
  }
};

export default flowModule;
