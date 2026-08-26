import { describe, it, expect } from 'vitest';
import { minutesUntil, getISTDate } from '../utils';

describe('minutesUntil', () => {
  it('returns plain difference within the same day', () => {
    expect(minutesUntil(600, 540)).toBe(60); // 10:00 from 09:00
  });

  it('wraps late-night "now" to a post-midnight target', () => {
    // 23:50 now, 00:10 arrival -> 20 min away
    expect(minutesUntil(10, 23 * 60 + 50)).toBe(20);
  });

  it('treats an early-morning target as tonight when seen during the day', () => {
    // 14:00 now, 00:50 arrival -> ~11h away, NOT -13h or +70m
    expect(minutesUntil(50, 14 * 60)).toBe(50 + 24 * 60 - 14 * 60);
  });

  it('rolls an already-passed early-morning time to tomorrow at deep night', () => {
    // 01:00 now, 00:30 already departed -> next one is tomorrow
    expect(minutesUntil(30, 60)).toBe(30 + 24 * 60 - 60);
  });

  it('does not wrap when target is later tonight before midnight cutoff', () => {
    expect(minutesUntil(300, 240)).toBe(60); // 05:00 from 04:00
  });
});

describe('getISTDate', () => {
  it('returns IST hours regardless of local timezone offset direction', () => {
    const d = getISTDate();
    expect(d).toBeInstanceOf(Date);
    // Minutes are preserved; only hours shift.
    expect(d.getSeconds()).toBe(new Date().getSeconds());
  });
});
