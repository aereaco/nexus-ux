/**
 * Nexus-UX Module Type Definitions
 *
 * Single source of truth for all module interfaces used throughout the
 * framework. These types define the contract between the engine and all
 * module implementations.
 *
 * ZCZS Role:
 *   - Zero-copy: Interfaces are structural; no runtime overhead.
 *   - Zero-serialization: Types exist only at compile time.
 *
 * Coordination:
 *   - ModuleCoordinator in modules.ts uses these interfaces for registration
 *   - All module implementations in src/modules/ conform to these contracts
 *   - composition.ts RuntimeContext references these types for handler signatures
 *
 * Nexus-UX Innovations Preserved:
 *   - Typed module registration with directive ordering
 *   - Modifier interceptPipeline for evaluation wrapping
 *   - Sprite auto-injection into expression scope
 *   - Mirror auto-injection with _ prefix
 */

import type { RuntimeContext } from './composition.ts';

/**
 * Base interface for all Nexus-UX modules.
 */
export interface Module {
  name: string;
  onGlobalInit?: (context: RuntimeContext) => void;
}

/**
 * Metadata for directive ordering.
 */
export interface DirectiveMetadata {
  before?: string[];
  after?: string[];
}

/**
 * Represents a module that handles `data-*` attributes.
 */
export interface AttributeModule extends Module {
  attribute?: string;
  metadata?: DirectiveMetadata;
  handle(element: HTMLElement, value: string, runtime: RuntimeContext, parsed?: ParsedAttribute): (() => void) | void;
}

/**
 * Represents a module that intercepts and refines DOM events or pipeline evaluation.
 */
export interface ModifierModule extends Module {
  handle(payload: any, element: HTMLElement, argument: string, runtime: RuntimeContext): any;
  interceptPipeline?: (evaluate: RuntimeContext['evaluate'], element: HTMLElement, argument: string, runtime: RuntimeContext) => RuntimeContext['evaluate'];
}

/**
 * Represents a module that provides imperative actions.
 */
export interface ActionModule extends Module {
  action?: string;
  handle(element: HTMLElement, ...args: unknown[]): unknown;
}

/**
 * Represents a module that listens to DOM or custom events.
 */
export interface ListenerModule extends Module {
  event?: string;
  listen(element: HTMLElement, runtime: RuntimeContext): (() => void) | void;
}

/**
 * Represents a module that integrates with browser Observer APIs.
 */
export interface ObserverModule extends Module {
  observerType?: string;
  observe(element: HTMLElement, runtime: RuntimeContext): (() => void) | void;
}

/**
 * Represents a module that provides general-purpose utility functions.
 */
export interface UtilityModule extends Module {
  install(runtime: RuntimeContext): void;
}

/**
 * Represents a module that provides reactive read/write wrappers for browser APIs.
 * Mirrors are injected into the expression scope with the `_` prefix.
 */
export interface MirrorModule extends Module {
  prefix: string;
  create(runtime: RuntimeContext): object;
}

/**
 * Represents a module that provides imperative commands in expression scope.
 * Sprites are injected with the `$` prefix.
 */
export interface SpriteModule extends Module {
  key?: string;
  sprites(runtime: RuntimeContext): Record<string, unknown>;
}

/**
 * Represents a module that provides environment-aware conditional boundaries.
 * Scopes are used with the `@` prefix in directives.
 */
export interface ScopeModule extends Module {
  rule: string;
  evaluate(expression: string, runtime: RuntimeContext): boolean | unknown;
}

export type ActionFunction = (...args: any[]) => any;
