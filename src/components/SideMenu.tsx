import { useState, useEffect } from 'react';
import { Menu, X, Route, Moon, Sun, Lightbulb, Coffee, CreditCard, Check, ArrowLeftRight } from 'lucide-react';
import { TipsDialog } from './TipsDialog';
import { CommuteSetup } from './CommuteSetup';
import { useMetroCard } from '@/contexts/MetroCardContext';
import { getCommuteSettings } from '@/lib/commuteStorage';

interface SideMenuProps {
  onOpenRoutePlanner: () => void;
}

export const SideMenu = ({ onOpenRoutePlanner }: SideMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isCommuteOpen, setIsCommuteOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { hasMetroCard, setHasMetroCard } = useMetroCard();
  const commuteSettings = getCommuteSettings();

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('theme');

    if (stored === 'dark' || (!stored && prefersDark)) {
      root.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newIsDark = !isDark;

    if (newIsDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    setIsDark(newIsDark);
  };

  const handleRoutePlanner = () => {
    setIsOpen(false);
    onOpenRoutePlanner();
  };

  const menuItems = [
    {
      icon: Route,
      label: 'Plan Route',
      onClick: handleRoutePlanner,
      description: 'Find your metro journey'
    },
    {
      icon: ArrowLeftRight,
      label: 'Daily Commute',
      onClick: () => {
        setIsOpen(false);
        setIsCommuteOpen(true);
      },
      description: commuteSettings ? 'Commute configured' : 'Set up home ↔ work route',
      customIconColor: commuteSettings ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground',
      customBgColor: commuteSettings ? 'bg-purple-500/15' : 'bg-muted',
      isToggle: commuteSettings !== null,
      isActive: commuteSettings !== null
    },
    {
      icon: CreditCard,
      label: 'Metro Card',
      onClick: () => setHasMetroCard(!hasMetroCard),
      description: hasMetroCard ? '10% discount applied' : 'Enable for 10% fare discount',
      customIconColor: hasMetroCard ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
      customBgColor: hasMetroCard ? 'bg-green-500/15' : 'bg-muted',
      isToggle: true,
      isActive: hasMetroCard
    },
    {
      icon: isDark ? Sun : Moon,
      label: isDark ? 'Light Mode' : 'Dark Mode',
      onClick: toggleTheme,
      description: 'Switch appearance'
    },
    {
      icon: Coffee,
      label: 'Buy me a coffee',
      onClick: () => window.open('https://buymeacoffee.com/notUbaid', '_blank'),
      description: 'Support the developer',
      customIconColor: 'text-yellow-600 dark:text-yellow-400',
      customBgColor: 'bg-yellow-500/15'
    },
    {
      icon: Lightbulb,
      label: 'Tips',
      onClick: () => {
        setIsOpen(false);
        setIsTipsOpen(true);
      },
      description: 'Travel tips',
      disabled: false
    },
  ];

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[1001] p-3 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border hover:bg-muted transition-colors pointer-events-auto"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1002] bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 z-[1003] bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${item.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-muted'
                }`}
            >
              <div className={`p-2 rounded-lg ${item.disabled ? 'bg-muted/50' : (item.customBgColor || 'bg-primary/10')}`}>
                <item.icon className={`w-5 h-5 ${item.disabled ? 'text-muted-foreground' : (item.customIconColor || 'text-primary')}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              {item.isToggle && (
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                  item.isActive ? 'bg-green-500 text-white' : 'bg-muted border border-border'
                }`}>
                  {item.isActive && <Check size={14} />}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            made with ❤️ by{' '}
            <a
              href="https://www.linkedin.com/in/notubaid/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Ubaid
            </a>
          </p>
        </div>
      </div>

      <TipsDialog isOpen={isTipsOpen} onOpenChange={setIsTipsOpen} />
      <CommuteSetup isOpen={isCommuteOpen} onClose={() => setIsCommuteOpen(false)} />
    </>
  );
};

export default SideMenu;
