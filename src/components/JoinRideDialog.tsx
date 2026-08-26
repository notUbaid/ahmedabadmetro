import { useState, useMemo, useEffect } from 'react';
import {
    Train, MapPin, X, ArrowRight, Clock, AlertTriangle,
    CircleDot, Navigation
} from 'lucide-react';
import { stations, LINE_COLORS } from '@/data/metroData';
import { trainSchedules } from '@/data/timetable';
import { cn, getISTDate, minutesUntil } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface JoinRideDialogProps {
    isOpen: boolean;
    onClose: () => void;
    trainId: string;
    initialDestination?: string;
    onNavigate?: () => void; // Optional callback to trigger navigation
}

export const JoinRideDialog = ({
    isOpen,
    onClose,
    trainId,
    initialDestination,
    onNavigate
}: JoinRideDialogProps) => {
    const [userStationId, setUserStationId] = useState('');
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const { language } = useLanguage();

    // Find the shared train schedule
    const sharedTrain = useMemo(() => {
        return trainSchedules.find(s => s.id === trainId);
    }, [trainId]);

    // Station options
    const stationOptions = useMemo(() => {
        return Object.values(stations)
            .map(s => ({ id: s.id, name: s.name, lines: s.lines }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const filteredStations = useMemo(() => {
        if (!search) return stationOptions;
        return stationOptions.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [stationOptions, search]);

    // Calculate intercept details
    const interceptDetails = useMemo(() => {
        if (!sharedTrain || !userStationId) return null;

        const stationIdx = sharedTrain.stations.indexOf(userStationId);

        // Check if station is on the route
        if (stationIdx === -1) return { status: 'not-on-route' };

        // Calculate arrival time
        const startMinutes = parseInt(sharedTrain.startTime.split(':')[0]) * 60 + parseInt(sharedTrain.startTime.split(':')[1]);
        const arrivalMinutes = startMinutes + sharedTrain.stationTimes[stationIdx];

        // Check if metro has already passed (simplified check against current time)
        const now = getISTDate();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const minutesAway = minutesUntil(arrivalMinutes, currentMinutes);
        if (minutesAway < 0) {
            return { status: 'passed', minutesAgo: -minutesAway };
        }

        const h = Math.floor(arrivalMinutes / 60) % 24;
        const m = Math.floor(arrivalMinutes % 60);
        const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        // Get destination from params or end of line
        const destStationId = initialDestination || sharedTrain.stations[sharedTrain.stations.length - 1];
        const destIdx = sharedTrain.stations.indexOf(destStationId);
        const destStation = stations[destStationId];

        let direction = 'unknown';
        if (destIdx > -1) {
            direction = destIdx > stationIdx ? 'forward' : 'backward'; // Simplified logic, real direction is fixed in schedule
        }

        // Determine if the user's station is AFTER the shared destination (invalid join)
        // Actually, schedule direction is fixed. 
        // If schedule is forward, and stationIdx > destIdx (if dest is provided), then they can't travel TO that dest.
        // But they might just want to join the ride regardless of destination.
        // Let's assume they want to join the train.

        return {
            status: 'upcoming',
            time: timeString,
            minutesAway,
            stationName: stations[userStationId].name,
            destName: destStation?.name || t('joinRide.endOfLine', language)
        };
    }, [sharedTrain, userStationId, initialDestination, language]);

    if (!isOpen || !sharedTrain) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-sm bg-background p-6 rounded-2xl shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full`} style={{ backgroundColor: `${LINE_COLORS[sharedTrain.line as keyof typeof LINE_COLORS]}20` }}>
                    <Train className="w-6 h-6" style={{ color: LINE_COLORS[sharedTrain.line as keyof typeof LINE_COLORS] }} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{t('joinRide.title', language)}</h2>
                        <p className="text-sm text-muted-foreground capitalize">{t('joinRide.lineMetro', language).replace('{line}', sharedTrain.line)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-muted/40 p-4 rounded-xl border border-border">
                        <p className="text-sm font-medium mb-2">{t('joinRide.whereBoard', language)}</p>
                        <div className="relative">
                            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border focus-within:border-primary transition-colors">
                                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder={t('common.search', language)}
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    className="flex-1 bg-transparent outline-none text-sm"
                                />
                            </div>
                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                                    {filteredStations.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setUserStationId(s.id);
                                                setSearch(s.name);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full px-3 py-3 min-h-[44px] text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[s.lines[0] as keyof typeof LINE_COLORS] }} />
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {sharedTrain && !userStationId && (
                        <p className="text-sm text-muted-foreground">{t('joinRide.selectStation', language)}</p>
                    )}

                    {interceptDetails?.status === 'not-on-route' && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold">{t('joinRide.noStopHere', language)}</p>
                                <p>{t('joinRide.doesNotPass', language).replace('{station}', stations[userStationId]?.name || '')}</p>
                            </div>
                        </div>
                    )}

                    {interceptDetails?.status === 'passed' && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3">
                            <Clock className="w-5 h-5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold">{t('dialog.departed', language)}</p>
                                <p>{t('joinRide.missedBy', language).replace('{mins}', String(interceptDetails.minutesAgo))}</p>
                            </div>
                        </div>
                    )}

                    {interceptDetails?.status === 'upcoming' && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 border-2 border-green-500/20 rounded-xl text-center space-y-2">
                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">{t('joinRide.beAtPlatform', language)}</p>
                            <div className="text-4xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                                {interceptDetails.time}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {t('joinRide.arrivesIn', language).replace('{mins}', String(interceptDetails.minutesAway))}
                            </p>

                            <div className="pt-2 mt-2 border-t border-green-200 dark:border-green-800/30 flex items-center justify-center gap-2 text-sm text-green-800 dark:text-green-200">
                                <span>{t('joinRide.destination', language)}</span>
                                <span className="font-semibold">{interceptDetails.destName}</span>
                            </div>

                            {onNavigate && (
                                <button
                                    onClick={onNavigate}
                                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 min-h-[44px] text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Navigation className="w-4 h-4" />
                                    {t('panel.directions', language)}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
