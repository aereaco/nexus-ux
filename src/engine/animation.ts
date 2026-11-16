/**
 * Executes a callback (which typically changes the DOM) and animates the transition
 * of elements using the FLIP (First, Last, Invert, Play) technique.
 */
export async function flip(
  targets: Element[] | NodeListOf<Element> | string | HTMLElement,
  changeCallback: () => void | Promise<void>,
  options: { duration?: number; easing?: string } = {}
) {
  const { duration = 300, easing = 'ease-out' } = options;

  let targetArray: HTMLElement[] = [];
  if (typeof targets === 'string') {
    targetArray = Array.from(document.querySelectorAll(targets)) as HTMLElement[];
  } else if (targets instanceof Element) {
    targetArray = [targets as HTMLElement];
  } else if (targets && (Array.isArray(targets) || typeof (targets as any)[Symbol.iterator] === 'function')) {
    targetArray = Array.from(targets as any) as HTMLElement[];
  }

  // 1. First: Capture the initial positions
  const initialRects = new Map<HTMLElement, DOMRect>();
  targetArray.forEach((el) => {
    if (el && typeof el.getBoundingClientRect === 'function') {
      initialRects.set(el, el.getBoundingClientRect());
    }
  });

  // 2. Last: Execute the change
  await changeCallback();

  // Wait for the reactive DOM cycle to settle completely before capturing final positions
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  // 3. Invert & Play
  targetArray.forEach((el) => {
    const initialRect = initialRects.get(el);
    if (!initialRect || !el || typeof el.getBoundingClientRect !== 'function') return;
    const finalRect = el.getBoundingClientRect();

    const dx = initialRect.left - finalRect.left;
    const dy = initialRect.top - finalRect.top;

    if (dx !== 0 || dy !== 0) {
      if (typeof el.animate === 'function') {
        el.animate([
          { transform: `translate3d(${dx}px, ${dy}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' }
        ], {
          duration,
          easing
        });
      } else {
        el.style.transition = 'none';
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        el.offsetWidth; // Force repaint fallback
        el.style.transition = `transform ${duration}ms ${easing}`;
        el.style.transform = 'translate3d(0, 0, 0)';

        el.addEventListener(
          'transitionend',
          () => {
            el.style.transition = '';
            el.style.transform = '';
          },
          { once: true }
        );
      }
    }
  });
}
