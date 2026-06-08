import { X, MapPin, Clock, Train, Navigation, Locate, Loader2, Route, AlertTriangle, Users, ChevronUp, ChevronDown } from 'lucide-react';
import { Station, LINE_COLORS } from '@/data/metroData';
import { getUpcomingTrains, getLastTrainWarnings, getCurrentHeadway } from '@/data/timetable';
import { getSimpleCrowdLevel } from '@/lib/crowding';
import { useEffect, useState } from 'react';

interface BottomPanelProps {
  selectedStation: Station | null;
  nearestStation: Station | null;
  distance: number | null; // in meters (real walking distance)
  walkingTime: number | null; // in seconds (real walking time)
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLocate: (lat: number, lng: number) => void;
  onPlanRoute?: (stationId: string) => void;
  userLocation: [number, number] | null;
}

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatWalkingTime = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const BottomPanel = ({
  selectedStation,
  nearestStation,
  distance,
  walkingTime,
  onClose,
  isExpanded,
  onToggleExpand,
  onLocate,
  onPlanRoute,
  userLocation,
}: BottomPanelProps) => {
  const [upcomingTrains, setUpcomingTrains] = useState<ReturnType<typeof getUpcomingTrains>>([]);
  const [lastTrainWarnings, setLastTrainWarnings] = useState<ReturnType<typeof getLastTrainWarnings>>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const station = selectedStation || nearestStation;

  // Auto-refresh current time every second for live feel
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Auto-refresh upcoming trains and last train warnings every 10 seconds
  useEffect(() => {
    if (station) {
      setUpcomingTrains(getUpcomingTrains(station.id, 3));
      setLastTrainWarnings(getLastTrainWarnings(station.id));
      const interval = setInterval(() => {
        setUpcomingTrains(getUpcomingTrains(station.id, 3));
        setLastTrainWarnings(getLastTrainWarnings(station.id));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [station]);

  // Calculate live "minutes away" based on current time
  const getLiveMinutesAway = (arrivalTime: string): number => {
    const [h, m] = arrivalTime.split(':').map(Number);
    const arrivalMinutes = h * 60 + m;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const secondsIntoMinute = currentTime.getSeconds();
    return Math.max(0, arrivalMinutes - currentMinutes - (secondsIntoMinute > 30 ? 1 : 0));
  };


  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocate(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location access denied. Please enable location permissions.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };


  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] pointer-events-none">
      {/* Floating buttons */}
      {/* Plan Route button - left side */}
      {selectedStation && onPlanRoute && (
        <button
          onClick={() => onPlanRoute(selectedStation.id)}
          className="absolute -top-14 left-4 p-3 bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-2 animate-fade-in pointer-events-auto"
          aria-label="Plan journey"
        >
          <Route className="w-5 h-5" />
          <span className="font-semibold text-sm">Plan Route</span>
        </button>
      )}

      {/* Navigate button - show when no selection but nearest exists */}
      {!selectedStation && nearestStation && (
        <button
          onClick={() => {
            const [lat, lng] = nearestStation.coordinates;
            let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
            if (userLocation) {
              url += `&origin=${userLocation[0]},${userLocation[1]}`;
            }
            window.open(url, '_blank');
          }}
          className="absolute -top-14 left-4 p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 animate-fade-in pointer-events-auto"
          aria-label="Navigate to station"
        >
          <Navigation className="w-5 h-5 fill-current" />
          <span className="font-semibold text-sm">Directions</span>
        </button>
      )}

      <button
        onClick={handleLocate}
        disabled={isLocating}
        className="absolute -top-14 right-4 p-3 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 pointer-events-auto"
        aria-label="Locate me"
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Locate className="w-5 h-5" />
        )}
      </button>

      {/* Panel container */}
      <div className="bg-background/95 backdrop-blur-md rounded-t-2xl shadow-2xl border-t border-border pointer-events-auto safe-p-bottom">
        {/* Always visible header - clickable to expand/collapse */}
        <div
          className="px-4 pt-4 pb-3 cursor-pointer active:bg-muted/30 transition-colors"
          onClick={() => onToggleExpand()}
        >
          {station ? (
            <>
              {/* Station header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {!selectedStation && nearestStation && distance !== null && !isNaN(distance) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Navigation className="w-3 h-3" />
                      <span>Nearest Station</span>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold">{station.name}</h2>
                  {station.nameGu && (
                    <p className="text-sm text-muted-foreground">{station.nameGu}</p>
                  )}
                </div>
                {selectedStation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Line badges */}
              <div className="flex gap-2 mb-2">
                {station.lines.map(line => (
                  <span
                    key={line}
                    className="px-2 py-0.5 rounded text-xs font-medium text-white capitalize"
                    style={{ backgroundColor: LINE_COLORS[line] }}
                  >
                    {line} Line
                  </span>
                ))}
                {station.isInterchange && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    🔄 Interchange
                  </span>
                )}
              </div>

              {/* Distance info */}
              {!selectedStation && distance !== null && walkingTime !== null && !isNaN(distance) && !isNaN(walkingTime) && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{formatDistance(distance)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm">{formatWalkingTime(walkingTime)} walk</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-3">
              <Train className="w-10 h-10 mx-auto mb-2 opacity-50 text-muted-foreground" />
              <h2 className="text-base font-semibold mb-1">Welcome to Ahmedabad Metro</h2>
              <p className="text-xs text-muted-foreground">Tap a station or enable location</p>
            </div>
          )}
        </div>

        {/* Collapsible content - Upcoming trains */}
        {station && (
          <div className={`transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'max-h-[60vh]' : 'max-h-0'}`}>
            <div className="px-4 pb-4 overflow-y-auto">
              {/* Last train warnings */}
              {lastTrainWarnings.length > 0 && (
                <div className="mb-3 space-y-2">
                  {lastTrainWarnings.map((warning, i) => (
                    <div
                      key={`${warning.destination}-${warning.lastTrainTime}`}
                      className="flex items-center gap-2 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        <span className="font-medium">Last train</span> to {warning.destination} departs in{' '}
                        <span className="font-semibold">{warning.minutesRemaining} min</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming trains */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Train className="w-4 h-4" />
                  Upcoming Trains
                  {upcomingTrains.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground font-normal">
                        · every {getCurrentHeadway(upcomingTrains[0].line).label}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground font-normal flex items-center">
                        Live
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full ml-1 animate-pulse" />
                      </span>
                    </>
                  )}
                </h3>
                {upcomingTrains.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingTrains.map((train) => {
                      const liveMinutes = getLiveMinutesAway(train.arrivalTime);
                      const crowd = getSimpleCrowdLevel(train.line, train.trainId || '');
                      return (
                        <div
                          key={`${train.arrivalTime}-${train.destination}`}
                          className="flex items-center justify-between p-2.5 bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: LINE_COLORS[train.line as keyof typeof LINE_COLORS] }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{train.destination}</div>
                              <div className="text-xs text-muted-foreground">{train.direction}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${crowd.level === 'low'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : crowd.level === 'moderate'
                                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}>
                              <Users className="w-3 h-3" />
                              <span>{crowd.label}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="text-sm font-semibold">{train.arrivalTime}</div>
                              <div className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${liveMinutes === 0 ? 'bg-green-500/20 text-green-600' : liveMinutes <= 2 ? 'bg-green-500/10 text-green-700' : liveMinutes <= 5 ? 'bg-yellow-500/10 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
                                {liveMinutes === 0 ? 'Now' : `${liveMinutes}m`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
                    Service hours: 06:20 - 22:00
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomPanel;
