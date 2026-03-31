import { assertEquals } from "std/assert";
import { JSDOM } from "jsdom";

Deno.test("JSDOM Sanity", () => {
  const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>');
  assertEquals(dom.window.document.querySelector("p")?.textContent, "Hello world");
});
