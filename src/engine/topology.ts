/**
 * Dynamic Engine Topology Manager
 * Spec 5.1: Implements the Adaptive Multimodal Topology for auto-scaling
 * 
 * Tiers:
 * - Tier 0: Mono-Thread (Fallback) - Low-power devices
 * - Tier 1: Dual-Thread (Standard) - Mid-range devices  
 * - Tier 2: Tri-Thread (Performance) - High-concurrency hosts
 * - Tier 3: Quad-Thread (Sovereign) - Enterprise/Elite hosts with dedicated 4D Predictive Engine
 */

import { ZCZS_SUPPORTED, heap } from './reactivity.ts';

export type TierLevel = 0 | 1 | 2 | 3;

interface TierConfig {
  level: TierLevel;
  name: string;
  threads: number;
  usesSharedArrayBuffer: boolean;
  usesWorkers: boolean;
  predictiveEngineDedicated: boolean;
}

const TIER_CONFIGS: Record<TierLevel, TierConfig> = {
  0: {
    level: 0,
    name: 'Mono-Thread (Fallback)',
    threads: 1,
    usesSharedArrayBuffer: false,
    usesWorkers: false,
    predictiveEngineDedicated: false
  },
  1: {
    level: 1,
    name: 'Dual-Thread (Standard)',
    threads: 2,
    usesSharedArrayBuffer: ZCZS_SUPPORTED,
    usesWorkers: true,
    predictiveEngineDedicated: false
  },
  2: {
    level: 2,
    name: 'Tri-Thread (Performance)',
    threads: 3,
    usesSharedArrayBuffer: ZCZS_SUPPORTED,
    usesWorkers: true,
    predictiveEngineDedicated: false
  },
  3: {
    level: 3,
    name: 'Quad-Thread (Sovereign)',
    threads: 4,
    usesSharedArrayBuffer: ZCZS_SUPPORTED,
    usesWorkers: true,
    predictiveEngineDedicated: true
  }
};

class EngineTopology {
  private currentTier: TierLevel = 0;
  private workers: Worker[] = [];
  private sharedBuffer: SharedArrayBuffer | null = null;
  private lagHistory: number[] = [];
  private readonly LAG_SAMPLE_SIZE = 60;
  private readonly LAG_THRESHOLD = 0.4; // 40% of frame budget
  private readonly FRAME_BUDGET = 16.67; // 60fps = 16.67ms per frame
  private autoScaleEnabled = true;
  private monitoringInterval: number | null = null;

  constructor() {
    this.boot();
  }

  /**
   * Boot probe - determines optimal tier based on environment
   * Spec 5.2.1: Auto-Adaptation Logic
   */
  private boot() {
    // Step 1: Check for Cross-Origin Isolation (SAB requirement)
    const isCrossOriginIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
    
    // Step 2: Check hardware concurrency
    const cores = navigator.hardwareConcurrency || 2;
    
    // Step 3: Check for Nexus-IO runtime bridge
    const hasNexusIO = typeof (globalThis as any).__NEXUS_IO__ !== 'undefined';
    
    // Determine tier based on capabilities
    if (cores >= 4 && (isCrossOriginIsolated || hasNexusIO)) {
      this.currentTier = 3; // Quad-Thread Sovereign
    } else if (cores >= 3 && (isCrossOriginIsolated || hasNexusIO)) {
      this.currentTier = 2; // Tri-Thread Performance  
    } else if (cores >= 2 && typeof Worker !== 'undefined') {
      this.currentTier = 1; // Dual-Thread Standard
    } else {
      this.currentTier = 0; // Mono-Thread Fallback
    }

    console.log(`[Nexus Topology] Boot: Detected ${cores} cores, SAB: ${isCrossOriginIsolated}, NexusIO: ${hasNexusIO}`);
    console.log(`[Nexus Topology] Selected Tier: ${this.currentTier} (${TIER_CONFIGS[this.currentTier].name})`);

    // Initialize tier-specific resources
    this.initializeTier();
  }

  /**
   * Initialize resources for the selected tier
   */
  private async initializeTier() {
    const config = TIER_CONFIGS[this.currentTier];

    if (config.usesSharedArrayBuffer && ZCZS_SUPPORTED) {
      try {
        // Allocate SharedArrayBuffer for cross-thread communication
        // 1MB buffer - should be enough for most signal heaps
        this.sharedBuffer = new SharedArrayBuffer(1024 * 1024);
        
        // Initialize heap with shared buffer
        if (heap) {
          (heap as any).attachSharedBuffer(this.sharedBuffer);
        }
        console.log('[Nexus Topology] SharedArrayBuffer initialized');
      } catch (e) {
        console.warn('[Nexus Topology] Failed to initialize SAB, falling back:', e);
        this.currentTier = Math.max(0, this.currentTier - 1);
        this.initializeTier();
        return;
      }
    }

    if (config.usesWorkers && this.currentTier > 0) {
      await this.spawnWorkers(this.currentTier);
    }

    // Start lag monitoring for auto-scaling
    if (this.autoScaleEnabled && this.currentTier > 0) {
      this.startMonitoring();
    }
  }

  /**
   * Spawn worker threads based on tier
   */
  private async spawnWorkers(tier: TierLevel) {
    const config = TIER_CONFIGS[tier];
    const workerCount = config.threads - 1; // Main thread counts as 1

    // Terminate existing workers first
    this.terminateWorkers();

    for (let i = 0; i < workerCount; i++) {
      try {
        // In production, this would load from a bundled worker file
        // For now, we'll create inline workers
        const workerCode = `
          self.onmessage = function(e) {
            if (e.data.type === 'EXECUTE') {
              // Worker logic would go here
              self.postMessage({ type: 'RESULT', id: e.data.id, result: null });
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (e) => {
          // Handle worker messages
        };
        
        this.workers.push(worker);
      } catch (e) {
        console.warn(`[Nexus Topology] Failed to spawn worker ${i}:`, e);
      }
    }

    console.log(`[Nexus Topology] Spawned ${this.workers.length} worker(s) for Tier ${tier}`);
  }

  /**
   * Terminate all worker threads
   */
  private terminateWorkers() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
  }

  /**
   * Start lag variance monitoring for auto-scaling
   * Spec 5.1.2: The Autoscale Mechanism
   */
  private startMonitoring() {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.measureLag();
    }, 1000) as unknown as number;
  }

  /**
   * Measure frame lag and trigger scale up/down
   */
  private measureLag() {
    const frameStart = performance.now();
    
    // Simulate work measurement
    requestAnimationFrame(() => {
      const frameEnd = performance.now();
      const frameTime = frameEnd - frameStart;
      const lagRatio = frameTime / this.FRAME_BUDGET;
      
      this.lagHistory.push(lagRatio);
      if (this.lagHistory.length > this.LAG_SAMPLE_SIZE) {
        this.lagHistory.shift();
      }

      // Calculate average lag
      const avgLag = this.lagHistory.reduce((a, b) => a + b, 0) / this.lagHistory.length;

      // Scale up if lag exceeds threshold
      if (avgLag > this.LAG_THRESHOLD && this.currentTier < 3) {
        this.scaleUp();
      }
      // Scale down if lag is consistently low
      else if (avgLag < 0.1 && this.currentTier > 0 && this.lagHistory.length >= this.LAG_SAMPLE_SIZE) {
        this.scaleDown();
      }
    });
  }

  /**
   * Scale up to higher tier
   */
  private async scaleUp() {
    const newTier = (this.currentTier + 1) as TierLevel;
    console.log(`[Nexus Topology] Scaling UP from Tier ${this.currentTier} to Tier ${newTier}`);
    
    this.currentTier = newTier;
    await this.initializeTier();
    
    // Emit event for predictive engine promotion
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus:topology-scale', { 
        detail: { tier: this.currentTier, direction: 'up' } 
      }));
    }
  }

  /**
   * Scale down to lower tier
   */
  private async scaleDown() {
    const newTier = (this.currentTier - 1) as TierLevel;
    if (newTier < 0) return;
    
    console.log(`[Nexus Topology] Scaling DOWN from Tier ${this.currentTier} to Tier ${newTier}`);
    
    this.currentTier = newTier;
    await this.initializeTier();

    // Emit event for predictive engine demotion  
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus:topology-scale', { 
        detail: { tier: this.currentTier, direction: 'down' } 
      }));
    }
  }

  /**
   * Get current tier configuration
   */
  public getTier(): TierLevel {
    return this.currentTier;
  }

  /**
   * Get tier configuration
   */
  public getTierConfig(): TierConfig {
    return TIER_CONFIGS[this.currentTier];
  }

  /**
   * Get SharedArrayBuffer for cross-thread communication
   */
  public getSharedBuffer(): SharedArrayBuffer | null {
    return this.sharedBuffer;
  }

  /**
   * Enable/disable auto-scaling
   */
  public setAutoScale(enabled: boolean): void {
    this.autoScaleEnabled = enabled;
    if (enabled && this.currentTier > 0) {
      this.startMonitoring();
    } else if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Force specific tier (for testing or manual override)
   */
  public async setTier(tier: TierLevel): Promise<void> {
    if (tier === this.currentTier) return;
    
    console.log(`[Nexus Topology] Manual tier change: ${this.currentTier} -> ${tier}`);
    this.currentTier = tier;
    await this.initializeTier();
  }

  /**
   * Get worker for task distribution
   */
  public getWorker(index: number): Worker | null {
    return this.workers[index % this.workers.length] || null;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.terminateWorkers();
    this.sharedBuffer = null;
  }
}

// Global singleton instance
export const topology = new EngineTopology();

// Export tier configs for external inspection
export { TIER_CONFIGS };
