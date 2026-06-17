import { useState, useEffect, useMemo } from 'react';
import { X, Route, Share2, ArrowRight, Train, Clock, MapPin, Check } from 'lucide-react';
import { stations } from '@/data/metroData';
import { calculateJourneyProgress, planRouteWithDeparture, PlannedRoute, getStationOptions } from '@/lib/routePlanner';
import { cn, getISTDate } from '@/lib/utils';

interface FriendsJourneyViewerProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        origin: string;
        dest: string;
        depMins: number;
    } | null;
    onCoordinate: (customDest?: string) => void;
}

const formatMinutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const FriendsJourneyViewer = ({ isOpen, onClose, data, onCoordinate }: FriendsJourneyViewerProps) => {
    const [route, setRoute] = useState<PlannedRoute | null>(null);
    const [journeyProgress, setJourneyProgress] = useState<ReturnType<typeof calculateJourneyProgress> | null>(null);
    const [customDest, setCustomDest] = useState<string>('');
    const [destSearch, setDestSearch] = useState('');
    const [showDestDropdown, setShowDestDropdown] = useState(false);

    const stationOptions = useMemo(() => getStationOptions(), []);
    const filteredStations = useMemo(() => {
        return destSearch ? stationOptions.filter(s => s.name.toLowerCase().includes(destSearch.toLowerCase())) : stationOptions;
    }, [destSearch, stationOptions]);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!data || !isOpen) return;

        setIsLoading(true);
        const timerId = setTimeout(() => {
            try {
                // Plan the exact route to show the friend's path
                const pRoute = planRouteWithDeparture(data.origin, data.dest, data.depMins);
                setRoute(pRoute);
                setCustomDest(data.dest);
                setDestSearch(stations[data.dest]?.name || '');
            } finally {
                setIsLoading(false);
            }
        }, 10);

        return () => clearTimeout(timerId);
    }, [data, isOpen]);
    
    // Update progress when route changes and set up interval
    useEffect(() => {
        if (route) {
            const updateProgress = () => {
                const now = getISTDate();
                const currentMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
                setJourneyProgress(calculateJourneyProgress(route, currentMins));
            };
            
            updateProgress();
            const interval = setInterval(updateProgress, 1000);
            return () => clearInterval(interval);
        }
    }, [route]);

    if (!isOpen || !data) return null;

    return (
        <div className={cn(
            "fixed inset-x-0 bottom-0 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl transition-all duration-300 transform rounded-t-3xl overflow-hidden z-[1005] safe-p-bottom",
            isOpen ? "translate-y-0" : "translate-y-full"
        )}>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-blue-600/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                        <Share2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Friend's Journey</h2>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">Shared Trip</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Status Banner */}
                    {journeyProgress && (
                        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-5 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Live Tracker</span>
                            </div>
                            <p className="text-2xl font-black mb-3 text-foreground leading-tight">{journeyProgress.statusText}</p>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-primary transition-all duration-1000 ease-out"
                                    style={{ width: `${journeyProgress.progress * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <span>{formatMinutesToTime(data.depMins)} DEP</span>
                                <span>{Math.round(journeyProgress.progress * 100)}% Trip Complete</span>
                                <span>{route?.arrivalTime || '--:--'} ARR</span>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="bg-muted/30 border border-border rounded-3xl p-6 space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col items-center flex-1 space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
                                    <div className="w-16 h-4 bg-muted animate-pulse rounded-full" />
                                    <div className="w-20 h-6 bg-muted animate-pulse rounded-full" />
                                </div>
                                <div className="flex flex-col items-center flex-1 space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
                                    <div className="w-16 h-4 bg-muted animate-pulse rounded-full" />
                                    <div className="w-20 h-6 bg-muted animate-pulse rounded-full" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                                <div className="h-16 bg-muted animate-pulse rounded-2xl" />
                                <div className="h-16 bg-muted animate-pulse rounded-2xl" />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-muted/30 border border-border rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Route size={120} />
                            </div>

                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-2">
                                        <Clock className="text-green-600" size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase">Depart</p>
                                    <p className="text-xl font-black">{formatMinutesToTime(data.depMins)}</p>
                                    <p className="text-[11px] font-bold mt-1 text-center truncate w-full">{stations[data.origin]?.name}</p>
                                </div>

                                <div className="flex flex-col items-center px-4">
                                    <ArrowRight className="text-muted-foreground mb-4" />
                                </div>

                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-2">
                                        <MapPin className="text-red-600" size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase">Arrive</p>
                                    <p className="text-xl font-black">{route?.arrivalTime || '--:--'}</p>
                                    <p className="text-[11px] font-bold mt-1 text-center truncate w-full">{stations[data.dest]?.name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                                <div className="bg-background/50 rounded-2xl p-3 flex items-center gap-3">
                                    <Train size={18} className="text-primary" />
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Stops</p>
                                        <p className="text-sm font-black">{route?.totalStations || '--'}</p>
                                    </div>
                                </div>
                                <div className="bg-background/50 rounded-2xl p-3 flex items-center gap-3">
                                    <Clock size={18} className="text-primary" />
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Time</p>
                                        <p className="text-sm font-black">{route?.totalTime || '--'} min</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Steps */}
                    {isLoading ? (
                        <div className="space-y-4 pt-4">
                            <div className="w-32 h-4 bg-muted animate-pulse rounded-full" />
                            <div className="bg-muted/30 border border-border rounded-3xl p-5 space-y-6">
                                <div className="w-full h-12 bg-muted animate-pulse rounded-xl" />
                                <div className="w-full h-12 bg-muted animate-pulse rounded-xl" />
                                <div className="w-full h-12 bg-muted animate-pulse rounded-xl" />
                            </div>
                        </div>
                    ) : route && route.steps.length > 0 && (
                        <div className="space-y-3 pt-4">
                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">Journey Details</h3>
                            <div className="bg-muted/30 border border-border rounded-3xl p-5 space-y-4">
                                {route.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                            {idx < route.steps.length - 1 && <div className="w-0.5 h-full bg-border my-1" />}
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <p className="text-sm font-bold">
                                                {step.type === 'board' ? `Board ${step.line} line at ${step.station.name}` : 
                                                 step.type === 'interchange' ? `Interchange at ${step.station.name} to ${step.line} line` : 
                                                 step.type === 'alight' ? `Arrive at ${step.station.name}` : 
                                                 step.type === 'travel' ? `Travel ${step.stationCount} stops` : 
                                                 `${step.type}`} 
                                            </p>
                                            
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                {step.type === 'board' && step.trainTime && (
                                                    <p className="text-xs text-primary font-bold flex items-center gap-1.5 bg-primary/10 w-fit px-2 py-0.5 rounded-full">
                                                        <Clock size={12} />
                                                        Departing at {step.trainTime}
                                                    </p>
                                                )}
                                                
                                                {step.type === 'interchange' && (
                                                    <>
                                                        {step.arrivalTime && (
                                                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                <Clock size={10} />
                                                                Arrive at {step.arrivalTime}
                                                            </p>
                                                        )}
                                                        {step.trainTime && (
                                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 w-fit px-2 py-0.5 rounded-full mt-1">
                                                                <Clock size={10} />
                                                                Next metro at {step.trainTime}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                                
                                                {step.type === 'alight' && step.arrivalTime && (
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
                                                        <Clock size={12} />
                                                        Arriving at {step.arrivalTime}
                                                    </p>
                                                )}
                                                
                                                {step.type === 'travel' && step.direction && (
                                                    <p className="text-[11px] text-muted-foreground font-medium mb-3">
                                                        Towards {step.direction}
                                                    </p>
                                                )}

                                                {step.type === 'travel' && step.allStations && (
                                                    <div className="mt-3 relative ml-1 space-y-3">
                                                        <div className="absolute top-2 bottom-2 left-1 w-[2px] bg-border/50" />
                                                        {step.allStations.map((stationId, sIdx) => {
                                                            const isCurrent = journeyProgress?.currentStationId === stationId;
                                                            const isNext = journeyProgress?.nextStationId === stationId;
                                                            // If we can't perfectly determine "passed", let's just highlight current/next
                                                            const stationInfo = stations[stationId];
                                                            
                                                            return (
                                                                <div key={stationId} className="relative flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-[10px] h-[10px] rounded-full z-10 bg-background border-2 border-muted-foreground/30",
                                                                        isCurrent && "w-3 h-3 bg-primary border-primary animate-pulse -ml-px",
                                                                        isNext && "border-primary bg-primary/20"
                                                                    )} />
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "text-xs",
                                                                            isCurrent ? "text-primary font-bold" : isNext ? "text-foreground font-medium" : "text-muted-foreground font-medium"
                                                                        )}>
                                                                            {stationInfo?.name || stationId}
                                                                        </span>
                                                                        {isCurrent && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Here</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Call to Action & Customization */}
                    <div className="space-y-4 pb-8">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Your Destination</p>
                            <div className="relative">
                                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-border focus-within:border-primary transition-all">
                                    <MapPin size={18} className="text-red-500" />
                                    <input
                                        type="text"
                                        className="bg-transparent border-none outline-none text-sm font-bold flex-1"
                                        placeholder="Where are you going?"
                                        value={destSearch}
                                        onChange={(e) => {
                                            setDestSearch(e.target.value);
                                            setShowDestDropdown(true);
                                        }}
                                        onFocus={() => setShowDestDropdown(true)}
                                    />
                                    {customDest !== data.dest && (
                                        <button
                                            onClick={() => {
                                                setCustomDest(data.dest);
                                                setDestSearch(stations[data.dest]?.name || '');
                                            }}
                                            className="text-[10px] font-bold text-primary hover:underline"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                {showDestDropdown && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-[1006] animate-in slide-in-from-bottom-2 duration-200">
                                        {filteredStations.slice(0, 8).map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    setCustomDest(s.id);
                                                    setDestSearch(s.name);
                                                    setShowDestDropdown(false);
                                                }}
                                                className="w-full p-4 text-left text-sm font-bold hover:bg-primary/5 transition-colors border-b border-border last:border-0 flex items-center justify-between"
                                            >
                                                <span>{s.name}</span>
                                                {customDest === s.id && <Check size={14} className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => onCoordinate(customDest)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-3xl font-black shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <Train size={20} />
                            Coordinate & Travel Together
                        </button>
                        <p className="text-[11px] text-center text-muted-foreground font-medium px-8 leading-relaxed">
                            {customDest === data.dest
                                ? "Traveling to the same destination! We'll find the best Metros to meet up."
                                : `Meeting friend on their journey from ${stations[data.origin]?.name} to ${stations[data.dest]?.name}.`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
