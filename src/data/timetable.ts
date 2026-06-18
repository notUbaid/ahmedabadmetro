// Excel-driven Ahmedabad Metro timetable + live animation helpers
// NOTE: This file must not contain any git merge conflict markers.

import { INTERCHANGE_STATIONS, NORMAL_STOP, INTERCHANGE_STOP, LINE_TIMINGS } from './segmentTimings';
import { getISTDate } from '@/lib/utils';
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
export const trainSchedules: TrainSchedule[] = parsed.trainSchedules;

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
    firstTrain: '06:16',
    lastTrain: '22:11',
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
    firstTrain: '07:33',
    lastTrain: '20:09',
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
    firstTrain: '07:36',
    lastTrain: '19:13',
    frequency: 'Morning: 49 min avg, Evening: 57 min avg',
    note: 'Bus service only from 10:18 to 16:06',
  },
} as const;

export const getCurrentHeadway = (line: string): { minutes: number; label: string } => {
  const now = getISTDate();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
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
  } else if (['koteshwar_road', 'mahatma_mandir', 'motera_stadium', 'sabarmati', 'aec', 'gift_city'].includes(dest)) {
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
export const getUpcomingTrains = (stationId: string, limit = 3, language: Language = 'en') => {
  const now = getISTDate();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay();
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

    let minutesAway = arrivalMinutes - currentMinutes;
    if (minutesAway < -12 * 60) {
      // Midnight boundary: e.g. arrival is 00:10 (10), current is 23:50 (1430) -> minutesAway = -1420
      minutesAway += 24 * 60;
    }

    if (minutesAway >= 0 && minutesAway <= 120) {
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

  return deduplicated.slice(0, limit);
};

export const getAllTrainsForStation = (stationId: string, language: Language = 'en') => {
  const trains: { time: string; destination: string; line: string; minutes: number; direction: string; remainingCount: number }[] = [];
  const now = getISTDate();
  const dayOfWeek = now.getDay();
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

export const getLastTrainWarnings = (stationId: string, language: Language = 'en') => {
  const now = getISTDate();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const destinationLastTrains = new Map<string, { line: string; arrivalMinutes: number }>();
  const dayOfWeek = now.getDay();
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

// Cache the filtered schedules to avoid O(N) filtering on every frame
let cachedDayType = '';
let cachedActiveSchedules: TrainSchedule[] = [];

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

export const getCurrentTrainPositions = (): TrainPosition[] => {
  const now = getISTDate();
  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes() +
    now.getSeconds() / 60 +
    now.getMilliseconds() / 60000;

  const positions: TrainPosition[] = [];

  const dayOfWeek = now.getDay();
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  // Update cache if day changed or first run
  if (cachedDayType !== currentDayType) {
    cachedDayType = currentDayType;
    cachedActiveSchedules = trainSchedules.filter(s => !s.dayType || s.dayType === currentDayType || (s.line !== 'blue' && s.dayType === 'Mon-Fri'));
  }

  for (const schedule of cachedActiveSchedules) {
    const startMinutes = schedule._cachedStartMinutes!;
    const journeyTime = schedule.stationTimes[schedule.stationTimes.length - 1];

    // Include dwell at the final station so trains remain visible while they're "at" the terminus.
    const finalStationId = schedule.stations[schedule.stations.length - 1];
    const finalIsInterchange = INTERCHANGE_STATIONS.includes(finalStationId);
    const lastStopDwellMinutes = (finalIsInterchange ? INTERCHANGE_STOP : NORMAL_STOP) / 60;

    const endMinutes = startMinutes + journeyTime + lastStopDwellMinutes;

    // Active only between departure and final arrival (+ final dwell)
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) continue;


    const elapsedMinutes = currentMinutes - startMinutes;

    let fromIdx = 0;
    let toIdx = 1;

    // stationTimes are cumulative arrivals; find segment by elapsed in [arr(i), arr(i+1)]
    for (let i = 0; i < schedule.stationTimes.length - 1; i++) {
      // Use half-open intervals to avoid segment-flipping at exact boundaries.
      // This prevents flicker / duplicate segment selection around dwell edges.
      if (elapsedMinutes >= schedule.stationTimes[i] && elapsedMinutes < schedule.stationTimes[i + 1]) {
        fromIdx = i;
        toIdx = i + 1;
        break;
      }

      // If we are exactly at the final station time, clamp to the last segment's endpoint.
      if (i === schedule.stationTimes.length - 2 && elapsedMinutes === schedule.stationTimes[i + 1]) {
        fromIdx = i;
        toIdx = i + 1;
      }
    }


    const fromStationId = schedule.stations[fromIdx];
    const toStationId = schedule.stations[toIdx];
    if (!fromStationId || !toStationId) continue;

    const arrivalAtA = schedule.stationTimes[fromIdx];
    const arrivalAtB = schedule.stationTimes[toIdx];

    // Dwell begins after arrivalAtA at station A (except start station)
    let dwellMinutes = 0;
    if (fromIdx > 0) {
      const isInterchange = INTERCHANGE_STATIONS.includes(fromStationId);
      dwellMinutes = (isInterchange ? INTERCHANGE_STOP : NORMAL_STOP) / 60;
    }

    const departureFromA = arrivalAtA + dwellMinutes;

    let status: 'stopped' | 'moving' = 'moving';
    let progress = 0;

    if (elapsedMinutes < departureFromA) {
      status = 'stopped';
      progress = 0;
    } else {
      status = 'moving';
      const travelDuration = arrivalAtB - departureFromA;
      progress = travelDuration > 0 ? (elapsedMinutes - departureFromA) / travelDuration : 0;
    }

    const destinationId = schedule.stations[schedule.stations.length - 1];

    positions.push({
      id: schedule.id,
      line: schedule.line,
      fromStationId,
      toStationId,
      progress: Math.max(0, Math.min(1, progress)),
      destination: formatStationName(destinationId),
      status,
    });
  }

  // Deduplicate visually identical or overlapping trains
  // This handles flawed timetable data where duplicate schedules exist, 
  // or when trains on shared tracks (e.g. Red/Green) are scheduled too closely.
  const uniquePositions: ReturnType<typeof getCurrentTrainPositions> = [];

  for (const pos of positions) {
    // We check if another train is on the exact same physical segment
    // and its progress is within 15% of this one. 
    // If so, we assume they are visually colliding and drop one.
    const isVisuallyColliding = uniquePositions.some(
      up => up.fromStationId === pos.fromStationId && 
            up.toStationId === pos.toStationId && 
            Math.abs(up.progress - pos.progress) < 0.30
    );

    if (!isVisuallyColliding) {
      uniquePositions.push(pos);
    }
  }

  return uniquePositions;
};
