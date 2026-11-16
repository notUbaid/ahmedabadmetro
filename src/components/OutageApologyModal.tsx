import { useState, useEffect } from 'react';
import { X, CheckCircle2, Heart, Train, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

export const APOLOGY_STORAGE_KEY = 'ahm_outage_apology_dismissed_nov2026';

/**
 * Checks whether the current user is an existing/returning user
 * based on presence of pre-existing storage items.
 */
export const isReturningUser = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    // Known keys that existing AhmMetro users will have
    const existingKeys = [
      'hasSeenWelcome',
      'ahmedabad-metro-language',
      'commute_settings',
      'recentSearches',
      'favorite_stations',
      'favoriteStations',
      'ahm_recent_searches',
      'theme',
    ];

    const hasStoredKey = existingKeys.some((k) => localStorage.getItem(k) !== null);
    if (hasStoredKey) return true;

    // Check if recorded in a previous session
    if (localStorage.getItem('ahm_visited_before') === 'true') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const OutageApologyModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const hasDismissed = localStorage.getItem(APOLOGY_STORAGE_KEY);
      if (hasDismissed === 'true') {
        return;
      }

      // Check if user is returning
      if (isReturningUser()) {
        // Show 1-time apology
        setIsOpen(true);
      } else {
        // Mark first-time visitor so future visits can recognize them, but don't show outage apology to brand-new installs
        localStorage.setItem('ahm_visited_before', 'true');
        localStorage.setItem(APOLOGY_STORAGE_KEY, 'true');
      }
    } catch {
      // Safe fallback for restricted storage environments
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(APOLOGY_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage write errors
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[3001] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apology-title"
    >
      <div className="bg-background border border-border/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300 text-foreground">
        <button
          onClick={handleDismiss}
          aria-label="Close apology notice"
          className="absolute top-4 right-4 p-2 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with gentle badge */}
        <div className="bg-gradient-to-b from-primary/15 to-transparent p-6 pb-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('apology.badge', language)}</span>
          </div>

          <div className="w-14 h-14 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-primary/20 border border-primary/30">
            <Train className="w-7 h-7" />
          </div>

          <h2 id="apology-title" className="text-xl font-bold tracking-tight text-foreground">
            {t('apology.title', language)}
          </h2>
        </div>

        {/* Message Body */}
        <div className="px-6 py-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {t('apology.message', language)
            .split('\n\n')
            .map((paragraph, idx) => (
              <p key={idx} className="text-xs sm:text-sm">
                {paragraph}
              </p>
            ))}

          <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex items-center gap-2.5 text-xs text-foreground font-medium mt-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>All live timetables, fare calculators & tracking are operating normally.</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-5 pt-4 bg-muted/20 border-t border-border flex flex-col gap-2">
          <button
            onClick={handleDismiss}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <span>{t('apology.action', language)}</span>
            <Heart className="w-4 h-4 fill-current text-rose-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutageApologyModal;
