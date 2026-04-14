import { designSystem } from '../src/engine/stylesheet.ts';

const inputClasses = Deno.args[0] || 'flex-1';
const classList = inputClasses.split(/\s+/);

for (const className of classList) {
  const candidates = Array.from(designSystem.parseCandidate(className));
  console.log(`--- [${className}] ---`);
  for (const c of candidates) {
    try {
       console.log(designSystem.generateCSS(c));
    } catch (e) {
       console.error("Crash during generateCSS!", e);
    }
  }
}
Deno.exit(0);
