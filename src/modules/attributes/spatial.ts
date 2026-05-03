import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';

/**
 * data-spatial: Standalone Spatial Marker.
 * Enables the Core Animation Engine to track and orchestrate layout transitions
 * for this element during reactive state changes.
 */
export const spatialAttribute: AttributeModule = {
  name: 'spatial',
  attribute: 'spatial',
  handle: (el: HTMLElement, _value: string, _runtime: RuntimeContext) => {
    // This is primarily a marker for document.querySelectorAll('[data-spatial]')
    // It can also be used to store local spatial metadata if needed.
    el.setAttribute('data-nexus-spatial', 'true');
    
    // Identity persistence helper
    const id = el.getAttribute('data-bind-id') || el.getAttribute('id');
    if (id) (el as any)._nexus_key = id;
  }
};

export default spatialAttribute;
