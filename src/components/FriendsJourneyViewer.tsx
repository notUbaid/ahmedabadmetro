import { useState, useEffect, useMemo } from 'react';
import { X, Route, Share2, ArrowRight, Train, Clock, MapPin, Check } from 'lucide-react';
import { stations } from '@/data/metroData';
import { calculateJourneyProgress, planRouteWithDeparture, PlannedRoute, getStationOptions } from '@/lib/routePlanner';
import { cn, getISTDate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStationName } from '@/lib/i18n';

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
    const clamped = ((Math.floor(minutes) % 1440) + 1440) % 1440; // URL-tampered depMins can be negative
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const FriendsJourneyViewer = ({ isOpen, onClose, data, onCoordinate }: FriendsJourneyViewerProps) => {
    const [route, setRoute] = useState<PlannedRoute | null>(null);
    const [journeyProgress, setJourneyProgress] = useState<ReturnType<typeof calculateJourneyProgress> | null>(null);
    const [customDest, setCustomDest] = useState<string>('');
    const [destSearch, setDestSearch] = useState('');
    const [showDestDropdown, setShowDestDropdown] = useState(false);
    const { language } = useLanguage();

    const stationOptions = useMemo(() => getStationOptions(), []);
    const filteredStations = useMemo(() => {
        if (!destSearch) return stationOptions;
        const query = destSearch.toLowerCase().trim();
        return stationOptions.filter(s => {
            const orig = stations[s.id];
            return (
                s.name.toLowerCase().includes(query) ||
                (orig?.nameGu && orig.nameGu.includes(query)) ||
                (orig?.nameHi && orig.nameHi.includes(query)) ||
                orig?.aliases?.some(a => a.toLowerCase().includes(query)) ||
                s.id.toLowerCase().includes(query)
            );
        });
    }, [destSearch, stationOptions]);

    useEffect(() => {
        if (!data || !isOpen) return;

        // Plan the exact route immediately without artificial delay
        const pRoute = planRouteWithDeparture(data.origin, data.dest, data.depMins);
        setRoute(pRoute);
        setCustomDest(data.dest);
        setDestSearch(stations[data.dest]?.name || '');
        
        if (pRoute) {
            const now = getISTDate();
            const currentMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
            setJourneyProgress(calculateJourneyProgress(pRoute, currentMins, language));
        }
    }, [data, isOpen, language]);
    
    // Update progress continuously every second with zero delay
    useEffect(() => {
        if (!route || !isOpen) return;

        const updateProgress = () => {
            const now = getISTDate();
            const currentMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
            setJourneyProgress(calculateJourneyProgress(route, currentMins, language));
        };

        updateProgress();
        const interval = setInterval(updateProgress, 1000);
        return () => clearInterval(interval);
    }, [route, isOpen, language]);

    if (!isOpen || !data) return null;

    return (
        <div className={cn(
            "fixed inset-x-0 bottom-0 bg-background/90 backdrop-blur-xl border-t border-border shadow-2xl transition-all duration-300 transform rounded-t-3xl overflow-hidden z-[1005] safe-p-bottom",
            isOpen ? "translate-y-0" : "translate-y-full"
        )}>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-blue-600/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                        <Share2 size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold">{t('friendsJourney.title', language)}</h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                {t('common.estimated', language)}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">{t('friendsJourney.scheduleSync', language)}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Status Banner */}
                    {journeyProgress && (
                        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-5 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{t('friendsJourney.journeyStatus', language)}</span>
                                </div>
                                <span className="text-[11px] font-bold text-muted-foreground">
                                    {journeyProgress.status === 'completed' ? t('friendsJourney.completed', language) : journeyProgress.status === 'upcoming' ? t('friendsJourney.scheduled', language) : t('friendsJourney.onSchedule', language)}
                                </span>
                            </div>
                            <p className="text-2xl font-black mb-1 text-foreground leading-tight">{journeyProgress.statusText}</p>
                            {journeyProgress.subStatusText && (
                                <p className="text-xs font-semibold text-muted-foreground mb-3">{journeyProgress.subStatusText}</p>
                            )}
                            <div className="h-3 w-full bg-muted/80 rounded-full overflow-hidden mb-2 shadow-inner">
                                <div
                                    className="h-full bg-primary transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.max(4, Math.round(journeyProgress.progress * 100))}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <span>{formatMinutesToTime(data.depMins)} DEP</span>
                                <span className="text-primary font-black">{Math.round(journeyProgress.progress * 100)}% {t('friendsJourney.complete', language)}</span>
                                <span>{route?.arrivalTime || '--:--'} ARR</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-muted/30 border border-border rounded-3xl p-6 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-2">
                                        <Clock className="text-green-600" size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase">{t('friendsJourney.depart', language)}</p>
                                    <p className="text-xl font-black">{formatMinutesToTime(data.depMins)}</p>
                                    <p className="text-[11px] font-bold mt-1 text-center truncate w-full">{getStationName(stations[data.origin], language)}</p>
                                </div>

                                <div className="flex flex-col items-center px-4">
                                    <ArrowRight className="text-muted-foreground mb-4" />
                                </div>

                                <div className="flex flex-col items-center flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-2">
                                        <MapPin className="text-red-600" size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase">{t('friendsJourney.arrive', language)}</p>
                                    <p className="text-xl font-black">{route?.arrivalTime || '--:--'}</p>
                                    <p className="text-[11px] font-bold mt-1 text-center truncate w-full">{getStationName(stations[data.dest], language)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                                <div className="bg-background/50 rounded-2xl p-3 flex items-center gap-3">
                                    <Train size={18} className="text-primary" />
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('route.stops', language)}</p>
                                        <p className="text-sm font-black">{route?.totalStations || '--'}</p>
                                    </div>
                                </div>
                                <div className="bg-background/50 rounded-2xl p-3 flex items-center gap-3">
                                    <Clock size={18} className="text-primary" />
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('friendsJourney.time', language)}</p>
                                        <p className="text-sm font-black">{route?.totalTime || '--'} min</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    {/* Detailed Steps */}
                    {route && route.steps.length > 0 && (
                        <div className="space-y-3 pt-4">
                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">{t('friendsJourney.details', language)}</h3>
                            <div className="bg-muted/30 border border-border rounded-3xl p-5 space-y-4">
                                {route.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 ring-2 ring-primary/20" />
                                            {idx < route.steps.length - 1 && <div className="w-0.5 h-full bg-border my-1" />}
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <p className="text-sm font-bold">
                                                {step.type === 'board' ? t('friendsJourney.boardAt', language).replace('{line}', step.line).replace('{station}', getStationName(step.station, language)) :
                                                 step.type === 'interchange' ? t('friendsJourney.interchangeAt', language).replace('{line}', step.line).replace('{station}', getStationName(step.station, language)) :
                                                 step.type === 'alight' ? t('friendsJourney.arriveAtStation', language).replace('{station}', getStationName(step.station, language)) :
                                                 step.type === 'travel' ? t('friendsJourney.travelStops', language).replace('{count}', String(step.stationCount ?? '')) :
                                                 `${step.type}`}
                                            </p>
                                            
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                {step.type === 'board' && step.trainTime && (
                                                    <p className="text-xs text-primary font-bold flex items-center gap-1.5 bg-primary/10 w-fit px-2.5 py-0.5 rounded-full">
                                                        <Clock size={12} />
                                                        {t('friendsJourney.departingAt', language).replace('{time}', step.trainTime)}
                                                    </p>
                                                )}
                                                
                                                {step.type === 'interchange' && (
                                                    <>
                                                        {step.arrivalTime && (
                                                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                <Clock size={10} />
                                                                {t('friendsJourney.arriveAtTime', language).replace('{time}', step.arrivalTime)}
                                                            </p>
                                                        )}
                                                        {step.trainTime && (
                                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 w-fit px-2 py-0.5 rounded-full mt-1">
                                                                <Clock size={10} />
                                                                {t('friendsJourney.nextMetroAt', language).replace('{time}', step.trainTime)}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                                
                                                {step.type === 'alight' && step.arrivalTime && (
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 w-fit px-2.5 py-0.5 rounded-full">
                                                        <Clock size={12} />
                                                        {t('friendsJourney.arriveAtTime', language).replace('{time}', step.arrivalTime)}
                                                    </p>
                                                )}
                                                
                                                {step.type === 'travel' && step.direction && (
                                                    <p className="text-[11px] text-muted-foreground font-medium mb-3">
                                                        {t('direction.towards', language).replace('{station}', step.direction)}
                                                    </p>
                                                )}

                                                {step.type === 'travel' && step.allStations && (
                                                    <div className="mt-3 relative ml-1 space-y-3">
                                                        <div className="absolute top-2 bottom-2 left-1 w-[2px] bg-border/50" />
                                                        {step.allStations.map((stationId) => {
                                                            const stationInfo = stations[stationId];
                                                            const isPassed = journeyProgress?.passedStationIds?.includes(stationId);
                                                            const isCurrent = journeyProgress?.currentStationId === stationId && (journeyProgress.isAtStation || journeyProgress.status === 'upcoming');
                                                            const isNext = journeyProgress?.nextStationId === stationId && !isCurrent;
                                                            
                                                            return (
                                                                <div key={stationId} className="relative flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-[10px] h-[10px] rounded-full z-10 bg-background border-2 border-muted-foreground/30 transition-all duration-300",
                                                                        isPassed && "w-[10px] h-[10px] bg-emerald-500 border-emerald-500",
                                                                        isCurrent && "w-3.5 h-3.5 bg-primary border-primary ring-4 ring-primary/20 -ml-[3px] animate-pulse",
                                                                        isNext && "w-3 h-3 border-primary bg-primary/20 ring-2 ring-primary/30 -ml-[1px]"
                                                                    )} />
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={cn(
                                                                            "text-xs transition-colors",
                                                                            isCurrent ? "text-primary font-black" : isNext ? "text-foreground font-bold" : isPassed ? "text-muted-foreground/70 font-medium" : "text-muted-foreground font-medium"
                                                                        )}>
                                                                            {stationInfo?.name || stationId}
                                                                        </span>
                                                                        {isCurrent && (
                                                                            <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                {t('friendsJourney.here', language)}
                                                                            </span>
                                                                        )}
                                                                        {isNext && (
                                                                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                                                {t('dialog.nextStop', language)}
                                                                            </span>
                                                                        )}
                                                                        {isPassed && !isCurrent && !isNext && (
                                                                            <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                                                                <Check size={10} />
                                                                                {t('friendsJourney.passed', language)}
                                                                            </span>
                                                                        )}
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
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">{t('friendsJourney.yourDestination', language)}</p>
                            <div className="relative">
                                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-border focus-within:border-primary transition-all">
                                    <MapPin size={18} className="text-red-500" />
                                    <input
                                        type="text"
                                        className="bg-transparent border-none outline-none text-sm font-bold flex-1"
                                        placeholder={t('friendsJourney.whereGoing', language)}
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
                                            className="text-[10px] font-bold text-primary hover:underline px-2 py-3 -my-2"
                                        >
                                            {t('friendsJourney.reset', language)}
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
                                                <span>{getStationName(s, language)}</span>
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
                            {t('friendsJourney.coordinateCta', language)}
                        </button>
                        <p className="text-[11px] text-center text-muted-foreground font-medium px-8 leading-relaxed">
                            {customDest === data.dest
                                ? t('friendsJourney.sameDest', language)
                                : t('friendsJourney.meetingFriend', language)
                                    .replace('{origin}', getStationName(stations[data.origin], language))
                                    .replace('{dest}', getStationName(stations[data.dest], language))}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
