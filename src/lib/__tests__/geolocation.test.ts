import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  let mockWatchPosition: ReturnType<typeof vi.fn>;
  let mockClearWatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentPosition = vi.fn();
    mockWatchPosition = vi.fn();
    mockClearWatch = vi.fn();

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('acquires fast location and refines via watchPosition stream', () => {
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
        }
      }
    );

    mockWatchPosition.mockImplementation(
      (success: PositionCallback, _error: ErrorCallback) => {
        // High-accuracy GPS stream delivers refined fix
        success({
          coords: {
            latitude: 23.02251,
            longitude: 72.57141,
            accuracy: 10,
          },
        });
        return 42;
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
    expect(mockClearWatch).toHaveBeenCalledWith(42);
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
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: ErrorCallback) => {
        error({
          code: 2, // POSITION_UNAVAILABLE
          POSITION_UNAVAILABLE: 2,
          message: 'Location provider disabled',
        });
      }
    );

    const onSuccess = vi.fn();
    const onError = vi.fn();

    getBestUserLocation(onSuccess, onError);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'POSITION_UNAVAILABLE' })
    );
  });

  it('handles master timeout when all providers fail to return a location', () => {
    vi.useFakeTimers();

    mockGetCurrentPosition.mockImplementation(() => {
      // no response
    });
    mockWatchPosition.mockImplementation(() => 99);

    const onSuccess = vi.fn();
    const onError = vi.fn();

    getBestUserLocation(onSuccess, onError, { timeout: 5000 });

    vi.advanceTimersByTime(5100);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TIMEOUT' })
    );
    expect(mockClearWatch).toHaveBeenCalledWith(99);
  });

  it('allows manual cancellation and clears active watch', () => {
    mockWatchPosition.mockImplementation(() => 101);

    const onSuccess = vi.fn();
    const onError = vi.fn();

    const cancel = getBestUserLocation(onSuccess, onError);
    cancel();

    expect(mockClearWatch).toHaveBeenCalledWith(101);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
