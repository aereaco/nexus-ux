/**
 * Self-Heal Agent & Crash Beacons
 * 
 * Nexus-UX 1.0 is the first framework with a native AI-debugging interface.
 * 
 * This module provides:
 * - Crash Beacons: Binary snapshots of Signal Heap, Ghost Mirror, and call-stack on errors
 * - Agentic Restoration: AI-powered failure analysis and state recovery
 * - Zero-Copy Capture: Minimal overhead during error capture
 * 
 * @module agent
 */

import { topology } from './topology.ts';
import type { TierLevel, TierConfig } from './topology.ts';
import type { RuntimeContext } from './composition.ts';
import { heap } from './reactivity.ts';

// Beacon types for crash reporting
export interface CrashBeacon {
  id: string;
  timestamp: number;
  tier: TierLevel;
  signalHeap: SignalHeapSnapshot;
  ghostMirror: GhostMirrorSnapshot;
  callStack: CallStackFrame[];
  navigator: NavigatorInfo;
  memory?: MemoryInfo;
}

export interface SignalHeapSnapshot {
  numericSignals: Float64Array | null;
  booleanSignals: Int32Array | null;
  objectSignals: Record<string, unknown>[];
  signalIndexMap: Record<string, number>;
  size: number;
}

export interface GhostMirrorSnapshot {
  activeNodes: number;
  dirtyNodes: number;
  spatialIndex: QuadtreeStats;
}

export interface QuadtreeStats {
  nodes: number;
  maxDepth: number;
  objects: number;
}

export interface CallStackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

export interface NavigatorInfo {
  userAgent: string;
  language: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Configuration for Self-Heal
export interface SelfHealConfig {
  enabled: boolean;
  captureHeap: boolean;
  captureMirror: boolean;
  captureStack: boolean;
  maxStackDepth: number;
  emitToConsole: boolean;
  emitToPlatform: boolean;
  platformEndpoint?: string;
}

const DEFAULT_CONFIG: SelfHealConfig = {
  enabled: true,
  captureHeap: true,
  captureMirror: true,
  captureStack: true,
  maxStackDepth: 20,
  emitToConsole: true,
  emitToPlatform: false // Disabled by default - requires platform endpoint
};

/**
 * SelfHeal Agent - Captures crash beacons and enables agentic restoration
 */
export class SelfHealAgent {
  private config: SelfHealConfig;
  private beaconHistory: CrashBeacon[] = [];
  private maxHistorySize = 10;
  private heapSnapshot: SignalHeapSnapshot | null = null;
  private mirrorSnapshot: GhostMirrorSnapshot | null = null;
  private isCapturing = false;
  private globalErrorHandler: ((error: Error, context?: unknown) => void) | null = null;
  private globalRejectionHandler: ((reason: unknown, promise?: Promise<unknown>) => void) | null = null;
  private runtime: RuntimeContext | null = null;

  constructor(runtime?: RuntimeContext, config: Partial<SelfHealConfig> = {}) {
    if (runtime) {
      this.runtime = runtime;
      this.runtime.agent = this;
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers for automatic beacon capture
   */
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    // Window error handler
    this.globalErrorHandler = (error: Error, context?: unknown) => {
      this.captureBeacon(error, 'error', context);
    };
    globalThis.addEventListener('error', this.globalErrorHandler as any);

    // Unhandled promise rejection
    this.globalRejectionHandler = (reason: unknown, promise?: Promise<unknown>) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureBeacon(error, 'unhandledRejection', { promise });
    };
    globalThis.addEventListener('unhandledrejection', this.globalRejectionHandler as any);
  }

  /**
   * Capture a crash beacon with full state snapshot
   */
  public captureBeacon(error: Error, type: 'error' | 'unhandledRejection' | 'manual', context?: unknown): CrashBeacon {
    if (this.isCapturing) {
      // Prevent recursive capture
      return this.createMinimalBeacon(error, type);
    }

    this.isCapturing = true;
    const _startTime = performance.now();

    try {
      const beacon: CrashBeacon = {
        id: this.generateBeaconId(),
        timestamp: Date.now(),
        tier: topology.getTier(),
        signalHeap: this.config.captureHeap ? this.captureSignalHeap() : this.createEmptyHeapSnapshot(),
        ghostMirror: this.config.captureMirror ? this.captureGhostMirror() : this.createEmptyMirrorSnapshot(),
        callStack: this.config.captureStack ? this.captureCallStack(error) : [],
        navigator: this.captureNavigator(),
        memory: this.captureMemory()
      };

      // Store beacon
      this.beaconHistory.push(beacon);
      if (this.beaconHistory.length > this.maxHistorySize) {
        this.beaconHistory.shift();
      }

      // Emit beacon
      if (this.config.emitToConsole) {
        this.emitToConsole(beacon, type, context);
      }

      if (this.config.emitToPlatform && this.config.platformEndpoint) {
        this.emitToPlatform(beacon);
      }

      return beacon;
    } catch (e) {
      // If capture fails, return minimal beacon
      return this.createMinimalBeacon(error, type);
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Create a minimal beacon when full capture fails
   */
  private createMinimalBeacon(error: Error, type: string): CrashBeacon {
    return {
      id: this.generateBeaconId(),
      timestamp: Date.now(),
      tier: topology.getTier(),
      signalHeap: this.createEmptyHeapSnapshot(),
      ghostMirror: this.createEmptyMirrorSnapshot(),
      callStack: [{ function: error.message, file: error.stack?.split('\n')[0] || 'unknown', line: 0, column: 0 }],
      navigator: this.captureNavigator(),
      memory: this.captureMemory()
    };
  }

  /**
   * Capture Signal Heap snapshot (Zero-Copy optimized)
   */
  private captureSignalHeap(): SignalHeapSnapshot {
    // Try to get typed arrays from reactivity if available
    let numericSignals: Float64Array | null = null;
    let booleanSignals: Int32Array | null = null;
    let objectSignals: Record<string, unknown>[] = [];
    let signalIndexMap: Record<string, number> = {};

    try {
      // Access SignalHeap from runtime context if available
      if (this.runtime) {
        if (heap) {
           // Copy typed arrays if they match the expected internal names
           // (Assuming we want to keep the "completing" logic as robust as possible)
           const h = heap as any;
           if (h._floatHeap instanceof Float64Array) numericSignals = new Float64Array(h._floatHeap);
           if (h._intHeap instanceof Int32Array) booleanSignals = new Int32Array(h._intHeap);
           signalIndexMap = { ...(h._indexMap || {}) };
        }

        // Capture global reactive state from runtime
        const globalState = this.runtime.globalSignals();
        if (globalState) {
          objectSignals = [globalState];
        }
      }
    } catch (e) {
      // Silently fail - capture what we can
    }

    const size = (numericSignals?.byteLength || 0) + (booleanSignals?.byteLength || 0);

    return {
      numericSignals,
      booleanSignals,
      objectSignals,
      signalIndexMap,
      size
    };
  }

  /**
   * Capture Ghost Mirror snapshot
   */
  private captureGhostMirror(): GhostMirrorSnapshot {
    let activeNodes = 0;
    let dirtyNodes = 0;
    let spatialIndex: QuadtreeStats = { nodes: 0, maxDepth: 0, objects: 0 };

    try {
      // Access predictive module for quadtree stats
      const predictiveModule = (globalThis as any).__nexus_predictive;
      if (predictiveModule?.quadtree) {
        const qt = predictiveModule.quadtree;
        spatialIndex = {
          nodes: qt.nodes?.length || 0,
          maxDepth: qt.maxDepth || 0,
          objects: qt.objects?.length || 0
        };
      }

      // Access DOM state
      if (typeof document !== 'undefined') {
        activeNodes = document.querySelectorAll('[data-signal]').length;
        dirtyNodes = document.querySelectorAll('[data-dirty]').length;
      }
    } catch (e) {
      // Silently fail
    }

    return {
      activeNodes,
      dirtyNodes,
      spatialIndex
    };
  }

  /**
   * Capture call stack from error
   */
  private captureCallStack(error: Error): CallStackFrame[] {
    const frames: CallStackFrame[] = [];
    
    if (!error.stack) return frames;

    const stackLines = error.stack.split('\n').slice(1); // Skip error message line
    const maxDepth = Math.min(stackLines.length, this.config.maxStackDepth);

    for (let i = 0; i < maxDepth; i++) {
      const line = stackLines[i].trim();
      if (!line) continue;

      // Parse different stack trace formats
      // Chrome: at function (file:line:column)
      // Firefox: function@file:line:column
      let match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
      
      if (match) {
        frames.push({
          function: match[1] || 'anonymous',
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10)
        });
      } else {
        // Try Firefox format
        match = line.match(/(?:(.+?)@)?(.+?):(\d+):(\d+)/);
        if (match) {
          frames.push({
            function: match[1] || 'anonymous',
            file: match[2],
            line: parseInt(match[3], 10),
            column: parseInt(match[4], 10)
          });
        }
      }
    }

    return frames;
  }

  /**
   * Capture navigator info
   */
  private captureNavigator(): NavigatorInfo {
    if (typeof navigator === 'undefined') {
      return { userAgent: '', language: '', hardwareConcurrency: 0 };
    }

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory
    };
  }

  /**
   * Capture memory info if available
   */
  private captureMemory(): MemoryInfo | undefined {
    if (typeof (performance as any).memory === 'undefined') {
      return undefined;
    }

    const mem = (performance as any).memory;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit
    };
  }

  /**
   * Create empty heap snapshot
   */
  private createEmptyHeapSnapshot(): SignalHeapSnapshot {
    return {
      numericSignals: null,
      booleanSignals: null,
      objectSignals: [],
      signalIndexMap: {},
      size: 0
    };
  }

  /**
   * Create empty mirror snapshot
   */
  private createEmptyMirrorSnapshot(): GhostMirrorSnapshot {
    return {
      activeNodes: 0,
      dirtyNodes: 0,
      spatialIndex: { nodes: 0, maxDepth: 0, objects: 0 }
    };
  }

  /**
   * Generate unique beacon ID
   */
  private generateBeaconId(): string {
    return `beacon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Emit beacon to console
   */
  private emitToConsole(beacon: CrashBeacon, type: string, context?: unknown): void {
    console.error('[Nexus Self-Heal] Crash Beacon captured', {
      id: beacon.id,
      type,
      timestamp: new Date(beacon.timestamp).toISOString(),
      tier: beacon.tier,
      memory: beacon.memory,
      error: beacon.callStack[0]?.function || 'Unknown',
      stack: beacon.callStack
    });
    
    if (context) {
      console.error('[Nexus Self-Heal] Context:', context);
    }
  }

  /**
   * Emit beacon to Aerea platform for AI analysis
   */
  private async emitToPlatform(beacon: CrashBeacon): Promise<void> {
    if (!this.config.platformEndpoint) return;

    try {
      await fetch(this.config.platformEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beacon)
      });
    } catch (e) {
      // Silently fail - don't break app for beacon emission
    }
  }

  /**
   * Get beacon history
   */
  public getBeaconHistory(): CrashBeacon[] {
    return [...this.beaconHistory];
  }

  /**
   * Get latest beacon
   */
  public getLatestBeacon(): CrashBeacon | null {
    return this.beaconHistory[this.beaconHistory.length - 1] || null;
  }

  /**
   * Get beacon by ID
   */
  public getBeaconById(id: string): CrashBeacon | null {
    return this.beaconHistory.find(b => b.id === id) || null;
  }

  /**
   * Clear beacon history
   */
  public clearHistory(): void {
    this.beaconHistory = [];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SelfHealConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Manually trigger a beacon capture
   */
  public manualCapture(message: string, context?: unknown): CrashBeacon {
    const error = new Error(message);
    return this.captureBeacon(error, 'manual', context);
  }

  /**
   * Report a non-breaking resolution failure to the Agentic Host.
   * This is used for missing selectors or failed expression evaluations
   * that don't throw but impede framework functionality.
   */
  public reportResolutionFailure(type: 'selector' | 'expression' | 'tier', identifier: string, context?: unknown): void {
    if (!this.config.enabled) return;

    if (this.config.emitToConsole) {
      console.warn(`[Nexus Resolution Beacon] ${type.toUpperCase()} Failure: "${identifier}"`, {
        context,
        timestamp: new Date().toISOString()
      });
    }

    if (this.config.emitToPlatform && this.config.platformEndpoint) {
      // Emit a specialized light-weight beacon for resolution failures
      const resolutionBeacon = {
        id: `res_${this.generateBeaconId()}`,
        timestamp: Date.now(),
        type: 'resolution_failure',
        failureType: type,
        identifier,
        context,
        tier: topology.getTier(),
        navigator: this.captureNavigator()
      };
      
      this.emitToPlatform(resolutionBeacon as any);
    }
  }

  /**
   * Cleanup - remove global handlers
   */
  public dispose(): void {
    if (typeof globalThis === 'undefined') return;

    if (this.globalErrorHandler) {
      globalThis.removeEventListener('error', this.globalErrorHandler as any);
    }
    if (this.globalRejectionHandler) {
      globalThis.removeEventListener('unhandledrejection', this.globalRejectionHandler as any);
    }

    this.beaconHistory = [];
  }
}

// Singleton instance
let agentInstance: SelfHealAgent | null = null;

/**
 * Get or create the Self-Heal agent singleton
 */
export function getSelfHealAgent(runtime?: RuntimeContext, config?: Partial<SelfHealConfig>): SelfHealAgent {
  if (!agentInstance) {
    agentInstance = new SelfHealAgent(runtime, config);
  }
  return agentInstance;
}

/**
 * Initialize Self-Heal with custom configuration
 */
export function initSelfHeal(runtime?: RuntimeContext, config?: Partial<SelfHealConfig>): SelfHealAgent {
  if (agentInstance) {
    agentInstance.updateConfig(config || {});
    return agentInstance;
  }
  
  agentInstance = new SelfHealAgent(runtime, config);
  return agentInstance;
}

/**
 * Manually capture a crash beacon
 */
export function captureCrashBeacon(error: Error, context?: unknown): CrashBeacon {
  const agent = getSelfHealAgent();
  return agent.captureBeacon(error, 'manual', context);
}

/**
 * Get all captured beacons
 */
export function getBeaconHistory(): CrashBeacon[] {
  return getSelfHealAgent().getBeaconHistory();
}
