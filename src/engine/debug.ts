/**
 * Nexus-UX Integrated Sanitizing Engine (engine/debug.ts)
 * 
 * Consolidates all error reporting, logging, and debug UI tooling into a
 * single crash-isolated module. The debug engine is LAZY — it only fully
 * boots when `data-debug` is detected on an element, maximizing production
 * performance.
 * 
 * Architecture:
 *   - In production (no data-debug): Only basic console.error fires. Zero overhead.
 *   - With data-debug: Full sanitizing MutationObserver, crash beacons, verbose
 *     logging, and element.nexus DevTools surface.
 *   - With data-debug="{ mcp: '<endpoint>' }": Same + AI-assisted diagnostics
 *     via the independent engine/mcp.ts transport.
 * 
 * MCP Independence: engine/mcp.ts remains a standalone omni-directional
 * primitive. This module consumes it when configured; it does not own it.
 */

import { ATTRIBUTE_PREFIX, CUSTOM_EVENT_PREFIX } from './consts.ts';
import { RuntimeContext } from './composition.ts';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Error Reporting API (consolidated from engine/errors.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom Error class for Nexus-UX framework errors.
 * Provides consistent error reporting with additional context.
 */
export class UXError extends Error {
  constructor(message: string, public element?: HTMLElement, public expression?: string) {
    super(message);
    this.name = 'UXError';
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, UXError.prototype);
  }
}

/**
 * Reports a framework-specific error.
 * This function centralizes error reporting and can be extended to provide
 * more sophisticated logging, UI notifications, or developer debugging tools.
 * Unified with MCP for AI-First Auto-Repair Diagnosis.
 */
export function reportError(error: Error, element?: HTMLElement, expression?: string): void {
  const errorMessage = `[UX Error] ${error.message}`;
  console.error(errorMessage, { element, expression, originalError: error });

  // 1. Diagnostic Routing (AI-First MCP Integration)
  // Only routes to MCP if the debug engine is active (data-debug present)
  const Nexus = (globalThis as Record<string, unknown>).Nexus as Record<string, unknown> | undefined;
  const coordinator = Nexus?.coordinator as Record<string, unknown> | undefined;
  const runtime = coordinator?.runtimeContext as RuntimeContext | undefined;
  
  if (runtime?.mcp && runtime.isDevMode) {
    runtime.mcp.sendRequest('sampling/createMessage', {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Diagnose and suggest a fix for this Nexus-UX engine error:\n` +
                `Message: ${error.message}\n` +
                `Expression: ${expression || 'N/A'}\n` +
                `Element: ${element?.outerHTML?.substring(0, 500) || 'N/A'}\n` +
                `Stack: ${error.stack}`
        }
      }]
    }).then((res: Record<string, unknown>) => {
       const content = res?.content as Record<string, string> | Record<string, string>[] | undefined;
       const suggestion = (content as Record<string, string>)?.text || 
                          (Array.isArray(content) ? content[0]?.text : undefined);
       if (suggestion) {
         console.info(`[Nexus AI Diagnosis] ✨ Suggested Fix:\n${suggestion}`);
       }
    }).catch(() => {
       // Silent fail for diagnostic bridge
    });
  }

  // 2. Dispatch custom event
  if (typeof CustomEvent !== 'undefined') {
    const errorEvent = new CustomEvent(`${CUSTOM_EVENT_PREFIX}error`, {
      bubbles: true,
      cancelable: false,
      detail: {
        message: errorMessage,
        element: element,
        expression: expression,
        originalError: error,
      },
    });
    element?.dispatchEvent(errorEvent) || (typeof document !== 'undefined' && document.dispatchEvent(errorEvent));
  }
}

/**
 * Creates and reports an initialization error for a module or directive.
 */
export function initError(moduleName: string, message: string, element?: HTMLElement, expression?: string): void {
  const error = new UXError(`Initialization failed for ${moduleName}: ${message}`, element, expression);
  reportError(error, element, expression);
}

/**
 * Creates and reports a runtime error for a module or directive.
 */
export function runtimeError(moduleName: string, message: string, element?: HTMLElement, expression?: string): void {
  const error = new UXError(`Runtime error in ${moduleName}: ${message}`, element, expression);
  reportError(error, element, expression);
}

/**
 * Creates and reports a syntax error related to a directive's attribute.
 */
export function syntaxError(directiveName: string, attributeValue: string, message: string, element?: HTMLElement): void {
  const error = new UXError(
    `Syntax error in ${ATTRIBUTE_PREFIX}${directiveName}="${attributeValue}": ${message}`,
    element,
    attributeValue
  );
  reportError(error, element, attributeValue);
}

/**
 * Creates and reports an evaluation error.
 */
export function evaluationError(expression: string, originalError: Error, element?: HTMLElement): void {
  const error = new UXError(
    `Expression evaluation failed: ${originalError.message}`,
    element,
    expression
  );
  error.stack = originalError.stack; // Preserve original stack trace
  reportError(error, element, expression);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Logging Subsystem (consolidated from engine/logger.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global logging utility for Nexus-UX.
 * Respects the data-debug flag on the root element.
 */
export const logger = {
  log: (context: RuntimeContext, ...args: unknown[]) => {
    if (context.isDevMode) console.log(`[Nexus]`, ...args);
  },
  warn: (context: RuntimeContext, ...args: unknown[]) => {
    if (context.isDevMode) console.warn(`[Nexus]`, ...args);
  },
  info: (context: RuntimeContext, ...args: unknown[]) => {
    if (context.isDevMode) console.info(`[Nexus]`, ...args);
  },
  debug: (context: RuntimeContext, ...args: unknown[]) => {
    if (context.isDevMode) console.debug(`[Nexus Debug]`, ...args);
  },
  error: (_context: RuntimeContext, ...args: unknown[]) => {
    // Errors are always logged, but prefixed
    console.error(`[Nexus Error]`, ...args);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sanitizing MutationObserver (extracted from engine/modules.ts)
// ─────────────────────────────────────────────────────────────────────────────

let sanitizingObserver: MutationObserver | null = null;

/**
 * Initializes the Sanitizing Engine.
 * This is called by the ModuleCoordinator during framework boot.
 * The sanitizing MutationObserver is crash-isolated from the framework observer.
 * 
 * @param runtimeContext - The framework runtime context
 */
export function initSanitizingEngine(runtimeContext: RuntimeContext): void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

  try {
    sanitizingObserver = new MutationObserver((mutations) => {
      try {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-debug') {
            const target = mutation.target as HTMLElement;
            const debugValue = target.getAttribute('data-debug');
            
            // Update dev mode flag
            runtimeContext.isDevMode = debugValue !== null;

            // If data-debug has an MCP config, initialize diagnostic transport
            if (debugValue && debugValue.trim().startsWith('{')) {
              try {
                const config = new Function(`return (${debugValue})`)() as Record<string, string>;
                if (config.mcp && !runtimeContext.mcp) {
                  // Lazy-load MCP connection from the independent mcp.ts module
                  import('./mcp.ts').then(({ MCPClient }) => {
                    runtimeContext.mcp = new MCPClient(config.mcp);
                    runtimeContext.mcp.connect().catch(() => {
                      console.warn(`[Nexus Debug] MCP connection failed: ${config.mcp}`);
                    });
                  });
                }
              } catch {
                // Invalid debug config — activate debug mode without MCP
              }
            }
          }
        }
      } catch (e) {
        // Crash isolation: sanitizing observer must never propagate errors
        console.error('[Nexus Sanitizer] Internal error (isolated):', e);
      }
    });

    // Observe the document root for data-debug attribute changes
    sanitizingObserver.observe(document.documentElement, { attributes: true, subtree: true });
  } catch (e) {
    console.error('[Nexus Sanitizer] Failed to initialize:', e);
  }
}

/**
 * Disposes the Sanitizing Engine.
 */
export function disposeSanitizingEngine(): void {
  if (sanitizingObserver) {
    sanitizingObserver.disconnect();
    sanitizingObserver = null;
  }
}
