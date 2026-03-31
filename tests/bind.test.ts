import { assertEquals, assertStrictEquals } from "std/assert";
import { JSDOM } from "jsdom";
import { ModuleCoordinator } from "../src/engine/modules.ts";
import bindModule from "../src/modules/attributes/bind.ts";
import signalModule from "../src/modules/attributes/signal.ts";

Deno.test("data-bind integration", () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="app" data-signal="{ count: 0 }"><input id="myInput" data-bind="count"></div>');
  const { 
    document, 
    HTMLElement, 
    HTMLInputElement, 
    HTMLSelectElement, 
    HTMLTextAreaElement,
    DocumentFragment,
    Element,
    Node,
    Text,
    Comment,
    Event,
    MutationObserver
  } = dom.window;
  
  // Mock globals for the engine
  Object.assign(globalThis, {
    document,
    HTMLElement,
    HTMLInputElement,
    HTMLSelectElement,
    HTMLTextAreaElement,
    DocumentFragment,
    Element,
    Node,
    Text,
    Comment,
    Event,
    MutationObserver
  });

  const coordinator = new ModuleCoordinator();
  coordinator.registerAttributeModule("signal", signalModule);
  coordinator.registerAttributeModule("bind", bindModule);

  const app = document.getElementById("app") as any;
  coordinator.initializeModules(app);

  const input = document.getElementById("myInput") as any;
  
  // 1. Initial value
  assertEquals(input.value, "0");

  // 2. State -> DOM (Mutate local signal)
  const signals = coordinator.runtimeContext.localSignals(app);
  signals.count = 5;
  
  assertEquals(input.value, "5");

  // 3. DOM -> State
  input.value = "10";
  input.dispatchEvent(new dom.window.Event("input"));
  assertEquals(signals.count, "10");

  // 4. Selector Engine ($)
  const collection = coordinator.runtimeContext.$("#myInput");
  assertEquals(collection.length, 1, "Selector should find the input");
  assertEquals(collection[0].id, "myInput", "Selector should find the correct node ID");
  
  coordinator.dispose();
});
