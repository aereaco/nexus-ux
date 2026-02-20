/**
 * $animate Sprite
 * Provides imperative control over animations, including the FLIP (First, Last, Invert, Play) technique.
 */

/**
 * Executes a callback (which typically changes the DOM) and animates the transition
 * of elements marked with data-animate-flip.
 */
export async function flip(
  targets: Element[] | NodeListOf<Element>,
  changeCallback: () => void | Promise<void>,
  options: { duration?: number; easing?: string } = {}
) {
  const { duration = 300, easing = 'ease-out' } = options;
  const targetArray = Array.from(targets) as HTMLElement[];

  // 1. First: Capture the initial positions
  const initialRects = new Map<HTMLElement, DOMRect>();
  targetArray.forEach((el) => {
    initialRects.set(el, el.getBoundingClientRect());
  });

  // 2. Last: Execute the change
  await changeCallback();

  // 3. Invert & Play
  targetArray.forEach((el) => {
    const initialRect = initialRects.get(el);
    const finalRect = el.getBoundingClientRect();

    if (!initialRect) return;

    const dx = initialRect.left - finalRect.left;
    const dy = initialRect.top - finalRect.top;

    if (dx !== 0 || dy !== 0) {
      // Invert
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;

      // Force repaint
      el.offsetWidth;

      // Play
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = 'translate3d(0, 0, 0)';

      // Cleanup
      el.addEventListener(
        'transitionend',
        () => {
          el.style.transition = '';
          el.style.transform = '';
        },
        { once: true }
      );
    }
  });
}

export const animate = {
  flip,
};
