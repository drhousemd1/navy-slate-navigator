// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const events: Record<string, (event: unknown) => void> = {};
  const cached = new Map<string, Response>();
  const cache = { put: vi.fn(async (key: string, response: Response) => { cached.set(key, response); }), match: vi.fn(async (key: string) => cached.get(key)), };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['navy-slate-navigator-v1', 'obedience-shell-old', 'other-app']), delete: vi.fn().mockResolvedValue(true) };
  const fetch = vi.fn().mockImplementation(async () => new Response('built', { status: 200 }));
  const self = { location: { origin: 'https://app.test' }, addEventListener: (type: string, cb: (event: unknown) => void) => { events[type] = cb; }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } };
  const template = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8').replace(
    "/* OBEDIENCE_SHELL_MANIFEST */ { version: 'unbuilt', assets: [] }", JSON.stringify({ version: 'test', assets: ['/index.html', '/assets/app.js', '/assets/app.css'] }));
  class RelativeRequest extends Request { constructor(input: string, init?: RequestInit) { super(new URL(input, self.location.origin), init); } }
  runInNewContext(template, { self, caches, fetch, Request: RelativeRequest, Response, URL, Set, console });
  const load = async (type: string) => { let completion: Promise<unknown>; events[type]({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } }); return completion; };
  const request = (url: string, options: { method?: string; mode?: string; headers?: Record<string, string> } = {}) => {
    const response = vi.fn(); events.fetch({ request: { url: new URL(url, self.location.origin).href, method: options.method ?? 'GET', mode: options.mode ?? 'cors', headers: new Headers(options.headers) }, respondWith: response }); return response;
  };
  return { events, caches, cache, cached, self, fetch, load, request };
}
describe('built static shell service worker', () => {
  it('installs all versioned chunks and CSS without taking over an active tab', async () => {
    const w = worker(); await w.load('install');
    expect([...w.cached.keys()]).toEqual(['/index.html', '/assets/app.js', '/assets/app.css']);
    expect(w.fetch.mock.calls.every(([request]) => request.credentials === 'omit')).toBe(true);
    expect(w.self.skipWaiting).not.toHaveBeenCalled(); expect(w.self.clients.claim).not.toHaveBeenCalled();
  });
  it('rejects partial installation or private responses rather than claiming an offline shell', async () => {
    const w = worker(); w.fetch.mockResolvedValueOnce(new Response('private', { headers: { 'cache-control': 'private, no-store' } }));
    await expect(w.load('install')).rejects.toThrow('not cacheable');
    expect(w.caches.delete).toHaveBeenCalledWith('obedience-shell-test');
  });
  it('removes only this app’s retired caches when a worker activates normally', async () => {
    const w = worker(); await w.load('activate');
    expect(w.caches.delete.mock.calls).toEqual([['navy-slate-navigator-v1'], ['obedience-shell-old']]);
    expect(w.self.clients.claim).not.toHaveBeenCalled();
  });
  it.each([
    ['/rest/v1/rewards', {}], ['/auth/v1/token', {}], ['/storage/v1/object/private/file', {}],
    ['/functions/v1/notify', {}], ['/admin/rebuild', { mode: 'navigate' }], ['/reset-password?code=private', { mode: 'navigate' }],
    ['https://backend.test/rest/v1/rewards', {}], ['/anything', { method: 'POST' }],
    ['/assets/app.js', { headers: { Authorization: 'Bearer private' } }], ['/tasks?token_hash=private', { mode: 'navigate' }],
  ])('leaves %s entirely to the network and never falls back to HTML', (url, options) => {
    expect(worker().request(url, options)).not.toHaveBeenCalled();
  });
  it('uses the shell only for failed same-origin navigation, and uses exact cached static assets', async () => {
    const w = worker(); await w.load('install'); w.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const navigation = w.request('/tasks', { mode: 'navigate' });
    expect(await (await navigation.mock.calls[0][0]).text()).toBe('built');
    const script = w.request('/assets/app.js'); expect(await (await script.mock.calls[0][0]).text()).toBe('built');
    expect(w.request('/private-image.png')).not.toHaveBeenCalled();
    expect(w.events.sync).toBeUndefined();
  });
  it('preserves HTTP denial rather than replacing it with a cached successful page', async () => {
    const w = worker(); await w.load('install'); w.fetch.mockResolvedValue(new Response('Denied', { status: 403 }));
    const navigation = w.request('/tasks', { mode: 'navigate' });
    expect((await navigation.mock.calls[0][0]).status).toBe(403);
  });
});
