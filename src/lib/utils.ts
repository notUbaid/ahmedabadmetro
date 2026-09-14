import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a new Date object artificially shifted so that local methods
 * (getHours, getMinutes, getDay, etc.) return the time in Indian Standard Time (IST).
 * This prevents bugs when a user accesses the app from a different timezone.
 */
export const getISTDate = (): Date => {
  const now = new Date();
  const localOffsetMinutes = -now.getTimezoneOffset();
  const istOffsetMinutes = 330; // +5:30
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
