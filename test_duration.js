const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><div id="box" style="transition: opacity 0.3s, transform 0.6s;"></div>`);
const el = dom.window.document.getElementById("box");
console.log(dom.window.getComputedStyle(el).transitionDuration);
