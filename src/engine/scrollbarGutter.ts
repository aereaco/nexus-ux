/**
 * Scrollbar-Gutter Stabilization
 *
 * Reserves layout space for the vertical scrollbar at the document root so a
 * scrollbar toggling on/off can never change `innerWidth`. This prevents a
 * reactive feedback loop on fractional display scaling (DPR 1.25 / 1.5, as in
 * native Windows at 125% / 150%): sub-pixel content-height rounding makes the
 * scrollbar toggle, which changes `innerWidth`, which re-renders layout that
 * depends on `innerWidth`, which reflows and toggles the scrollbar again — an
 * endless loop. At integer DPR (DPR 1.0) the rounding is deterministic, so the
 * loop never forms (this is why the same code "works in WSL" but not native
 * Windows). Stabilizing the gutter makes rendering identical across DPR/OS/browser.
 */

let injected = false;

export function ensureScrollbarGutter() {
  if (injected) return;
  if (typeof document === 'undefined') return;
  if (!document.documentElement) return;
  injected = true;
  document.documentElement.style.scrollbarGutter = 'stable';
}
