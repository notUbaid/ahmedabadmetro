import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [isSlim, setIsSlim] = useState(false);

  useEffect(() => {
    let offlineTimeout: number | undefined;
    
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setIsSlim(false);
      if (offlineTimeout) window.clearTimeout(offlineTimeout);
      offlineTimeout = window.setTimeout(() => setShowBanner(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setIsSlim(false);
      if (offlineTimeout) window.clearTimeout(offlineTimeout);
      offlineTimeout = window.setTimeout(() => setIsSlim(true), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setShowBanner(true);
      offlineTimeout = window.setTimeout(() => setIsSlim(true), 3000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimeout !== undefined) {
        window.clearTimeout(offlineTimeout);
      }
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] text-center font-medium transition-all duration-300 flex items-center justify-center gap-2",
        isOnline ? "bg-green-500 text-white" : "bg-amber-500 text-white",
        isSlim ? "h-1.5 p-0" : "px-4 py-2 text-sm"
      )}
    >
      {!isSlim && (
        isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            Back online
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            You're offline — using cached data
          </>
        )
      )}
    </div>
  );
};

export default OfflineIndicator;
