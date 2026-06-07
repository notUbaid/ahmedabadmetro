import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MetroCardContextType {
  hasMetroCard: boolean;
  setHasMetroCard: (value: boolean) => void;
  getDiscountedFare: (fare: number) => number;
}

const MetroCardContext = createContext<MetroCardContextType | undefined>(undefined);

const readMetroCardFromStorage = (): boolean => {
  try {
    return localStorage.getItem('hasMetroCard') === 'true';
  } catch {
    return false;
  }
};

const writeMetroCardToStorage = (value: boolean): void => {
  try {
    localStorage.setItem('hasMetroCard', value.toString());
  } catch {
    // Ignore storage failures in restricted browsers.
  }
};

export const MetroCardProvider = ({ children }: { children: ReactNode }) => {
  const [hasMetroCard, setHasMetroCard] = useState(() => readMetroCardFromStorage());

  useEffect(() => {
    writeMetroCardToStorage(hasMetroCard);
  }, [hasMetroCard]);

  const getDiscountedFare = (fare: number): number => {
    if (hasMetroCard) {
      return Math.round(fare * 0.9 * 10) / 10; // 10% discount, rounded to 1 decimal
    }
    return fare;
  };

  return (
    <MetroCardContext.Provider value={{ hasMetroCard, setHasMetroCard, getDiscountedFare }}>
      {children}
    </MetroCardContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMetroCard = () => {
  const context = useContext(MetroCardContext);
  if (!context) {
    throw new Error('useMetroCard must be used within a MetroCardProvider');
  }
  return context;
};
