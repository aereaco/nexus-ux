// Canvas Event Forwarding Script
// Injected into the builder's iframe to forward DOM events to the parent.
// This follows the VvvebJs pattern where the iframe content dispatches custom
// events to the parent's builder container for handling in the reactive scope.
(function() {
  var container = window.parent.document.getElementById('vvveb-builder-container');
  if (!container) return;

  function resolveTarget(e) {
    var target = e.composedPath ? e.composedPath()[0] : e.target;
    if (!target) return null;
    while (target && target.nodeType === 3) target = target.parentElement;
    if (!target || target.nodeType !== 1 || target === document.body || target.tagName === 'HTML') return null;
    return target;
  }

  // Click → select element
  document.addEventListener('click', function(e) {
    var target = resolveTarget(e);
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      container.dispatchEvent(new CustomEvent('canvasselect', { bubbles: false, detail: { target: target } }));
    } else {
      // Clicked on body/html → deselect
      container.dispatchEvent(new CustomEvent('canvasdeselect', { bubbles: false }));
    }
  }, true);

  // Mousemove → highlight element on hover
  document.addEventListener('mousemove', function(e) {
    var target = resolveTarget(e);
    if (target) {
      container.dispatchEvent(new CustomEvent('canvashover', { bubbles: false, detail: { target: target } }));
    }
  }, true);

  // Mouseleave → hide highlight
  document.body.addEventListener('mouseleave', function() {
    container.dispatchEvent(new CustomEvent('canvasleave', { bubbles: false }));
  });

  // Double-click → inline text editing (contentEditable)
  document.addEventListener('dblclick', function(e) {
    var target = resolveTarget(e);
    if (target) {
      e.preventDefault();
      target.contentEditable = 'true';
      target.focus();
      container.dispatchEvent(new CustomEvent('canvasdblclick', { bubbles: false, detail: { target: target } }));

      var onInput = function() {
        container.dispatchEvent(new CustomEvent('canvasinput', {
          bubbles: false,
          detail: { target: target, text: target.textContent || '' }
        }));
      };

      target.addEventListener('input', onInput);
      target.addEventListener('blur', function onBlur() {
        target.contentEditable = 'false';
        target.removeEventListener('input', onInput);
        target.removeEventListener('blur', onBlur);
        container.dispatchEvent(new CustomEvent('canvasblur', {
          bubbles: false,
          detail: { target: target }
        }));
      });
    }
  }, true);

  // Scroll → update overlay box positions
  document.addEventListener('scroll', function() {
    container.dispatchEvent(new CustomEvent('canvasscroll', { bubbles: false }));
  }, { passive: true });

  window.addEventListener('resize', function() {
    container.dispatchEvent(new CustomEvent('canvasscroll', { bubbles: false }));
  }, { passive: true });

  // Notify parent that canvas events are bound and ready
  container.dispatchEvent(new CustomEvent('canvasloaded', { bubbles: false }));
})();
