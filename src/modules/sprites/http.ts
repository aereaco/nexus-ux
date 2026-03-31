import { RuntimeContext } from '../../engine/composition.ts';
import { fetchSprite } from './fetch.ts';

function createBodyRequest(
  method: string,
  fetcher: ReturnType<typeof fetchSprite>
) {
  return (url: string, body?: unknown, options: RequestInit = {}) => {
    const opts: RequestInit = { ...options, method };
    const headers = new Headers(opts.headers);

    if (body && typeof body === 'object') {
      opts.body = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    } else if (body) {
      opts.body = String(body);
    }

    opts.headers = headers;
    return fetcher(url, opts);
  };
}

export function getSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, options: RequestInit = {}) => fetcher(url, { ...options, method: 'GET' });
}

export function postSprite(runtime: RuntimeContext) {
  return createBodyRequest('POST', fetchSprite(runtime));
}

export function putSprite(runtime: RuntimeContext) {
  return createBodyRequest('PUT', fetchSprite(runtime));
}

export function patchSprite(runtime: RuntimeContext) {
  return createBodyRequest('PATCH', fetchSprite(runtime));
}

export function deleteSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, options: RequestInit = {}) => fetcher(url, { ...options, method: 'DELETE' });
}

export default function(runtime: RuntimeContext) {
  return {
    $get: getSprite(runtime),
    $post: postSprite(runtime),
    $put: putSprite(runtime),
    $patch: patchSprite(runtime),
    $delete: deleteSprite(runtime)
  };
}
