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
  const settings = getCommuteSettings();
  if (settings) {
    if (direction === 'homeToWork') {
      settings.homeToWorkDismissCount = (settings.homeToWorkDismissCount || 0) + 1;
    } else {
      settings.workToHomeDismissCount = (settings.workToHomeDismissCount || 0) + 1;
    }
    saveCommuteSettings(settings);
  }
};

export const shouldShowCommuteCard = (direction: 'homeToWork' | 'workToHome'): boolean => {
  const settings = getCommuteSettings();
  if (!settings) return false;
  
  if (direction === 'homeToWork') {
    return (settings.homeToWorkDismissCount || 0) < 3;
  } else {
    return (settings.workToHomeDismissCount || 0) < 3;
  }
};
