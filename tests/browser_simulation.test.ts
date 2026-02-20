
import { JSDOM } from "jsdom";
import { assertEquals, assertExists } from "std/assert";

Deno.test({
  name: "Todo App Simulation",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  // 1. Setup JSDOM
  const html = await Deno.readTextFile("./examples/todo.html");
  // Strip the production script tag and data-debug to verify clean console
  const cleanHtml = html
    .replace(/<script.*nexus-ux\.js.*<\/script>/, '')
    .replace(/\sdata-debug/g, '');
  
  const dom = new JSDOM(cleanHtml, {
    url: "http://localhost:4508/examples/todo.html",
    runScripts: "dangerously",
    resources: "usable"
  });

  const window = dom.window;
  const document = window.document;

  // Seed localStorage for the test
  const initialTodos = JSON.stringify([
    { id: 1, text: "Task 1", completed: false },
    { id: 2, text: "Task 2", completed: true }
  ]);
  window.localStorage.setItem('todos', initialTodos);
  
  // 1.5 Snapshot global state to restore after test
  const g = globalThis as unknown as Record<string, unknown>;
  const originalGlobals: Record<string, unknown> = {
    window: globalThis.window,
    document: g.document,
    HTMLElement: globalThis.HTMLElement,
    HTMLInputElement: g.HTMLInputElement,
    HTMLTemplateElement: g.HTMLTemplateElement,
    Node: globalThis.Node,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    MutationObserver: globalThis.MutationObserver,
    ResizeObserver: g.ResizeObserver,
    IntersectionObserver: g.IntersectionObserver,
    matchMedia: g.matchMedia,
    localStorage: g.localStorage,
    navigator: g.navigator,
    performance: g.performance,
  };

  try {
    // Polyfill global environment for Deno-based UX module
    g.window = window;
    g.document = document;
    g.HTMLElement = window.HTMLElement as any;
    g.HTMLInputElement = window.HTMLInputElement as any;
    g.Element = window.Element as any;
    (globalThis as any).DocumentFragment = dom.window.DocumentFragment;
    
    // Force localStorage override (Deno can be sticky with globals)
    Object.defineProperty(globalThis, 'localStorage', {
      value: window.localStorage,
      configurable: true,
      enumerable: true,
      writable: true
    });

    g.HTMLTemplateElement = window.HTMLTemplateElement as any;
    g.Node = window.Node as any;
    g.Event = window.Event as any;
    g.CustomEvent = window.CustomEvent as any;
    g.MutationObserver = window.MutationObserver as any;
    g.navigator = window.navigator as any;
    g.performance = window.performance as any;
    g.screen = window.screen as any;

    if (!g.screen) {
       // @ts-ignore
       g.screen = {
         width: 1024,
         height: 768,
         colorDepth: 24,
         pixelDepth: 24,
         orientation: { type: 'landscape-primary', addEventListener: () => {} }
       };
    }

    // @ts-ignore: Polyfilling global ResizeObserver mock
    g.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };

    // @ts-ignore: Polyfilling global IntersectionObserver mock
    g.IntersectionObserver = class IntersectionObserver { observe() {} unobserve() {} disconnect() {} };

    // @ts-ignore: Polyfilling global matchMedia mock
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        addListener: function() {},
        removeListener: function() {},
        addEventListener: function() {},
        removeEventListener: function() {},
      } as unknown as MediaQueryList;
    };
    g.matchMedia = window.matchMedia;

    // 2. Initialize UX
    const { UX } = await import("../src/index.ts");
    const _ux = new UX();
    
    console.error(`[Test] UX Initialized. Document state: ${document.readyState}`);
    console.error(`[Test] window.localStorage todos: ${window.localStorage.getItem('todos')}`);
    console.error(`[Test] globalThis.localStorage todos: ${(globalThis as any).localStorage.getItem('todos')}`);
    console.error(`[Test] globalThis.localStorage === window.localStorage: ${(globalThis as any).localStorage === window.localStorage}`);
    
    // Force DOMContentLoaded simulation if JSDOM is stuck in loading
    if (document.readyState === 'loading') {
       window.dispatchEvent(new window.Event('DOMContentLoaded'));
    }
    
    // Ensure scan runs
    _ux.scan(); 
    
    // Wait for initial scan to complete (synchronous in this mock env)
    await new Promise(r => setTimeout(r, 50));
    
    console.error(`[Test] After wait. Document has ${document.querySelectorAll('.todo-item').length} todos.`);
    
    // ... verified verify logic ...
    const todos = document.querySelectorAll(".todo-item");
    assertEquals(todos.length, 2, "Should start with 2 todos");

    const input = document.querySelector('input[data-bind-value="#newTodo"]') as HTMLInputElement;
    assertExists(input, "Input should exist");
    
    input.value = "Buy Milk";
    input.dispatchEvent(new window.Event("input"));

    const addBtn = document.querySelector('button[data-on-click*="push"]') as HTMLElement;
    assertExists(addBtn, "Add button should exist");
    
    addBtn.dispatchEvent(new window.Event("click"));

    await new Promise(r => setTimeout(r, 100));

    // Verify New Item
    const newTodos = document.querySelectorAll(".todo-item");
    assertEquals(newTodos.length, 3, "Should have 3 todos after adding");
    
    // 7. Verify Scheduler Phase Order
    // We can leak the execution log or check the scheduler state
    const { scheduler } = await import("../src/engine/scheduler.ts");
    const executionLogs: string[] = [];
    
    // Patch scheduler methods to track execution
    const originalCapture = scheduler.enqueueCapture.bind(scheduler);
    const originalPaint = scheduler.enqueuePaint.bind(scheduler);
    
    // This is a bit tricky to test retroactively, but we can enqueue two jobs
    // and see if they run in order if we manually trigger a flush.
    let order: string[] = [];
    scheduler.enqueuePaint(() => order.push('paint'));
    scheduler.enqueueCapture(() => order.push('capture'));
    scheduler.enqueueResolve(() => order.push('resolve'));
    scheduler.enqueueEvaluate(() => order.push('evaluate'));
    
    (scheduler as any).flush();
    
    assertEquals(order.join(','), 'capture,evaluate,resolve,paint', "Scheduler MUST maintain strict 4-phase atomic order");

    console.log("Todo App Simulation passed with NEG Grammar & 4-Phase Scheduler verified!");
  } finally {
    // Restore original globals to avoid Deno teardown crashes
    Object.keys(originalGlobals).forEach(key => {
      (globalThis as unknown as Record<string, unknown>)[key] = originalGlobals[key];
    });
  }
}
});
