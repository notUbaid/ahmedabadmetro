import { getISTDate } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { X, Train, Clock, Users, Navigation, ArrowRight } from 'lucide-react';
import { Station, LINE_COLORS } from '@/data/metroData';
import { getCurrentHeadway } from '@/data/timetable';
import { getAvailableDepartures } from '@/lib/routePlanner';
import { getSimpleCrowdLevel } from '@/lib/crowding';

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
      .filter(route => route.departureMinutes >= nowMinutes)
      .slice(0, 3)
      .map(route => ({
        ...route,
        line: fromStation.lines[0],
        departureLabel: route.departureTime,
        destinationArrivalTime: route.arrivalTime,
        routeLabel: route.interchangeCount > 0 ? `via ${route.interchangeCount} change${route.interchangeCount > 1 ? 's' : ''}` : 'direct',
      }));
  }, [departures, currentTime, fromStation]);

  const getLiveMinutesAway = (arrivalTime: string): number => {
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const arrivalMinutes = arrH * 60 + arrM;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const secondsIntoMinute = currentTime.getSeconds();
    return Math.max(0, arrivalMinutes - currentMinutes - (secondsIntoMinute > 30 ? 1 : 0));
  };

  const primaryLine = fromStation.lines[0];
  const headway = getCurrentHeadway(primaryLine);

  return (
    <div className="fixed top-20 left-4 right-4 z-[1500] max-w-sm mx-auto animate-in slide-in-from-top duration-300">
      <div className="bg-background/85 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 overflow-hidden">
        <div 
          className="px-4 py-3 text-white flex items-center justify-between"
          style={{ background: `linear-gradient(90deg, ${LINE_COLORS[primaryLine as keyof typeof LINE_COLORS]}33, ${LINE_COLORS[primaryLine as keyof typeof LINE_COLORS]}88)` }}
        >
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">Daily Commute</p>
              <p className="text-xs text-white/80">{fromStation.name} → {toStation.name}</p>
            </div>
          </div>
          <button 
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {walkingTime !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Navigation className="w-3.5 h-3.5" />
              <span>{Math.ceil(walkingTime / 60)} min walk to {fromStation.name}</span>
              <span className="ml-auto text-sm font-medium">every {headway.label}</span>
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
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl shadow-sm hover:scale-[1.02] hover:shadow-md transition-all cursor-default border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: LINE_COLORS[train.line as keyof typeof LINE_COLORS] }}
                      />
                      <div>
                        <div className="text-sm font-semibold">{train.departureTime}</div>
                        <div className="text-xs text-muted-foreground">
                          {train.line.toUpperCase()} • {train.routeLabel} • reaches {toStation.name} at {train.destinationArrivalTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        crowd.level === 'low'
                          ? 'bg-green-500/10 text-green-600'
                          : crowd.level === 'moderate'
                            ? 'bg-yellow-500/10 text-yellow-600'
                            : 'bg-red-500/10 text-red-600'
                      }`}>
                        <Users className="w-3 h-3" />
                        <span>{crowd.label}</span>
                      </div>
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${liveMinutes === 0 ? 'bg-green-500/20 text-green-700' : liveMinutes <= 5 ? 'bg-yellow-500/10 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
                        {liveMinutes === 0 ? 'Now' : `${liveMinutes}m`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
              No upcoming direct Metros to {toStation.name} right now
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onPlanRoute}
              className="flex-1 py-3 px-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-90 hover:shadow-lg hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: LINE_COLORS[primaryLine as keyof typeof LINE_COLORS] || '#3B82F6' }}
            >
              <ArrowRight className="w-4 h-4" />
              Plan Route
            </button>
            <button
              onClick={onDismiss}
              className="py-3 px-6 rounded-2xl font-semibold border border-border/50 bg-muted/50 transition-all hover:bg-muted hover:shadow-md hover:scale-[1.02] active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommuteCard;
