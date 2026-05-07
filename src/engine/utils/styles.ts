/**
 * Tailwind CSS utility functions for AST processing.
 * These are kept for compatibility with any code that imports from stylesheet.
 */

export function withAlpha(value: string, alpha: string): string {
  if (!alpha) return value;
  const alphaAsNumber = Number(alpha);
  if (!Number.isNaN(alphaAsNumber)) alpha = `${alphaAsNumber * 100}%`;
  if (alpha === '100%') return value;
  return `color-mix(in oklab, ${value} ${alpha}, transparent)`;
}

export function segment(input: string, separator: string): string[] {
  let stackPos = 0;
  const parts: string[] = [];
  let lastPos = 0;
  const len = input.length;
  const sepCode = separator.charCodeAt(0);
  const closingStack = new Uint8Array(256);

  const BACKSLASH = 0x5c;
  const SINGLE_QUOTE = 0x27;
  const DOUBLE_QUOTE = 0x22;
  const OPEN_PAREN = 0x28;
  const CLOSE_PAREN = 0x29;
  const OPEN_BRACKET = 0x5b;
  const CLOSE_BRACKET = 0x5d;
  const OPEN_CURLY = 0x7b;
  const CLOSE_CURLY = 0x7d;

  for (let idx = 0; idx < len; idx++) {
    const char = input.charCodeAt(idx);
    if (stackPos === 0 && char === sepCode) {
      parts.push(input.slice(lastPos, idx));
      lastPos = idx + 1;
      continue;
    }
    switch (char) {
      case BACKSLASH: idx++; break;
      case SINGLE_QUOTE:
      case DOUBLE_QUOTE:
        while (++idx < len) {
          if (input.charCodeAt(idx) === BACKSLASH) { idx++; continue; }
          if (input.charCodeAt(idx) === char) break;
        }
        break;
      case OPEN_PAREN: closingStack[stackPos++] = CLOSE_PAREN; break;
      case OPEN_BRACKET: closingStack[stackPos++] = CLOSE_BRACKET; break;
      case OPEN_CURLY: closingStack[stackPos++] = CLOSE_CURLY; break;
      case CLOSE_BRACKET:
      case CLOSE_CURLY:
      case CLOSE_PAREN:
        if (stackPos > 0 && char === closingStack[stackPos - 1]) stackPos--;
        break;
    }
  }
  parts.push(input.slice(lastPos));
  return parts;
}