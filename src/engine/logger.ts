/**
 * Re-export barrel for backward compatibility.
 * All logging logic has been consolidated into engine/debug.ts
 * (the Integrated Sanitizing Engine).
 * 
 * @deprecated Import directly from './debug.ts' instead.
 */
export { logger } from './debug.ts';
