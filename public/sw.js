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

// FIXED: Push event handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let notificationData = {
    title: 'Navy Slate Navigator',
    body: 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {},
    tag: 'default'
  };

  // Handle push data - could be encrypted or plain text
  if (event.data) {
    try {
      // First, try to get as text (this works for both encrypted and unencrypted)
      const dataText = event.data.text();
      console.log('[SW] Push data as text:', dataText);

      if (dataText) {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(dataText);
          console.log('[SW] Parsed push data:', jsonData);
          
          notificationData = {
            title: jsonData.title || notificationData.title,
            body: jsonData.body || notificationData.body,
            icon: jsonData.icon || notificationData.icon,
            badge: jsonData.badge || notificationData.badge,
            data: jsonData.data || notificationData.data,
            tag: jsonData.data?.type || 'default'
          };
        } catch (parseError) {
          console.log('[SW] Failed to parse as JSON, using text as body');
          notificationData.body = dataText;
        }
      }
    } catch (textError) {
      console.log('[SW] Failed to get data as text:', textError);
      // For encrypted data that can't be decrypted here, use defaults
      console.log('[SW] Using default notification data for encrypted push');
    }
  } else {
    console.log('[SW] No push data, using defaults');
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: false, // Changed from true to false
    silent: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  console.log('[SW] Showing notification:', notificationData.title, notificationOptions);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log('[SW] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW] Failed to show notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW] Focusing existing window');
            return client.focus();
          }
        }

        // If no window exists, open a new one
        if (self.clients.openWindow) {
          const targetUrl = event.notification.data?.url || '/';
          console.log('[SW] Opening new window:', targetUrl);
          return self.clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('[SW] Error handling notification click:', error);
      })
  );
});
