import { ModuleCoordinator } from './src/engine/modules.ts';
import { stylesheet } from './src/engine/stylesheet.ts';

/**
 * Phase 19 Verification Suite
 */
async function runVerification() {
  console.log("🚀 Starting Phase 19 Verification...");

  const coordinator = new ModuleCoordinator();
  const root = document.createElement('div');
  root.id = 'nexus-root';
  document.body.appendChild(root);

  // --- 1. Branch Isolation (Firewall) Test ---
  console.log("\n--- Testing Branch Isolation Firewalls ---");
  root.innerHTML = `
    <div id="no-ignore" class="bg-blue-500" data-bind="foo"></div>
    <div id="total-ignore" data-ignore class="bg-red-500" data-bind="bar">
      <div id="inner-ignored" data-bind="baz"></div>
    </div>
    <div id="ux-ignore" data-ignore:ux class="bg-green-500" data-bind="qux"></div>
    <div id="style-ignore" data-ignore:style class="bg-yellow-500" data-bind="quux"></div>
    <div id="nested-pierce" data-ignore>
      <div id="pierced" data-ignore:off data-bind="piercedValue"></div>
    </div>
  `;

  coordinator.initializeModules(root);

  const noIgnore = document.getElementById('no-ignore')!;
  const totalIgnore = document.getElementById('total-ignore')!;
  const uxIgnore = document.getElementById('ux-ignore')!;
  const styleIgnore = document.getElementById('style-ignore')!;
  const pierced = document.getElementById('pierced')!;

  // Verification
  console.log("No Ignore (Marked):", (noIgnore as any).__nexus_marker__ !== undefined);
  console.log("Total Ignore (Should NOT be marked):", (totalIgnore as any).__nexus_marker__ === undefined);
  console.log("Inner Ignored (Should NOT be marked):", (document.getElementById('inner-ignored') as any).__nexus_marker__ === undefined);
  console.log("UX Ignore (Marked but no directive cleanups):", (uxIgnore as any).__nexus_marker__ !== undefined);
  console.log("Style Ignore (Marked and has directive cleanups):", (styleIgnore as any).__nexus_marker__ !== undefined);
  console.log("Pierced (Should be marked despite parent ignore):", (pierced as any).__nexus_marker__ !== undefined);

  // --- 2. MCP Architecture Test ---
  console.log("\n--- Testing MCP Architecture ---");
  const mcp = coordinator.runtimeContext.mcp;
  console.log("MCP Client initialized (if meta tag present):", mcp !== undefined);

  // --- 3. Adaptive Data Plane Test ---
  console.log("\n--- Testing Adaptive Ingress (Envelopes) ---");
  const { createSuspenseProxy } = (await import('./src/engine/fetch.ts')).fetchUtilities;
  const mockApiPromise = Promise.resolve({
    data: {
      user: { name: 'Nexus' }
    }
  });

  const proxy = createSuspenseProxy(mockApiPromise, coordinator.runtimeContext);
  
  // Wait for resolution
  await mockApiPromise;
  console.log("Envelope Diving (proxy.user.name):", (proxy as any).user.name); // Should be 'Nexus'

  console.log("\n✅ Phase 19 Verification Complete.");
}

// Global hook for browser testing
(window as any).runPhase19Verification = runVerification;
