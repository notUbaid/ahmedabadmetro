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
