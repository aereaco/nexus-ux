
import { JSDOM } from "jsdom";
import { assertEquals, assertExists } from "std/assert";
import { UX } from "../src/index.ts";

Deno.test("Todo App Simulation", async () => {
  // 1. Setup JSDOM
  const html = await Deno.readTextFile("./examples/todo.html");
  const dom = new JSDOM(html, {
    url: "http://localhost:4508/examples/todo.html",
    runScripts: "dangerously",
    resources: "usable"
  });

  const window = dom.window;
  const document = window.document;
  
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
    matchMedia: g.matchMedia
  };

  try {
    // Polyfill global environment for Deno-based UX module

    // @ts-ignore: Polyfilling global window for JSDOM
    globalThis.window = window;

    // @ts-ignore: Polyfilling global document for JSDOM
    (globalThis as unknown as Record<string, unknown>).document = document;

    // @ts-ignore: Polyfilling global HTMLElement
    globalThis.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;

    // @ts-ignore: Polyfilling global HTMLInputElement
    (globalThis as unknown as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;

    // @ts-ignore: Polyfilling global HTMLTemplateElement
    (globalThis as unknown as Record<string, unknown>).HTMLTemplateElement = window.HTMLTemplateElement;

    // @ts-ignore: Polyfilling global Node
    globalThis.Node = window.Node as unknown as typeof Node;

    // @ts-ignore: Polyfilling global Event
    globalThis.Event = window.Event as unknown as typeof Event;

    // @ts-ignore: Polyfilling global CustomEvent
    globalThis.CustomEvent = window.CustomEvent as unknown as typeof CustomEvent;

    // @ts-ignore: Polyfilling global MutationObserver
    globalThis.MutationObserver = window.MutationObserver as unknown as typeof MutationObserver;

    // @ts-ignore: Polyfilling global ResizeObserver mock
    (globalThis as unknown as Record<string, unknown>).ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };

    // @ts-ignore: Polyfilling global IntersectionObserver mock
    (globalThis as unknown as Record<string, unknown>).IntersectionObserver = class IntersectionObserver { observe() {} unobserve() {} disconnect() {} };

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
    // @ts-ignore: Polyfilling global matchMedia
    (globalThis as unknown as Record<string, unknown>).matchMedia = window.matchMedia;

    // 2. Initialize UX
    // The constructor triggers init() -> scan() automatically if window is defined.

    const _ux = new UX();
    
    // Wait for initial scan to complete (synchronous in this mock env)
    await new Promise(r => setTimeout(r, 0));
    
    // ... verified verify logic ...
    const todos = document.querySelectorAll(".todo-item");
    assertEquals(todos.length, 2, "Should start with 2 todos");

    const input = document.querySelector('input[data-bind-value="newTodo"]') as HTMLInputElement;
    assertExists(input, "Input should exist");
    
    input.value = "Buy Milk";
    input.dispatchEvent(new window.Event("input"));

    const addBtn = document.querySelector('button[data-on-click*="push"]') as HTMLElement;
    assertExists(addBtn, "Add button should exist");
    
    addBtn.dispatchEvent(new window.Event("click"));

    await new Promise(r => setTimeout(r, 100));

    // 6. Verify New Item
    const newTodos = document.querySelectorAll(".todo-item");
    assertEquals(newTodos.length, 3, "Should have 3 todos after adding");
    
    const tags = Array.from(newTodos).map(el => (el as Element).querySelector("span")?.textContent);
    assertEquals(tags.includes("Buy Milk"), true, "New todo text should be present");

    const activeBtn = document.querySelector('button[data-on-click*="active"]') as HTMLElement;
    activeBtn.dispatchEvent(new window.Event("click"));
    
    await new Promise(r => setTimeout(r, 100));

    const visibleTodos = document.querySelectorAll(".todo-item");
    assertEquals(visibleTodos.length, 2, "Active filter should show 2 items");
    
    console.log("Todo App Simulation Passed!");
  } finally {
    // Restore original globals to avoid Deno teardown crashes
    Object.keys(originalGlobals).forEach(key => {
      (globalThis as unknown as Record<string, unknown>)[key] = originalGlobals[key];
    });
  }
});
