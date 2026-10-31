import { useState, useEffect } from 'react';
import { getISTDate } from '@/lib/utils';

interface ListenerEntry {
  callback: (time: Date) => void;
  intervalMs: number;
  lastNotified: number;
}

let globalTime = getISTDate();
let timerId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<ListenerEntry>();

function getMinInterval(): number {
  if (listeners.size === 0) return 15000;
  let min = 15000;
  listeners.forEach(l => {
    if (l.intervalMs < min) min = l.intervalMs;
  });
  return min;
}

function restartTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (listeners.size === 0) return;

  const minInterval = getMinInterval();
  timerId = setInterval(() => {
    const now = Date.now();
    globalTime = getISTDate();
    listeners.forEach(entry => {
      if (now - entry.lastNotified >= entry.intervalMs - 50) {
        entry.lastNotified = now;
        entry.callback(globalTime);
      }
    });
  }, minInterval);
}

/**
 * Synchronized clock hook in Indian Standard Time (IST).
 * Defaults to 15s (15000ms) interval to prevent excessive top-level re-renders.
 * Pass 1000ms only inside active live tracking views.
 */
export function useCurrentTime(intervalMs = 15000): Date {
  const [time, setTime] = useState<Date>(() => globalTime);

  useEffect(() => {
    setTime(globalTime);
    const entry: ListenerEntry = {
      callback: setTime,
      intervalMs,
      lastNotified: Date.now(),
    };
    listeners.add(entry);
    restartTimer();

    return () => {
      listeners.delete(entry);
      restartTimer();
    };
  }, [intervalMs]);

  return time;
}
