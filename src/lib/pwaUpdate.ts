import { registerSW } from 'virtual:pwa-register';

export type UpdateStatus = 'updated' | 'already-latest' | 'offline' | 'error';

export interface CheckUpdateResult {
  status: UpdateStatus;
  message?: string;
}

type UpdateCallback = (hasUpdate: boolean) => void;

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let isUpdateAvailableState = false;
let isInitialized = false;
const listeners = new Set<UpdateCallback>();

function notifyListeners(hasUpdate: boolean) {
  isUpdateAvailableState = hasUpdate;
  listeners.forEach((callback) => {
    try {
      callback(hasUpdate);
    } catch (err) {
      console.error('Error in PWA update listener:', err);
    }
  });
}

/**
 * Subscribe to update state changes.
 * Calls callback immediately with current state.
 */
export function subscribeToUpdate(callback: UpdateCallback): () => void {
  listeners.add(callback);
  callback(isUpdateAvailableState);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Returns whether a service worker update is currently available/installed.
 */
export function isUpdateAvailable(): boolean {
  return isUpdateAvailableState;
}

/**
 * Immediately applies the waiting update and reloads the application.
 */
export function applyUpdate(targetRegistration?: ServiceWorkerRegistration | null): void {
  if (typeof window === 'undefined') return;

  const reloadWithCacheBust = () => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('ahm_pwa_reload_time');
      } catch {
        // Ignore storage errors
      }
    }
    window.location.reload();
  };

  const reg = targetRegistration || swRegistration;

  if (updateSWFn) {
    updateSWFn(true).catch(() => {
      reloadWithCacheBust();
    });
  } else if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    reloadWithCacheBust();
  } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((activeReg) => {
        if (activeReg?.waiting) {
          activeReg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .finally(() => {
        reloadWithCacheBust();
      });
  } else {
    reloadWithCacheBust();
  }
}

/**
 * Manually forces a check for service worker updates.
 * Used by the "Check for Updates" button in SideMenu.
 */
export async function checkForUpdates(): Promise<CheckUpdateResult> {
  if (typeof window === 'undefined') {
    return { status: 'already-latest', message: 'Window not defined' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'offline', message: 'Currently offline' };
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { status: 'already-latest', message: 'Service Worker not supported' };
  }

  try {
    const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
    if (!reg) {
      return { status: 'already-latest', message: 'No service worker registered' };
    }

    // If an update is already downloaded and waiting, activate it immediately
    if (reg.waiting) {
      notifyListeners(true);
      applyUpdate(reg);
      return { status: 'updated', message: 'Update ready! Applying...' };
    }

    // Force browser to check server for byte differences in sw.js
    await reg.update();

    if (reg.waiting || reg.installing) {
      notifyListeners(true);
      if (reg.waiting) {
        applyUpdate(reg);
      }
      return { status: 'updated', message: 'New version found! Installing...' };
    }

    return { status: 'already-latest', message: 'Up to date' };
  } catch (err) {
    console.error('Failed to check for updates:', err);
    return { status: 'error', message: 'Update check failed' };
  }
}

/**
 * Initializes PWA update lifecycle listeners, periodic background checks,
 * and visibilitychange listeners.
 */
export function initPwaUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (isInitialized) return;
  isInitialized = true;

  try {
    updateSWFn = registerSW({
      immediate: true,
      onRegistered(registration) {
        if (!registration) return;
        swRegistration = registration;

        // If an update is already waiting, flag it immediately
        if (registration.waiting) {
          notifyListeners(true);
        }

        // Listen for new worker installation
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              // If there's an existing active controller, this is an update
              if (navigator.serviceWorker.controller) {
                notifyListeners(true);
              }
            }
          });
        });

        // 1. Initial check for updates immediately on load
        registration.update().catch(() => {});

        // 2. Periodic background update check every 15 minutes
        setInterval(() => {
          if (navigator.onLine && swRegistration) {
            swRegistration.update().catch(() => {});
          }
        }, 15 * 60 * 1000);

        // 3. Check for updates whenever user returns to the app / tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && navigator.onLine && swRegistration) {
            swRegistration.update().catch(() => {});
          }
        });

        // 4. Check on window focus
        window.addEventListener('focus', () => {
          if (navigator.onLine && swRegistration) {
            swRegistration.update().catch(() => {});
          }
        });
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:', error);
      },
    });

    // Guard against reload on first install (when page initially had no controller)
    const hadInitialController = Boolean(navigator.serviceWorker.controller);
    let hasReloaded = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // If there was no controller when the page loaded, this is just the initial SW claiming clients.
      // Do NOT reload the page on first install!
      if (!hadInitialController) return;
      if (hasReloaded) return;

      const now = Date.now();
      if (typeof sessionStorage !== 'undefined') {
        try {
          const lastReload = Number(sessionStorage.getItem('ahm_pwa_reload_time') || '0');
          if (now - lastReload < 6000) {
            return;
          }
          sessionStorage.setItem('ahm_pwa_reload_time', String(now));
        } catch {
          // Ignore storage errors in restricted contexts
        }
      }

      hasReloaded = true;
      window.location.reload();
    });
  } catch (err) {
    console.error('Failed to initialize PWA updater:', err);
  }
}
