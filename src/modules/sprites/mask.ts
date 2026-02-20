/**
 * $mask Sprite
 * Provides utility functions for string masking.
 */

/**
 * Strips characters from input that don't match the template's pattern slots.
 */
function stripDown(template: string, input: string): string {
  const regexes = {
    '9': /[0-9]/,
    'a': /[a-zA-Z]/,
    '*': /[a-zA-Z0-9]/,
  };

  let inputIdx = 0;
  let result = '';

  for (let i = 0; i < template.length && inputIdx < input.length; i++) {
    const char = template[i];
    const regex = regexes[char as keyof typeof regexes];

    if (regex) {
      // Find the next matching char in input
      while (inputIdx < input.length) {
        if (regex.test(input[inputIdx])) {
          result += input[inputIdx];
          inputIdx++;
          break;
        }
        inputIdx++;
      }
    } else {
      // Static char in template, skip it if it's in the input at current position
      if (input[inputIdx] === char) {
        inputIdx++;
      }
    }
  }

  return result;
}

/**
 * Builds up the formatted string using the template and stripped input.
 */
function buildUp(template: string, stripped: string): string {
  if (!stripped) return '';
  
  let strippedIdx = 0;
  let result = '';

  for (let i = 0; i < template.length && strippedIdx < stripped.length; i++) {
    const char = template[i];
    if (['9', 'a', '*'].includes(char)) {
      result += stripped[strippedIdx];
      strippedIdx++;
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Formats a value according to a template.
 */
export function format(value: string, template: string): string {
  if (!value || !template) return value;
  const stripped = stripDown(template, value);
  return buildUp(template, stripped);
}

export const mask = {
  format,
};
