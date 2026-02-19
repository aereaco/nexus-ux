// deno-lint-ignore no-import-prefix
import { assertEquals, assertExists } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { UX } from "../src/index.ts";
import { heap } from "../src/engine/heap.ts";
import { threadManager } from "../src/engine/worker.ts";
import { windowMirror } from "../src/modules/mirrors/window.ts";

Deno.test("UX Entry Point", () => {
  assertExists(UX, "UX class should be exported");
  const ux = new UX();
  assertExists(ux, "UX instance should be created");
});

Deno.test("Binary Heap", () => {
  assertExists(heap, "Heap should be exported");
  const _idx = heap.alloc("test_key", 123);
  assertEquals(heap.get("test_key"), 123, "Heap should store and retrieve values");
});

Deno.test("Thread Manager", () => {
  assertExists(threadManager, "ThreadManager should be exported");
  // We can't easily test worker execution in this unit test environment without full permissions/setup,
  // but existence proves module loading.
});

Deno.test("Mirrors", () => {
  assertExists(windowMirror, "windowMirror should be exported");
  // Verify it's reactive (Vue proxy)
  // Note: windowMirror is a reactive object, accessing props should work
  const w = windowMirror.innerWidth;
  assertEquals(typeof w, "number", "windowMirror.innerWidth should be a number");
});
