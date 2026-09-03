import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getCommuteSettings, 
  saveCommuteSettings, 
  clearCommuteSettings, 
  markCommuteCardShown, 
  shouldShowCommuteCard,
  getISTDateString
} from '../commuteStorage';

describe('Daily Commute Storage & Trigger Rules', () => {
  const day1 = new Date(2025, 5, 4, 8, 30, 0); // Day 1 morning 8:30 AM
  const day1Evening = new Date(2025, 5, 4, 18, 0, 0); // Day 1 evening 6:00 PM
  const day2 = new Date(2025, 5, 5, 8, 30, 0); // Day 2 morning 8:30 AM

  let storageMock: Record<string, string> = {};

  beforeEach(() => {
    storageMock = {};
    globalThis.localStorage = {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => { storageMock[key] = value; },
      removeItem: (key: string) => { delete storageMock[key]; },
      clear: () => { storageMock = {}; },
      length: 0,
      key: () => null,
    } as Storage;
  });

  it('returns false if no commute settings exist', () => {
    expect(shouldShowCommuteCard('homeToWork', day1)).toBe(false);
    expect(shouldShowCommuteCard('workToHome', day1)).toBe(false);
  });

  it('returns true for both directions initially when commute settings are saved', () => {
    saveCommuteSettings({
      homeStation: 'thaltej',
      workStation: 'gift_city'
    });

    expect(shouldShowCommuteCard('homeToWork', day1)).toBe(true);
    expect(shouldShowCommuteCard('workToHome', day1)).toBe(true);
  });

  it('shows card once a day for going (homeToWork) and blocks subsequent triggers on same day', () => {
    saveCommuteSettings({
      homeStation: 'thaltej',
      workStation: 'gift_city'
    });

    // Initial check: should show going card
    expect(shouldShowCommuteCard('homeToWork', day1)).toBe(true);

    // Card pops up and gets marked as shown
    markCommuteCardShown('homeToWork', day1);

    // Later that same morning / day: should NOT show going card again
    expect(shouldShowCommuteCard('homeToWork', day1)).toBe(false);
    expect(shouldShowCommuteCard('homeToWork', day1Evening)).toBe(false);

    // But coming back card (workToHome) has NOT been shown yet today, so it should still be allowed!
    expect(shouldShowCommuteCard('workToHome', day1Evening)).toBe(true);
  });

  it('shows card once a day for coming back (workToHome) and blocks subsequent triggers on same day', () => {
    saveCommuteSettings({
      homeStation: 'thaltej',
      workStation: 'gift_city'
    });

    // Mark going as shown in morning
    markCommuteCardShown('homeToWork', day1);

    // Evening: coming back card is shown
    expect(shouldShowCommuteCard('workToHome', day1Evening)).toBe(true);
    markCommuteCardShown('workToHome', day1Evening);

    // Now both directions have been shown once today
    expect(shouldShowCommuteCard('homeToWork', day1Evening)).toBe(false);
    expect(shouldShowCommuteCard('workToHome', day1Evening)).toBe(false);
  });

  it('refreshes automatically the next day for both going and coming back', () => {
    saveCommuteSettings({
      homeStation: 'thaltej',
      workStation: 'gift_city'
    });

    // Day 1: both cards shown and consumed
    markCommuteCardShown('homeToWork', day1);
    markCommuteCardShown('workToHome', day1Evening);

    expect(shouldShowCommuteCard('homeToWork', day1)).toBe(false);
    expect(shouldShowCommuteCard('workToHome', day1)).toBe(false);

    // Day 2 arrives (next day): both should automatically show again!
    expect(shouldShowCommuteCard('homeToWork', day2)).toBe(true);
    expect(shouldShowCommuteCard('workToHome', day2)).toBe(true);
  });
});
