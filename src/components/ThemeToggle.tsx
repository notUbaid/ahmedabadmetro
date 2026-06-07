import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let stored: string | null = null;

    try {
      stored = localStorage.getItem('theme');
    } catch {
      stored = null;
    }

    if (stored === 'dark' || (!stored && prefersDark)) {
      root.classList.add('dark');
      setIsDark(true);
    } else {
      root.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const newIsDark = !isDark;
    
    if (newIsDark) {
      root.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch {
        // Ignore storage failures.
      }
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch {
        // Ignore storage failures.
      }
    }
    
    setIsDark(newIsDark);
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-[1001] p-3 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
