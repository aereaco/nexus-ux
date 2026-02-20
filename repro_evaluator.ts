import { assertEquals } from "std/assert";

/**
 * Stripped down Evaluator logic for local testing.
 */
function preProcessExpression(expression: string): string {
  let processed = expression;

  // 1. @ Scope Rules
  if (processed.includes('@')) {
    processed = processed.replace(/@(\w+)\(([^)]*)\)\s*\{([^}]*)\}/g, (_match, name, arg, body) => {
      const safeArg = arg.trim().replace(/'/g, "\\'").replace(/"/g, '\\"');
      return `_scopes.${name}("${safeArg}", () => { return ${body.trim()} })`;
    });
  }

  // 2. Unified NEG Grammar Replacement (#, _, $)
  // Matches tokens starting with #, _, or $ (if not followed by ()
  // Avoids double-processing by handling them in one pass.
  processed = processed.replace(/(^|[^a-zA-Z0-9_$])([#_$])([a-zA-Z_$][\w$]*)(?!\()/g, (match, prefix, type, name) => {
    if (type === '$' && name === 'global') return match;
    if (type === '#') return prefix + '$global.' + name;
    if (type === '_') return prefix + '$global._' + name;
    if (type === '$') return prefix + '$global.$' + name;
    return match;
  });

  return processed;
}

Deno.test("Evaluator Pre-processing", () => {
  assertEquals(preProcessExpression("#ux_theme"), "$global.ux_theme");
  assertEquals(preProcessExpression("#$progress"), "$global.$progress");
  assertEquals(preProcessExpression("_localStorage.todos"), "$global._localStorage.todos");
  assertEquals(preProcessExpression("$saveTodos"), "$global.$saveTodos");
  
  // Complex case
  const signalBlock = `{ 
        $progress: 0,
        $saveTodos: (t) => {
            #$progress = 20;
        }
    }`;
  const processed = preProcessExpression(signalBlock);
  console.log("Processed Signal Block:\n", processed);
  // Should NOT mangle $progress inside string keys if we're careful.
  // Wait, my regex matches $progress at start of token.
  // If it's inside { $progress: 0 }, the prefix is " ". Matches.
  // Result: { $global.$progress: 0 }. 
  // THIS IS STILL A SYNTAX ERROR in object literal keys.
});

Deno.test("Evaluator Pre-processing", () => {
  assertEquals(preProcessExpression("#ux_theme"), "$global.ux_theme");
  assertEquals(preProcessExpression("#$progress"), "$global.$progress");
  assertEquals(preProcessExpression("_localStorage.todos"), "$global._localStorage.todos");
  assertEquals(preProcessExpression("$saveTodos(t)"), "$global.saveTodos(t)");
  
  // Failing cases from logs
  const signalBlock = `{ 
        todos: JSON.parse(_localStorage.todos || '[]'),
        $progress: 0,
        $saveTodos: (t) => {
            #$progress = 20;
        }
    }`;
  const processedSignal = preProcessExpression(signalBlock);
  console.log("Processed Signal Block:\n", processedSignal);
  
  // Check if $progress: 0 was mangled
  // Current logic: $progress -> $global.progress
  // Which results in { $global.progress: 0 } -> Syntax Error
});

Deno.test("Object Literal Syntax Error reproduction", () => {
  const processed = "{ a: 1, b: 2 }";
  // This fails if evaluated as a statement
  try {
    new Function('scope', `with (scope) { ${processed} }`)();
  } catch (e) {
    console.log("Caught expected statement error:", e.message);
  }
  
  // This succeeds if evaluated as an expression
  const f = new Function('scope', `with (scope) { return (${processed}) }`);
  assertEquals(f({}), { a: 1, b: 2 });
});
