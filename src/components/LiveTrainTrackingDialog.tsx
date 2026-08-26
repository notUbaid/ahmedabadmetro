import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Share2, Copy, Check, ChevronDown, MapPin, Train, Clock, ArrowRight } from 'lucide-react';
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
  const fullRouteLineRef = useRef<L.Polyline | null>(null);
  const selectedRouteLineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Find the train schedule
  const schedule = useMemo(() => {
    return trainSchedules.find(s => s.id === trainId);
  }, [trainId]);

  // Selected Origin & Destination along this train's route
  const [originStationId, setOriginStationId] = useState<string>('');
  const [destStationId, setDestStationId] = useState<string>('');

  // Reset / initialize From & To stations when train schedule changes or modal opens
  useEffect(() => {
    if (schedule && schedule.stations.length >= 2) {
      setOriginStationId(schedule.stations[0]);
      setDestStationId(schedule.stations[schedule.stations.length - 1]);
    }
  }, [schedule, isOpen]);

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

  const fromIndex = useMemo(() => {
    if (!schedule) return 0;
    const idx = schedule.stations.indexOf(originStationId);
    return idx >= 0 ? idx : 0;
  }, [schedule, originStationId]);

  const toIndex = useMemo(() => {
    if (!schedule) return 1;
    const idx = schedule.stations.indexOf(destStationId);
    return idx >= 0 ? idx : schedule.stations.length - 1;
  }, [schedule, destStationId]);

  const trainStartMins = useMemo(() => {
    if (!schedule) return 0;
    const [hours, mins] = schedule.startTime.split(':').map(Number);
    return hours * 60 + mins;
  }, [schedule]);

  const fromDepMins = useMemo(() => {
    if (!schedule || fromIndex < 0) return trainStartMins;
    return trainStartMins + (schedule.stationTimes[fromIndex] ?? 0);
  }, [schedule, fromIndex, trainStartMins]);

  const toArrMins = useMemo(() => {
    if (!schedule || toIndex < 0) return trainStartMins;
    return trainStartMins + (schedule.stationTimes[toIndex] ?? 0);
  }, [schedule, toIndex, trainStartMins]);

  const tripStops = Math.max(1, toIndex - fromIndex);
  const tripDuration = Math.max(0, toArrMins - fromDepMins);

  const handleFromStationChange = (newOrigin: string) => {
    if (!schedule) return;
    setOriginStationId(newOrigin);
    const newFromIdx = schedule.stations.indexOf(newOrigin);
    if (newFromIdx >= toIndex) {
      const nextDestIdx = Math.min(newFromIdx + 1, schedule.stations.length - 1);
      setDestStationId(schedule.stations[nextDestIdx]);
    }
  };

  const handleToStationChange = (newDest: string) => {
    if (!schedule) return;
    setDestStationId(newDest);
    const newToIdx = schedule.stations.indexOf(newDest);
    if (newToIdx <= fromIndex) {
      const prevOriginIdx = Math.max(newToIdx - 1, 0);
      setOriginStationId(schedule.stations[prevOriginIdx]);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || !schedule) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([23.0225, 72.5714], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxNativeZoom: 19,
        maxZoom: 22,
      }).addTo(mapRef.current);
    }

    // Full Route Background Line
    const fullCoordinates = schedule.stations
      .map(stationId => {
        const st = stations[stationId];
        return st ? [st.coordinates[0], st.coordinates[1]] as [number, number] : null;
      })
      .filter((coord): coord is [number, number] => coord !== null);

    if (!fullRouteLineRef.current && fullCoordinates.length > 0) {
      fullRouteLineRef.current = L.polyline(fullCoordinates, {
        color: LINE_COLORS[line as keyof typeof LINE_COLORS] || '#FFB347',
        weight: 3,
        opacity: 0.35,
        dashArray: '6, 6'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        fullRouteLineRef.current = null;
        selectedRouteLineRef.current = null;
        trainMarkerRef.current = null;
        startMarkerRef.current = null;
        endMarkerRef.current = null;
      }
    };
  }, [isOpen, schedule, line]);

  // Update selected sub-route and start/end markers on the map
  useEffect(() => {
    if (!isOpen || !mapRef.current || !schedule) return;

    const selectedCoords = schedule.stations
      .slice(fromIndex, toIndex + 1)
      .map(stationId => {
        const st = stations[stationId];
        return st ? [st.coordinates[0], st.coordinates[1]] as [number, number] : null;
      })
      .filter((coord): coord is [number, number] => coord !== null);

    if (selectedCoords.length >= 2) {
      if (selectedRouteLineRef.current) {
        selectedRouteLineRef.current.setLatLngs(selectedCoords);
      } else {
        selectedRouteLineRef.current = L.polyline(selectedCoords, {
          color: LINE_COLORS[line as keyof typeof LINE_COLORS] || '#FFB347',
          weight: 6,
          opacity: 0.95
        }).addTo(mapRef.current);
      }

      // Start Marker
      const startCoord = selectedCoords[0];
      if (startMarkerRef.current) {
        startMarkerRef.current.setLatLng(startCoord);
      } else {
        startMarkerRef.current = L.marker(startCoord, {
          icon: L.divIcon({
            html: `<div class="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md ring-2 ring-green-500/40"></div>`,
            className: 'origin-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(mapRef.current);
      }

      // End Marker
      const endCoord = selectedCoords[selectedCoords.length - 1];
      if (endMarkerRef.current) {
        endMarkerRef.current.setLatLng(endCoord);
      } else {
        endMarkerRef.current = L.marker(endCoord, {
          icon: L.divIcon({
            html: `<div class="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md ring-2 ring-red-500/40"></div>`,
            className: 'dest-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(mapRef.current);
      }

      // Fit map to selected section
      const bounds = L.latLngBounds(selectedCoords);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [isOpen, schedule, line, fromIndex, toIndex]);

  // Update live train marker position
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
                <div class="relative flex items-center justify-center">
                  <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-60"></span>
                  <div class="p-1 rounded-full shadow-lg border-2 border-white" style="background-color: ${LINE_COLORS[line as keyof typeof LINE_COLORS] || '#FFB347'}">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                      <path d="m18 15-6-6-6 6"/>
                    </svg>
                  </div>
                </div>
              `,
              className: 'live-train-marker',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            }),
            zIndexOffset: 1000
          }
        ).addTo(mapRef.current);
      }
    }
  }, [isOpen, schedule, line, currentTime]);

  if (!isOpen || !schedule) return null;

  // Convert minutes to HH:MM format
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const originStation = stations[originStationId] || stations[schedule.stations[0]];
  const destStation = stations[destStationId] || stations[schedule.stations[schedule.stations.length - 1]];
  const originName = getStationName(originStation, language) || originStationId;
  const destName = getStationName(destStation, language) || destStationId;
  const lineTitle = t(`route.${line}Line` as Parameters<typeof t>[0], language);

  const getShareUrl = () => {
    return `${window.location.origin}${window.location.pathname}?orig=${originStationId || schedule.stations[0]}&dest=${destStationId || schedule.stations[schedule.stations.length - 1]}&depMins=${fromDepMins}`;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();

    if (navigator.share) {
      navigator.share({
        title: `Track my Metro journey!`,
        text: `I'm riding the ${lineTitle} from ${originName} to ${destName} (Departing at ${minutesToTime(fromDepMins)}). Track my metro live!`,
        url: shareUrl
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const shareUrl = getShareUrl();
    const text = `🚆 Track my Ahmedabad Metro live on the ${lineTitle} (${originName} ➔ ${destName}, Dep: ${minutesToTime(fromDepMins)})\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-background rounded-t-3xl md:rounded-3xl shadow-2xl border border-border w-full md:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-200 safe-p-bottom"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: LINE_COLORS[line as keyof typeof LINE_COLORS] || '#0066CC' }}
        >
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              {t('dialog.liveTracking', language)}
            </h2>
            <p className="text-xs text-white/80 font-medium">{lineTitle} · {t('common.estimated', language)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Map */}
        <div 
          ref={mapContainerRef}
          className="w-full h-56 sm:h-72 md:h-80 flex-shrink-0"
        />

        {/* Info & Selectors Section */}
        <div className="p-4 sm:p-5 border-t border-border overflow-y-auto space-y-3.5">
          {/* Station Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* From Station Selector */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex flex-col justify-between focus-within:border-primary/50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  {t('common.from', language).replace('...', '')}
                </span>
                <span className="text-xs font-bold text-primary">
                  Dep {minutesToTime(fromDepMins)}
                </span>
              </div>
              <div className="relative">
                <select
                  value={originStationId}
                  onChange={(e) => handleFromStationChange(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer pr-8 shadow-xs"
                >
                  {schedule.stations.map((stId, idx) => {
                    const st = stations[stId];
                    const name = getStationName(st, language) || stId;
                    const timeStr = minutesToTime(trainStartMins + (schedule.stationTimes[idx] ?? 0));
                    return (
                      <option key={stId} value={stId} disabled={idx >= toIndex}>
                        {name} ({timeStr})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* To Station Selector */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex flex-col justify-between focus-within:border-primary/50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                  {t('common.to', language).replace('...', '')}
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Arr {minutesToTime(toArrMins)}
                </span>
              </div>
              <div className="relative">
                <select
                  value={destStationId}
                  onChange={(e) => handleToStationChange(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer pr-8 shadow-xs"
                >
                  {schedule.stations.map((stId, idx) => {
                    const st = stations[stId];
                    const name = getStationName(st, language) || stId;
                    const timeStr = minutesToTime(trainStartMins + (schedule.stationTimes[idx] ?? 0));
                    return (
                      <option key={stId} value={stId} disabled={idx <= fromIndex}>
                        {name} ({timeStr})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Selected Trip Details Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/15 text-xs font-medium">
            <div className="flex items-center gap-2">
              <Train className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">
                {tripStops} {tripStops === 1 ? 'stop' : 'stops'} ({tripDuration} min)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Time: <strong className="text-foreground">{minutesToTime(currentTime)}</strong></span>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              onClick={handleShare}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-sm cursor-pointer"
              style={{ backgroundColor: LINE_COLORS[line as keyof typeof LINE_COLORS] || '#0066CC' }}
            >
              <Share2 size={18} />
              {t('dialog.shareLiveLocation', language)}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="py-3 px-4 rounded-xl font-semibold bg-[#25D366] text-white hover:bg-[#20ba59] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.761.88 2.79.88 3.182 0 5.768-2.587 5.768-5.766.001-3.187-2.575-5.766-5.767-5.766zm9.969 5.766c0 5.517-4.483 10-10 10-1.812 0-3.513-.485-4.981-1.328l-5.019 1.39 1.416-4.891c-.961-1.536-1.516-3.344-1.516-5.171 0-5.517 4.483-10 10-10 5.517 0 10 4.483 10 10z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className={cn(
                'py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border cursor-pointer',
                copied 
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
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

