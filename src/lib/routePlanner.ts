import { stations, Station, LINE_COLORS } from '@/data/metroData';
import { trainSchedules, TrainSchedule, lineStations } from '@/data/timetable';
import { CORRIDOR_TIMINGS, REVERSE_CORRIDOR_TIMINGS, LINE_TIMINGS } from '@/data/segmentTimings';

export interface RouteStep {
  type: 'board' | 'interchange' | 'travel' | 'alight' | 'bus';
  station: Station;
  line?: keyof typeof LINE_COLORS;
  direction?: string;
  stationCount?: number;
  stations?: Station[];
  trainTime?: string; // When to board the train
  arrivalTime?: string; // When this leg arrives at the interchange/alight station
  trainId?: string; // Unique ID of the train
  allStations?: string[]; // ALL station IDs in this leg (from -> to)
  isDirect?: boolean; // Is this a direct train (no interchange needed)
  waitTime?: number; // Wait time for interchange in minutes
  busDestination?: string; // For bus step
}

export interface PlannedRoute {
  origin: Station;
  destination: Station;
  steps: RouteStep[];
  totalStations: number;
  totalTime: number; // in minutes
  interchangeCount: number;
  fare: number; // in INR
  departureTime?: string;
  arrivalTime?: string;
  departureMinutes?: number;
  arrivalMinutes?: number;
  isDirect?: boolean;
  hasBusSegment?: boolean;

  // Trust/confidence for UI
  // - timetable: schedule matched for all legs (no estimated fallback)
  // - estimated: at least one leg fell back to estimated timings
  // - mixed: some legs matched, some estimated
  routeConfidence?: 'timetable' | 'estimated' | 'mixed';
}

// Define station order for each line (terminal to terminal)
const getDayType = (date: Date = new Date()) => {
  const day = date.getDay();
  return day === 0 ? 'Sunday' : day === 6 ? 'Saturday' : 'Mon-Fri';
};

const LINE_STATIONS: Record<string, string[]> = {
  blue: [
    'thaltej_gam', 'thaltej', 'doordarshan_kendra', 'gurukul_road', 'gujarat_university',
    'commerce_six_road', 'stadium', 'old_high_court', 'shahpur', 'gheekanta', 'kalupur',
    'kankaria_east', 'apparel_park', 'amraiwadi', 'rabari_colony', 'vastral',
    'nirant_cross_roads', 'vastral_gam'
  ],
  red: [
    'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram',
    'old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec',
    'sabarmati', 'motera_stadium', 'koteshwar_road'
  ],
  green: [
    'koteshwar_road', 'vishwakarma_college', 'tapovan_circle',
    'narmada_canal', 'koba_circle', 'juna_koba', 'koba_gam', 'gnlu', 'raysan',
    'randesan', 'dholakuva_circle', 'infocity', 'sector_1', 'sector_10a', 'sachivalaya',
    'akshardham', 'juna_sachivalaya', 'sector_16', 'sector_24', 'mahatma_mandir'
  ],
  purple: ['gnlu', 'pdpu', 'gift_city']
};

// Terminal stations for direction names
const LINE_TERMINALS: Record<string, { start: string; end: string }> = {
  blue: { start: 'Thaltej Gam', end: 'Vastral Gam' },
  red: { start: 'APMC', end: 'Koteshwar Road' },
  green: { start: 'Koteshwar Road', end: 'Mahatma Mandir' },
  purple: { start: 'GNLU', end: 'GIFT City' }
};

const MAX_WAIT_FOR_DIRECT = 20; // Max minutes to wait for a direct train
const BUS_TIME_GNLU_TO_PDPU = 8; // Bus takes ~8 mins from GNLU to PDPU
const BUS_TIME_GNLU_TO_GIFT = 15; // Bus takes ~15 mins from GNLU to GIFT City
const MIN_TRANSFER_TIME = 2; // Minimum minutes required to change trains

import { BLUE_LINE_STATION_INDEX, BLUE_LINE_FARE_MATRIX, RED_LINE_STATION_INDEX, BLUE_RED_FARE_MATRIX, RED_LINE_FARE_MATRIX } from '@/data/fareData';

// Fare calculation (based on number of stations, with precise matrix for Blue, Red and Blue-Red lookups)
export const calculateFare = (originId: string, destId: string, stationCount: number): number => {
  // 1. Check Blue-Blue internal fare
  const originBlueIdx = BLUE_LINE_STATION_INDEX[originId];
  const destBlueIdx = BLUE_LINE_STATION_INDEX[destId];

  if (originBlueIdx !== undefined && destBlueIdx !== undefined) {
    return BLUE_LINE_FARE_MATRIX[originBlueIdx][destBlueIdx];
  }

  // 2. Check Red-Red internal fare
  const originRedIdx = RED_LINE_STATION_INDEX[originId];
  const destRedIdx = RED_LINE_STATION_INDEX[destId];

  if (originRedIdx !== undefined && destRedIdx !== undefined) {
    return RED_LINE_FARE_MATRIX[originRedIdx][destRedIdx];
  }

  // 3. Check Blue-Red inter-line fare
  // Blue -> Red
  if (originBlueIdx !== undefined && destRedIdx !== undefined) {
    return BLUE_RED_FARE_MATRIX[originBlueIdx][destRedIdx];
  }
  // Red -> Blue
  if (originRedIdx !== undefined && destBlueIdx !== undefined) {
    return BLUE_RED_FARE_MATRIX[destBlueIdx][originRedIdx];
  }

  // Fallback distance-based fare for other lines (Green, Purple) or multi-line journeys
  // Derived from user requirements and Blue/Red dynamics: 
  // 0-2 stations: 5, 3-7: 10, 8-10: 15, 11-14: 20, 15-22: 25, 23-26: 30, 27-30: 35, 31+: 40
  // 0-3 stops: 5
  if (stationCount <= 3) return 5;
  // 4-6 stops: 10
  if (stationCount <= 6) return 10;
  // 7-10 stops: 15
  if (stationCount <= 10) return 15;
  // 11-15 stops: 20
  if (stationCount <= 15) return 20;
  // 16-20 stops: 25
  if (stationCount <= 20) return 25;
  // 21-25 stops: 30
  if (stationCount <= 25) return 30;
  // 26-30 stops: 35
  if (stationCount <= 30) return 35;
  // 31 or more stops: 40
  return 40;
};

// Get current time in minutes from midnight
const getCurrentTimeMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Parse time string to minutes
const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Format minutes to time string
const formatMinutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Pre-compute accurate travel times between any two stations on corridor/line schedules
// This uses the official segment timing data for accuracy
const getAccurateTravelTime = (originId: string, destId: string): number | null => {
  // Check corridor timings first (most accurate for cross-line journeys)
  const corridors = [
    CORRIDOR_TIMINGS.apmcToMahatmaMandir,
    CORRIDOR_TIMINGS.apmcToSachivalaya,
    CORRIDOR_TIMINGS.apmcToGnlu,
    CORRIDOR_TIMINGS.apmcToGift,
    REVERSE_CORRIDOR_TIMINGS.mahatmaMandirToApmc,
    REVERSE_CORRIDOR_TIMINGS.sachivalayaToApmc,
    REVERSE_CORRIDOR_TIMINGS.gnluToApmc,
    REVERSE_CORRIDOR_TIMINGS.giftToApmc,
  ];

  for (const corridor of corridors) {
    const originIdx = corridor.stations.indexOf(originId);
    const destIdx = corridor.stations.indexOf(destId);
    if (originIdx !== -1 && destIdx !== -1 && originIdx < destIdx) {
      return corridor.arrivalMinutes[destIdx] - corridor.arrivalMinutes[originIdx];
    }
  }

  // Check individual line timings
  const lines = [
    LINE_TIMINGS.blue,
    LINE_TIMINGS.red,
    LINE_TIMINGS.green,
    LINE_TIMINGS.purple,
  ];

  for (const line of lines) {
    const originIdx = line.stations.indexOf(originId);
    const destIdx = line.stations.indexOf(destId);
    if (originIdx !== -1 && destIdx !== -1) {
      const timeDiff = Math.abs(line.arrivalMinutes[destIdx] - line.arrivalMinutes[originIdx]);
      return timeDiff;
    }
  }

  return null;
};

// Find next train at a station going towards destination
const findNextTrain = (
  stationId: string,
  afterMinutes: number,
  destStationId: string,
  preferredLine?: string
): { schedule: TrainSchedule; departureMinutes: number; arrivalMinutes: number; trainId: string } | null => {
  const candidates: { schedule: TrainSchedule; departureMinutes: number; arrivalMinutes: number; trainId: string }[] = [];

  for (const schedule of trainSchedules) {
    const stationIdx = schedule.stations.indexOf(stationId);
    const destIdx = schedule.stations.indexOf(destStationId);

    // Station must be on route, and destination must be after it
    if (stationIdx !== -1 && destIdx !== -1 && stationIdx < destIdx) {
      const startMinutes = parseTimeToMinutes(schedule.startTime);
      const departureMinutes = startMinutes + schedule.stationTimes[stationIdx];
      const arrivalMinutes = startMinutes + schedule.stationTimes[destIdx];

      // Train must depart after specified time
      if (departureMinutes > afterMinutes) {
        // Prefer specified line if given
        if (preferredLine && schedule.line !== preferredLine) continue;

        candidates.push({ schedule, departureMinutes, arrivalMinutes, trainId: schedule.id });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.departureMinutes - b.departureMinutes);
  return candidates[0];
};

// Find next train on a specific line at a station
const findNextTrainOnLine = (
  stationId: string,
  line: string,
  afterMinutes: number,
  direction: 'forward' | 'backward' | 'any' = 'any'
): { schedule: TrainSchedule; departureMinutes: number } | null => {
  const candidates: { schedule: TrainSchedule; departureMinutes: number }[] = [];

  for (const schedule of trainSchedules) {
    if (schedule.line !== line) continue;
    if (direction !== 'any' && schedule.direction !== direction) continue;

    const stationIdx = schedule.stations.indexOf(stationId);
    if (stationIdx === -1) continue;

    const startMinutes = parseTimeToMinutes(schedule.startTime);
    const departureMinutes = startMinutes + schedule.stationTimes[stationIdx];

    if (departureMinutes > afterMinutes) {
      candidates.push({ schedule, departureMinutes });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.departureMinutes - b.departureMinutes);
  return candidates[0];
};

// Check if a train goes directly between two stations
const findDirectTrain = (originId: string, destId: string): {
  schedule: TrainSchedule;
  departureTime: string;
  arrivalTime: string;
  minutesAway: number;
  departureMinutes: number;
  arrivalMinutes: number;
  trainId: string;
} | null => {
  const currentMinutes = getCurrentTimeMinutes();

  const directTrains: {
    schedule: TrainSchedule;
    departureMinutes: number;
    arrivalMinutes: number;
  }[] = [];

  for (const schedule of trainSchedules) {
    const originIdx = schedule.stations.indexOf(originId);
    const destIdx = schedule.stations.indexOf(destId);

    if (originIdx !== -1 && destIdx !== -1 && originIdx < destIdx) {
      const startMinutes = parseTimeToMinutes(schedule.startTime);
      const departureMinutes = startMinutes + schedule.stationTimes[originIdx];
      const arrivalMinutes = startMinutes + schedule.stationTimes[destIdx];

      if (departureMinutes > currentMinutes) {
        directTrains.push({ schedule, departureMinutes, arrivalMinutes });
      }
    }
  }

  if (directTrains.length === 0) return null;

  directTrains.sort((a, b) => a.departureMinutes - b.departureMinutes);
  const next = directTrains[0];

  return {
    schedule: next.schedule,
    departureTime: formatMinutesToTime(next.departureMinutes),
    arrivalTime: formatMinutesToTime(next.arrivalMinutes),
    minutesAway: next.departureMinutes - currentMinutes,
    departureMinutes: next.departureMinutes,
    arrivalMinutes: next.arrivalMinutes,
    trainId: next.schedule.id
  };
};

// Get direction name based on travel direction on a line
const getDirection = (line: string, fromIdx: number, toIdx: number): string => {
  const terminal = LINE_TERMINALS[line];
  if (!terminal) return '';
  return fromIdx < toIdx ? `towards ${terminal.end}` : `towards ${terminal.start}`;
};

// Get all stations between two stations from a schedule (exclusive of endpoints)
const getStationsBetweenFromSchedule = (schedule: TrainSchedule, fromId: string, toId: string): Station[] => {
  const fromIdx = schedule.stations.indexOf(fromId);
  const toIdx = schedule.stations.indexOf(toId);

  if (fromIdx === -1 || toIdx === -1) return [];

  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);

  const stationIds = schedule.stations.slice(start + 1, end);
  if (fromIdx > toIdx) {
    stationIds.reverse();
  }

  return stationIds.map(id => stations[id]).filter(Boolean);
};

// Get all stations between two stations on a line (exclusive of endpoints)
const getStationsBetween = (line: string, fromId: string, toId: string): Station[] => {
  const lineStationsList = LINE_STATIONS[line];
  if (!lineStationsList) return [];

  const fromIdx = lineStationsList.indexOf(fromId);
  const toIdx = lineStationsList.indexOf(toId);

  if (fromIdx === -1 || toIdx === -1) return [];

  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);

  const stationIds = lineStationsList.slice(start + 1, end);
  if (fromIdx > toIdx) {
    stationIds.reverse();
  }

  return stationIds.map(id => stations[id]).filter(Boolean);
};

// Get station index on a line
const getStationIndex = (line: string, stationId: string): number => {
  return LINE_STATIONS[line]?.indexOf(stationId) ?? -1;
};

// Check if station is on line
const isStationOnLine = (stationId: string, line: string): boolean => {
  return LINE_STATIONS[line]?.includes(stationId) ?? false;
};

// Check if any train schedule can take you from station A to station B
const canReachDirectlyByTrain = (fromId: string, toId: string): boolean => {
  for (const schedule of trainSchedules) {
    const fromIdx = schedule.stations.indexOf(fromId);
    const toIdx = schedule.stations.indexOf(toId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
      return true;
    }
  }
  return false;
};

// Get all lines for a station
const getStationLines = (stationId: string): string[] => {
  return stations[stationId]?.lines || [];
};

// BFS to find the shortest path (by number of interchanges)
interface BFSNode {
  stationId: string;
  line: string;
  path: { stationId: string; line: string }[];
}

const findShortestPath = (originId: string, destId: string): { stationId: string; line: string }[] | null => {
  const originLines = getStationLines(originId);
  const destLines = getStationLines(destId);

  if (originLines.length === 0 || destLines.length === 0) return null;

  // Check for direct route on same line first
  for (const line of originLines) {
    if (isStationOnLine(destId, line)) {
      return [
        { stationId: originId, line },
        { stationId: destId, line }
      ];
    }
  }

  // Check if any train schedule goes directly from origin to destination
  // This catches corridor trains that span multiple lines
  if (canReachDirectlyByTrain(originId, destId)) {
    // Find which schedule covers this route
    for (const schedule of trainSchedules) {
      const originIdx = schedule.stations.indexOf(originId);
      const destIdx = schedule.stations.indexOf(destId);
      if (originIdx !== -1 && destIdx !== -1 && originIdx < destIdx) {
        return [
          { stationId: originId, line: schedule.line },
          { stationId: destId, line: schedule.line }
        ];
      }
    }
  }

  // BFS for routes with interchanges
  const queue: BFSNode[] = [];
  const visited = new Set<string>();

  for (const line of originLines) {
    queue.push({
      stationId: originId,
      line,
      path: [{ stationId: originId, line }]
    });
    visited.add(`${originId}:${line}`);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { stationId, line, path } = current;

    const lineStationsList = LINE_STATIONS[line] || [];

    for (const nextStationId of lineStationsList) {
      if (nextStationId === destId) {
        return [...path, { stationId: destId, line }];
      }

      const nextStation = stations[nextStationId];
      if (nextStation && nextStation.isInterchange) {
        // Check if any train from this interchange goes directly to destination
        if (canReachDirectlyByTrain(nextStationId, destId)) {
          // Find which line/schedule covers this
          for (const schedule of trainSchedules) {
            const fromIdx = schedule.stations.indexOf(nextStationId);
            const toIdx = schedule.stations.indexOf(destId);
            if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
              return [
                ...path,
                { stationId: nextStationId, line },
                { stationId: nextStationId, line: schedule.line },
                { stationId: destId, line: schedule.line }
              ];
            }
          }
        }

        for (const nextLine of nextStation.lines) {
          const visitKey = `${nextStationId}:${nextLine}`;
          if (!visited.has(visitKey)) {
            visited.add(visitKey);

            if (isStationOnLine(destId, nextLine)) {
              return [
                ...path,
                { stationId: nextStationId, line },
                { stationId: nextStationId, line: nextLine },
                { stationId: destId, line: nextLine }
              ];
            }

            queue.push({
              stationId: nextStationId,
              line: nextLine,
              path: [
                ...path,
                { stationId: nextStationId, line },
                { stationId: nextStationId, line: nextLine }
              ]
            });
          }
        }
      }
    }
  }

  return null;
};

// Build time-aware route with actual wait times from timetable
const buildTimeAwareRoute = (
  path: { stationId: string; line: string }[],
  startTimeMinutes: number
): PlannedRoute | null => {
  if (!path || path.length < 2) return null;

  const origin = stations[path[0].stationId];
  const destination = stations[path[path.length - 1].stationId];

  if (!origin || !destination) return null;

  // Process path into segments
  const segments: { from: string; to: string; line: string }[] = [];
  let currentLine = path[0].line;
  let segmentStart = path[0].stationId;

  for (let i = 1; i < path.length; i++) {
    const node = path[i];

    if (node.line !== currentLine && node.stationId === path[i - 1].stationId) {
      segments.push({ from: segmentStart, to: node.stationId, line: currentLine });
      currentLine = node.line;
      segmentStart = node.stationId;
    } else if (node.line === currentLine && i === path.length - 1) {
      segments.push({ from: segmentStart, to: node.stationId, line: currentLine });
    }
  }

  const steps: RouteStep[] = [];
  let totalStationsCount = 0;
  let interchangeCount = 0;
  let hasTimetable = false;
  let hasEstimated = false;
  let currentTimeMinutes = startTimeMinutes;
  let firstDepartureTime: string | undefined;
  let firstDepartureMinutes: number | undefined;
  let lastArrivalTime: string | undefined;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const fromStation = stations[seg.from];
    const toStation = stations[seg.to];

    // Find next train for this segment - don't force a specific line to allow corridor trains
    const nextTrain = findNextTrain(seg.from, currentTimeMinutes, seg.to);

    if (!nextTrain) {
      // No train found, fall back to estimated times using LINE_STATIONS
      hasEstimated = true;
      const stationsBetween = getStationsBetween(seg.line, seg.from, seg.to);
      const stationCount = Math.max(1, stationsBetween.length + 1);
      const fromIdx = getStationIndex(seg.line, seg.from);
      const toIdx = getStationIndex(seg.line, seg.to);
      const direction = getDirection(seg.line, fromIdx, toIdx);

      if (i === 0) {
        // No timetable match: treat the journey as starting now (estimate-only fallback)
        firstDepartureMinutes = startTimeMinutes;
        firstDepartureTime = formatMinutesToTime(startTimeMinutes);

        steps.push({
          type: 'board',
          station: fromStation,
          line: seg.line as keyof typeof LINE_COLORS,
          direction
        });
      }

      steps.push({
        type: 'travel',
        station: toStation,
        line: seg.line as keyof typeof LINE_COLORS,
        stationCount,
        stations: stationsBetween
      });

      // Estimate time
      currentTimeMinutes += stationCount * 2.5;
    } else {
      hasTimetable = true;
      // Use the actual schedule to get stations between
      const stationsBetween = getStationsBetweenFromSchedule(nextTrain.schedule, seg.from, seg.to);
      const stationCount = stationsBetween.length + 1;

      // Get direction from the schedule's final station
      const finalStation = nextTrain.schedule.stations[nextTrain.schedule.stations.length - 1];
      const finalStationName = stations[finalStation]?.name || finalStation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const direction = `towards ${finalStationName}`;

      const trainTime = formatMinutesToTime(nextTrain.departureMinutes);
      const arrivalTime = formatMinutesToTime(nextTrain.arrivalMinutes);
      const displayLine = nextTrain.schedule.line as keyof typeof LINE_COLORS;

      // Get all station IDs for this segment from the schedule
      const fromIdx = nextTrain.schedule.stations.indexOf(seg.from);
      const toIdx = nextTrain.schedule.stations.indexOf(seg.to);
      const allStationsInSegment = fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx
        ? nextTrain.schedule.stations.slice(fromIdx, toIdx + 1).filter((st, i, arr) => i === 0 || st !== arr[i - 1])
        : [seg.from, seg.to];

      if (i === 0) {
        firstDepartureTime = trainTime;
        firstDepartureMinutes = nextTrain.departureMinutes;

        steps.push({
          type: 'board',
          station: fromStation,
          line: displayLine,
          direction,
          trainTime,
          trainId: nextTrain.trainId,
          allStations: allStationsInSegment
        });
      }

      steps.push({
        type: 'travel',
        station: toStation,
        line: displayLine,
        stationCount,
        stations: stationsBetween,
        trainId: nextTrain.trainId,
        allStations: allStationsInSegment
      });

      currentTimeMinutes = nextTrain.arrivalMinutes;
      lastArrivalTime = arrivalTime;
      totalStationsCount += stationCount;
    }

    // Interchange with actual wait time
    if (i < segments.length - 1) {
      const nextSeg = segments[i + 1];

      // Find next connecting train - allowing MIN_TRANSFER_TIME for walking between platforms
      const connectingTrain = findNextTrain(nextSeg.from, currentTimeMinutes + MIN_TRANSFER_TIME, nextSeg.to);

      let waitTime = 5; // Default
      let nextTrainTime: string | undefined;
      let nextDirection = '';
      let nextDisplayLine = nextSeg.line as keyof typeof LINE_COLORS;

      // Compute interchange times/direction/line based on the actual connecting train when possible.
      if (connectingTrain) {
        // connectingTrain departs at `connectingTrain.departureMinutes` (from nextSeg.from)
        // and we currently are at the arrival time of the previous segment at `currentTimeMinutes`.
        waitTime = Math.max(0, connectingTrain.departureMinutes - currentTimeMinutes);
        nextTrainTime = formatMinutesToTime(connectingTrain.departureMinutes);
        nextDirection = (() => {
          const finalStation = connectingTrain.schedule.stations[connectingTrain.schedule.stations.length - 1];
          const finalStationName = stations[finalStation]?.name || finalStation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `towards ${finalStationName}`;
        })();
        nextDisplayLine = connectingTrain.schedule.line as keyof typeof LINE_COLORS;
        currentTimeMinutes = connectingTrain.departureMinutes;
      } else {
        // Estimated fallback: keep waitTime default.
        const nextFromIdx = getStationIndex(nextSeg.line, nextSeg.from);
        const nextToIdx = getStationIndex(nextSeg.line, nextSeg.to);
        nextDirection = getDirection(nextSeg.line, nextFromIdx, nextToIdx);
      }

      // Get allStations for the connecting train segment if available
      let interchangeAllStations: string[] | undefined;
      if (connectingTrain) {
        const cFromIdx = connectingTrain.schedule.stations.indexOf(nextSeg.from);
        const cToIdx = connectingTrain.schedule.stations.indexOf(nextSeg.to);
        if (cFromIdx !== -1 && cToIdx !== -1 && cToIdx > cFromIdx) {
          interchangeAllStations = connectingTrain.schedule.stations.slice(cFromIdx, cToIdx + 1);
        }
      }

      steps.push({
        type: 'interchange',
        station: toStation,
        line: nextDisplayLine,
        direction: nextDirection,
        waitTime,
        trainTime: nextTrainTime,
        trainId: connectingTrain?.trainId,
        allStations: interchangeAllStations
      });

      interchangeCount++;
    }
  }

  // Alight
  steps.push({
    type: 'alight',
    station: destination
  });

  const journeyStartMinutes = firstDepartureMinutes ?? startTimeMinutes;
  const totalTime = currentTimeMinutes - journeyStartMinutes;

  return {
    origin,
    destination,
    steps,
    totalStations: totalStationsCount,
    // Show journey duration from the selected/actual first departure (not from "now")
    totalTime: Math.round(totalTime),
    interchangeCount,
    fare: calculateFare(origin.id, destination.id, totalStationsCount),
    departureTime: firstDepartureTime ?? formatMinutesToTime(journeyStartMinutes),
    arrivalTime: lastArrivalTime,
    departureMinutes: firstDepartureMinutes ?? journeyStartMinutes,
    arrivalMinutes: currentTimeMinutes,
    routeConfidence: (hasTimetable && hasEstimated) ? 'mixed' : (hasEstimated ? 'estimated' : 'timetable')
  };
};

// Build route with bus from GNLU to PDPU/GIFT City
const buildBusRoute = (
  originId: string,
  destId: string,
  startTimeMinutes: number
): PlannedRoute | null => {
  const origin = stations[originId];
  const destination = stations[destId];
  const gnluStation = stations['gnlu'];

  if (!origin || !destination || !gnluStation) return null;

  let stepsWithBus: RouteStep[] = [];
  let arrivalAtGnlu = startTimeMinutes;
  let totalFare = 0;
  let totalStations = 0;
  let interchangeCount = 0;
  let departureTime = formatMinutesToTime(startTimeMinutes);
  let departureMinutes = startTimeMinutes;
  let totalTime = 0;
  let routeConfidence: 'timetable' | 'mixed' | 'estimated' = 'timetable';

  if (originId !== 'gnlu') {
    // First, build route from origin to GNLU
    const pathToGnlu = findShortestPath(originId, 'gnlu');
    if (!pathToGnlu) return null;

    const routeToGnlu = buildTimeAwareRoute(pathToGnlu, startTimeMinutes);
    if (!routeToGnlu) return null;

    arrivalAtGnlu = routeToGnlu.arrivalMinutes ?? startTimeMinutes;
    totalFare = routeToGnlu.fare;
    totalStations = routeToGnlu.totalStations;
    interchangeCount = routeToGnlu.interchangeCount;
    departureTime = routeToGnlu.departureTime;
    departureMinutes = routeToGnlu.departureMinutes;
    totalTime = routeToGnlu.totalTime;
    routeConfidence = routeToGnlu.routeConfidence ?? 'timetable';
    
    stepsWithBus = [...routeToGnlu.steps];

    const alightIdx = stepsWithBus.findIndex(
      (s) => s.type === 'alight' && s.station?.id === 'gnlu'
    );

    if (alightIdx === -1) return null;
    stepsWithBus.splice(alightIdx);
  }

  // Determine bus time
  const busTime = destId === 'pdpu' ? BUS_TIME_GNLU_TO_PDPU : BUS_TIME_GNLU_TO_GIFT;
  const busDestName = destId === 'pdpu' ? 'PDPU' : 'GIFT City';

  stepsWithBus.push({
    type: 'bus',
    station: gnluStation,
    busDestination: busDestName
  });

  // Add alight at destination
  stepsWithBus.push({
    type: 'alight',
    station: destination
  });

  totalTime += busTime;
  const busArrivalMinutes = arrivalAtGnlu + busTime;

  return {
    origin,
    destination,
    steps: stepsWithBus,
    totalStations: totalStations,
    totalTime,
    interchangeCount: interchangeCount,
    fare: totalFare,
    departureTime: departureTime,
    arrivalTime: formatMinutesToTime(busArrivalMinutes),
    departureMinutes: departureMinutes,
    arrivalMinutes: busArrivalMinutes,
    hasBusSegment: true,
    routeConfidence
  };
};

// Build a direct route (no interchange needed)
const buildDirectRoute = (
  originId: string,
  destId: string,
  directTrain: { schedule: TrainSchedule; departureTime: string; arrivalTime: string; minutesAway: number; departureMinutes: number; arrivalMinutes: number }
): PlannedRoute | null => {
  const origin = stations[originId];
  const destination = stations[destId];

  if (!origin || !destination) return null;

  const schedule = directTrain.schedule;
  const originIdx = schedule.stations.indexOf(originId);
  const destIdx = schedule.stations.indexOf(destId);

  const stationIds = schedule.stations.slice(originIdx + 1, destIdx);
  const stationsBetween = stationIds.map(id => stations[id]).filter(Boolean);
  const stationCount = stationsBetween.length + 1;

  const finalStation = schedule.stations[schedule.stations.length - 1];
  const finalStationName = stations[finalStation]?.name || finalStation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const direction = `towards ${finalStationName}`;

  const displayLine = schedule.line as keyof typeof LINE_COLORS;

  const steps: RouteStep[] = [
    {
      type: 'board',
      station: origin,
      line: displayLine,
      direction,
      trainTime: directTrain.departureTime,
      trainId: (directTrain as { trainId?: string }).trainId || directTrain.schedule.id,
      isDirect: true
    },
    {
      type: 'travel',
      station: destination,
      line: displayLine,
      stationCount,
      stations: stationsBetween,
      isDirect: true
    },
    {
      type: 'alight',
      station: destination
    }
  ];

  const travelTime = schedule.stationTimes[destIdx] - schedule.stationTimes[originIdx];

  return {
    origin,
    destination,
    steps,
    totalStations: stationCount,
    totalTime: Math.round(travelTime),
    interchangeCount: 0,
    fare: calculateFare(originId, destId, stationCount),
    departureTime: directTrain.departureTime,
    arrivalTime: directTrain.arrivalTime,
    departureMinutes: directTrain.departureMinutes,
    arrivalMinutes: directTrain.arrivalMinutes,
    isDirect: true,
    routeConfidence: 'timetable'
  };
};

export const planRoute = (originId: string, destinationId: string): PlannedRoute | null => {
  const origin = stations[originId];
  const destination = stations[destinationId];

  if (!origin || !destination) return null;
  if (originId === destinationId) return null;

  const currentMinutes = getCurrentTimeMinutes();
  const currentDayType = getDayType();
  const departures = getAvailableDepartures(originId, destinationId, currentDayType);

  const isPurpleDestination = destinationId === 'pdpu' || destinationId === 'gift_city';

  if (departures.length === 0) {
    if (isPurpleDestination && originId !== 'gnlu') {
      const busRoute = buildBusRoute(originId, destinationId, currentMinutes);
      if (busRoute) return busRoute;
    }
    return null;
  }

  // We strictly show trains that are departing from the current minute onwards
  const GRACE_PERIOD = 0;
  let possible = departures.filter(d => d.departureMinutes >= currentMinutes - GRACE_PERIOD);

  let isTomorrow = false;
  if (possible.length === 0) {
    // If no more departures today, show the first available departure for tomorrow morning
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayType = getDayType(tomorrow);
    
    const tomorrowDepartures = getAvailableDepartures(originId, destinationId, tomorrowDayType);
    possible = tomorrowDepartures.filter(d => d.departureMinutes >= 380);
    isTomorrow = true;
    
    if (possible.length === 0) {
      return null;
    }
  }

  // Find the absolute best departure:
  // 1. Minimum arrival time (earliest to reach destination)
  // 2. Maximum departure time (shortest journey for that arrival)
  // 3. Minimum interchanges
  const sorted = [...possible].sort((a, b) => {
    if (a.arrivalMinutes !== b.arrivalMinutes) {
      return a.arrivalMinutes - b.arrivalMinutes;
    }
    if (a.departureMinutes !== b.departureMinutes) {
      return b.departureMinutes - a.departureMinutes; // Later departure is better for same arrival
    }
    return a.interchangeCount - b.interchangeCount;
  });

  const best = sorted[0];

  const targetDayType = isTomorrow ? getDayType(new Date(Date.now() + 86400000)) : currentDayType;
  const route = planRouteWithDeparture(originId, destinationId, best.departureMinutes, targetDayType);
  if (!route) return null;

  // Special handling for PDPU and GIFT City: suggest bus even if a direct train exists but is infrequent
  if (isPurpleDestination && originId !== 'gnlu') {
    // Check wait time at GNLU (even if direct, metro to PDPU/GIFT is often just a feeder)
    const gnluStepIdx = route.steps.findIndex(s => s.station.id === 'gnlu');
    if (gnluStepIdx !== -1) {
      const gnluStep = route.steps[gnluStepIdx];
      // If the train arrives late or has a long wait/transfer feel, suggest bus
      // The user specifically asked for bus choice for PDPU.
      const busRoute = buildBusRoute(originId, destinationId, currentMinutes);

      // Suggest bus if metro arrival is more than 5 mins later than bus arrival OR if it's the specific PDPU request
      // We increased the buffer to 10 mins to prioritize the bus feeder as requested.
      if (busRoute && route.arrivalMinutes) {
        const busArrivalMins = busRoute.arrivalMinutes ?? 0;
        if (busArrivalMins < route.arrivalMinutes + 10) {
          return busRoute;
        }
      }
    }
  }

  return route;
};

// Get all stations as options for selection
export const getStationOptions = (): { id: string; name: string; lines: string[]; isInterchange?: boolean }[] => {
  return Object.values(stations)
    .filter(s => !s.isWIP)
    .map(s => ({ id: s.id, name: s.name, lines: s.lines, isInterchange: s.isInterchange }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Get stations organized by category: interchanges first, then by line
export const getOrganizedStations = (): {
  interchanges: { id: string; name: string; lines: string[] }[];
  byLine: { line: string; lineName: string; stations: { id: string; name: string; lines: string[] }[] }[];
} => {
  const allStations = Object.values(stations).filter(s => !s.isWIP);
  
  // Get interchange stations
  const interchanges = allStations
    .filter(s => s.isInterchange)
    .map(s => ({ id: s.id, name: s.name, lines: s.lines }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Define line order and names
  const lineOrder = [
    { line: 'blue', name: 'Blue Line (Thaltej ↔ Vastral)' },
    { line: 'red', name: 'Red Line (APMC ↔ Koteshwar)' },
    { line: 'green', name: 'Green Line (Koteshwar ↔ Mahatma Mandir)' },
    { line: 'purple', name: 'Purple Line (GNLU ↔ GIFT City)' },
  ];
  
  // Get stations by line (excluding ones already in interchanges)
  const interchangeIds = new Set(interchanges.map(s => s.id));
  
  const byLine = lineOrder.map(({ line, name }) => {
    const lineStations = allStations
      .filter((s: typeof allStations[number]) => (s.lines as string[]).includes(line as string) && !interchangeIds.has(s.id))
      .map(s => ({ id: s.id, name: s.name, lines: s.lines }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return { line, lineName: name, stations: lineStations };
  }).filter(group => group.stations.length > 0);
  
  return { interchanges, byLine };
};

// Module-level cache to prevent running 150x Dijkstra loops repeatedly for the same route.
// Includes a dayType sentinel so the cache auto-invalidates at midnight (dayType change).
let departureCacheDayType = '';
const departureCache = new Map<string, {
  departureTime: string;
  arrivalTime: string;
  departureMinutes: number;
  arrivalMinutes: number;
  isDirect: boolean;
  interchangeCount: number;
}[]>();

// Get all available departure times for a route from origin to destination
export const getAvailableDepartures = (originId: string, destId: string, dayType: string = getDayType()): {
  departureTime: string;
  arrivalTime: string;
  departureMinutes: number;
  arrivalMinutes: number;
  isDirect: boolean;
  interchangeCount: number;
}[] => {
  if (departureCacheDayType !== dayType) {
    departureCache.clear();
    departureCacheDayType = dayType;
  }

  const cacheKey = `${originId}-${destId}-${dayType}`;
  if (departureCache.has(cacheKey)) {
    return departureCache.get(cacheKey)!;
  }

  // Collect all unique departure minutes at origin (from all schedules)
  const departureMinutesSet = new Set<number>();

  for (const schedule of trainSchedules) {
    if (schedule.dayType && schedule.dayType !== dayType) continue;
    const originIdx = schedule.stations.indexOf(originId);
    // Skip if origin not on this schedule or it's the last station
    if (originIdx === -1 || originIdx === schedule.stations.length - 1) continue;

    const startMinutes = parseTimeToMinutes(schedule.startTime);
    const departureMinutes = startMinutes + schedule.stationTimes[originIdx];

    // Do not arbitrarily limit departure minutes to 22:00, because trains depart later from intermediate stations
    departureMinutesSet.add(departureMinutes);
  }

  const departureMinutesList = Array.from(departureMinutesSet).sort((a, b) => a - b);

  // For each exact departure time, compute the best (earliest-arrival) route that starts on a train leaving at that exact minute.
  const results: {
    departureTime: string;
    arrivalTime: string;
    departureMinutes: number;
    arrivalMinutes: number;
    isDirect: boolean;
    interchangeCount: number;
  }[] = [];

  for (const depMin of departureMinutesList) {
    const route = planRouteWithDeparture(originId, destId, depMin, dayType);
    if (!route?.departureTime || !route.arrivalTime) continue;

    const arrMin = parseTimeToMinutes(route.arrivalTime);

    results.push({
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      departureMinutes: depMin,
      arrivalMinutes: arrMin,
      isDirect: !!route.isDirect,
      interchangeCount: route.interchangeCount,
    });
  }

  // If there are direct trains available for this route, filter out all interchange trains.
  const hasDirectTrains = results.some(r => r.isDirect);
  const filteredResults = hasDirectTrains ? results.filter(r => r.isDirect) : results;

  // Sort by departure time DESCENDING (latest first) to apply backwards domination filter
  filteredResults.sort((a, b) => b.departureMinutes - a.departureMinutes);

  const pruned: typeof results = [];
  let bestArrival = Infinity;

  for (const r of filteredResults) {
    if (r.arrivalMinutes < bestArrival) {
      pruned.push(r);
      bestArrival = r.arrivalMinutes;
    } else if (r.arrivalMinutes === bestArrival && r.interchangeCount < pruned[pruned.length - 1].interchangeCount) {
      // If it arrives at the exact same time but has FEWER interchanges, we might prefer it,
      // but usually an earlier departure with fewer interchanges means it's a slower direct train.
      // However, typically a later departure is strictly better. So we discard earlier departures
      // unless we want to offer the user a slower direct train instead of a faster interchange train.
      // For now, if you leave earlier and arrive at the same time, it's dominated.
      // We strictly discard it.
    }
  }

  // Reverse back to chronological order (earliest first)
  pruned.reverse();
  
  departureCache.set(cacheKey, pruned);
  return pruned;
};

type PrevEdge = {
  prevStationId: string;
  scheduleId: string;
  fromIdx: number;
  toIdx: number;
  departMinutes: number;
  arriveMinutes: number;
};

const getSchedulesDepartingExactlyAt = (stationId: string, departureMinutes: number, dayType: string): { schedule: TrainSchedule; stationIdx: number; departMinutes: number }[] => {
  const matches: { schedule: TrainSchedule; stationIdx: number; departMinutes: number }[] = [];
  for (const schedule of trainSchedules) {
    if (schedule.dayType && schedule.dayType !== dayType) continue;
    const stationIdx = schedule.stations.indexOf(stationId);
    if (stationIdx === -1 || stationIdx === schedule.stations.length - 1) continue;

    const startMinutes = parseTimeToMinutes(schedule.startTime);
    const depMin = startMinutes + schedule.stationTimes[stationIdx];

    // Exact match - departure times must match precisely
    if (depMin === departureMinutes) {
      matches.push({ schedule, stationIdx, departMinutes: depMin });
    }
  }
  return matches;
};

const getStationsSlice = (schedule: TrainSchedule, fromIdx: number, toIdx: number) => {
  const slice = fromIdx <= toIdx 
    ? schedule.stations.slice(fromIdx, toIdx + 1)
    : schedule.stations.slice(toIdx, fromIdx + 1).reverse();
  return slice.filter((station, i) => i === 0 || station !== slice[i - 1]);
};

const getBetweenStationsSlice = (schedule: TrainSchedule, fromIdx: number, toIdx: number) => {
  const slice = fromIdx <= toIdx 
    ? schedule.stations.slice(fromIdx + 1, toIdx)
    : schedule.stations.slice(toIdx + 1, fromIdx).reverse();
  return slice.filter((station, i) => i === 0 || station !== slice[i - 1]);
};

const buildRouteFromLegs = (
  originId: string,
  destId: string,
  departureMinutes: number,
  legs: {
    schedule: TrainSchedule;
    fromId: string;
    toId: string;
    fromIdx: number;
    toIdx: number;
    departMinutes: number;
    arriveMinutes: number;
  }[]
): PlannedRoute | null => {
  const origin = stations[originId];
  const destination = stations[destId];
  if (!origin || !destination) return null;

  // Merge adjacent legs that use the same train schedule
  const mergedLegs: typeof legs = [];
  for (const leg of legs) {
    if (mergedLegs.length > 0 && mergedLegs[mergedLegs.length - 1].schedule.id === leg.schedule.id) {
      const last = mergedLegs[mergedLegs.length - 1];
      last.toId = leg.toId;
      last.toIdx = leg.toIdx;
      last.arriveMinutes = leg.arriveMinutes;
    } else {
      mergedLegs.push({ ...leg });
    }
  }

  const steps: RouteStep[] = [];
  let totalStationsCount = 0;
  let interchangeCount = 0;

  const firstLeg = mergedLegs[0];
  const firstSchedule = firstLeg.schedule;
  const firstFinalStation = firstSchedule.stations[firstSchedule.stations.length - 1];
  const firstFinalName = stations[firstFinalStation]?.name || firstFinalStation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  steps.push({
    type: 'board',
    station: origin,
    line: firstSchedule.line as keyof typeof LINE_COLORS,
    direction: `towards ${firstFinalName}`,
    trainTime: formatMinutesToTime(firstLeg.departMinutes),
    isDirect: mergedLegs.length === 1,
    trainId: firstSchedule.id,
    allStations: getStationsSlice(firstSchedule, firstLeg.fromIdx, firstLeg.toIdx)
  });

  for (let i = 0; i < mergedLegs.length; i++) {
    const leg = mergedLegs[i];

    const betweenIds = getBetweenStationsSlice(leg.schedule, leg.fromIdx, leg.toIdx);
    const betweenStations = betweenIds.map(id => stations[id]).filter(Boolean);
    const stationCount = betweenIds.length + 1;

    steps.push({
      type: 'travel',
      station: stations[leg.toId],
      line: leg.schedule.line as keyof typeof LINE_COLORS,
      stationCount,
      stations: betweenStations,
      isDirect: mergedLegs.length === 1,
      trainId: leg.schedule.id,
      allStations: getStationsSlice(leg.schedule, leg.fromIdx, leg.toIdx)
    });

    totalStationsCount += stationCount;

    if (i < mergedLegs.length - 1) {
      const nextLeg = mergedLegs[i + 1];
      const waitTime = Math.max(0, nextLeg.departMinutes - leg.arriveMinutes);

      const nextFinalStation = nextLeg.schedule.stations[nextLeg.schedule.stations.length - 1];
      const nextFinalName = stations[nextFinalStation]?.name || nextFinalStation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      steps.push({
        type: 'interchange',
        station: stations[leg.toId],
        line: nextLeg.schedule.line as keyof typeof LINE_COLORS,
        direction: `towards ${nextFinalName}`,
        waitTime,
        trainTime: formatMinutesToTime(nextLeg.departMinutes),
        arrivalTime: formatMinutesToTime(leg.arriveMinutes),
        trainId: nextLeg.schedule.id,
        allStations: getStationsSlice(nextLeg.schedule, nextLeg.fromIdx, nextLeg.toIdx)
      });

      interchangeCount++;
    }
  }

  steps.push({ 
    type: 'alight', 
    station: destination,
    arrivalTime: formatMinutesToTime(mergedLegs[mergedLegs.length - 1].arriveMinutes)
  });

  const lastArrivalMinutes = mergedLegs[mergedLegs.length - 1].arriveMinutes;

  const routeConfidence: PlannedRoute['routeConfidence'] = 'timetable';

  return {
    origin,
    destination,
    steps,
    totalStations: totalStationsCount,
    totalTime: Math.round(lastArrivalMinutes - departureMinutes),
    interchangeCount,
    fare: calculateFare(originId, destId, totalStationsCount),
    departureTime: formatMinutesToTime(departureMinutes),
    arrivalTime: formatMinutesToTime(lastArrivalMinutes),
    departureMinutes,
    arrivalMinutes: lastArrivalMinutes,
    isDirect: legs.length === 1,
    routeConfidence,
  };
};

// Plan route with specific (exact) departure time.
// This MUST honor the chosen departure minute (i.e., start on a train leaving at exactly that time from origin).
export const planRouteWithDeparture = (
  originId: string,
  destinationId: string,
  departureMinutes: number,
  dayType: string = getDayType()
): PlannedRoute | null => {
  const origin = stations[originId];
  const destination = stations[destinationId];
  if (!origin || !destination) return null;
  if (originId === destinationId) return null;

  // Seed candidates: all trains that depart origin at exactly departureMinutes
  const startingTrains = getSchedulesDepartingExactlyAt(originId, departureMinutes, dayType);
  if (startingTrains.length === 0) return null;

  // Dijkstra / earliest-arrival search, seeded by the chosen departure (no waiting at origin)
  const costMap = new Map<string, number>();
  const prev = new Map<string, PrevEdge & { transfers: number; nonOfficialTransfers: number }>();

  const pq: { stationId: string; cost: number; time: number }[] = [];

  const push = (stationId: string, cost: number, time: number) => {
    pq.push({ stationId, cost, time });
  };

  // Initialize cost map
  for (const s of Object.keys(stations)) {
    costMap.set(s, Number.POSITIVE_INFINITY);
  }

  // Seed from origin using all possible starting trains
  for (const { schedule, stationIdx, departMinutes } of startingTrains) {
    const startMinutes = parseTimeToMinutes(schedule.startTime);

    for (let toIdx = stationIdx + 1; toIdx < schedule.stations.length; toIdx++) {
      const toId = schedule.stations[toIdx];
      const arriveMinutes = startMinutes + schedule.stationTimes[toIdx];
      const cost = arriveMinutes; // initial route, no transfers

      const best = costMap.get(toId) ?? Number.POSITIVE_INFINITY;
      if (cost < best) {
        costMap.set(toId, cost);
        prev.set(toId, {
          prevStationId: originId,
          scheduleId: schedule.id,
          fromIdx: stationIdx,
          toIdx,
          departMinutes,
          arriveMinutes,
          transfers: 0,
          nonOfficialTransfers: 0
        });
        push(toId, cost, arriveMinutes);
      }
    }
  }

  // Search
  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const current = pq.shift()!;

    const currentBest = costMap.get(current.stationId) ?? Number.POSITIVE_INFINITY;
    if (current.cost !== currentBest) continue;

    if (current.stationId === destinationId) break;

    for (const schedule of trainSchedules) {
      if (schedule.dayType && schedule.dayType !== dayType) continue;
      const fromIdx = schedule.stations.indexOf(current.stationId);
      if (fromIdx === -1 || fromIdx === schedule.stations.length - 1) continue;

      const startMinutes = parseTimeToMinutes(schedule.startTime);
      const departMin = startMinutes + schedule.stationTimes[fromIdx];

      // Boarding constraint: must depart at/after arrival time.
      // If boarding a different train, require MIN_TRANSFER_TIME (reduced for same-platform transfers).
      const edgeToCurrent = prev.get(current.stationId);
      const arrivedOnTrainId = edgeToCurrent?.scheduleId;
      const isTransfer = arrivedOnTrainId && arrivedOnTrainId !== schedule.id;
      
      let transferBuffer = isTransfer ? MIN_TRANSFER_TIME : 0;
      if (isTransfer && arrivedOnTrainId) {
        const prevLine = trainSchedules.find(s => s.id === arrivedOnTrainId)?.line;
        if ((prevLine === 'red' && schedule.line === 'green') || (prevLine === 'green' && schedule.line === 'red')) {
          transferBuffer = 1; // Red and Green lines share the same track/platforms south of Koteshwar
        }
      }

      if (departMin < current.time + transferBuffer) {
        continue;
      }


      const currentTransfers = edgeToCurrent?.transfers ?? 0;
      const currentNonOfficial = edgeToCurrent?.nonOfficialTransfers ?? 0;
      const newTransfers = currentTransfers + (isTransfer ? 1 : 0);
      const newNonOfficial = currentNonOfficial + (isTransfer && !stations[current.stationId].isInterchange ? 1 : 0);

      for (let toIdx = fromIdx + 1; toIdx < schedule.stations.length; toIdx++) {
        const toId = schedule.stations[toIdx];
        const arriveMin = startMinutes + schedule.stationTimes[toIdx];

        // Cost function: primarily minimize arrival time.
        // Tie-breaker 1: minimize non-official transfers (adds 0.01 mins penalty)
        // Tie-breaker 2: minimize total transfers (adds 0.001 mins penalty)
        const cost = arriveMin + (newNonOfficial * 0.01) + (newTransfers * 0.001);

        const best = costMap.get(toId) ?? Number.POSITIVE_INFINITY;
        if (cost < best) {
          costMap.set(toId, cost);
          prev.set(toId, {
            prevStationId: current.stationId,
            scheduleId: schedule.id,
            fromIdx,
            toIdx,
            departMinutes: departMin,
            arriveMinutes: arriveMin,
            transfers: newTransfers,
            nonOfficialTransfers: newNonOfficial
          });
          push(toId, cost, arriveMin);
        }
      }
    }
  }

  const arrivalAtDest = costMap.get(destinationId) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(arrivalAtDest)) return null;

  // Reconstruct legs from prev map
  const legsReversed: {
    schedule: TrainSchedule;
    fromId: string;
    toId: string;
    fromIdx: number;
    toIdx: number;
    departMinutes: number;
    arriveMinutes: number;
  }[] = [];

  let cursor = destinationId;
  while (cursor !== originId) {
    const edge = prev.get(cursor);
    if (!edge) return null;

    const schedule = trainSchedules.find(s => s.id === edge.scheduleId);
    if (!schedule) return null;

    legsReversed.push({
      schedule,
      fromId: edge.prevStationId,
      toId: cursor,
      fromIdx: edge.fromIdx,
      toIdx: edge.toIdx,
      departMinutes: edge.departMinutes,
      arriveMinutes: edge.arriveMinutes,
    });

    cursor = edge.prevStationId;
  }

  const legs = legsReversed.reverse();
  if (legs.length === 0) return null;

  return buildRouteFromLegs(originId, destinationId, departureMinutes, legs);
};

export interface SharedSegment {
  trainId: string;
  stations: string[];
}

/**
 * SOPHISTICATED JOURNEY COORDINATION ALGORITHM
 * 
 * Problem: User 1 shares a journey (e.g., Paldi → GNLU on a corridor train).
 * User 2 wants to travel from a different origin (e.g., Thaltej) to possibly the same or different destination.
 * Goal: Find a route for User 2 that maximizes the time they travel TOGETHER with User 1 on the SAME train.
 * 
 * Algorithm:
 * 1. Get the shared train's FULL schedule (not just the segment User 1 travels)
 * 2. Find ALL stations on this train's route that come BEFORE or AT User 2's destination
 * 3. For each candidate interchange station, calculate when the shared train arrives there
 * 4. Find the earliest route for User 2 to reach each interchange
 * 5. Select the interchange that:
 *    a) User 2 can reach BEFORE the shared train arrives
 *    b) Maximizes the number of stops User 2 travels WITH User 1
 * 6. Build the complete route: User 2's connecting journey + shared train segment
 */

const extractLegsFromRoute = (route: PlannedRoute): {
  schedule: TrainSchedule;
  fromId: string;
  toId: string;
  fromIdx: number;
  toIdx: number;
  departMinutes: number;
  arriveMinutes: number;
}[] => {
  const extractedLegs: {
    schedule: TrainSchedule;
    fromId: string;
    toId: string;
    fromIdx: number;
    toIdx: number;
    departMinutes: number;
    arriveMinutes: number;
  }[] = [];
  let legFromId: string = '';
  let legFromIdx: number = -1;
  let legDepartMin: number = 0;
  let currentSchedule: TrainSchedule | null = null;
  
  for (const step of route.steps) {
    if (step.type === 'board' && step.trainId && step.station) {
      currentSchedule = trainSchedules.find(s => s.id === step.trainId) || null;
      if (currentSchedule) {
        legFromId = step.station.id;
        legFromIdx = currentSchedule.stations.indexOf(legFromId);
        const schedStart = parseTimeToMinutes(currentSchedule.startTime);
        legDepartMin = schedStart + (legFromIdx >= 0 ? currentSchedule.stationTimes[legFromIdx] : 0);
      }
    } else if (step.type === 'interchange' && step.station && currentSchedule) {
      const legToId = step.station.id;
      const legToIdx = currentSchedule.stations.indexOf(legToId);
      const schedStart = parseTimeToMinutes(currentSchedule.startTime);
      const legArriveMin = schedStart + (legToIdx >= 0 ? currentSchedule.stationTimes[legToIdx] : 0);
      
      if (legFromIdx >= 0 && legToIdx >= 0 && legToIdx !== legFromIdx) {
        extractedLegs.push({
          schedule: currentSchedule,
          fromId: legFromId,
          toId: legToId,
          fromIdx: legFromIdx,
          toIdx: legToIdx,
          departMinutes: legDepartMin,
          arriveMinutes: legArriveMin
        });
      }
      
      currentSchedule = trainSchedules.find(s => s.id === step.trainId) || null;
      if (currentSchedule) {
        legFromId = step.station.id;
        legFromIdx = currentSchedule.stations.indexOf(legFromId);
        const newSchedStart = parseTimeToMinutes(currentSchedule.startTime);
        legDepartMin = newSchedStart + (legFromIdx >= 0 ? currentSchedule.stationTimes[legFromIdx] : 0);
      }
    } else if (step.type === 'alight' && step.station && currentSchedule) {
      const legToId = step.station.id;
      const legToIdx = currentSchedule.stations.indexOf(legToId);
      const schedStart = parseTimeToMinutes(currentSchedule.startTime);
      const legArriveMin = schedStart + (legToIdx >= 0 ? currentSchedule.stationTimes[legToIdx] : 0);
      
      if (legFromIdx >= 0 && legToIdx >= 0 && legToIdx !== legFromIdx) {
        extractedLegs.push({
          schedule: currentSchedule,
          fromId: legFromId,
          toId: legToId,
          fromIdx: legFromIdx,
          toIdx: legToIdx,
          departMinutes: legDepartMin,
          arriveMinutes: legArriveMin
        });
      }
      currentSchedule = null;
    }
  }
  return extractedLegs;
};

export const findCommonTrainRoute = (
  sharedSegments: SharedSegment[],
  userOriginId: string,
  userDestId: string,
  currentTimeMins: number = getCurrentTimeMinutes()
): PlannedRoute | null => {
  const origin = stations[userOriginId];
  const dest = stations[userDestId];
  if (!origin || !dest || userOriginId === userDestId || !sharedSegments?.length) return null;
  
  interface InterchangeCandidate {
    stationId: string;
    stationIdx: number;
    trainArrivalMin: number;
    sharedStopsWithUser1: number;
    totalStopsOnSharedTrain: number;
  }
  
  interface ViableOption {
    segmentIdx: number;
    candidate: InterchangeCandidate;
    routeToInterchange: PlannedRoute | null;
    arrivalAtInterchange: number;
    sharedSchedule: TrainSchedule;
    user1LastIdx: number;
    user2DestIdx: number;
  }

  const viableOptions: ViableOption[] = [];

  for (let segmentIdx = 0; segmentIdx < sharedSegments.length; segmentIdx++) {
    const segment = sharedSegments[segmentIdx];
    const sharedSchedule = trainSchedules.find(s => s.id === segment.trainId);
    if (!sharedSchedule) continue;
    
    const scheduleStartMin = parseTimeToMinutes(sharedSchedule.startTime);
    const user2DestIdx = sharedSchedule.stations.indexOf(userDestId);
    
    const user1Stations = new Set(segment.stations);
    let user1FirstIdx = -1;
    let user1LastIdx = -1;
    for (let i = 0; i < sharedSchedule.stations.length; i++) {
      if (user1Stations.has(sharedSchedule.stations[i])) {
        if (user1FirstIdx === -1) user1FirstIdx = i;
        user1LastIdx = i;
      }
    }
    if (user1FirstIdx === -1) continue;
    
    const candidates: InterchangeCandidate[] = [];
    for (let i = 0; i <= user1LastIdx; i++) {
      const stationId = sharedSchedule.stations[i];
      const trainArrivalMin = scheduleStartMin + sharedSchedule.stationTimes[i];
      
      let endIdx: number;
      if (user2DestIdx !== -1 && user2DestIdx <= user1LastIdx) {
        endIdx = user2DestIdx;
      } else if (user2DestIdx !== -1) {
        endIdx = user1LastIdx;
      } else {
        endIdx = user1LastIdx;
      }
      
      const overlapStart = Math.max(i, user1FirstIdx);
      const overlapEnd = Math.min(endIdx, user1LastIdx);
      const sharedStopsWithUser1 = Math.max(0, overlapEnd - overlapStart);
      const totalStopsOnSharedTrain = endIdx > i ? endIdx - i : 0;
      
      if (sharedStopsWithUser1 > 0 && totalStopsOnSharedTrain > 0) {
        candidates.push({
          stationId,
          stationIdx: i,
          trainArrivalMin,
          sharedStopsWithUser1,
          totalStopsOnSharedTrain
        });
      }
    }
    
    for (const candidate of candidates) {
      if (candidate.stationId === userOriginId) {
        if (currentTimeMins + MIN_TRANSFER_TIME <= candidate.trainArrivalMin) {
          viableOptions.push({
            segmentIdx,
            candidate,
            routeToInterchange: null,
            arrivalAtInterchange: currentTimeMins,
            sharedSchedule,
            user1LastIdx,
            user2DestIdx
          });
        }
        continue;
      }
      
      const path = findShortestPath(userOriginId, candidate.stationId);
      if (!path) continue;
      
      const routeToInterchange = buildTimeAwareRoute(path, currentTimeMins);

      if (routeToInterchange) {
        const arrivalAtInterchange = routeToInterchange.arrivalMinutes;
        if (arrivalAtInterchange !== undefined && arrivalAtInterchange + MIN_TRANSFER_TIME <= candidate.trainArrivalMin) {
          viableOptions.push({
            segmentIdx,
            candidate,
            routeToInterchange,
            arrivalAtInterchange,
            sharedSchedule,
            user1LastIdx,
            user2DestIdx
          });
        }
      }
    }
  }

  if (viableOptions.length === 0) return null;

  // STEP 6: Select the best option
  viableOptions.sort((a, b) => {
    // First priority: minimum travel time for user to reach the interchange
    const travelTimeA = a.routeToInterchange ? a.routeToInterchange.totalTime : 0;
    const travelTimeB = b.routeToInterchange ? b.routeToInterchange.totalTime : 0;
    
    if (Math.abs(travelTimeA - travelTimeB) > 5) {
      return travelTimeA - travelTimeB;
    }
    
    // Otherwise, prefer more shared stops
    if (b.candidate.sharedStopsWithUser1 !== a.candidate.sharedStopsWithUser1) {
      return b.candidate.sharedStopsWithUser1 - a.candidate.sharedStopsWithUser1;
    }
    
    // Third priority: earlier segments so they can travel together sooner
    if (a.segmentIdx !== b.segmentIdx) {
      return a.segmentIdx - b.segmentIdx;
    }
    
    return a.arrivalAtInterchange - b.arrivalAtInterchange;
  });

  const bestOption = viableOptions[0];
  const bestCandidate = bestOption.candidate;
  let bestRouteToInterchange = bestOption.routeToInterchange;
  const sharedSchedule = bestOption.sharedSchedule;
  const user1LastIdx = bestOption.user1LastIdx;
  const user2DestIdx = bestOption.user2DestIdx;
  
  const scheduleStartMin = parseTimeToMinutes(sharedSchedule.startTime);
  
  // Optimize User 2's waiting time by finding the latest possible departure for the winning candidate
  // Since we only do this full search for ONE candidate, it runs instantly without crashing!
  if (bestRouteToInterchange) {
    const departures = getAvailableDepartures(userOriginId, bestCandidate.stationId);
    const possibleDepartures = departures.filter(d => 
      d.departureMinutes >= currentTimeMins && 
      d.arrivalMinutes + MIN_TRANSFER_TIME <= bestCandidate.trainArrivalMin
    );
    
    if (possibleDepartures.length > 0) {
      possibleDepartures.sort((a, b) => b.departureMinutes - a.departureMinutes);
      const optimizedRoute = planRouteWithDeparture(userOriginId, bestCandidate.stationId, possibleDepartures[0].departureMinutes);
      if (optimizedRoute) {
        bestRouteToInterchange = optimizedRoute;
      }
    }
  }
  
  // STEP 7: Determine where User 2 should alight from the shared train
  let alightIdx: number;
  let alightStationId: string;
  
  if (user2DestIdx !== -1 && user2DestIdx > bestCandidate.stationIdx) {
    // User 2's destination is on the shared train
    alightIdx = user2DestIdx;
    alightStationId = userDestId;
  } else {
    // User 2's destination is NOT on the shared train, or is before the interchange
    // They should travel with User 1 as far as possible, then transfer
    alightIdx = user1LastIdx;
    alightStationId = sharedSchedule.stations[user1LastIdx];
  }
  
  // STEP 8: Build the complete route
  const departFromInterchange = scheduleStartMin + sharedSchedule.stationTimes[bestCandidate.stationIdx];
  const arriveAtAlight = scheduleStartMin + sharedSchedule.stationTimes[alightIdx];

  const legs: {
    schedule: TrainSchedule;
    fromId: string;
    toId: string;
    fromIdx: number;
    toIdx: number;
    departMinutes: number;
    arriveMinutes: number;
  }[] = [];
  
  // Add the connecting journey legs (if any)
  if (bestRouteToInterchange) {
    legs.push(...extractLegsFromRoute(bestRouteToInterchange));
  }
  
  // Add the shared train leg
  legs.push({
    schedule: sharedSchedule,
    fromId: bestCandidate.stationId,
    toId: alightStationId,
    fromIdx: bestCandidate.stationIdx,
    toIdx: alightIdx,
    departMinutes: departFromInterchange,
    arriveMinutes: arriveAtAlight
  });
  
  // STEP 9: If User 2 needs to continue after alighting from the shared train
  if (alightStationId !== userDestId) {
    // User 2 needs another connection to reach their final destination
    const departures = getAvailableDepartures(alightStationId, userDestId);
    const validDepartures = departures.filter(d => d.departureMinutes >= arriveAtAlight + MIN_TRANSFER_TIME);
    
    let continueRoute: PlannedRoute | null = null;
    if (validDepartures.length > 0) {
      validDepartures.sort((a, b) => a.departureMinutes - b.departureMinutes);
      continueRoute = planRouteWithDeparture(alightStationId, userDestId, validDepartures[0].departureMinutes);
    }
    
    if (continueRoute) {
      legs.push(...extractLegsFromRoute(continueRoute));
    } else {
      // If we cannot reach the final destination, this is not a valid coordinate route
      return null;
    }
  }
  
  if (legs.length === 0) {
    return null;
  }
  
  const firstDepart = legs[0].departMinutes;
  const result = buildRouteFromLegs(userOriginId, userDestId, firstDepart, legs);
  
  // Ensure arrivalMinutes is set on the result
  if (result && !result.arrivalMinutes) {
    result.arrivalMinutes = legs[legs.length - 1].arriveMinutes;
  }
  
  return result;
};

/**
 * Calculates current progress along a route based on current time (minutes since midnight)
 */
export const calculateJourneyProgress = (
  route: PlannedRoute,
  currentTimeMins: number
): {
  progress: number; // 0 to 1
  status: 'upcoming' | 'ongoing' | 'completed';
  currentStationId?: string;
  nextStationId?: string;
  isAtStation: boolean;
  statusText: string;
} => {
  const depTime = parseTimeToMinutes(route.departureTime || '00:00');
  const arrTime = parseTimeToMinutes(route.arrivalTime || '00:00');

  if (currentTimeMins < depTime) {
    return {
      progress: 0,
      status: 'upcoming',
      isAtStation: true,
      currentStationId: route.origin.id,
      statusText: `Starting from ${route.origin.name} at ${route.departureTime}`
    };
  }

  if (currentTimeMins >= arrTime) {
    return {
      progress: 1,
      status: 'completed',
      isAtStation: true,
      currentStationId: route.destination.id,
      statusText: `Arrived at ${route.destination.name}`
    };
  }

  const duration = arrTime - depTime;
  const elapsed = currentTimeMins - depTime;
  const overallProgress = elapsed / duration;

  let currentPos: { currentStationId?: string; nextStationId?: string; isAtStation: boolean; statusText: string } = {
    isAtStation: false,
    statusText: 'Traveling...'
  };

  let accumulatedTime = depTime;
  for (let i = 0; i < route.steps.length; i++) {
    const step = route.steps[i];

    if (step.type === 'board') {
      // Board step - skip to next step, but update accumulated time for the train departure
      const trainDepartureTime = route.departureMinutes ?? parseTimeToMinutes(step.trainTime || route.departureTime || '00:00');
      accumulatedTime = trainDepartureTime;
      continue;
    }
    
    if (step.type === 'travel') {
      let stepDuration = 0;

      // Determine previous station for this travel leg reliably.
      // For a travel step, the previous physical stop should be:
      // - the last station from the prior travel step (if any)
      // - otherwise route.origin
      const prevTravelStation = (() => {
        for (let j = i - 1; j >= 0; j--) {
          const s = route.steps[j];
          if (s.type === 'travel') return route.steps[j].station;
          if (s.type === 'board') return route.origin;
        }
        return route.origin;
      })();

      const prevStation = prevTravelStation;
      const accurateTime = getAccurateTravelTime(prevStation.id, step.station.id);
      stepDuration = accurateTime || (step.stationCount || 1) * 2.5;

      const stepEndTime = accumulatedTime + stepDuration;

      if (currentTimeMins >= accumulatedTime && currentTimeMins < stepEndTime) {
        const stepProgress = (currentTimeMins - accumulatedTime) / stepDuration;
        const stationsInStep = [
          prevStation,
          ...(step.stations || []),
          step.station
        ];

        const segmentCount = stationsInStep.length - 1;
        const segmentIdx = Math.max(0, Math.min(segmentCount - 1, Math.floor(stepProgress * segmentCount)));
        const progressInSegment = (stepProgress * segmentCount) % 1;

        const s1 = stationsInStep[segmentIdx];
        const s2 = stationsInStep[segmentIdx + 1];

        currentPos = {
          currentStationId: s1?.id,
          nextStationId: s2?.id,
          isAtStation: progressInSegment < 0.1 || progressInSegment > 0.9,
          statusText: (progressInSegment < 0.1 || progressInSegment > 0.9)
            ? `At ${progressInSegment < 0.1 ? s1?.name : s2?.name}`
            : `Between ${s1?.name} and ${s2?.name}`
        };
        break;
      }
      accumulatedTime = stepEndTime;
    } else if (step.type === 'interchange') {
      const stepEndTime = accumulatedTime + (step.waitTime || 5);
      if (currentTimeMins >= accumulatedTime && currentTimeMins < stepEndTime) {
        currentPos = {
          currentStationId: step.station.id,
          isAtStation: true,
          statusText: `Interchanging at ${step.station.name}`
        };
        break;
      }
      accumulatedTime = stepEndTime;
    } else if (step.type === 'bus') {
      // Bus step - use estimated time (8 or 15 minutes)
      const busDuration = step.busDestination === 'PDPU' ? BUS_TIME_GNLU_TO_PDPU : BUS_TIME_GNLU_TO_GIFT;
      const stepEndTime = accumulatedTime + busDuration;
      if (currentTimeMins >= accumulatedTime && currentTimeMins < stepEndTime) {
        currentPos = {
          currentStationId: step.station.id,
          isAtStation: true,
          statusText: `Traveling by bus to ${step.busDestination}`
        };
        break;
      }
      accumulatedTime = stepEndTime;
    }
  }

  return {
    progress: overallProgress,
    status: 'ongoing',
    ...currentPos
  };
};
