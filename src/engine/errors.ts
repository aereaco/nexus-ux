import { ATTRIBUTE_PREFIX, CUSTOM_EVENT_PREFIX } from './consts.ts';

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
  const Nexus = (globalThis as any).Nexus;
  const runtime = Nexus?.coordinator?.runtimeContext;
  
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
    }).then((res: any) => {
       const suggestion = res?.content?.text || res?.content?.[0]?.text;
       if (suggestion) {
         console.info(`[Nexus AI Diagnosis] ✨ Suggested Fix:\n${suggestion}`);
         // Populate internal debug signal if it exists
         if (runtime.setGlobalSignal) {
           const diagnoses = runtime.globalSignals()._debug_diagnoses || [];
           runtime.setGlobalSignal('_debug_diagnoses', [...diagnoses, { error: error.message, suggestion }]);
         }
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
