import { RuntimeContext } from '../engine/composition.ts';
import { fetchSprite } from './fetch.ts';

// We implement them as factories using the base $fetch logic
// But we need to reuse the same instance/logic.

export function getSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, options: RequestInit = {}) => fetcher(url, { ...options, method: 'GET' });
}

export function postSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, body?: unknown, options: RequestInit = {}) => {
    const opts: RequestInit = { ...options, method: 'POST' };
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

export function putSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, body?: unknown, options: RequestInit = {}) => {
    const opts: RequestInit = { ...options, method: 'PUT' };
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

export function patchSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, body?: unknown, options: RequestInit = {}) => {
    const opts: RequestInit = { ...options, method: 'PATCH' };
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

export function deleteSprite(runtime: RuntimeContext) {
  const fetcher = fetchSprite(runtime);
  return (url: string, options: RequestInit = {}) => fetcher(url, { ...options, method: 'DELETE' });
}
