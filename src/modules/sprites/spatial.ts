import { SpriteModule } from '../index.ts';
import { RuntimeContext } from '../../engine/composition.ts';

// We import the Quadtree instance or type from predictive.ts
// Assuming predictive.ts exports its central tree for sprite access.

/**
 * $spatial Sprite.
 * Provides high-level query access to the framework's internal Quadtree.
 */
export const spatialModule: SpriteModule = {
  name: 'spatial',
  key: '$spatial',
  sprites: (context: RuntimeContext) => {
     // Retrieve the active Quadtree from context (injected during predictive sprite init)
     const getTree = () => context.predictive?.quadtree;

     return {
        /**
         * Insert or Update an element in the spatial index.
         */
        update: (el: HTMLElement) => {
           const tree = getTree();
           if (!tree) return;
           const rect = el.getBoundingClientRect();
           tree.insert(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
        },

        /**
         * Query elements within a bounding box.
         */
        query: (x: number, y: number, width: number, height: number) => {
           const tree = getTree();
           return tree ? tree.query({ x, y, w: width / 2, h: height / 2 }, []) : [];
        },

        /**
         * Find the nearest element to a point.
         */
        nearest: (x: number, y: number) => {
           const tree = getTree();
           if (!tree) return null;
           const results = tree.query({ x, y, w: 50, h: 50 }, []); // Proximity query
           // Simple distance sort (ZCZS optimized)
           let nearest = null;
           let minDist = Infinity;
           for (const el of results) {
              const rect = el.getBoundingClientRect();
              const ex = rect.left + rect.width / 2;
              const ey = rect.top + rect.height / 2;
              const dist = Math.sqrt((x - ex) ** 2 + (y - ey) ** 2);
              if (dist < minDist) {
                 minDist = dist;
                 nearest = el;
              }
           }
           return nearest;
        }
     };
  }
};
