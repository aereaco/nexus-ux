/**
 * Nexus-UX Drag Sprite `$drag`
 *
 * Provides live reactive drag-and-drop state and programmatic list reordering
 * utilities for expression scopes.
 */

import { SpriteModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';

export interface DragState {
  isDragging: boolean;
  activeItem: any;
  sourceList: string;
  targetList: string;
  fromIndex: number;
  toIndex: number;
}

/** Global reactive drag state singleton */
export const dragState: DragState = reactive({
  isDragging: false,
  activeItem: null,
  sourceList: '',
  targetList: '',
  fromIndex: -1,
  toIndex: -1
});

export const $drag = {
  get isDragging(): boolean {
    return dragState.isDragging;
  },
  get activeItem(): any {
    return dragState.activeItem;
  },
  get sourceList(): string {
    return dragState.sourceList;
  },
  get targetList(): string {
    return dragState.targetList;
  },
  get fromIndex(): number {
    return dragState.fromIndex;
  },
  get toIndex(): number {
    return dragState.toIndex;
  },

  /** Programmatic in-place list reordering */
  move<T>(list: T[], fromIndex: number, toIndex: number): T[] {
    if (!Array.isArray(list) || fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
      return list;
    }
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    return list;
  },

  /** Programmatic cross-list transfer */
  transfer<T>(fromList: T[], toList: T[], fromIndex: number, toIndex?: number): boolean {
    if (!Array.isArray(fromList) || !Array.isArray(toList) || fromIndex < 0 || fromIndex >= fromList.length) {
      return false;
    }
    const [item] = fromList.splice(fromIndex, 1);
    const dest = typeof toIndex === 'number' && toIndex >= 0 ? toIndex : toList.length;
    toList.splice(dest, 0, item);
    return true;
  },

  /** Abort active drag */
  cancel() {
    dragState.isDragging = false;
    dragState.activeItem = null;
    dragState.sourceList = '';
    dragState.targetList = '';
    dragState.fromIndex = -1;
    dragState.toIndex = -1;
  }
};

export const dragSprite: SpriteModule = {
  name: 'drag',
  sprites: (_runtime: RuntimeContext) => ({
    $drag,
  })
};

export default dragSprite;
