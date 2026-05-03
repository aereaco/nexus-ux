/**
 * Re-export barrel for backward compatibility.
 * All error reporting logic has been consolidated into engine/debug.ts
 * (the Integrated Sanitizing Engine).
 * 
 * @deprecated Import directly from './debug.ts' instead.
 */
export { 
  UXError, 
  reportError, 
  initError, 
  runtimeError, 
  syntaxError, 
  evaluationError 
} from './debug.ts';
