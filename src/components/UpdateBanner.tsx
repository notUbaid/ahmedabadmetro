import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { subscribeToUpdate, applyUpdate } from '@/lib/pwaUpdate';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

export const UpdateBanner = () => {
  const { language } = useLanguage();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUpdate((updateAvailable) => {
      setHasUpdate(updateAvailable);
      if (updateAvailable) {
        // Reset dismissed state on fresh update
        setIsDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  if (!hasUpdate || isDismissed) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    applyUpdate();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-1.5rem)] max-w-md safe-m-top animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-xl border border-blue-500/40 rounded-2xl p-3 shadow-2xl shadow-blue-500/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 leading-tight">
              {t('update.title', language)}
            </h3>
            <p className="text-xs text-slate-300 dark:text-slate-400 truncate leading-tight mt-0.5">
              {t('update.description', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? t('update.updating', language) : t('update.action', language)}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss update notification"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateBanner;
