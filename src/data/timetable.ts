// Excel-driven Ahmedabad Metro timetable + live animation helpers
// NOTE: This file must not contain any git merge conflict markers.

import { INTERCHANGE_STATIONS, NORMAL_STOP, INTERCHANGE_STOP, LINE_TIMINGS } from './segmentTimings';
import timetableFromExcelData from './timetableFromExcel.generated.json';

import { stations } from './metroData';

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
  const now = new Date();
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

export const getDirectionStr = (destinationId: string): string => {
  const dest = destinationId.toLowerCase();
  if (['apmc', 'vasna', 'gyaspur', 'jivraj_park', 'shreyas'].includes(dest)) {
    return 'Southbound';
  } else if (['koteshwar_road', 'mahatma_mandir', 'motera_stadium', 'sabarmati', 'aec'].includes(dest)) {
    return 'Northbound';
  } else if (['vastral_gam', 'vastral', 'nirant_cross_roads', 'rabari_colony', 'gift_city'].includes(dest)) {
    return 'Eastbound';
  } else if (['thaltej_gam', 'thaltej', 'doordarshan_kendra'].includes(dest)) {
    return 'Westbound';
  } else {
    return `towards ${formatStationName(destinationId)}`;
  }
};

// Returns trains arriving within next 120 minutes for stationIndex visualization
export const getUpcomingTrains = (stationId: string, limit = 3) => {
  const now = new Date();
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

  for (const schedule of trainSchedules) {
    // Filter by day type — don't show Sunday/Saturday trains on weekdays
    if (schedule.dayType && schedule.dayType !== currentDayType) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) continue;
    if (stationIndex === schedule.stations.length - 1) continue; // Hide terminating trains
    // We want to show arriving trains at terminus stations so users know when trains arrive.

    const startMinutes = toMinutes(schedule.startTime);
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
      const directionStr = getDirectionStr(destinationId);

      upcoming.push({
        arrivalTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
        direction: directionStr,
        line: currentLine,
        minutesAway: Math.round(minutesAway),
        destination: formatStationName(destinationId),
        trainId: schedule.id,
        remainingStations: schedule.stations.slice(stationIndex + 1),
        stationIndex: stationIndex,
        stationList: schedule.stations,
      });
    }
  }

  const sorted = upcoming.sort((a, b) => a.minutesAway - b.minutesAway);
  const deduplicated = [];
  const seen = new Set<string>();
  
  for (const train of sorted) {
    // Include line in key so trains on different lines at interchanges aren't dropped
    const key = `${train.minutesAway}-${train.direction}-${train.line}`;
    if (!seen.has(key)) {
      const same = sorted.filter(t => `${t.minutesAway}-${t.direction}-${t.line}` === key);
      const best = same.reduce((prev, curr) => (prev.remainingStations.length > curr.remainingStations.length) ? prev : curr);
      deduplicated.push(best);
      seen.add(key);
    }
  }

  return deduplicated.slice(0, limit);
};

export const getAllTrainsForStation = (stationId: string) => {
  const trains: { time: string; destination: string; line: string; minutes: number; direction: string; remainingCount: number }[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  for (const schedule of trainSchedules) {
    if (schedule.dayType && schedule.dayType !== currentDayType) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) continue;
    if (stationIndex === schedule.stations.length - 1) continue; // Hide terminating trains

    const startMinutes = toMinutes(schedule.startTime);
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const arrivalHour = Math.floor(arrivalMinutes / 60) % 24;
    const arrivalMin = Math.floor(arrivalMinutes % 60);

    const destinationId = schedule.stations[schedule.stations.length - 1];
    const currentLine = schedule.line;

    trains.push({
      time: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
      destination: formatStationName(destinationId),
      line: currentLine,
      minutes: arrivalMinutes,
      direction: getDirectionStr(destinationId),
      remainingCount: schedule.stations.length - 1 - stationIndex,
    });
  }

  const sorted = trains.sort((a, b) => a.minutes - b.minutes);
  const deduplicated = [];
  const seen = new Set<string>();
  
  for (const train of sorted) {
    // Include line in key so trains on different lines at interchanges aren't dropped
    const key = `${Math.round(train.minutes)}-${train.direction}-${train.line}`;
    if (!seen.has(key)) {
      const same = sorted.filter(t => `${Math.round(t.minutes)}-${t.direction}-${t.line}` === key);
      const best = same.reduce((prev, curr) => (prev.remainingCount > curr.remainingCount) ? prev : curr);
      deduplicated.push(best);
      seen.add(key);
    }
  }

  return deduplicated.map(({ time, destination, line }) => ({ time, destination, line }));
};

export const getLastTrainWarnings = (stationId: string) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const destinationLastTrains = new Map<string, { line: string; arrivalMinutes: number }>();
  const dayOfWeek = now.getDay();
  const currentDayType = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Mon-Fri';

  for (const schedule of trainSchedules) {
    if (schedule.dayType && schedule.dayType !== currentDayType) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1 || stationIndex === schedule.stations.length - 1) continue;

    const startMinutes = toMinutes(schedule.startTime);
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
        destination: formatStationName(destinationId),
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
  const now = new Date();
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
    cachedActiveSchedules = trainSchedules.filter(s => !s.dayType || s.dayType === currentDayType);
    // Pre-calculate start minutes to avoid string split in animation loop
    cachedActiveSchedules.forEach(s => {
      if (s._cachedStartMinutes === undefined) {
        s._cachedStartMinutes = toMinutes(s.startTime);
      }
    });
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

  // Deduplicate visually identical trains (same line, segment, and progress)
  // This handles flawed timetable data where duplicate schedules exist
  const uniquePositions: ReturnType<typeof getCurrentTrainPositions> = [];
  const seenPositions = new Set<string>();

  for (const pos of positions) {
    const key = `${pos.line}-${pos.fromStationId}-${pos.toStationId}-${pos.progress.toFixed(4)}`;
    if (!seenPositions.has(key)) {
      seenPositions.add(key);
      uniquePositions.push(pos);
    }
  }

  return uniquePositions;
};
