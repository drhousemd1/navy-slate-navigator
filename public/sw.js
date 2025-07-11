
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
  
  try {
    const data = event.data ? event.data.json() : {};
    console.log('Push data:', data);
    
    const title = data.title || 'Navy Slate Navigator';
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        notificationType: data.type || 'general',
        ...data.payload
      },
      requireInteraction: data.requireInteraction || false,
      silent: false,
      // Mobile specific optimizations
      tag: data.type || 'general', // Replace similar notifications
      renotify: true // Show notification even if similar exists
    };

    console.log('Showing notification:', title, options);
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('Notification shown successfully');
        })
        .catch((error) => {
          console.error('Failed to show notification:', error);
        })
    );
  } catch (error) {
    console.error('Error handling push event:', error);
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Navy Slate Navigator', {
        body: 'You have a new notification',
        icon: '/icons/icon-192.png',
        tag: 'fallback'
      })
    );
  }
});

// Notification click event - handle user clicking on notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  console.log('Target URL:', targetUrl);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('Found clients:', clientList.length);
        
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('Focusing existing client');
            client.focus();
            if (client.postMessage) {
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                data: event.notification.data
              });
            }
            return client.navigate(targetUrl);
          }
        }
        
        // If app is not open, open it
        if (clients.openWindow) {
          console.log('Opening new window');
          return clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('Error handling notification click:', error);
      })
  );
});

// Add debugging for push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  // Could trigger re-subscription logic here if needed
});
