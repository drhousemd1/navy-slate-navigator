
// Centralised service-worker registration with auto-update.
// 1. Registers SW in every environment (dev & prod).
// 2. The first time a brand-new build finishes installing, the page
//    reloads itself so the user instantly sees the new version.
import { logger } from '@/lib/logger';

export function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        // Listen when a new worker is found
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // When it has finished installing AND there's already a live controller,
            // it means this is an update, not the first install.
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Tell the new worker to take control immediately
              newWorker.postMessage({ type: "SKIP_WAITING" });
              // Reload once so the page uses the fresh files
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => logger.error("SW registration failed:", err));

    // Optional: when the waiting worker becomes active, reload again (safety net)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
}
