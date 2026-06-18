import { useState, useEffect } from 'react';
import { Menu, X, Route, Moon, Sun, Lightbulb, Coffee, CreditCard, Check, ArrowLeftRight, Download } from 'lucide-react';
import { TipsDialog } from './TipsDialog';
import { CommuteSetup } from './CommuteSetup';
import { useMetroCard } from '@/contexts/MetroCardContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCommuteSettings } from '@/lib/commuteStorage';
import { Languages } from 'lucide-react';
import { t } from '@/lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface SideMenuProps {
  onOpenRoutePlanner: () => void;
}

export const SideMenu = ({ onOpenRoutePlanner }: SideMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isCommuteOpen, setIsCommuteOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { hasMetroCard, setHasMetroCard } = useMetroCard();
  const { language, setLanguage } = useLanguage();
  const commuteSettings = getCommuteSettings();

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('theme');

    if (stored === 'dark' || (!stored && prefersDark)) {
      root.classList.add('dark');
      setIsDark(true);
    }

    let promptTimeout: NodeJS.Timeout;

    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);

      // Auto-prompt after 30 seconds of usage
      promptTimeout = setTimeout(() => {
        const triggerPrompt = async () => {
          document.removeEventListener('click', triggerPrompt);
          document.removeEventListener('touchstart', triggerPrompt);
          try {
            await event.prompt();
            const { outcome } = await event.userChoice;
            if (outcome === 'accepted') {
              setIsInstallable(false);
            }
            setDeferredPrompt(null);
          } catch (err) {
            console.log('Auto-prompt prevented by browser', err);
          }
        };
        // Wait for the next user interaction to trigger it to satisfy browser requirements
        document.addEventListener('click', triggerPrompt);
        document.addEventListener('touchstart', triggerPrompt);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(promptTimeout);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

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
      label: t('menu.planRoute', language),
      onClick: handleRoutePlanner,
      description: t('menu.planRouteDesc', language)
    },
    {
      icon: ArrowLeftRight,
      label: t('menu.dailyCommute', language),
      onClick: () => {
        setIsOpen(false);
        setIsCommuteOpen(true);
      },
      description: commuteSettings ? t('menu.commuteConfigured', language) : t('menu.dailyCommuteDesc', language),
      customIconColor: commuteSettings ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground',
      customBgColor: commuteSettings ? 'bg-purple-500/15' : 'bg-muted',
      isToggle: commuteSettings !== null,
      isActive: commuteSettings !== null
    },
    {
      icon: CreditCard,
      label: t('menu.metroCard', language),
      onClick: () => setHasMetroCard(!hasMetroCard),
      description: hasMetroCard ? t('menu.metroCardApplied', language) : t('menu.metroCardDesc', language),
      customIconColor: hasMetroCard ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
      customBgColor: hasMetroCard ? 'bg-green-500/15' : 'bg-muted',
      isToggle: true,
      isActive: hasMetroCard
    },
    {
      icon: isDark ? Sun : Moon,
      label: isDark ? t('menu.lightMode', language) : t('menu.darkMode', language),
      onClick: toggleTheme,
      description: t('menu.themeDesc', language)
    },
    {
      icon: Languages,
      label: t('menu.language', language),
      onClick: () => {
        const nextLang = language === 'en' ? 'gu' : language === 'gu' ? 'hi' : 'en';
        setLanguage(nextLang);
      },
      description: language === 'en' 
        ? 'English (Click to switch to ગુજરાતી)' 
        : language === 'gu' 
          ? 'ગુજરાતી (हिंदी में बदलने के लिए क्लिक करें)' 
          : 'हिंदी (Click to switch to English)',
      customIconColor: 'text-blue-600 dark:text-blue-400',
      customBgColor: 'bg-blue-500/15',
      isToggle: false,
    },
    {
      icon: Coffee,
      label: t('menu.buyCoffee', language),
      onClick: () => window.open('https://buymeacoffee.com/notUbaid', '_blank'),
      description: t('menu.buyCoffeeDesc', language),
      customIconColor: 'text-yellow-600 dark:text-yellow-400',
      customBgColor: 'bg-yellow-500/15'
    },
    {
      icon: Lightbulb,
      label: t('menu.tips', language),
      onClick: () => {
        setIsOpen(false);
        setIsTipsOpen(true);
      },
      description: t('menu.tipsDesc', language),
      disabled: false
    },
    ...(isInstallable ? [{
      icon: Download,
      label: t('menu.installApp', language),
      onClick: handleInstallClick,
      description: t('menu.installAppDesc', language),
      customIconColor: 'text-blue-600 dark:text-blue-400',
      customBgColor: 'bg-blue-500/15'
    }] : []),
  ];

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[1001] p-3 bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border hover:bg-muted transition-colors pointer-events-auto safe-m-top"
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
        className={`fixed top-0 right-0 h-full w-72 z-[1003] bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-out will-change-transform transform-gpu ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">{t('menu.title', language)}</h2>
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background safe-p-bottom">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="bg-muted/50 p-2 rounded-lg text-[10px] text-muted-foreground leading-relaxed w-full border border-border/50">
              <span className="font-semibold block mb-1">{t('menu.disclaimer', language)}</span>
              {t('menu.disclaimerGovt', language)} {t('menu.disclaimerSource', language)} <a href="https://www.gujaratmetrorail.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{t('menu.gmrc', language)}</a>.
            </div>
            
            <div className="flex items-center justify-between w-full px-1 mt-1">
              <p className="text-xs text-muted-foreground font-medium">
                v1.2.1 • June 2026
              </p>
              <p className="text-xs text-muted-foreground/70">
                by{' '}
                <a
                  href="https://www.linkedin.com/in/notubaid/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors font-medium"
                >
                  Ubaid
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <TipsDialog isOpen={isTipsOpen} onOpenChange={setIsTipsOpen} />
      <CommuteSetup isOpen={isCommuteOpen} onClose={() => setIsCommuteOpen(false)} />
    </>
  );
};

export default SideMenu;
