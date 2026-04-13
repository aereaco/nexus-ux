import { designSystem, parseCandidate, generateCSS } from '../src/engine/tailwind-engine.ts';

const candidates = Array.from(parseCandidate('flex-1', designSystem));
console.log("Parsed candidates:", candidates);
for (const c of candidates) {
  try {
     console.log("CSS Output:", generateCSS(c, designSystem));
  } catch (e) {
     console.error("Crash during generateCSS!", e);
  }
}
