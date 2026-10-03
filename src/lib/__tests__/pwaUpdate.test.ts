import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  subscribeToUpdate,
  isUpdateAvailable,
  checkForUpdates,
  applyUpdate,
} from '../pwaUpdate';

describe('pwaUpdate module', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  let mockReload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockReload = vi.fn();

    // Define window on globalThis for node test environment
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { reload: mockReload },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    if (originalWindow !== undefined) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    } else {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });

  it('subscribes to updates and returns initial false state', () => {
    let updateState: boolean | null = null;
    const unsubscribe = subscribeToUpdate((hasUpdate) => {
      updateState = hasUpdate;
    });

    expect(updateState).toBe(false);
    expect(isUpdateAvailable()).toBe(false);

    unsubscribe();
  });

  it('handles offline state during checkForUpdates without throwing', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true,
    });

    const res = await checkForUpdates();
    expect(res.status).toBe('offline');
  });

  it('handles missing service worker support safely', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    const res = await checkForUpdates();
    expect(res.status).toBe('already-latest');
  });

  it('checkForUpdates detects already waiting worker and triggers update', async () => {
    const postMessageMock = vi.fn();

    const mockRegistration = {
      waiting: {
        postMessage: postMessageMock,
      },
      update: vi.fn().mockResolvedValue(undefined),
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        onLine: true,
        serviceWorker: {
          getRegistration: vi.fn().mockResolvedValue(mockRegistration),
          addEventListener: vi.fn(),
        },
      },
      configurable: true,
      writable: true,
    });

    const res = await checkForUpdates();
    expect(res.status).toBe('updated');
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(mockReload).toHaveBeenCalled();
  });

  it('checkForUpdates returns already-latest when no waiting or installing worker exists', async () => {
    const mockRegistration = {
      waiting: null,
      installing: null,
      update: vi.fn().mockResolvedValue(undefined),
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        onLine: true,
        serviceWorker: {
          getRegistration: vi.fn().mockResolvedValue(mockRegistration),
          addEventListener: vi.fn(),
        },
      },
      configurable: true,
      writable: true,
    });

    const res = await checkForUpdates();
    expect(res.status).toBe('already-latest');
    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it('applyUpdate reloads the page', () => {
    applyUpdate();
    expect(mockReload).toHaveBeenCalled();
  });
});
