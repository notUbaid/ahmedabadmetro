/**
 * Resilient, multi-stage geolocation service for web & mobile PWA/TWA.
 * 
 * Strategy:
 * 1. Dual-Path Immediate & Stream Architecture:
 *    - Path A (Instant Coarse/Cached): Uses `getCurrentPosition` with `maximumAge: 300000` (5 min cache)
 *      to deliver any cached Android location (from Swiggy, Google Maps, WhatsApp, etc.) in <50ms.
 *    - Path B (High-Accuracy Stream): Uses `watchPosition` with `enableHighAccuracy: true`. On Android,
 *      watchPosition wakes up the FusedLocationProvider hardware loop, eliminating the notorious one-shot
 *      cold-start GPS timeout on fresh installs.
 * 2. Progressive Accuracy Refinement:
 *    - First fix wins immediately to eliminate user perceived latency and dismiss spinners.
 *    - If the initial fix was coarse (>35m), the stream continues running in the background to refine
 *      to pin-point GPS accuracy, then cleanly unsubscribes.
 * 3. Human-Tolerant Safety Windows:
 *    - 25-30s master timeout to comfortably accommodate users reading and accepting Android runtime
 *      permission dialogs ("While using the app") without false-positive TIMEOUT errors.
 * 4. Precise Error Diagnosis:
 *    - Differentiates PERMISSION_DENIED (fails fast), POSITION_UNAVAILABLE (GPS toggle off in Android
 *      Quick Settings), and genuine TIMEOUT.
 */

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  isHighAccuracy: boolean;
}

export type GeolocationErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export const getBestUserLocation = (
  onSuccess: (coords: GeolocationCoords) => void,
  onError: (error: GeolocationError) => void,
  options: {
    timeout?: number;
    maximumAge?: number;
  } = {}
): (() => void) => {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav || !('geolocation' in nav) || !nav.geolocation) {
    onError({
      code: 'UNSUPPORTED',
      message: 'Geolocation is not supported on this device/browser.'
    });
    return () => {};
  }

  let hasAcquiredLocation = false;
  let isCancelled = false;
  let bestAccuracy = Infinity;
  let watchId: number | null = null;
  let masterTimer: ReturnType<typeof setTimeout> | null = null;

  const totalTimeout = options.timeout ?? 25000;
  const maxAge = options.maximumAge ?? 300000;

  const cleanup = () => {
    isCancelled = true;
    if (watchId !== null && typeof nav.geolocation.clearWatch === 'function') {
      try {
        nav.geolocation.clearWatch(watchId);
      } catch {
        // Ignore cleanup errors
      }
      watchId = null;
    }
    if (masterTimer !== null) {
      clearTimeout(masterTimer);
      masterTimer = null;
    }
  };

  // Master safety timer: only fires if zero location fixes were acquired
  masterTimer = setTimeout(() => {
    if (isCancelled || hasAcquiredLocation) return;
    cleanup();
    onError({
      code: 'TIMEOUT',
      message: 'Location request timed out. Please check your signal and try again.'
    });
  }, totalTimeout);

  const handlePosition = (
    pos: { coords: { latitude: number; longitude: number; accuracy: number } },
    isHighAccuracy: boolean
  ) => {
    if (isCancelled) return;

    const acc = pos.coords.accuracy ?? 100;

    // Only deliver if this is our first fix, or if it substantially refines accuracy
    if (!hasAcquiredLocation || acc < bestAccuracy * 0.85) {
      hasAcquiredLocation = true;
      bestAccuracy = Math.min(bestAccuracy, acc);

      onSuccess({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: acc,
        isHighAccuracy,
      });
    }

    // If we've achieved excellent GPS precision (<= 35m), stop listening to save battery
    if (acc <= 35) {
      cleanup();
    }
  };

  const handleTerminalError = (
    err: { code: number; message?: string; PERMISSION_DENIED?: number; POSITION_UNAVAILABLE?: number }
  ) => {
    if (isCancelled || hasAcquiredLocation) return;

    const permDeniedCode = err.PERMISSION_DENIED ?? 1;
    const posUnavailCode = err.POSITION_UNAVAILABLE ?? 2;

    if (err.code === permDeniedCode) {
      cleanup();
      onError({
        code: 'PERMISSION_DENIED',
        message: 'Location access denied. Please grant location permissions in your app/browser settings.'
      });
      return true;
    }

    if (err.code === posUnavailCode) {
      cleanup();
      onError({
        code: 'POSITION_UNAVAILABLE',
        message: 'Location unavailable. Please make sure your device GPS/Location toggle is turned ON in Quick Settings.'
      });
      return true;
    }

    return false;
  };

  // Path 1: Fast cached / network fix (getCurrentPosition with enableHighAccuracy: false)
  try {
    nav.geolocation.getCurrentPosition(
      (pos) => {
        handlePosition(pos, false);
      },
      (err) => {
        // If user denied permission explicitly, fail immediately
        if (handleTerminalError(err)) return;
        // For timeouts or network misses, let Path 2 continue
      },
      {
        enableHighAccuracy: false,
        timeout: Math.min(8000, totalTimeout),
        maximumAge: maxAge,
      }
    );
  } catch (e) {
    console.debug('Fast geolocation check unavailable:', e);
  }

  // Path 2: Precision GPS stream (watchPosition with enableHighAccuracy: true)
  if (typeof nav.geolocation.watchPosition === 'function') {
    try {
      const id = nav.geolocation.watchPosition(
        (pos) => {
          handlePosition(pos, true);
        },
        (err) => {
          handleTerminalError(err);
        },
        {
          enableHighAccuracy: true,
          timeout: totalTimeout,
          maximumAge: maxAge,
        }
      );
      if (isCancelled) {
        try {
          nav.geolocation.clearWatch(id);
        } catch {
          // Ignore
        }
      } else {
        watchId = id;
      }
    } catch (e) {
      console.debug('watchPosition unavailable, falling back to getCurrentPosition:', e);
    }
  } else {
    // Fallback environment (e.g. basic unit tests or environments without watchPosition)
    try {
      nav.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition(pos, true);
        },
        (err) => {
          if (!handleTerminalError(err)) {
            // If neither succeeded and masterTimer hasn't fired
            if (!hasAcquiredLocation) {
              cleanup();
              onError({
                code: 'TIMEOUT',
                message: 'Location request timed out. Please check your signal and try again.'
              });
            }
          }
        },
        {
          enableHighAccuracy: true,
          timeout: totalTimeout,
          maximumAge: maxAge,
        }
      );
    } catch (e) {
      console.debug('High-accuracy fallback error:', e);
    }
  }

  return cleanup;
};
