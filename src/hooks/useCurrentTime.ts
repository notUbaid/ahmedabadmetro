import { useState, useEffect } from 'react';
import { getISTDate } from '@/lib/utils';

let globalTime = getISTDate();
let timerId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(time: Date) => void>();

function startTimerIfNeeded() {
  if (!timerId && listeners.size > 0) {
    timerId = setInterval(() => {
      globalTime = getISTDate();
      listeners.forEach(fn => fn(globalTime));
    }, 1000);
  }
}

function stopTimerIfNoListeners() {
  if (listeners.size === 0 && timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

/**
 * Global synchronized 1Hz clock hook in Indian Standard Time (IST).
 * Uses a single timer shared across all mounted components.
 */
export function useCurrentTime(): Date {
  const [time, setTime] = useState<Date>(() => globalTime);

  useEffect(() => {
    // Immediately sync with the latest global time on mount
    setTime(globalTime);
    listeners.add(setTime);
    startTimerIfNeeded();

    return () => {
      listeners.delete(setTime);
      stopTimerIfNoListeners();
    };
  }, []);

  return time;
}
