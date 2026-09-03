/**
 * Resilient, multi-stage geolocation service for web & mobile PWA/TWA.
 * 
 * Strategy:
 * 1. Fast path: Acquire cached / network-based fix (enableHighAccuracy: false)
 *    within 200-500ms so map and nearest station update immediately.
 * 2. Precision path: In parallel/background, refine coordinates via GPS
 *    (enableHighAccuracy: true). If GPS is unavailable (e.g. indoors/subway),
 *    the user already has their location without any error banners.
 * 3. Graceful error diagnosis: Distinguish between PERMISSION_DENIED,
 *    POSITION_UNAVAILABLE (device GPS toggle off), and TIMEOUT with actionable advice.
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

  const fastTimeout = options.timeout ?? 12000; // 12 seconds gives ample time for permission dialog
  const fastMaxAge = options.maximumAge ?? 300000; // Accept fixes up to 5 min old for instant responsiveness

  // Stage 1: Fast network / cellular / Wi-Fi fix
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (isCancelled) return;
      hasAcquiredLocation = true;
      onSuccess({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        isHighAccuracy: false,
      });

      // Stage 2: Background GPS refinement
      navigator.geolocation.getCurrentPosition(
        (highPos) => {
          if (isCancelled) return;
          // Refine position if accuracy is better or reasonable
          onSuccess({
            latitude: highPos.coords.latitude,
            longitude: highPos.coords.longitude,
            accuracy: highPos.coords.accuracy,
            isHighAccuracy: true,
          });
        },
        (highErr) => {
          // Silent fallback: user already has their network location
          console.debug('Background GPS refinement unavailable:', highErr.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    },
    (fastErr) => {
      if (isCancelled) return;

      // If user denied permission explicitly, stop immediately and report PERMISSION_DENIED
      if (fastErr.code === fastErr.PERMISSION_DENIED) {
        onError({
          code: 'PERMISSION_DENIED',
          message: 'Location access denied. Please grant location permissions in your app/browser settings.'
        });
        return;
      }

      // If network fix failed for other reasons (e.g. timeout or no network), try GPS directly
      navigator.geolocation.getCurrentPosition(
        (gpsPos) => {
          if (isCancelled) return;
          hasAcquiredLocation = true;
          onSuccess({
            latitude: gpsPos.coords.latitude,
            longitude: gpsPos.coords.longitude,
            accuracy: gpsPos.coords.accuracy,
            isHighAccuracy: true,
          });
        },
        (gpsErr) => {
          if (isCancelled || hasAcquiredLocation) return;

          if (gpsErr.code === gpsErr.PERMISSION_DENIED) {
            onError({
              code: 'PERMISSION_DENIED',
              message: 'Location access denied. Please grant location permissions in your app/browser settings.'
            });
          } else if (gpsErr.code === gpsErr.POSITION_UNAVAILABLE) {
            onError({
              code: 'POSITION_UNAVAILABLE',
              message: 'Location unavailable. Please make sure your device GPS/Location toggle is turned ON in Quick Settings.'
            });
          } else if (gpsErr.code === gpsErr.TIMEOUT) {
            onError({
              code: 'TIMEOUT',
              message: 'Location request timed out. Please check your signal and try again.'
            });
          } else {
            onError({
              code: 'UNKNOWN',
              message: gpsErr.message || 'Unable to acquire your location. Please try again.'
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    },
    {
      enableHighAccuracy: false,
      timeout: fastTimeout,
      maximumAge: fastMaxAge,
    }
  );

  return () => {
    isCancelled = true;
  };
};
