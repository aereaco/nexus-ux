import { AttributeModule } from "../../engine/modules.ts";
import { RuntimeContext } from "../../engine/composition.ts";

/**
 * data-spatial: Modifier-Gated Spatial Engine Selector
 *
 * Sets marker attributes that other modules (drag.ts, $spatial sprite) use
 * to gate their behavior. This attribute module does NOT instantiate engines
 * directly — it only marks containers for the correct engine mode.
 *
 * Engine selection via modifier value:
 * - `data-spatial="draggable"` → sets data-nexus-spatial-draggable marker
 *   (DragReorderEngine in drag.ts activates when it sees this marker)
 * - `data-spatial="canvas"` → sets data-nexus-spatial-canvas marker
 *   (SpatialCanvasEngine activates via $spatial sprite)
 * - No value → Default marker for morph transitions
 */
export const spatialAttribute: AttributeModule = {
  name: "spatial",
  attribute: "spatial",
  handle: (el: HTMLElement, value: string, _runtime: RuntimeContext) => {
    const engine = value.trim().toLowerCase();

    if (engine === "draggable") {
      el.setAttribute("data-nexus-spatial-draggable", "true");
      return () => el.removeAttribute("data-nexus-spatial-draggable");
    } else if (engine === "canvas") {
      el.setAttribute("data-nexus-spatial-canvas", "true");

      // Instantiate canvas engine via $spatial sprite if available
      try {
        const listExpr = el.getAttribute("data-teleport:drop") ||
          el.getAttribute("data-for")?.split("in")[1]?.trim() || "[]";
        if (_runtime.sprites?.$spatial?.canvas) {
          _runtime.sprites.$spatial.canvas(el, listExpr, {
            snapGrid: [20, 20],
          });
        }
      } catch {
        // Sprite may not be registered yet — canvas engine will be
        // initialized when the sprite processes this container
      }

      return () => {
        try {
          if (_runtime.sprites?.$spatial?.destroy) {
            _runtime.sprites.$spatial.destroy(el);
          }
        } catch { /* ignore cleanup errors */ }
        el.removeAttribute("data-nexus-spatial-canvas");
      };
    } else {
      el.setAttribute("data-nexus-spatial", "true");
    }

    return () => {
      el.removeAttribute("data-nexus-spatial-draggable");
      el.removeAttribute("data-nexus-spatial-canvas");
      el.removeAttribute("data-nexus-spatial");
    };
  },
};

export default spatialAttribute;

