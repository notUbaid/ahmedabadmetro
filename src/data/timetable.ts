// Excel-driven Ahmedabad Metro timetable + live animation helpers
// NOTE: This file must not contain any git merge conflict markers.

import { INTERCHANGE_STATIONS, NORMAL_STOP, INTERCHANGE_STOP, LINE_TIMINGS } from './segmentTimings';
import { getISTDate, getISTMinutes, getISTTimeComponents, minutesUntil } from '@/lib/utils';
import timetableFromExcelData from './timetableFromExcel.generated.json';

import { stations } from './metroData';
import { t, Language, getStationName } from '@/lib/i18n';

export interface TrainSchedule {
  id: string;
  line: 'blue' | 'red' | 'green' | 'purple';
  direction: 'forward' | 'backward';
  dayType?: string;
  startTime: string; // HH:MM format
  _cachedStartMinutes?: number; // Precalculated for performance
  stations: string[]; // station IDs in order
  stationTimes: number[]; // minutes from start for each station
}

// Source of truth from Excel-generated JSON
const parsed = timetableFromExcelData as { trainSchedules: TrainSchedule[] };

// Fix missing weekend schedules for Red/Green/Purple lines which run the same schedule every day
export const trainSchedules: TrainSchedule[] = parsed.trainSchedules.map(schedule => {
  if (schedule.line !== 'blue' && schedule.dayType === 'Mon-Fri') {
    return { ...schedule, dayType: undefined };
  }
  return schedule;
});

// Station definitions per line — uses the verified segment-timing station lists.
// DO NOT use trainSchedules.find() here: through-running trains (e.g. green line
// APMC→Mahatma Mandir) pollute the station list with Red Line stations.
export const lineStations: Record<'blue' | 'red' | 'green' | 'purple', string[]> = {
  blue: LINE_TIMINGS.blue.stations,
  red: LINE_TIMINGS.red.stations,
  green: LINE_TIMINGS.green.stations,
  purple: LINE_TIMINGS.purple.stations,
};

// Get all unique adjacent station pairs across all train schedules.
// This is needed because through-running trains (e.g. purple/green going
// through red line corridor) use station pairs not in a single line's cache.
export const getAllAdjacentStationPairs = (): [string, string][] => {
  const seen = new Set<string>();
  const pairs: [string, string][] = [];
  for (const schedule of trainSchedules) {
    for (let i = 0; i < schedule.stations.length - 1; i++) {
      const key = `${schedule.stations[i]}-${schedule.stations[i + 1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([schedule.stations[i], schedule.stations[i + 1]]);
      }
    }
  }
  return pairs;
};

// Line metadata (kept for UI)
export const lineInfo = {
  blue: {
    name: 'Line 1 - East West Corridor',
    color: '#0066CC',
    from: 'Vastral Gam',
    to: 'Thaltej Gam',
    distance: '21.1 km',
    travelTime: '45 min',
    firstTrain: '06:20',
    lastTrain: '23:00',
    frequency: 'Peak: 7 min, Off-peak: 10-12 min',
  },
  red: {
    name: 'Line 2 - North South Corridor',
    color: '#CC0000',
    from: 'APMC',
    to: 'Koteshwar Road',
    distance: '20.2 km',
    travelTime: '35 min',
    firstTrain: '06:15',
    lastTrain: '23:09',
    frequency: 'Every 12 min (Mon-Sun)',
    note: 'Local services + through-running corridor services',
  },
  green: {
    name: 'Line 3 - Koteshwar Road-Mahatma Mandir Corridor',
    color: '#CCAA00',
    from: 'Koteshwar Road',
    to: 'Mahatma Mandir',
    distance: '20.87 km',
    travelTime: '43 min',
    firstTrain: '06:20',
    lastTrain: '21:00',
    frequency: 'Average 24 min (Mon-Sun)',
    note: 'Local services + through-running corridor services from APMC',
  },
  purple: {
    name: 'Line 4 - GNLU-GIFT City Corridor',
    color: '#660099',
    from: 'GNLU',
    to: 'GIFT City',
    distance: '5.8 km',
    travelTime: '6 min',
    firstTrain: '06:45',
    lastTrain: '19:13',
    frequency: 'Morning: 49 min avg, Evening: 57 min avg',
    note: 'Bus service only from 10:18 to 16:06',
  },
} as const;

export const getCurrentHeadway = (line: string): { minutes: number; label: string } => {
  const { hours: hour, dayOfWeek } = getISTTimeComponents();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isPeakHour = (hour >= 8 && hour < 11) || (hour >= 17 && hour < 20);

  switch (line.toLowerCase()) {
    case 'blue':
      if (isSunday) return { minutes: 12, label: '~12 min' };
      if (isSaturday) return { minutes: isPeakHour ? 10 : 12, label: isPeakHour ? '~10 min' : '~12 min' };
      return { minutes: isPeakHour ? 7 : 10, label: isPeakHour ? '~7 min' : '~10 min' };
    case 'red':
      return { minutes: 12, label: '~12 min' };
    case 'green':
      return { minutes: 24, label: '~24 min' };
    case 'purple':
      return { minutes: hour < 12 ? 49 : 57, label: hour < 12 ? '~49 min' : '~57 min' };
    default:
      return { minutes: 10, label: '~10 min' };
  }
};

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const formatStationName = (stationId: string): string => {
  const name = stations[stationId]?.name;
  if (name) return name;
  return stationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// getTrainLineAtStation was removed.

export const schedulesByStation = new Map<string, TrainSchedule[]>();

trainSchedules.forEach(schedule => {
  schedule._cachedStartMinutes = toMinutes(schedule.startTime);
  schedule.stations.forEach(stationId => {
    let list = schedulesByStation.get(stationId);
    if (!list) {
      list = [];
      schedulesByStation.set(stationId, list);
    }
    list.push(schedule);
  });
});

export const getDirectionStr = (destinationId: string, language: Language = 'en'): string => {
  const dest = destinationId.toLowerCase();
  if (['apmc', 'vasna', 'gyaspur', 'jivraj_park', 'shreyas', 'gnlu'].includes(dest)) {
    return t('direction.southbound', language);
  } else if ([
    'koteshwar_road', 'mahatma_mandir', 'motera_stadium', 'sabarmati', 'aec',
    'sachivalaya', 'sector_1', 'sector_10a', 'sector_16', 'sector_24',
    'infocity', 'akshardham', 'juna_sachivalaya', 'gift_city', 'pdpu'
  ].includes(dest)) {
    return t('direction.northbound', language);
  } else if (['vastral_gam', 'vastral', 'nirant_cross_roads', 'rabari_colony'].includes(dest)) {
    return t('direction.eastbound', language);
  } else if (['thaltej_gam', 'thaltej', 'doordarshan_kendra'].includes(dest)) {
    return t('direction.westbound', language);
  } else {
    const stationName = stations[destinationId] ? getStationName(stations[destinationId], language) : formatStationName(destinationId);
    return t('direction.towards', language).replace('{station}', stationName);
  }
};

// Returns trains arriving within next 120 minutes for stationIndex visualization
export const getUpcomingTrains = (stationId: string, limit = 3, language: Language = 'en', baseDate?: Date) => {
  const { hours, minutes, dayOfWeek } = getISTTimeComponents(baseDate);
  const currentMinutes = hours * 60 + minutes;
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  const upcoming: {
    arrivalTime: string;
    direction: string;
    line: string;
    minutesAway: number;
    destination: string;
    trainId: string;
    remainingStations: string[];
    stationIndex: number;
    stationList: string[];
  }[] = [];

  const schedulesAtStation = schedulesByStation.get(stationId) || [];
  for (const schedule of schedulesAtStation) {
    // Filter by day type — don't show Sunday/Saturday trains on weekdays
    if (schedule.dayType && schedule.dayType !== currentDayType && !(schedule.line !== 'blue' && schedule.dayType === 'Mon-Fri')) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) continue;
    if (stationIndex === schedule.stations.length - 1) continue; // Hide terminating trains
    // We want to show arriving trains at terminus stations so users know when trains arrive.

    const startMinutes = schedule._cachedStartMinutes!;
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    // Midnight boundary handled by minutesUntil: a 00:10 arrival seen at 23:50
    // is 20 minutes away; the same 00:10 seen at 14:00 belongs to tonight and
    // must not appear as "70 min away".
    const minutesAway = minutesUntil(arrivalMinutes, currentMinutes);

    if (minutesAway >= 0) {
      const arrivalHour = Math.floor(arrivalMinutes / 60) % 24;
      const arrivalMin = Math.floor(arrivalMinutes % 60);

      const destinationId = schedule.stations[schedule.stations.length - 1];
      const currentLine = schedule.line;
      const directionStr = getDirectionStr(destinationId, language);

      upcoming.push({
        arrivalTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
        direction: directionStr,
        line: currentLine,
        minutesAway: Math.round(minutesAway),
        destination: stations[destinationId] ? getStationName(stations[destinationId], language) : formatStationName(destinationId),
        trainId: schedule.id,
        remainingStations: schedule.stations.slice(stationIndex + 1),
        stationIndex: stationIndex,
        stationList: schedule.stations,
      });
    }
  }

  const sorted = upcoming.sort((a, b) => a.minutesAway - b.minutesAway);
  const deduplicated = [];
  
  for (const train of sorted) {
    // Suppress trains that are less than 3 minutes apart on the same line and direction
    // to prevent weird timetable anomalies (like 1 minute gap duplicates)
    const isTooClose = deduplicated.some(
      t => t.line === train.line && 
           t.direction === train.direction && 
           Math.abs(t.minutesAway - train.minutesAway) < 3
    );

    if (!isTooClose) {
      deduplicated.push(train);
    }
  }

  const within120 = deduplicated.filter(t => t.minutesAway <= 120);
  if (within120.length > 0) {
    return within120.slice(0, limit);
  }

  // Fallback: If no trains within 120 mins (e.g. midday service gap on Purple line), return next scheduled trains today
  return deduplicated.slice(0, limit);
};

export const getAllTrainsForStation = (stationId: string, language: Language = 'en', baseDate?: Date) => {
  const trains: { time: string; destination: string; line: string; minutes: number; direction: string; remainingCount: number }[] = [];
  const { dayOfWeek } = getISTTimeComponents(baseDate);
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  const schedulesAtStation = schedulesByStation.get(stationId) || [];
  for (const schedule of schedulesAtStation) {
    if (schedule.dayType && schedule.dayType !== currentDayType && !(schedule.line !== 'blue' && schedule.dayType === 'Mon-Fri')) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) continue;
    if (stationIndex === schedule.stations.length - 1) continue; // Hide terminating trains

    const startMinutes = schedule._cachedStartMinutes!;
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const arrivalHour = Math.floor(arrivalMinutes / 60) % 24;
    const arrivalMin = Math.floor(arrivalMinutes % 60);

    const destinationId = schedule.stations[schedule.stations.length - 1];
    const currentLine = schedule.line;

    trains.push({
      time: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
      destination: stations[destinationId] ? getStationName(stations[destinationId], language) : formatStationName(destinationId),
      line: currentLine,
      minutes: arrivalMinutes,
      direction: getDirectionStr(destinationId, language),
      remainingCount: schedule.stations.length - 1 - stationIndex,
    });
  }

  const sorted = trains.sort((a, b) => a.minutes - b.minutes);
  const deduplicated = [];
  
  for (const train of sorted) {
    // Suppress trains that are less than 3 minutes apart on the same line and direction
    // to prevent weird timetable anomalies (like 1 minute gap duplicates)
    const isTooClose = deduplicated.some(
      t => t.line === train.line && 
           t.direction === train.direction && 
           Math.abs(t.minutes - train.minutes) < 3
    );

    if (!isTooClose) {
      deduplicated.push(train);
    }
  }

  return deduplicated.map(({ time, destination, line }) => ({ time, destination, line }));
};

export const getLastTrainWarnings = (stationId: string, language: Language = 'en', baseDate?: Date) => {
  const { hours, minutes, dayOfWeek } = getISTTimeComponents(baseDate);
  const currentMinutes = hours * 60 + minutes;
  const destinationLastTrains = new Map<string, { line: string; arrivalMinutes: number }>();
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  const schedulesAtStation = schedulesByStation.get(stationId) || [];
  for (const schedule of schedulesAtStation) {
    if (schedule.dayType && schedule.dayType !== currentDayType && !(schedule.line !== 'blue' && schedule.dayType === 'Mon-Fri')) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1 || stationIndex === schedule.stations.length - 1) continue;

    const startMinutes = schedule._cachedStartMinutes!;
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const destinationId = schedule.stations[schedule.stations.length - 1];
    const currentLine = schedule.line;
    const existing = destinationLastTrains.get(destinationId);

    if (!existing || arrivalMinutes > existing.arrivalMinutes) {
      destinationLastTrains.set(destinationId, { line: currentLine, arrivalMinutes });
    }
  }

  const warnings: {
    line: string;
    destination: string;
    lastTrainTime: string;
    minutesRemaining: number;
  }[] = [];

  destinationLastTrains.forEach((data, destinationId) => {
    const minutesRemaining = data.arrivalMinutes - currentMinutes;
    if (minutesRemaining > 0 && minutesRemaining <= 60) {
      const arrivalHour = Math.floor(data.arrivalMinutes / 60) % 24;
      const arrivalMin = Math.floor(data.arrivalMinutes % 60);

      warnings.push({
        line: data.line,
        destination: stations[destinationId] ? getStationName(stations[destinationId], language) : formatStationName(destinationId),
        lastTrainTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
        minutesRemaining: Math.round(minutesRemaining),
      });
    }
  });

  return warnings.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
};

// First and last train times at a station for the current service day.
// Used to explain an empty "upcoming" list: before first train vs end of service.
export const getServiceWindow = (stationId: string, baseDate?: Date): { first: string; last: string } | null => {
  const { dayOfWeek } = getISTTimeComponents(baseDate);
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  let firstMinutes = Infinity;
  let lastMinutes = -Infinity;
  for (const schedule of schedulesByStation.get(stationId) || []) {
    if (schedule.dayType && schedule.dayType !== currentDayType && !(schedule.line !== 'blue' && schedule.dayType === 'Mon-Fri')) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1 || stationIndex === schedule.stations.length - 1) continue;

    const arrivalMinutes = schedule._cachedStartMinutes! + schedule.stationTimes[stationIndex];
    if (arrivalMinutes < firstMinutes) firstMinutes = arrivalMinutes;
    if (arrivalMinutes > lastMinutes) lastMinutes = arrivalMinutes;
  }

  if (lastMinutes === -Infinity) return null;
  const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  return { first: fmt(firstMinutes), last: fmt(lastMinutes) };
};

// Cache the filtered schedules to avoid O(N) filtering on every frame
let cachedDayType = '';
let cachedActiveSchedules: TrainSchedule[] = [];

interface TurnaroundInfo {
  dwellMinutes: number;
  returnDestination?: string;
  matchedDepartureId?: string;
}
const turnaroundCache = new Map<string, TurnaroundInfo>();

export const TURNAROUND_TERMINI = ['mahatma_mandir', 'koteshwar_road'];
export const MAX_TURNAROUND_LAYOVER = 12; // Maximum minutes to hold at platform for a scheduled return trip
export const DEFAULT_TURNAROUND_LAYOVER = 8; // Standard 7-8 min layover when waiting or terminating

export interface TrainPosition {
  id: string;
  line: string;
  fromStationId: string;
  toStationId: string;
  progress: number;
  destination: string;
  status: 'stopped' | 'moving';
  _isGeometryUnreliable?: boolean;
}

export const getCurrentTrainPositions = (baseDate?: Date): TrainPosition[] => {
  const { hours, minutes, seconds, dayOfWeek } = getISTTimeComponents(baseDate);
  const ms = (baseDate || new Date()).getMilliseconds();
  const currentMinutes = hours * 60 + minutes + seconds / 60 + ms / 60000;

  const positions: TrainPosition[] = [];
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  // Update cache if day changed or first run
  if (cachedDayType !== currentDayType) {
    cachedDayType = currentDayType;
    cachedActiveSchedules = trainSchedules.filter(s => !s.dayType || s.dayType === currentDayType || (s.line !== 'blue' && s.dayType === 'Mon-Fri'));

    turnaroundCache.clear();

    for (const terminusId of TURNAROUND_TERMINI) {
      const arrivals: { schedule: TrainSchedule; arrMin: number }[] = [];
      const departures: { schedule: TrainSchedule; depMin: number }[] = [];

      for (const s of cachedActiveSchedules) {
        const startMin = s._cachedStartMinutes!;
        const firstSt = s.stations[0];
        const lastSt = s.stations[s.stations.length - 1];

        if (lastSt === terminusId) {
          const arrMin = startMin + s.stationTimes[s.stationTimes.length - 1];
          arrivals.push({ schedule: s, arrMin });
        }
        if (firstSt === terminusId) {
          departures.push({ schedule: s, depMin: startMin });
        }
      }

      arrivals.sort((a, b) => a.arrMin - b.arrMin);
      departures.sort((a, b) => a.depMin - b.depMin);

      const usedDepartureIds = new Set<string>();

      for (const arr of arrivals) {
        const nextDep = departures.find(
          d => d.schedule.line === arr.schedule.line &&
               d.depMin >= arr.arrMin &&
               !usedDepartureIds.has(d.schedule.id)
        );

        let dwellMinutes = DEFAULT_TURNAROUND_LAYOVER;
        let returnDestination: string | undefined = undefined;
        let matchedDepartureId: string | undefined = undefined;

        if (nextDep) {
          const gap = nextDep.depMin - arr.arrMin;
          if (gap >= 0 && gap <= MAX_TURNAROUND_LAYOVER) {
            dwellMinutes = gap;
            returnDestination = nextDep.schedule.stations[nextDep.schedule.stations.length - 1];
            matchedDepartureId = nextDep.schedule.id;
            usedDepartureIds.add(nextDep.schedule.id);
          } else {
            dwellMinutes = Math.min(DEFAULT_TURNAROUND_LAYOVER, gap);
            returnDestination = nextDep.schedule.stations[nextDep.schedule.stations.length - 1];
          }
        }

        turnaroundCache.set(arr.schedule.id, {
          dwellMinutes,
          returnDestination,
          matchedDepartureId,
        });
      }
    }
  }

  for (const schedule of cachedActiveSchedules) {
    const startMinutes = schedule._cachedStartMinutes!;
    const journeyTime = schedule.stationTimes[schedule.stationTimes.length - 1];

    // Include dwell at the final station so trains remain visible while they're "at" the terminus.
    const finalStationId = schedule.stations[schedule.stations.length - 1];
    let lastStopDwellMinutes = 0;
    const turnaround = turnaroundCache.get(schedule.id);

    if (turnaround) {
      lastStopDwellMinutes = turnaround.dwellMinutes;
    } else {
      const finalIsInterchange = INTERCHANGE_STATIONS.includes(finalStationId);
      lastStopDwellMinutes = (finalIsInterchange ? INTERCHANGE_STOP : NORMAL_STOP) / 60;
    }

    const endMinutes = startMinutes + journeyTime + lastStopDwellMinutes;

    // Active only between departure and final arrival (+ final dwell / turnaround layover)
    if (currentMinutes < startMinutes) continue;
    if (turnaround?.matchedDepartureId ? currentMinutes >= endMinutes : currentMinutes > endMinutes) continue;


    const elapsedMinutes = currentMinutes - startMinutes;

    let fromIdx = 0;
    let toIdx = 1;
    let status: 'stopped' | 'moving' = 'moving';
    let progress = 0;
    let destinationStationId = finalStationId;

    if (elapsedMinutes >= journeyTime) {
      // Train has reached the final terminus and is dwelling at the platform
      fromIdx = Math.max(0, schedule.stationTimes.length - 2);
      toIdx = schedule.stationTimes.length - 1;
      status = 'stopped';
      progress = 1;
      if (turnaround?.returnDestination) {
        destinationStationId = turnaround.returnDestination;
      }
    } else {
      // stationTimes are cumulative arrivals; find segment by elapsed in [arr(i), arr(i+1)]
      for (let i = 0; i < schedule.stationTimes.length - 1; i++) {
        // Use half-open intervals to avoid segment-flipping at exact boundaries.
        if (elapsedMinutes >= schedule.stationTimes[i] && elapsedMinutes < schedule.stationTimes[i + 1]) {
          fromIdx = i;
          toIdx = i + 1;
          break;
        }
      }

      const arrivalAtA = schedule.stationTimes[fromIdx];
      const arrivalAtB = schedule.stationTimes[toIdx];

      // Dwell begins after arrivalAtA at station A (except start station)
      let dwellMinutes = 0;
      if (fromIdx > 0) {
        const isInterchange = INTERCHANGE_STATIONS.includes(schedule.stations[fromIdx]);
        dwellMinutes = (isInterchange ? INTERCHANGE_STOP : NORMAL_STOP) / 60;
      }

      const departureFromA = arrivalAtA + dwellMinutes;

      if (elapsedMinutes < departureFromA) {
        status = 'stopped';
        progress = 0;
      } else {
        status = 'moving';
        const travelDuration = arrivalAtB - departureFromA;
        progress = travelDuration > 0 ? (elapsedMinutes - departureFromA) / travelDuration : 0;
      }
    }

    const fromStationId = schedule.stations[fromIdx];
    const toStationId = schedule.stations[toIdx];
    if (!fromStationId || !toStationId) continue;

    positions.push({
      id: schedule.id,
      line: schedule.line,
      fromStationId,
      toStationId,
      progress: Math.max(0, Math.min(1, progress)),
      destination: formatStationName(destinationStationId),
      status,
    });
  }

  // Deduplicate visually identical or overlapping trains
  // This handles flawed timetable data where duplicate schedules exist, 
  // or when trains on shared tracks (e.g. Red/Green) are scheduled too closely.
  const uniquePositions: ReturnType<typeof getCurrentTrainPositions> = [];

  for (const pos of positions) {
    // Drop trains on the exact same physical segment or duplicate stopped trains at turnaround termini
    const isVisuallyColliding = uniquePositions.some(
      up => {
        if (up.fromStationId === pos.fromStationId && up.toStationId === pos.toStationId) {
          return Math.abs(up.progress - pos.progress) < 0.30;
        }
        // At turnaround terminus platform, ensure no two stopped trains overlap
        const upStation = up.progress >= 0.9 ? up.toStationId : (up.progress <= 0.1 ? up.fromStationId : null);
        const posStation = pos.progress >= 0.9 ? pos.toStationId : (pos.progress <= 0.1 ? pos.fromStationId : null);
        if (upStation && posStation && upStation === posStation && TURNAROUND_TERMINI.includes(upStation)) {
          return true;
        }
        return false;
      }
    );

    if (!isVisuallyColliding) {
      uniquePositions.push(pos);
    }
  }

  return uniquePositions;
};
