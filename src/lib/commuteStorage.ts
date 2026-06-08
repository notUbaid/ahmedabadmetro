const STORAGE_KEY = 'ahmedabad_metro_commute';

export interface CommuteSettings {
  homeStation: string;
  workStation: string;
  homeToWorkDismissCount: number;
  workToHomeDismissCount: number;
}

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

export const incrementDismissCount = (direction: 'homeToWork' | 'workToHome'): void => {
  // Intentionally left blank. We no longer limit dismissals.
};

export const shouldShowCommuteCard = (direction: 'homeToWork' | 'workToHome'): boolean => {
  const settings = getCommuteSettings();
  return !!settings;
};
