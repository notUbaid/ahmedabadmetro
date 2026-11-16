import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isReturningUser, APOLOGY_STORAGE_KEY } from '../OutageApologyModal';

describe('OutageApologyModal & isReturningUser logic', () => {
  let storageMock: Record<string, string> = {};
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    storageMock = {};
    const mockStorage = {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        storageMock = {};
      },
      length: 0,
      key: () => null,
    } as Storage;

    globalThis.localStorage = mockStorage;
    globalThis.window = { localStorage: mockStorage } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
    globalThis.window = originalWindow;
  });

  it('identifies new user when localStorage is empty', () => {
    expect(isReturningUser()).toBe(false);
  });

  it('identifies returning user when hasSeenWelcome is present', () => {
    globalThis.localStorage.setItem('hasSeenWelcome', 'true');
    expect(isReturningUser()).toBe(true);
  });

  it('identifies returning user when language preference is present', () => {
    globalThis.localStorage.setItem('ahmedabad-metro-language', 'gu');
    expect(isReturningUser()).toBe(true);
  });

  it('identifies returning user when commute_settings is present', () => {
    globalThis.localStorage.setItem('commute_settings', JSON.stringify({ origin: 'paldi' }));
    expect(isReturningUser()).toBe(true);
  });

  it('identifies returning user when recentSearches is present', () => {
    globalThis.localStorage.setItem('recentSearches', JSON.stringify(['thaltej']));
    expect(isReturningUser()).toBe(true);
  });

  it('identifies returning user when ahm_visited_before flag is present', () => {
    globalThis.localStorage.setItem('ahm_visited_before', 'true');
    expect(isReturningUser()).toBe(true);
  });

  it('storage key is defined properly', () => {
    expect(APOLOGY_STORAGE_KEY).toBe('ahm_outage_apology_dismissed_nov2026');
  });
});
