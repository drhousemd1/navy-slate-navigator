import { logger } from '@/lib/logger';

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

/** Only built assets have a complete manifest. A Vite dev refresh is not an
 * offline-shell test, and must not install an unbuilt worker. */
export function register(config?: Config) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const start = () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
      registration.onupdatefound = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.onstatechange = () => {
          if (worker.state !== 'installed') return;
          if (navigator.serviceWorker.controller) {
            logger.info('An app update is ready. It will activate after all current app tabs close.');
            config?.onUpdate?.(registration);
          } else {
            logger.info('The built app shell was cached. Offline data availability still depends on this account’s saved state.');
            config?.onSuccess?.(registration);
          }
        };
      };
    }).catch(() => logger.warn('The app shell could not be prepared for offline loading.'));
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

export function unregister() {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration('/').then(registration => registration?.unregister());
}
