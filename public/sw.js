const CACHE_NAME = 'navy-slate-navigator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  console.log('Service Worker activated and ready');
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, could return a fallback page
        return caches.match('/index.html');
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  console.log('Push data available:', !!event.data);
  
  let notificationData = {
    title: 'Navy Slate Navigator',
    body: 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {}
  };
  
  // Handle encrypted push data
  if (event.data) {
    try {
      // Try to parse as JSON first (for encrypted payloads)
      const jsonData = event.data.json();
      console.log('Parsed push data:', jsonData);
      notificationData = {
        title: jsonData.title || notificationData.title,
        body: jsonData.body || notificationData.body,
        icon: jsonData.icon || notificationData.icon,
        badge: jsonData.badge || notificationData.badge,
        data: jsonData.data || notificationData.data
      };
    } catch (jsonError) {
      console.log('Failed to parse as JSON, trying text:', jsonError);
      try {
        // Try to parse as text
        const textData = event.data.text();
        console.log('Push text data:', textData);
        if (textData) {
          try {
            const parsedText = JSON.parse(textData);
            notificationData = {
              title: parsedText.title || notificationData.title,
              body: parsedText.body || notificationData.body,
              icon: parsedText.icon || notificationData.icon,
              badge: parsedText.badge || notificationData.badge,
              data: parsedText.data || notificationData.data
            };
          } catch (parseError) {
            console.log('Failed to parse text as JSON, using as body');
            notificationData.body = textData;
          }
        }
      } catch (textError) {
        console.error('Failed to parse push data as text:', textError);
        // Use default notification data
      }
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.data?.type || 'default',
    data: notificationData.data,
    requireInteraction: true,
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

  console.log('Showing notification:', notificationData.title, notificationOptions);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window exists, open a new one
        if (clients.openWindow) {
          const targetUrl = event.notification.data?.url || '/';
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Background sync event (if needed for offline support)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      Promise.resolve()
    );
  }
});