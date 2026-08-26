import { getISTDate, minutesUntil } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { X, Train, Clock, Users, Navigation, ArrowRight } from 'lucide-react';
import { Station, LINE_COLORS } from '@/data/metroData';
import { getCurrentHeadway } from '@/data/timetable';
import { getAvailableDepartures } from '@/lib/routePlanner';
import { getServiceWindow } from '@/data/timetable';
import { getSimpleCrowdLevel } from '@/lib/crowding';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStationName } from '@/lib/i18n';

interface CommuteCardProps {
  fromStation: Station;
  toStation: Station;
  walkingTime: number | null;
  onDismiss: () => void;
  onPlanRoute: () => void;
}

export const CommuteCard = ({ 
  fromStation, 
  toStation, 
  walkingTime,
  onDismiss, 
  onPlanRoute 
}: CommuteCardProps) => {
  const { language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(getISTDate());

  const [departures, setDepartures] = useState<ReturnType<typeof getAvailableDepartures>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getISTDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!fromStation || !toStation) return;
    
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
       const deps = getAvailableDepartures(fromStation.id, toStation.id);
       setDepartures(deps);
       setIsLoading(false);
    }, 10);
    return () => clearTimeout(timeoutId);
  }, [fromStation, toStation]);

  const MetrosToDestination = useMemo(() => {
    if (departures.length === 0) return [];

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    return departures
      .filter(route => minutesUntil(route.departureMinutes, nowMinutes) >= 0)
      .slice(0, 3)
      .map(route => {
        let routeLabel = t('route.directMetro', language);
        if (route.interchangeCount > 0) {
          routeLabel = `${route.interchangeCount} ${route.interchangeCount === 1 ? (language === 'gu' ? 'બદલો' : language === 'hi' ? 'બદલાવ' : 'Change') : (language === 'gu' ? 'બદલાવ' : language === 'hi' ? 'બદલાવ' : 'Changes')}`;
        }
        const trainLine = route.line || fromStation.lines[0];
        return {
          ...route,
          line: trainLine,
          departureLabel: route.departureTime,
          destinationArrivalTime: route.arrivalTime,
          routeLabel,
        };
      });
  }, [departures, currentTime, fromStation, language]);

  const getLiveMinutesAway = (arrivalTime: string): number => {
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const arrivalMinutes = arrH * 60 + arrM;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const minutesAway = minutesUntil(arrivalMinutes, currentMinutes);
    const secondsIntoMinute = currentTime.getSeconds();
    return Math.max(0, minutesAway - (secondsIntoMinute > 30 ? 1 : 0));
  };

  const primaryLine = MetrosToDestination[0]?.line || fromStation.lines[0];
  const headway = getCurrentHeadway(primaryLine);
  // Service day window at the boarding station, to explain an empty list.
  const serviceWindow = useMemo(() => getServiceWindow(fromStation.id), [fromStation]);

  return (
    <div 
      className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div 
        className="bg-background rounded-3xl shadow-2xl border border-border max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="px-4 py-3 text-white flex items-center justify-between transition-all duration-300"
          style={{ background: `linear-gradient(90deg, ${LINE_COLORS[primaryLine as keyof typeof LINE_COLORS]}CC, ${LINE_COLORS[primaryLine as keyof typeof LINE_COLORS]})` }}
        >
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5 text-white" />
            <div>
              <p className="font-semibold text-sm text-white">{t('commute.dailyCommute', language)}</p>
              <p className="text-xs text-white/90">{getStationName(fromStation, language)} → {getStationName(toStation, language)}</p>
            </div>
          </div>
          <button 
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {walkingTime !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              <span>{Math.round(walkingTime / 60)} min {t('panel.walk', language)} - {getStationName(fromStation, language)}</span>
              <span className="ml-auto text-xs font-medium text-foreground">every ~{headway.label}</span>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2 py-1">
               <div className="w-full h-[60px] bg-muted animate-pulse rounded-xl shadow-sm"></div>
               <div className="w-full h-[60px] bg-muted animate-pulse rounded-xl shadow-sm"></div>
            </div>
          ) : MetrosToDestination.length > 0 ? (
            <div className="space-y-2">
              {MetrosToDestination.map((train, idx) => {
                const liveMinutes = getLiveMinutesAway(train.departureTime);
                const crowd = getSimpleCrowdLevel(train.line);
                
                return (
                  <div 
                    key={`${train.departureTime}-${idx}`}
                    className="flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl shadow-sm border border-border/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: LINE_COLORS[train.line as keyof typeof LINE_COLORS] }}
                      />
                      <div>
                        <div className="text-sm font-semibold">{train.departureTime}</div>
                        <div className="text-xs text-muted-foreground font-medium">
                          <span 
                            className="font-bold text-[10px] px-1.5 py-0.5 rounded text-white mr-1.5 uppercase"
                            style={{ backgroundColor: LINE_COLORS[train.line as keyof typeof LINE_COLORS] }}
                          >
                            {train.line}
                          </span>
                          {train.routeLabel} • {t('route.arriveAt', language)} {getStationName(toStation, language)} @ {train.destinationArrivalTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        crowd.level === 'low'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : crowd.level === 'moderate'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        <Users className="w-3 h-3" />
                        <span>{crowd.label}</span>
                      </div>
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${liveMinutes === 0 ? 'bg-green-500/20 text-green-700 dark:text-green-400' : liveMinutes <= 5 ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                        {liveMinutes === 0 ? t('panel.now', language) : `${liveMinutes}m`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
              {t('commute.noMetros', language)} {getStationName(toStation, language)}
              {serviceWindow && (() => {
                const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                const firstMin = Number(serviceWindow.first.slice(0, 2)) * 60 + Number(serviceWindow.first.slice(3));
                if (nowMinutes < firstMin) {
                  return (
                    <div className="text-xs mt-1">
                      {t('panel.firstMetro', language)} {serviceWindow.first}
                    </div>
                  );
                }
                return (
                  <div className="text-xs mt-1">
                    {t('panel.serviceEnded', language)} · {t('panel.lastMetro', language)} {serviceWindow.last}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onPlanRoute}
              className="flex-1 py-3 px-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-90 hover:shadow-lg hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: LINE_COLORS[primaryLine as keyof typeof LINE_COLORS] || '#3B82F6' }}
            >
              <ArrowRight className="w-4 h-4" />
              {t('panel.planRoute', language)}
            </button>
            <button
              onClick={onDismiss}
              className="py-3 px-6 rounded-2xl font-semibold border border-border/80 bg-muted/50 transition-all hover:bg-muted hover:shadow-md hover:scale-[1.02] active:scale-95"
            >
              {t('common.ok', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommuteCard;
