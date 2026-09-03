import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBestUserLocation } from '../geolocation';

type PositionCallback = (position: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}) => void;

type ErrorCallback = (error: {
  code: number;
  PERMISSION_DENIED?: number;
  POSITION_UNAVAILABLE?: number;
  TIMEOUT?: number;
  message: string;
}) => void;

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

describe('Geolocation Service', () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentPosition = vi.fn();
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
      configurable: true,
      writable: true,
    });
  });

  it('handles unsupported browser environment', () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();

    getBestUserLocation(onSuccess, onError);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNSUPPORTED' })
    );
  });

  it('acquires fast location and triggers background GPS refinement', () => {
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback, _error: ErrorCallback, options?: GeolocationOptions) => {
        if (options?.enableHighAccuracy === false) {
          success({
            coords: {
              latitude: 23.0225,
              longitude: 72.5714,
              accuracy: 65,
            },
          });
        } else {
          success({
            coords: {
              latitude: 23.02251,
              longitude: 72.57141,
              accuracy: 10,
            },
          });
        }
      }
    );

    const onSuccess = vi.fn();
    const onError = vi.fn();

    getBestUserLocation(onSuccess, onError);

    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ latitude: 23.0225, isHighAccuracy: false })
    );
    expect(onSuccess).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ latitude: 23.02251, isHighAccuracy: true })
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports PERMISSION_DENIED immediately if permission is denied', () => {
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: ErrorCallback) => {
        error({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
          message: 'User denied geolocation',
        });
      }
    );

    const onSuccess = vi.fn();
    const onError = vi.fn();

    getBestUserLocation(onSuccess, onError);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PERMISSION_DENIED' })
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('reports POSITION_UNAVAILABLE when device location is off', () => {
    let callCount = 0;
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: ErrorCallback, options?: GeolocationOptions) => {
        callCount++;
        if (options?.enableHighAccuracy === false) {
          // Fast fix failed (e.g. timeout / no network)
          error({
            code: 3,
            PERMISSION_DENIED: 1,
            message: 'Fast network fix timed out',
          });
        } else {
          // GPS failed with POSITION_UNAVAILABLE
          error({
            code: 2, // POSITION_UNAVAILABLE
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Location provider should be enabled',
          });
        }
      }
    );

    const onSuccess = vi.fn();
    const onError = vi.fn();

    getBestUserLocation(onSuccess, onError);

    expect(callCount).toBe(2);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'POSITION_UNAVAILABLE' })
    );
  });
});
