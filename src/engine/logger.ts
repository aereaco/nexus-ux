import { RuntimeContext } from './composition.ts';

/**
 * Global logging utility for Nexus-UX.
 * Respects the data-debug flag on the root element.
 */
export const logger = {
  log: (context: RuntimeContext, ...args: any[]) => {
    if (context.isDevMode) console.log(`[Nexus]`, ...args);
  },
  warn: (context: RuntimeContext, ...args: any[]) => {
    if (context.isDevMode) console.warn(`[Nexus]`, ...args);
  },
  info: (context: RuntimeContext, ...args: any[]) => {
    if (context.isDevMode) console.info(`[Nexus]`, ...args);
  },
  error: (context: RuntimeContext, ...args: any[]) => {
    // Errors are always logged, but prefixed
    console.error(`[Nexus Error]`, ...args);
  }
};
