import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { reactive } from '../../engine/reactivity.ts';

/**
 * data-flow: Root Viewport Directive.
 * Orchestrates spatial coordinates for any HTML or SVG elements within its bounds.
 */
export const flowAttribute: AttributeModule = {
  name: 'flow',
  attribute: 'flow',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    // Initialize or bind to a spatial state object { x, y, zoom }
    const state = runtime.evaluate(element, value) as any || reactive({ x: 0, y: 0, zoom: 1 });
    
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e: PointerEvent) => {
       // Pan with Middle Mouse Button or Alt + Left Click
       if (e.button === 1 || (e.button === 0 && e.altKey)) {
         isPanning = true;
         startX = e.clientX - (state.x || 0);
         startY = e.clientY - (state.y || 0);
         element.setPointerCapture(e.pointerId);
         element.style.cursor = 'grabbing';
       }
    };

    const onPointerMove = (e: PointerEvent) => {
       if (!isPanning) return;
       state.x = e.clientX - startX;
       state.y = e.clientY - startY;
    };

    const onPointerUp = (e: PointerEvent) => {
       if (!isPanning) return;
       isPanning = false;
       element.releasePointerCapture(e.pointerId);
       element.style.cursor = '';
    };

    const onWheel = (e: WheelEvent) => {
       // Only zoom if Ctrl/Cmd is pressed to prevent scroll interference
       if (!e.ctrlKey && !e.metaKey) return;
       e.preventDefault();
       
       const zoomIntensity = 0.001;
       const delta = -e.deltaY * zoomIntensity;
       const nextZoom = Math.min(Math.max((state.zoom || 1) + delta, 0.1), 5);
       
       // Zoom towards mouse position (simplistic implementation)
       state.zoom = nextZoom;
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });

    const stop = runtime.effect(() => {
       // Apply transform to the primary content container
       const content = element.querySelector('.nexus-flow-content') as HTMLElement || element;
       content.classList.add('nexus-flow-viewport');
       content.style.transform = `translate3d(${state.x || 0}px, ${state.y || 0}px, 0) scale(${state.zoom || 1})`;
       content.style.transformOrigin = '0 0';
    });

    return () => {
       stop();
       element.removeEventListener('pointerdown', onPointerDown);
       element.removeEventListener('pointermove', onPointerMove);
       element.removeEventListener('pointerup', onPointerUp);
       element.removeEventListener('wheel', onWheel);
    };
  }
};

/**
 * data-node: Spatial Node Directive.
 * Handles dragging and placement of nodes within the flow coordinate system.
 */
export const nodeAttribute: AttributeModule = {
  name: 'node',
  attribute: 'node',
  handle: (element: HTMLElement, value: string, runtime: RuntimeContext) => {
    const nodeState = runtime.evaluate(element, value) as any;
    if (!nodeState || typeof nodeState !== 'object') return;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialX = 0;
    let initialY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Don't drag if Alt is pressed (that's for panning) or if not primary button
      if (e.button !== 0 || e.altKey) return;
      
      // Don't drag if clicking a handle
      if ((e.target as HTMLElement).closest('[data-handle]')) return;

      e.stopPropagation();
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialX = nodeState.x || 0;
      initialY = nodeState.y || 0;
      
      element.setPointerCapture(e.pointerId);
      element.style.zIndex = '1000';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      
      // Adjust movement by zoom level
      const flowEl = element.closest('[data-flow]') as HTMLElement;
      let zoom = 1;
      if (flowEl) {
         const flowAttr = flowEl.getAttribute('data-flow');
         const flowState = runtime.evaluate(flowEl, flowAttr || '{}') as any;
         zoom = flowState?.zoom || 1;
      }

      const dx = (e.clientX - dragStartX) / zoom;
      const dy = (e.clientY - dragStartY) / zoom;
      
      nodeState.x = initialX + dx;
      nodeState.y = initialY + dy;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      element.releasePointerCapture(e.pointerId);
      element.style.zIndex = '';
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);

    const stop = runtime.effect(() => {
       element.style.position = 'absolute';
       element.style.left = '0';
       element.style.top = '0';
       element.style.transform = `translate3d(${nodeState.x || 0}px, ${nodeState.y || 0}px, 0)`;
    });

    return () => {
       stop();
       element.removeEventListener('pointerdown', onPointerDown);
       element.removeEventListener('pointermove', onPointerMove);
       element.removeEventListener('pointerup', onPointerUp);
    };
  }
};

/**
 * data-handle: Port Directive.
 * Identifies connection points for edges.
 */
export const handleAttribute: AttributeModule = {
  name: 'handle',
  attribute: 'handle',
  handle: (element: HTMLElement, value: string, _runtime: RuntimeContext) => {
    element.setAttribute('data-nexus-handle', value);
    element.classList.add('nexus-handle');
  }
};
