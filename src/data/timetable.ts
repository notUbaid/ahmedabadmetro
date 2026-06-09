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

// Station definitions extracted from the Excel timetable data (fallback to static segment timings)
export const lineStations: Record<'blue' | 'red' | 'green' | 'purple', string[]> = {
  blue: trainSchedules.find(s => s.line === 'blue')?.stations || LINE_TIMINGS.blue.stations,
  red: trainSchedules.find(s => s.line === 'red')?.stations || LINE_TIMINGS.red.stations,
  green: trainSchedules.find(s => s.line === 'green')?.stations || LINE_TIMINGS.green.stations,
  purple: trainSchedules.find(s => s.line === 'purple')?.stations || LINE_TIMINGS.purple.stations,
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
    lastTrain: '22:00',
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
  }[] = [];

  for (const schedule of trainSchedules) {
    // Filter by day type — don't show Sunday/Saturday trains on weekdays
    if (schedule.dayType && schedule.dayType !== currentDayType) continue;
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) continue;
    if (stationIndex === schedule.stations.length - 1) continue;

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
      
      let directionStr = '';
      if (schedule.line === 'blue') {
        directionStr = schedule.direction === 'forward' ? 'Eastbound' : 'Westbound';
      } else if (schedule.line === 'red') {
        directionStr = schedule.direction === 'forward' ? 'Northbound' : 'Southbound';
      } else {
        directionStr = `towards ${formatStationName(destinationId)}`;
      }

      upcoming.push({
        arrivalTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
        direction: directionStr,
        line: schedule.line,
        minutesAway: Math.round(minutesAway),
        destination: formatStationName(destinationId),
        trainId: schedule.id,
        remainingStations: schedule.stations.slice(stationIndex + 1),
      });
    }
  }

  return upcoming.sort((a, b) => a.minutesAway - b.minutesAway).slice(0, limit);
};

export const getAllTrainsForStation = (stationId: string) => {
  const trains: { time: string; destination: string; line: string; minutes: number }[] = [];

  for (const schedule of trainSchedules) {
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) continue;
    if (stationIndex === schedule.stations.length - 1) continue;

    const startMinutes = toMinutes(schedule.startTime);
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const arrivalHour = Math.floor(arrivalMinutes / 60) % 24;
    const arrivalMin = Math.floor(arrivalMinutes % 60);

    const destinationId = schedule.stations[schedule.stations.length - 1];

    trains.push({
      time: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
      destination: formatStationName(destinationId),
      line: schedule.line,
      minutes: arrivalMinutes,
    });
  }

  return trains.sort((a, b) => a.minutes - b.minutes).map(({ time, destination, line }) => ({ time, destination, line }));
};

export const getLastTrainWarnings = (stationId: string) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const destinationLastTrains = new Map<string, { line: string; arrivalMinutes: number }>();

  for (const schedule of trainSchedules) {
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1 || stationIndex === schedule.stations.length - 1) continue;

    const startMinutes = toMinutes(schedule.startTime);
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const destinationId = schedule.stations[schedule.stations.length - 1];
    const existing = destinationLastTrains.get(destinationId);

    if (!existing || arrivalMinutes > existing.arrivalMinutes) {
      destinationLastTrains.set(destinationId, { line: schedule.line, arrivalMinutes });
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
    const endMinutes = startMinutes + journeyTime;

    // Active only between departure and final arrival (inclusive of dwell at last stop)
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) continue;

    const elapsedMinutes = currentMinutes - startMinutes;

    let fromIdx = 0;
    let toIdx = 1;

    // stationTimes are cumulative arrivals; find segment by elapsed in [arr(i), arr(i+1)]
    for (let i = 0; i < schedule.stationTimes.length - 1; i++) {
      if (elapsedMinutes >= schedule.stationTimes[i] && elapsedMinutes <= schedule.stationTimes[i + 1]) {
        fromIdx = i;
        toIdx = i + 1;
        break;
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
      progress = travelDuration > 0 ? (elapsedMinutes - departureFromA) / travelDuration : 1;
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

  return positions;
};

