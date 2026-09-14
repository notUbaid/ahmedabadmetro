import { useState, useEffect } from 'react';
import { X, Train, Clock, Search, Map } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

export const WelcomeOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={handleClose} 
          aria-label="Close"
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="bg-primary/10 p-6 text-center border-b border-primary/20">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Train className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('welcome.title', language)}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t('welcome.subtitle', language)}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t('welcome.feature1Title', language)}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('welcome.feature1Desc', language)}</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
              <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t('welcome.feature2Title', language)}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('welcome.feature2Desc', language)}</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t('welcome.feature3Title', language)}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('welcome.feature3Desc', language)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border flex justify-center">
          <button 
            onClick={handleClose} 
            className="group w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl shadow-md transition-colors"
          >
            <span>{t('welcome.letsGo', language)}</span>
            <Train className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  );
};
