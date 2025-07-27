const CACHE_NAME = 'navy-slate-navigator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating…');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  console.log('[SW] Service Worker activated and ready');
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        return caches.match('/index.html');
      })
  );
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

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(Promise.resolve());
  }
});

console.log('[SW] Service worker loaded successfully');