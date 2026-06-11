import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Route, ArrowRight, Clock, Train,
  ChevronDown, ChevronUp, MapPin, ArrowDownUp, X,
  CircleDot, Circle, Bus, Share2, Check, Info
} from 'lucide-react';
import { stations, LINE_COLORS } from '@/data/metroData';
import { planRoute, planRouteWithDeparture, PlannedRoute, RouteStep, getStationOptions, getOrganizedStations, getAvailableDepartures, findCommonTrainRoute } from '@/lib/routePlanner';
import { cn } from '@/lib/utils';
import { useMetroCard } from '@/contexts/MetroCardContext';

// Parse time string "HH:MM" to minutes since midnight
const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
interface RoutePlannerProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrigin?: string;
  initialDestination?: string;
  onRouteChange?: (route: PlannedRoute | null) => void;
  isCoordinating?: boolean;
  sharedSegments?: { trainId: string; stations: string[] }[];
  friendDepMins?: number; // Friend's departure time in minutes for coordination
}

export const RoutePlanner = ({
  isOpen,
  onClose,
  initialOrigin,
  initialDestination,
  onRouteChange,
  isCoordinating = false,
  sharedSegments,
  friendDepMins
}: RoutePlannerProps) => {
  const { getDiscountedFare, hasMetroCard } = useMetroCard();
  const [origin, setOrigin] = useState(initialOrigin || '');
  const [destination, setDestination] = useState(initialDestination || '');
  const [originSearch, setOriginSearch] = useState(() => initialOrigin ? (stations[initialOrigin]?.name || '') : '');
  const [destSearch, setDestSearch] = useState(() => initialDestination ? (stations[initialDestination]?.name || '') : '');
  const [internalIsCoordinating, setInternalIsCoordinating] = useState(isCoordinating);
  const activeTrainRef = useRef<HTMLButtonElement>(null);


  // Sync initial props if they change after mount
  useEffect(() => {
    if (initialOrigin) {
      setOrigin(initialOrigin);
      setOriginSearch(stations[initialOrigin]?.name || '');
    }
  }, [initialOrigin]);

  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
      setDestSearch(stations[initialDestination]?.name || '');
    }
  }, [initialDestination]);

  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [selectedDepartureIdx, setSelectedDepartureIdx] = useState<number | null>(null);
  const [showDepartDropdown, setShowDepartDropdown] = useState(false);
  const [showArriveDropdown, setShowArriveDropdown] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setInternalIsCoordinating(isCoordinating);
  }, [isCoordinating]);

  const stationOptions = useMemo(() => getStationOptions(), []);
  const organizedStations = useMemo(() => getOrganizedStations(), []);

  // Get all available departures for this route
  const availableDepartures = useMemo(() => {
    if (!origin || !destination || origin === destination) return [];
    return getAvailableDepartures(origin, destination);
  }, [origin, destination]);

  // Create unique departure times list
  const uniqueDepartureTimes = useMemo(() => {
    const seen = new Set<string>();
    return availableDepartures.filter(dep => {
      if (seen.has(dep.departureTime)) return false;
      seen.add(dep.departureTime);
      return true;
    });
  }, [availableDepartures]);

  // Create unique arrival times list - for each arrival, keep the one with latest departure (shortest journey)
  const uniqueArrivalTimes = useMemo(() => {
    const arrivalMap = new Map<string, typeof availableDepartures[0]>();
    for (const dep of availableDepartures) {
      const existing = arrivalMap.get(dep.arrivalTime);
      // Keep the one with the latest departure (shortest travel time)
      if (!existing || dep.departureMinutes > existing.departureMinutes) {
        arrivalMap.set(dep.arrivalTime, dep);
      }
    }
    return Array.from(arrivalMap.values()).sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);
  }, [availableDepartures]);

  // Check if user is searching
  const isOriginSearching = originSearch.trim().length > 0;
  const isDestSearching = destSearch.trim().length > 0;

  const filteredOriginStations = useMemo(() => {
    if (!originSearch) return stationOptions;
    return stationOptions.filter(s =>
      s.name.toLowerCase().includes(originSearch.toLowerCase())
    );
  }, [stationOptions, originSearch]);

  const filteredDestStations = useMemo(() => {
    if (!destSearch) return stationOptions;
    return stationOptions.filter(s =>
      s.name.toLowerCase().includes(destSearch.toLowerCase())
    );
  }, [stationOptions, destSearch]);

  // Calculate route based on selected departure time or use default
  const route = useMemo(() => {
    try {
      if (!origin || !destination || origin === destination) return null;

      if (internalIsCoordinating && sharedSegments && sharedSegments.length > 0) {
        // Find route relative to friend's departure, giving user up to 120 minutes of travel time
        const baseTime = friendDepMins !== undefined
          ? Math.max(0, friendDepMins - 120)
          : 0;
        const coordinated = findCommonTrainRoute(sharedSegments, origin, destination, baseTime);
        return coordinated;
      }

      if (selectedDepartureIdx !== null && availableDepartures[selectedDepartureIdx]) {
        const dep = availableDepartures[selectedDepartureIdx];
        return planRouteWithDeparture(origin, destination, dep.departureMinutes);
      }

      return planRoute(origin, destination);
    } catch (e) {
      console.error("Error calculating route:", e);
      return null;
    }
  }, [origin, destination, selectedDepartureIdx, availableDepartures, internalIsCoordinating, sharedSegments, friendDepMins]);

  // Auto-scroll to selected train when route changes
  useEffect(() => {
    if (activeTrainRef.current) {
      // Small delay to ensure flex layout and overflow container are fully rendered
      const timer = setTimeout(() => {
        activeTrainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [route?.departureTime]);

// Calculate overlap with friend's journey when coordinating
   const overlapInfo = useMemo(() => {
    try {
      if (!internalIsCoordinating || !sharedSegments || !route) return null;

      const sharedTrainIds = sharedSegments.map(s => s.trainId);

      const commonTrains = route.steps
        .filter(step => step.trainId && sharedTrainIds.includes(step.trainId))
        .map(step => step.trainId as string);

      if (commonTrains.length === 0) return null;

      // Find the strict intersection of stations where the user is on the shared train AND the friend is too
      const sharedStations: string[] = [];
      route.steps.forEach((step) => {
        if (step.trainId) {
          const seg = sharedSegments.find(s => s.trainId === step.trainId);
          if (seg && step.allStations) {
            step.allStations.forEach(stationId => {
              if (seg.stations.includes(stationId) && !sharedStations.includes(stationId)) {
                sharedStations.push(stationId);
              }
            });
          }
        }
      });

      if (sharedStations.length < 2) return null;

      const firstStationName = stations[sharedStations[0]]?.name;
      const lastStationName = stations[sharedStations[sharedStations.length - 1]]?.name;

      if (!firstStationName || !lastStationName) return null;

      return {
        first: firstStationName,
        last: lastStationName,
        count: sharedStations.length - 1,
        trains: Array.from(new Set(commonTrains))
      };
    } catch (e) {
      console.error("Error calculating overlap info:", e);
      return null;
    }
  }, [internalIsCoordinating, sharedSegments, route]);

  // Notify parent when route changes
  useEffect(() => {
    onRouteChange?.(route);
  }, [route, onRouteChange]);

  // Update destination when initialDestination prop changes
  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
      setDestSearch(stations[initialDestination]?.name || '');
    }
  }, [initialDestination]);

  // Update origin when initialOrigin prop changes
  useEffect(() => {
    if (initialOrigin) {
      setOrigin(initialOrigin);
      setOriginSearch(stations[initialOrigin]?.name || '');
    }
  }, [initialOrigin]);

  // Reset selected departure when stations change
  useEffect(() => {
    setSelectedDepartureIdx(null);
  }, [origin, destination]);

  const swapStations = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginSearch(stations[destination]?.name || '');
    setDestSearch(stations[origin]?.name || '');
    setSelectedDepartureIdx(null);
  };

  const handleSelectDeparture = (departureTime: string) => {
    // Find the index in availableDepartures that matches this departure time
    const idx = availableDepartures.findIndex(d => d.departureTime === departureTime);
    if (idx !== -1) {
      setSelectedDepartureIdx(idx);
    }
    setShowDepartDropdown(false);
    setShowArriveDropdown(false);
  };

  const handleSelectArrival = (arrivalTime: string) => {
    // Find the departure with latest departure time for this arrival (shortest journey)
    const matchingDeps = availableDepartures.filter(d => d.arrivalTime === arrivalTime);
    if (matchingDeps.length > 0) {
      // Pick the one with latest departure (shortest journey)
      const best = matchingDeps.reduce((a, b) =>
        a.departureMinutes > b.departureMinutes ? a : b
      );
      const idx = availableDepartures.findIndex(d =>
        d.departureMinutes === best.departureMinutes && d.arrivalMinutes === best.arrivalMinutes
      );
      if (idx !== -1) {
        setSelectedDepartureIdx(idx);
      }
    }
    setShowDepartDropdown(false);
    setShowArriveDropdown(false);
  };

  const selectOrigin = (id: string) => {
    setOrigin(id);
    setOriginSearch(stations[id]?.name || '');
    setShowOriginDropdown(false);
  };

  const selectDestination = (id: string) => {
    setDestination(id);
    setDestSearch(stations[id]?.name || '');
    setShowDestDropdown(false);
  };

  const handleShareRide = async () => {
    if (!route || !route.departureTime) return;

    // Use the actual departure time from the route being displayed, not from dropdown index
    const depMins = route.departureMinutes ?? parseTimeToMinutes(route.departureTime);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('orig', origin);
      url.searchParams.set('dest', destination);
      url.searchParams.set('depMins', depMins.toString());

      await navigator.clipboard.writeText(url.toString());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const getLineColor = (line?: keyof typeof LINE_COLORS) => {
    return line ? LINE_COLORS[line] : '#6B7280';
  };

  const renderStepIcon = (step: RouteStep, index: number, total: number) => {
    const isFirst = index === 0;
    const isLast = index === total - 1;

    if (step.type === 'board' || isFirst) {
      return <CircleDot className="w-5 h-5" style={{ color: getLineColor(step.line) }} />;
    }
    if (step.type === 'alight' || isLast) {
      return <MapPin className="w-5 h-5 text-red-500" />;
    }
    if (step.type === 'interchange') {
      return <ArrowDownUp className="w-5 h-5 text-amber-500" />;
    }
    if (step.type === 'bus') {
      return <Bus className="w-5 h-5 text-emerald-500" />;
    }
    return <Circle className="w-4 h-4" style={{ color: getLineColor(step.line) }} />;
  };

  const renderStep = (step: RouteStep, index: number, steps: RouteStep[]) => {
    switch (step.type) {
      case 'board':
        return (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {renderStepIcon(step, index, steps.length)}
              <div
                className="w-1 h-12 mt-1 rounded-full"
                style={{ backgroundColor: getLineColor(step.line) }}
              />
            </div>
            <div className="flex-1 pb-4">
              <p className="font-semibold">{step.station.name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Board{' '}
                  <span
                    className="font-medium px-1.5 py-0.5 rounded text-white text-xs"
                    style={{ backgroundColor: getLineColor(step.line) }}
                  >
                    {step.line?.toUpperCase()} LINE
                  </span>
                </p>
                {step.trainTime && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    🕐 {step.trainTime}
                  </span>
                )}
                {step.isDirect && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    ✓ Direct Metro
                  </span>
                )}
              </div>
              {step.direction && (
                <p className="text-xs text-muted-foreground mt-1">{step.direction}</p>
              )}
            </div>
          </div>
        );

      case 'travel':
        return (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-1 flex-1 rounded-full"
                style={{ backgroundColor: getLineColor(step.line) }}
              />
            </div>
            <div className="flex-1 py-2">
              {showDetails && step.stations && step.stations.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {step.stations.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Circle className="w-2 h-2" style={{ color: getLineColor(step.line) }} />
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Train className="w-3 h-3" />
                <span>{step.stationCount} station{step.stationCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>~{Math.round((step.stationCount || 1) * 2.5)} min</span>
              </div>
            </div>
          </div>
        );

      case 'interchange':
        return (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {renderStepIcon(step, index, steps.length)}
              <div
                className="w-1 h-12 mt-1 rounded-full"
                style={{ backgroundColor: getLineColor(step.line) }}
              />
            </div>
            <div className="flex-1 pb-4">
              <p className="font-semibold">{step.station.name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  🔄 Change to{' '}
                  <span
                    className="px-1.5 py-0.5 rounded text-white text-xs"
                    style={{ backgroundColor: getLineColor(step.line) }}
                  >
                    {step.line?.toUpperCase()} LINE
                  </span>
                </p>
                {step.trainTime && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    🕐 {step.trainTime}
                  </span>
                )}
              </div>
              {step.arrivalTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  Arrive at {step.arrivalTime}
                </p>
              )}
              {step.direction && (
                <p className="text-xs text-muted-foreground mt-1">{step.direction}</p>
              )}
              {step.waitTime !== undefined && (
                <p className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  step.waitTime <= 3
                    ? "text-red-600 dark:text-red-400 font-semibold"
                    : step.waitTime > 15
                      ? "text-amber-600 dark:text-amber-400 font-medium"
                      : "text-muted-foreground"
                )}>
                  <Clock className="w-3 h-3" />
                  {step.waitTime} min wait
                  {step.waitTime <= 3 && (
                    <span className="ml-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                      Hurry!
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        );

      case 'bus':
        return (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Bus className="w-4 h-4 text-white" />
              </div>
              <div className="w-1 h-12 mt-1 rounded-full bg-emerald-500" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, hsl(var(--background)) 4px, hsl(var(--background)) 8px)' }} />
            </div>
            <div className="flex-1 pb-4">
              <p className="font-semibold">{step.station.name}</p>
              <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mt-2">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  🚌 Take Bus to {step.busDestination}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bus stop is just below the metro station. Buses run frequently.
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  ~{step.busDestination === 'PDPU' ? '8' : '15'} min • Faster than waiting for metro
                </p>
              </div>
            </div>
          </div>
        );

      case 'alight':
        return (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {renderStepIcon(step, index, steps.length)}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{step.station.name}</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                🎯 Exit here
              </p>
              {step.arrivalTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  Arrive at {step.arrivalTime}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md max-h-[90vh] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col safe-p-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">
              {internalIsCoordinating ? "Coordinate with Friend" : "Plan Your Journey"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Late Night Alert */}
        {new Date().getHours() >= 23 || new Date().getHours() < 6 ? (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Outside Operating Hours</p>
              <p className="text-xs text-amber-600/90 dark:text-amber-500/90 mt-0.5">
                Service hours are 6:20 AM - 11:00 PM (Ahmedabad) and 6:20 AM - 10:00 PM (Gandhinagar). Routes shown now are estimated for tomorrow morning.
              </p>
            </div>
          </div>
        ) : null}

        {/* Coordination Status */}
        {internalIsCoordinating && (
          <div className="bg-primary/10 border-b border-primary/20 flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase tracking-wider">Syncing with Friend's Journey</span>
              </div>
              <button
                onClick={() => setInternalIsCoordinating(false)}
                className="text-[10px] font-bold text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
              >
                Exit Sync
              </button>
            </div>
            {overlapInfo ? (
              <div className="px-4 pb-3">
                <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border border-primary/20 shadow-sm flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Train className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase leading-tight">Travel Together For</p>
                    <p className="text-sm font-black text-foreground">
                      {overlapInfo.count} stops <span className="text-muted-foreground font-medium">({overlapInfo.first} → {overlapInfo.last})</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black bg-green-500 text-white px-2 py-1 rounded-md uppercase">Synced</span>
                  </div>
                </div>
                {route && route.departureTime && (
                  <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10 flex items-start gap-2 animate-pulse">
                    <Clock className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Depart {route.origin.name} at exactly <span className="text-primary font-black bg-primary/10 px-1 py-0.5 rounded">{route.departureTime}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">To reach the interchange station on time</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 pb-3">
                <div className="bg-muted/50 rounded-xl p-3 border border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium italic leading-tight">
                    You cannot reach the shared metro in time from this origin. Try a closer station.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Station Selection */}
        <div className="p-4 space-y-3">
          {/* Origin */}
          <div className="relative">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border focus-within:border-primary transition-colors">
              <CircleDot className="w-4 h-4 text-green-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="From station..."
                value={originSearch}
                onChange={(e) => {
                  setOriginSearch(e.target.value);
                  setShowOriginDropdown(true);
                }}
                onFocus={() => setShowOriginDropdown(true)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            {showOriginDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto z-10">
                {isOriginSearching ? (
                  filteredOriginStations.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectOrigin(s.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                        origin === s.id && "bg-primary/10"
                      )}
                    >
                      <Train className="w-3 h-3 text-muted-foreground" />
                      <span>{s.name}</span>
                      <div className="flex gap-1 ml-auto">
                        {s.lines.map(l => (
                          <span
                            key={l}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: LINE_COLORS[l as keyof typeof LINE_COLORS] }}
                          />
                        ))}
                      </div>
                    </button>
                  ))
                ) : (
                  <>
                    {organizedStations.interchanges.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-popover/95 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
                          Interchange Stations
                        </div>
                        {organizedStations.interchanges.map(s => (
                          <button
                            key={s.id}
                            onClick={() => selectOrigin(s.id)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                              origin === s.id && "bg-primary/10"
                            )}
                          >
                            <Train className="w-3 h-3 text-muted-foreground" />
                            <span>{s.name}</span>
                            <div className="flex gap-1 ml-auto">
                              {s.lines.map(l => (
                                <span
                                  key={l}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: LINE_COLORS[l as keyof typeof LINE_COLORS] }}
                                />
                              ))}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {organizedStations.byLine.map(group => (
                      <div key={group.line}>
                        <div 
                          className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-popover/95 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50 flex items-center gap-2"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: LINE_COLORS[group.line as keyof typeof LINE_COLORS] }}
                          />
                          {group.lineName}
                        </div>
                        {group.stations.map(s => (
                          <button
                            key={s.id}
                            onClick={() => selectOrigin(s.id)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                              origin === s.id && "bg-primary/10"
                            )}
                          >
                            <Train className="w-3 h-3 text-muted-foreground" />
                            <span>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <button
              onClick={swapStations}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              disabled={!origin && !destination}
            >
              <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Destination */}
          <div className="relative">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border focus-within:border-primary transition-colors">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="To station..."
                value={destSearch}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  setShowDestDropdown(true);
                }}
                onFocus={() => setShowDestDropdown(true)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            {showDestDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto z-10">
                {isDestSearching ? (
                  filteredDestStations.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectDestination(s.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                        destination === s.id && "bg-primary/10"
                      )}
                    >
                      <Train className="w-3 h-3 text-muted-foreground" />
                      <span>{s.name}</span>
                      <div className="flex gap-1 ml-auto">
                        {s.lines.map(l => (
                          <span
                            key={l}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: LINE_COLORS[l as keyof typeof LINE_COLORS] }}
                          />
                        ))}
                      </div>
                    </button>
                  ))
                ) : (
                  <>
                    {organizedStations.interchanges.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-popover/95 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
                          Interchange Stations
                        </div>
                        {organizedStations.interchanges.map(s => (
                          <button
                            key={s.id}
                            onClick={() => selectDestination(s.id)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                              destination === s.id && "bg-primary/10"
                            )}
                          >
                            <Train className="w-3 h-3 text-muted-foreground" />
                            <span>{s.name}</span>
                            <div className="flex gap-1 ml-auto">
                              {s.lines.map(l => (
                                <span
                                  key={l}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: LINE_COLORS[l as keyof typeof LINE_COLORS] }}
                                />
                              ))}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {organizedStations.byLine.map(group => (
                      <div key={group.line}>
                        <div 
                          className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-popover/95 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50 flex items-center gap-2"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: LINE_COLORS[group.line as keyof typeof LINE_COLORS] }}
                          />
                          {group.lineName}
                        </div>
                        {group.stations.map(s => (
                          <button
                            key={s.id}
                            onClick={() => selectDestination(s.id)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2",
                              destination === s.id && "bg-primary/10"
                            )}
                          >
                            <Train className="w-3 h-3 text-muted-foreground" />
                            <span>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Route Result */}
        {route && (
          <div className="flex-1 overflow-y-auto border-t border-border">
            {/* Summary */}
            <div className="p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{route.origin.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{route.destination.name}</span>
                  {route.isDirect && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium ml-2">
                      Direct Metro
                    </span>
                  )}
                  {route.hasBusSegment && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium ml-2">
                      🚌 Includes Bus
                    </span>
                  )}
                </div>
              </div>

              {/* Available Departures (Modern Chips) */}
              {route.departureTime && route.arrivalTime && availableDepartures.length > 0 && !internalIsCoordinating && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Available Metros</p>
                  <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    {uniqueDepartureTimes.map((dep, idx) => {
                      const isSelected = route.departureTime === dep.departureTime;
                      return (
                        <button
                          key={idx}
                          ref={isSelected ? activeTrainRef : null}
                          onClick={() => handleSelectDeparture(dep.departureTime)}
                          className={cn(
                            "flex-shrink-0 flex flex-col items-center justify-center min-w-[90px] p-2.5 rounded-2xl border transition-all",
                            isSelected 
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                              : "bg-background border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <span className="font-black text-lg leading-none mb-1">{dep.departureTime}</span>
                          <span className={cn("text-[9px] uppercase tracking-wider font-bold mb-1.5", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                            Arr {dep.arrivalTime}
                          </span>
                          <div className={cn(
                            "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full", 
                            isSelected 
                              ? "bg-primary-foreground/20 text-primary-foreground" 
                              : dep.interchangeCount === 0 
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          )}>
                            {dep.interchangeCount === 0 ? "Direct" : `${dep.interchangeCount} Change`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{route.totalTime} min</span>
                </div>

                {route.routeConfidence && (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                        route.routeConfidence === 'timetable'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : route.routeConfidence === 'mixed'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {route.routeConfidence === 'timetable'
                        ? 'Official Timetable'
                        : route.routeConfidence === 'mixed'
                          ? 'Timetable + Estimates'
                          : 'Estimates'
                      }
                    </span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground w-full bg-muted/50 p-2 rounded border border-border mt-1">
                  <p className="font-medium text-foreground mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Note: Planning & visuals are approximate</p>
                  {route.routeConfidence === 'timetable'
                    ? 'Times shown are computed from the official timetable, but real-world delays may occur.'
                    : route.routeConfidence === 'mixed'
                      ? 'Part of this route uses official timetable data; the rest uses standard travel estimates.'
                      : 'This route uses standard travel estimates. Real-world times may vary.'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Train className="w-4 h-4 text-primary" />
                  <span>{route.totalStations} stations</span>
                </div>
                {route.interchangeCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ArrowDownUp className="w-4 h-4 text-amber-500" />
                    <span>{route.interchangeCount} change{route.interchangeCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {route.hasBusSegment && (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Bus className="w-4 h-4" />
                    <span>+ Bus</span>
                  </div>
                )}
                {route.interchangeCount === 0 && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <span>No interchange needed</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold border-l border-border pl-4">
                  <span className="text-sm">
                    ₹{getDiscountedFare(route.fare)}
                    {hasMetroCard && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 ml-1">(-10%)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Share Button */}
              {route.steps[0].trainId && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleShareRide}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        Share this Ride
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Toggle details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors border-b border-border"
            >
              {showDetails ? (
                <>Hide stops <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show all stops <ChevronDown className="w-4 h-4" /></>
              )}
            </button>

            {/* Journey Steps */}
            <div className="p-4">
              {route.steps.map((step, index) => (
                <div key={index}>
                  {renderStep(step, index, route.steps)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No route state */}
        {origin && destination && origin !== destination && !route && (
          <div className="p-8 text-center text-muted-foreground">
            <Route className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No route found between these stations</p>
          </div>
        )}

        {/* Empty state */}
        {(!origin || !destination) && (
          <div className="p-8 text-center text-muted-foreground">
            <Train className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select origin and destination stations</p>
          </div>
        )}
      </div>
    </div >
  );
};

export default RoutePlanner;
