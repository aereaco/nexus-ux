import { UtilityModule } from './modules.ts';
import { RuntimeContext } from './composition.ts';
import { reportError } from './errors.ts';
import { CUSTOM_EVENT_PREFIX } from './consts.ts';

export interface FetchOptions extends RequestInit {
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  targetSelector?: string;
  updateSignals?: boolean;
}

export interface FetchUtilities {
  request(url: string, options: FetchOptions, el: HTMLElement): Promise<unknown>;
}

export const fetchUtilities: FetchUtilities = {
  request: async (url: string, options: FetchOptions, el: HTMLElement): Promise<unknown> => {
    let controller: AbortController | undefined;
    try {
      controller = new AbortController();
      const signal = controller.signal;

      const fetchOptions: RequestInit = {
        ...options,
        signal,
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data: unknown;
      switch (options.responseType) {
        case 'json':
          data = await response.json();
          break;
        case 'blob':
          data = await response.blob();
          break;
        case 'arrayBuffer':
          data = await response.arrayBuffer();
          break;
        case 'formData':
          data = await response.formData();
          break;
        case 'text':
        default:
          data = await response.text();
          break;
      }

      el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-success`, {
        bubbles: true,
        cancelable: false,
        detail: { url, options, data, response },
      }));

      return data;

    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        if (document.documentElement.hasAttribute('data-debug')) {
          console.warn(`Fetch request to ${url} was aborted.`);
        }
      } else {
        reportError(new Error(`Failed to fetch from ${url}: ${e instanceof Error ? e.message : String(e)}`), el);
      }
      el.dispatchEvent(new CustomEvent(`${CUSTOM_EVENT_PREFIX}fetch-error`, {
        bubbles: true,
        cancelable: false,
        detail: { url, options, error: e },
      }));
      throw e;
    }
  },
};

export const fetchModule: UtilityModule = {
  name: 'fetch',
  install: (context: RuntimeContext) => {
    context.fetch = fetchUtilities;
  },
};
