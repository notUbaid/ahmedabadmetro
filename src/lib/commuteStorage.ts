import { getISTDate } from './utils';

const STORAGE_KEY = 'ahmedabad_metro_commute';

export interface CommuteSettings {
  homeStation: string;
  workStation: string;
  lastShownHomeToWorkDate?: string; // YYYY-MM-DD in IST
  lastShownWorkToHomeDate?: string; // YYYY-MM-DD in IST
  homeToWorkDismissCount?: number;
  workToHomeDismissCount?: number;
}

/**
 * Returns YYYY-MM-DD in IST timezone.
 */
export const getISTDateString = (date: Date = getISTDate()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCommuteSettings = (): CommuteSettings | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load commute settings:', e);
  }
  return null;
};

export const saveCommuteSettings = (settings: CommuteSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save commute settings:', e);
  }
};

export const clearCommuteSettings = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear commute settings:', e);
  }
};

export const markCommuteCardShown = (
  direction: 'homeToWork' | 'workToHome',
  date: Date = getISTDate()
): void => {
  const settings = getCommuteSettings();
  if (settings) {
    const today = getISTDateString(date);
    if (direction === 'homeToWork') {
      settings.lastShownHomeToWorkDate = today;
      settings.homeToWorkDismissCount = (settings.homeToWorkDismissCount || 0) + 1;
    } else {
      settings.lastShownWorkToHomeDate = today;
      settings.workToHomeDismissCount = (settings.workToHomeDismissCount || 0) + 1;
    }
    saveCommuteSettings(settings);
  }
};

export const incrementDismissCount = (direction: 'homeToWork' | 'workToHome'): void => {
  markCommuteCardShown(direction);
};

export const shouldShowCommuteCard = (
  direction: 'homeToWork' | 'workToHome',
  date: Date = getISTDate()
): boolean => {
  const settings = getCommuteSettings();
  if (!settings || !settings.homeStation || !settings.workStation) return false;

  const today = getISTDateString(date);

  if (direction === 'homeToWork') {
    // Only show once per day for going to work
    return settings.lastShownHomeToWorkDate !== today;
  } else {
    // Only show once per day for coming back home
    return settings.lastShownWorkToHomeDate !== today;
  }
};
