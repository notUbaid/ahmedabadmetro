import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract time components in Indian Standard Time (Asia/Kolkata) using Intl.DateTimeFormat.
 * Guaranteed to produce true IST wall-clock values regardless of system/runner timezone.
 */
export const getISTTimeComponents = (baseDate: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number;
  timeString: string;
} => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(baseDate);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let weekdayStr = 'Wed';

  for (const part of parts) {
    if (part.type === 'hour') {
      hours = parseInt(part.value, 10);
      if (hours === 24) hours = 0;
    } else if (part.type === 'minute') {
      minutes = parseInt(part.value, 10);
    } else if (part.type === 'second') {
      seconds = parseInt(part.value, 10);
    } else if (part.type === 'weekday') {
      weekdayStr = part.value;
    }
  }

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = dayMap[weekdayStr] ?? 3;
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return { hours, minutes, seconds, dayOfWeek, timeString };
};

/**
 * Returns total minutes since midnight in Indian Standard Time (0..1439).
 */
export const getISTMinutes = (baseDate: Date = new Date()): number => {
  const { hours, minutes } = getISTTimeComponents(baseDate);
  return hours * 60 + minutes;
};

/**
 * Returns a Date object artificially aligned so that local getHours(), getMinutes(),
 * and getDay() return true Indian Standard Time (IST) values across all platforms.
 */
export const getISTDate = (baseDate?: Date): Date => {
  const now = baseDate || new Date();
  const localOffsetMinutes = -now.getTimezoneOffset();
  const istOffsetMinutes = 330; // UTC+5:30
  const shift = istOffsetMinutes - localOffsetMinutes;
  return new Date(now.getTime() + shift * 60000);
};

/**
 * Minutes from `nowMinutes` until `targetMinutes`, service-day aware.
 * Times in the 00:00–04:59 window belong to the tail of the current service
 * day, so when "now" is already past them they refer to tomorrow's first
 * services — not a time ~24h in the past.
 */
export const minutesUntil = (targetMinutes: number, nowMinutes: number): number => {
  if (targetMinutes <= 300 && targetMinutes < nowMinutes) {
    return targetMinutes + 24 * 60 - nowMinutes;
  }
  return targetMinutes - nowMinutes;
};

/**
 * Great-circle distance between two coordinates in meters using the Haversine formula.
 */
export const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
