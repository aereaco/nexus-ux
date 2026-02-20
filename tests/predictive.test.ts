import { JSDOM } from "jsdom";
import { assertEquals } from "std/assert";
import { predictive } from "../src/engine/predictive.ts";
import { scheduler } from "../src/engine/scheduler.ts";

/**
 * 4D Predictive Engine Test
 * Verifies Vector Velocity ($V_{xyzt}$) and Interaction Frustum Projection.
 */

Deno.test("4D Predictive Engine: Velocity & Pre-warming", async () => {
  // Setup JSDOM
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const window = dom.window;
  const document = window.document;

  // Polyfill Globals
  const g = globalThis as any;
  const originalWindow = g.window;
  const originalDocument = g.document;
  const originalPerformance = g.performance;
  const originalMouseEvent = g.MouseEvent;
  const originalHTMLElement = g.HTMLElement;
  const originalCustomEvent = g.CustomEvent;

  let currentTime = 1000;
  (globalThis as any).DEBUG_PREDICTIVE = true;
  g.performance = { now: () => currentTime };
  g.window = window;
  g.document = document;
  g.MouseEvent = window.MouseEvent;
  g.HTMLElement = window.HTMLElement;
  g.CustomEvent = window.CustomEvent;

  // Re-initialize predictive engine with the new window
  predictive.init();

  try {
    const move = (x: number, y: number, advance: number = 20) => {
      currentTime += advance;
      window.dispatchEvent(new window.MouseEvent('mousemove', { clientX: x, clientY: y }));
    };

    // 1. Initial State
    move(0, 0); // T=1020
    move(100, 100, 50); // T=1070
    move(150, 120, 50); // T=1120

    const v = predictive.getVelocity();
    
    // Check for non-zero velocity and correct direction
    assertEquals(v.x > 0, true, `Velocity X should be positive, got ${v.x}`);
    assertEquals(v.y > 0, true, `Velocity Y should be positive, got ${v.y}`);

    // 2. Pre-warming Test
    const target = document.createElement('div');
    target.setAttribute('data-signal', '{}');
    document.body.appendChild(target);

    // Mock implementation of elementsFromPoint
    (document as any).elementsFromPoint = (x: number, y: number) => {
      // Proj projected: moving from (150, 120) with v (50/50, 20/50) = (1.0, 0.4)
      // At T+100ms: 150 + 100*1 = 250, 120 + 100*0.4 = 160
      if (x >= 240 && x <= 260 && y >= 150 && y <= 170) return [target];
      return [];
    };

    // Trigger prediction
    (scheduler as any).flush();

    assertEquals(target.classList.contains('nexus-predictive-warm'), true, "Target should be pre-warmed by interaction frustum");
    
    // Move slightly to change frustum
    move(160, 120, 50); 
    (scheduler as any).flush();
    
    assertEquals(target.classList.contains('nexus-predictive-warm'), false, "Target should cool down when trajectory changes");
    
    document.body.removeChild(target);
  } finally {
    g.window = originalWindow;
    g.document = originalDocument;
    g.performance = originalPerformance;
    g.MouseEvent = originalMouseEvent;
    g.HTMLElement = originalHTMLElement;
    g.CustomEvent = originalCustomEvent;
  }
});
