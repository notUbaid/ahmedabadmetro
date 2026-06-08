import { useState, useMemo, useEffect } from 'react';
import { X, Clock, MapPin, Train, Zap } from 'lucide-react';
import { stations, LINE_COLORS } from '@/data/metroData';
import { trainSchedules } from '@/data/timetable';
import { cn } from '@/lib/utils';

interface TrainDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trainId: string;
  line: 'blue' | 'red' | 'green' | 'purple';
}

export const TrainDetailsDialog = ({
  isOpen,
  onClose,
  trainId,
  line
}: TrainDetailsDialogProps) => {
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Update current time every second
  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const now = new Date();
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

  if (!isOpen || !schedule) return null;

  // Convert minutes to HH:MM format
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Parse start time and convert to minutes
  const getStartTimeInMinutes = (timeStr: string): number => {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
  };

  const startTimeMinutes = getStartTimeInMinutes(schedule.startTime);

  // Get current position relative to this train's schedule
  const trainCurrentTime = currentTime >= startTimeMinutes ? currentTime - startTimeMinutes : -1;
  const currentStationIndex = schedule.stationTimes.findIndex(
    (time, idx) => {
      const nextTime = schedule.stationTimes[idx + 1];
      if (nextTime === undefined) return time <= trainCurrentTime;
      return time <= trainCurrentTime && trainCurrentTime < nextTime;
    }
  );

  const isCompleted = trainCurrentTime >= schedule.stationTimes[schedule.stationTimes.length - 1];
  const hasStarted = trainCurrentTime >= 0;

  return (
    <div className="fixed inset-0 z-[2100] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <div 
        className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200 safe-p-bottom"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 text-white sticky top-0 z-10"
          style={{ backgroundColor: LINE_COLORS[line as keyof typeof LINE_COLORS] }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Train size={24} />
              <div>
                <h2 className="font-bold text-lg">{line.charAt(0).toUpperCase() + line.slice(1)} Line Timetable</h2>
                <p className="text-sm text-white/80">Departs {schedule.startTime}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Current Time Display */}
          <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Time</p>
                <p className="text-2xl font-bold">{minutesToTime(currentTime)}</p>
              </div>
              <Clock size={32} className="text-primary" />
            </div>
          </div>

          {/* Status Message */}
          {!hasStarted && (
            <div className="mb-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
              <p className="text-sm text-yellow-600 font-medium">
                Train departs at {schedule.startTime}
              </p>
            </div>
          )}

          {/* Stations List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Station Schedule</h3>
            
            {schedule.stations.map((stationId, idx) => {
              const relativeMinutes = schedule.stationTimes[idx];
              const absoluteMinutes = startTimeMinutes + relativeMinutes;
              const arrivalTime = minutesToTime(absoluteMinutes);
              
              const station = stations[stationId];
              const isPassed = trainCurrentTime > relativeMinutes && hasStarted;
              const isCurrent = idx === currentStationIndex && !isCompleted && hasStarted;
              const isNext = idx === currentStationIndex + 1 && !isCompleted && hasStarted;

              return (
                <div
                  key={stationId}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    isCurrent && 'bg-primary/20 border-primary shadow-md scale-102',
                    isPassed && !isCurrent && 'bg-muted/50 border-muted',
                    !isPassed && !isCurrent && 'bg-background border-border',
                    isNext && 'border-primary/50 bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Status Indicator */}
                      <div className="relative">
                        {isCurrent && (
                          <>
                            <div className="absolute inset-0 animate-pulse">
                              <Zap className="text-primary" size={20} />
                            </div>
                            <div className="w-5 h-5" />
                          </>
                        )}
                        {isPassed && !isCurrent && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-background" />
                          </div>
                        )}
                        {!isPassed && !isCurrent && (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                        )}
                      </div>

                      {/* Station Info */}
                      <div className="flex-1">
                        <p className={cn(
                          'font-medium',
                          isCurrent && 'text-primary',
                          isPassed && !isCurrent && 'text-muted-foreground',
                        )}>
                          {station?.name || stationId}
                        </p>
                        {isPassed && !isCurrent && (
                          <p className="text-xs text-muted-foreground">Departed</p>
                        )}
                        {isCurrent && (
                          <p className="text-xs text-primary font-semibold">Currently here</p>
                        )}
                        {isNext && (
                          <p className="text-xs text-primary">Next stop</p>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-right">
                      <p className={cn(
                        'text-lg font-semibold',
                        isCurrent && 'text-primary',
                        isPassed && !isCurrent && 'text-muted-foreground',
                      )}>
                        {arrivalTime}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Message */}
          {isCompleted && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted text-center">
              <p className="text-sm text-muted-foreground">
                Service for this train has ended for today.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
