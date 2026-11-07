// Replaced with the exact Vite output manifest during a production build.
// The source worker deliberately has no installable offline shell.
const BUILD = /* OBEDIENCE_SHELL_MANIFEST */ { version: 'unbuilt', assets: [] };
const CACHE_PREFIX = 'obedience-shell-';
const CACHE_NAME = CACHE_PREFIX + BUILD.version;
const assetPaths = new Set(BUILD.assets);
const privatePath = path => /^\/(?:auth|forgot-password|reset-password|admin)(?:\/|$)/.test(path) ||
  /^\/(?:api|rest|auth|storage|functions|realtime)(?:\/|$)/.test(path);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!BUILD.assets.includes('/index.html')) throw new Error('A built shell manifest is required');
    const cache = await caches.open(CACHE_NAME);
    try {
      for (const path of BUILD.assets) {
        const response = await fetch(new Request(path, { cache: 'reload', credentials: 'omit' }));
        if (!response.ok || response.type === 'opaque' || response.headers.has('set-cookie') ||
            /(?:private|no-store)/i.test(response.headers.get('cache-control') || '')) throw new Error('Shell asset was not cacheable');
        await cache.put(path, response);
      }
    } catch (error) { await caches.delete(CACHE_NAME); throw error; }
  })());
  // No skipWaiting: an update cannot replace the code under an existing tab.
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => (name.startsWith(CACHE_PREFIX) || name === 'navy-slate-navigator-v1') && name !== CACHE_NAME)
    .map(name => caches.delete(name)))));
  // No clients.claim: a first visit becomes controlled on its next navigation.
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Network-only means no respondWith at all, including on failure. Never turn
  // an API/Auth error, private request or POST into a successful HTML response.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.headers.has('authorization') || request.headers.has('apikey') || privatePath(url.pathname) ||
      url.searchParams.has('code') || url.searchParams.has('token') || url.searchParams.has('token_hash') ||
      url.searchParams.has('access_token') || url.searchParams.has('refresh_token')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await (await caches.open(CACHE_NAME)).match('/index.html');
      return cached || Response.error();
    }));
    return;
  }
  if (!assetPaths.has(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE_NAME)).match(url.pathname);
    return cached || fetch(request);
  })());
});

// Private previews only. Payload encryption is handled by the browser before
// the push event; source content and caller-provided links are never displayed.
const notificationRoutes = new Set(['/', '/messages', '/wellbeing', '/tasks', '/rules', '/punishments', '/rewards', '/notifications']);
const notificationBodies = new Set(['You have a new message.', 'It is time for your wellbeing check-in.', 'Your activity has an update.', 'This is your requested device notification test.']);
const notificationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { /* Generic visible fallback. */ }
  const valid = payload?.version === 1 && notificationId.test(payload.notificationId || '') &&
    notificationBodies.has(payload.body) && notificationRoutes.has(payload.url);
  event.waitUntil(self.registration.showNotification('Navy Slate Navigator', {
    body: valid ? payload.body : 'Your activity has an update.',
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: valid ? `notification:${payload.notificationId}` : 'notification:generic',
    data: { url: valid ? payload.url : '/' },
    requireInteraction: false, silent: false,
    actions: [{ action: 'open', title: 'Open App' }, { action: 'close', title: 'Dismiss' }],
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  const route = notificationRoutes.has(event.notification.data?.url) ? event.notification.data.url : '/';
  const target = new URL(route, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      const current = new URL(client.url);
      if (current.origin !== self.location.origin || privatePath(current.pathname)) continue;
      if (current.href === target) return client.focus();
      if (typeof client.navigate === 'function') {
        try { const navigated = await client.navigate(target); if (navigated) return navigated.focus(); }
        catch { /* A closed window does not prevent opening the requested route. */ }
      }
    }
    return self.clients.openWindow?.(target);
  })());
});
