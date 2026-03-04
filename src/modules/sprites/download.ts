import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $download Sprite — File download utility
 * 
 * Creates a Blob URL and triggers a browser download via anchor click.
 * Synchronous — no reactive container needed (instant side-effect).
 * 
 * Usage:
 *   $download(filename, content)              — download as text file
 *   $download(filename, content, mimeType)    — download with custom MIME type
 */

export default function downloadFactory(_runtime: RuntimeContext) {
  return {
    $download: function downloadSprite(
      filename: string,
      content: string | Blob | ArrayBuffer,
      mimeType: string = 'text/plain'
    ): void {
      if (typeof document === 'undefined') return;

      let blob: Blob;
      if (content instanceof Blob) {
        blob = content;
      } else if (content instanceof ArrayBuffer) {
        blob = new Blob([content], { type: mimeType });
      } else {
        blob = new Blob([content], { type: mimeType });
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();

      // Cleanup: rAF guarantees the click has been dispatched and the download
      // dialog initiated before we revoke the URL.
      requestAnimationFrame(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });
    }
  };
}
