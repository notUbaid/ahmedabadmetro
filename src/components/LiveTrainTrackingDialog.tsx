import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';
import { stations, LINE_COLORS } from '@/data/metroData';
import { trainSchedules } from '@/data/timetable';
import L from 'leaflet';
import { cn, getISTDate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStationName } from '@/lib/i18n';

interface LiveTrainTrackingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trainId: string;
  line: 'blue' | 'red' | 'green' | 'purple';
}

export const LiveTrainTrackingDialog = ({
  isOpen,
  onClose,
  trainId,
  line
}: LiveTrainTrackingDialogProps) => {
  const { language } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trainMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Update current time every second
  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const now = getISTDate();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Find the train schedule
  const schedule = useMemo(() => {
    return trainSchedules.find(s => s.id === trainId);
  }, [trainId]);

  // Initialize map and route line
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || !schedule) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [23.1815, 72.6369], // Ahmedabad center
        12
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxNativeZoom: 19,
        maxZoom: 22,
      }).addTo(mapRef.current);
    }

    if (!routeLineRef.current) {
      const coordinates = schedule.stations
        .map(stationId => {
          const station = stations[stationId];
          return station ? [station.coordinates[0], station.coordinates[1]] as [number, number] : null;
        })
        .filter((coord): coord is [number, number] => coord !== null);

      routeLineRef.current = L.polyline(coordinates, {
        color: LINE_COLORS[line as keyof typeof LINE_COLORS],
        weight: 4,
        opacity: 0.6,
        dashArray: '5, 5'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        routeLineRef.current = null;
        trainMarkerRef.current = null;
      }
    };
  }, [isOpen, schedule, line]);

  // Update train marker
  useEffect(() => {
    if (!isOpen || !mapRef.current || !schedule) return;

    const currentStationIndex = schedule.stationTimes.findIndex(
      (time, idx) => {
        const nextTime = schedule.stationTimes[idx + 1];
        if (nextTime === undefined) return time <= currentTime;
        return time <= currentTime && currentTime < nextTime;
      }
    );

    const displayIndex = Math.min(Math.max(0, currentStationIndex), schedule.stations.length - 1);
    const currentStation = stations[schedule.stations[displayIndex]];

    if (currentStation) {
      if (trainMarkerRef.current) {
        trainMarkerRef.current.setLatLng([currentStation.coordinates[0], currentStation.coordinates[1]]);
      } else {
        trainMarkerRef.current = L.marker(
          [currentStation.coordinates[0], currentStation.coordinates[1]],
          {
            icon: L.divIcon({
              html: `
                <div class="relative">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="16" fill="${LINE_COLORS[line as keyof typeof LINE_COLORS]}"/>
                    <path d="M16 8L24 24H8L16 8Z" fill="white"/>
                  </svg>
                </div>
              `,
              className: 'train-marker',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }
        ).addTo(mapRef.current);
      }

      // Center map on train smoothly
      mapRef.current.panTo([currentStation.coordinates[0], currentStation.coordinates[1]]);
    }
  }, [isOpen, schedule, line, currentTime]);

  if (!isOpen || !schedule) return null;

  // Convert minutes to HH:MM format
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleShare = async () => {
    const originStation = schedule.stations[0];
    const destStation = schedule.stations[schedule.stations.length - 1];
    const originName = getStationName(stations[originStation], language) || originStation;
    const destName = getStationName(stations[destStation], language) || destStation;
    
    // Parse start time to get departure minutes
    const [hours, mins] = schedule.startTime.split(':').map(Number);
    const depMins = hours * 60 + mins;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?orig=${originStation}&dest=${destStation}&depMins=${depMins}`;

    if (navigator.share) {
      navigator.share({
        title: 'Track my Metro journey!',
        text: `I'm on the ${line.charAt(0).toUpperCase() + line.slice(1)} Line from ${originName} to ${destName}. Track my metro live!`,
        url: shareUrl
      }).catch(() => {});
    }
  };

  const handleCopyLink = () => {
    const originStation = schedule.stations[0];
    const destStation = schedule.stations[schedule.stations.length - 1];
    
    // Parse start time to get departure minutes
    const [hours, mins] = schedule.startTime.split(':').map(Number);
    const depMins = hours * 60 + mins;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?orig=${originStation}&dest=${destStation}&depMins=${depMins}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const originStation = schedule.stations[0];
    const destStation = schedule.stations[schedule.stations.length - 1];
    const originName = getStationName(stations[originStation], language) || originStation;
    const destName = getStationName(stations[destStation], language) || destStation;
    
    const [hours, mins] = schedule.startTime.split(':').map(Number);
    const depMins = hours * 60 + mins;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?orig=${originStation}&dest=${destStation}&depMins=${depMins}`;
    const text = `🚆 Track my Ahmedabad Metro live on the ${line.charAt(0).toUpperCase() + line.slice(1)} Line (${originName} ➔ ${destName})\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Get origin and destination
  const originStation = stations[schedule.stations[0]];
  const destStation = stations[schedule.stations[schedule.stations.length - 1]];

  return (
    <div className="fixed inset-0 z-[2100] flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-background rounded-t-2xl md:rounded-2xl shadow-2xl border border-border w-full md:max-w-2xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-200 safe-p-bottom"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: LINE_COLORS[line as keyof typeof LINE_COLORS] }}
        >
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              {t('dialog.liveTracking', language)}
            </h2>
            <p className="text-sm text-white/80">{t(`route.${line}Line` as Parameters<typeof t>[0], language)} · {t('common.estimated', language)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Map */}
        <div 
          ref={mapContainerRef}
          className="w-full flex-1 md:h-96"
          style={{ minHeight: '300px' }}
        />

        {/* Info and Actions */}
        <div className="p-6 border-t border-border flex-shrink-0 space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{t('common.from', language).replace('...', '')}</p>
              <p className="font-semibold">{originStation ? getStationName(originStation, language) : t('dialog.unknown', language)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{t('common.to', language).replace('...', '')}</p>
              <p className="font-semibold">{destStation ? getStationName(destStation, language) : t('dialog.unknown', language)}</p>
            </div>
          </div>

          {/* Current Time */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">{t('dialog.metroTrackingTime', language)}</p>
            <p className="text-2xl font-bold text-primary">{minutesToTime(currentTime)}</p>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleShare}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
              style={{ backgroundColor: LINE_COLORS[line as keyof typeof LINE_COLORS] }}
            >
              <Share2 size={18} />
              {t('dialog.shareLiveLocation', language)}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="py-3 px-4 rounded-xl font-semibold bg-[#25D366] text-white hover:bg-[#20ba59] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.761.88 2.79.88 3.182 0 5.768-2.587 5.768-5.766.001-3.187-2.575-5.766-5.767-5.766zm9.969 5.766c0 5.517-4.483 10-10 10-1.812 0-3.513-.485-4.981-1.328l-5.019 1.39 1.416-4.891c-.961-1.536-1.516-3.344-1.516-5.171 0-5.517 4.483-10 10-10 5.517 0 10 4.483 10 10z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className={cn(
                'py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border',
                copied 
                  ? 'bg-green-500/20 border-green-500 text-green-500'
                  : 'bg-muted/50 border-border hover:bg-muted active:scale-[0.98]'
              )}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? t('dialog.copied', language) : t('dialog.copyLink', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
