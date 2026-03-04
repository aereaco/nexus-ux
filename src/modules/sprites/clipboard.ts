import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $clipboard Sprite — Clipboard API wrapper
 * 
 * Returns reactive containers (no await needed in directives).
 * 
 * Usage:
 *   $clipboard.write(text)  — copies text to clipboard, returns { status, error }
 *   $clipboard.read()       — reads from clipboard, returns { data, status, error }
 */

export default function clipboardFactory(runtime: RuntimeContext) {
  return {
    $clipboard: {
      /**
       * Write text to the clipboard.
       * Returns a reactive { status, error } container.
       */
      write(text: string) {
        const op = runtime.reactive<{ status: string; error: string | null }>({
          status: 'pending',
          error: null
        });

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(text)
            .then(() => {
              op.status = 'done';
            })
            .catch(e => {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = 'error';
            });
        } else {
          // Fallback: document.execCommand('copy') for older browsers
          try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            op.status = 'done';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        }

        return op;
      },

      /**
       * Read text from the clipboard.
       * Returns a reactive { data, status, error } container.
       * Note: Requires user gesture and permission grant.
       */
      read() {
        const op = runtime.reactive<{ data: string | null; status: string; error: string | null }>({
          data: null,
          status: 'loading',
          error: null
        });

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.readText()
            .then(text => {
              op.data = text;
              op.status = 'ready';
            })
            .catch(e => {
              op.error = e instanceof Error ? e.message : String(e);
              op.status = 'error';
            });
        } else {
          op.error = 'Clipboard API not available';
          op.status = 'error';
        }

        return op;
      }
    }
  };
}
