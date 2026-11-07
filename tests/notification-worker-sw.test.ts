// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const showNotification = vi.fn(async () => {}), openWindow = vi.fn(async () => {}), matchAll = vi.fn(async () => []);
  const self = { location: { origin: 'https://app.example.invalid' }, registration: { showNotification },
    clients: { openWindow, matchAll }, addEventListener: (name: string, handler: (event: unknown) => void) => { listeners[name] = handler; } };
  vm.runInNewContext(source, { self, URL });
  const dispatch = async (name: string, event: Record<string, unknown>) => { let pending: Promise<unknown> | undefined;
    listeners[name]({ ...event, waitUntil: (promise: Promise<unknown>) => { pending = promise; } }); await pending; };
  return { dispatch, showNotification, openWindow, matchAll };
}
it('private preview handler ignores injected names, raw text and external links', async () => {
  const w = worker(); await w.dispatch('push', { data: { json: () => ({ title: 'private name', body: 'private content', url: 'https://evil.invalid' }) } });
  expect(w.showNotification).toHaveBeenCalledWith('Navy Slate Navigator', expect.objectContaining({ body: 'Your activity has an update.', data: { url: '/' } }));
});
it('same delivery retries use a stable notification tag', async () => {
  const w = worker(); const data = { json: () => ({ version: 1, notificationId: '10000000-0000-4000-8000-000000000001', body: 'You have a new message.', url: '/messages' }) };
  await w.dispatch('push', { data }); await w.dispatch('push', { data });
  expect(w.showNotification.mock.calls[0]).toEqual(w.showNotification.mock.calls[1]);
});
it('click navigates an existing app window before focusing it', async () => {
  const w = worker(), focus = vi.fn(async () => {}), navigate = vi.fn(async () => ({ focus }));
  w.matchAll.mockResolvedValue([{ url: 'https://app.example.invalid/tasks', navigate, focus }] as never);
  await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: '/messages' } } });
  expect(navigate).toHaveBeenCalledWith('https://app.example.invalid/messages'); expect(focus).toHaveBeenCalledOnce(); expect(w.openWindow).not.toHaveBeenCalled();
});
it('external click URLs fall back to home; similarly named origins and auth tabs are not commandeered', async () => {
  const w = worker(), focus = vi.fn();
  w.matchAll.mockResolvedValue([{ url: 'https://app.example.invalid.attacker.invalid/', focus }, { url: 'https://app.example.invalid/auth', focus }] as never);
  await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: 'https://evil.invalid/' } } });
  expect(focus).not.toHaveBeenCalled(); expect(w.openWindow).toHaveBeenCalledWith('https://app.example.invalid/');
});
it('dismiss does not open or focus an app', async () => {
  const w = worker(); await w.dispatch('notificationclick', { action: 'close', notification: { close: vi.fn() } });
  expect(w.matchAll).not.toHaveBeenCalled(); expect(w.openWindow).not.toHaveBeenCalled();
});

it('the fixed device-test preview opens only the notification settings route', async () => {
  const w = worker(); await w.dispatch('push', { data: { json: () => ({ version: 1,
    notificationId: '10000000-0000-4000-8000-000000000001', body: 'This is your requested device notification test.', url: '/notifications' }) } });
  expect(w.showNotification).toHaveBeenCalledWith('Navy Slate Navigator', expect.objectContaining({
    body: 'This is your requested device notification test.', data: { url: '/notifications' },
  }));
  await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: '/notifications' } } });
  expect(w.openWindow).toHaveBeenCalledWith('https://app.example.invalid/notifications');
});
