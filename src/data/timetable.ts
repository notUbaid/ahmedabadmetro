// Comprehensive Ahmedabad Metro Timetable based on official schedules
// Data effective from 16/01/2026 (Updated Ahmedabad-Gandhinagar Metro Rail Services)
// Uses precise segment timings with 45s normal stops and 70s interchange stops

import {
  LINE_TIMINGS,
  CORRIDOR_TIMINGS,
  REVERSE_CORRIDOR_TIMINGS,
  INTERCHANGE_STATIONS,
  NORMAL_STOP,
  INTERCHANGE_STOP,
} from './segmentTimings';

export interface TrainSchedule {
  id: string;
  line: 'blue' | 'red' | 'green' | 'purple';
  direction: 'forward' | 'backward';
  startTime: string; // HH:MM format
  stations: string[]; // station IDs in order
  stationTimes: number[]; // minutes from start for each station
}

// NOTE: Source of truth is the Excel file (generated JSON).
import timetableFromExcelData from './timetableFromExcel.generated.json';

const trainSchedules: TrainSchedule[] = (timetableFromExcelData as { trainSchedules: TrainSchedule[] }).trainSchedules;

// Station definitions extracted from Excel timetable data
// These are derived from the actual train schedules
export const lineStations = {
  // Blue Line (Line 1): Thaltej Gam ↔ Vastral Gam - 18 stations
  blue: trainSchedules.find(s => s.line === 'blue')?.stations || LINE_TIMINGS.blue.stations,

  // Red Line (Line 2): APMC ↔ Koteshwar Road - extracted from red line schedules
  red: trainSchedules.find(s => s.line === 'red')?.stations || LINE_TIMINGS.red.stations,

  // Green Line (Line 3): Koteshwar Road ↔ Mahatma Mandir - extracted from green line schedules
  green: trainSchedules.find(s => s.line === 'green')?.stations || LINE_TIMINGS.green.stations,

  // Purple Line (Line 4): GNLU ↔ GIFT City - 3 stations
  purple: LINE_TIMINGS.purple.stations
};

export { trainSchedules };

// Line metadata (based on Phase 1 and Phase 2 timetables)
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
};

// Get current headway (frequency) for a line based on time and day
export const getCurrentHeadway = (line: string): { minutes: number; label: string } => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isPeakHour = (hour >= 8 && hour < 11) || (hour >= 17 && hour < 20);
  
  switch (line.toLowerCase()) {
    case 'blue':
      if (isSunday) {
        return { minutes: 12, label: '~12 min' };
      } else if (isSaturday) {
        return { minutes: isPeakHour ? 10 : 12, label: isPeakHour ? '~10 min' : '~12 min' };
      } else {
        return { minutes: isPeakHour ? 7 : 10, label: isPeakHour ? '~7 min' : '~10 min' };
      }
    case 'red':
      return { minutes: 12, label: '~12 min' };
    case 'green':
      return { minutes: 24, label: '~24 min' };
    case 'purple': {
      const isMorning = hour < 12;
      return { minutes: isMorning ? 49 : 57, label: isMorning ? '~49 min' : '~57 min' };
    }
    default:
      return { minutes: 10, label: '~10 min' };
  }
};

// Get upcoming trains for a specific station
export const getUpcomingTrains = (stationId: string, limit = 3): {
  arrivalTime: string;
  direction: string;
  line: string;
  minutesAway: number;
  destination: string;
  trainId: string;
  remainingStations: string[];
}[] => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const upcoming: ReturnType<typeof getUpcomingTrains> = [];

  trainSchedules.forEach(schedule => {
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) return;

    if (stationIndex === schedule.stations.length - 1) return;

    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const minutesAway = arrivalMinutes - currentMinutes;
    // Include trains arriving now (0 minutes) to improve UX 'Now' labeling
    if (minutesAway >= 0 && minutesAway <= 120) {
      const arrivalHour = Math.floor(arrivalMinutes / 60) % 24;
      const arrivalMin = Math.floor(arrivalMinutes % 60);

      const destination = schedule.stations[schedule.stations.length - 1];
      const destinationName = destination.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const remainingStations = schedule.stations.slice(stationIndex + 1);

      upcoming.push({
        arrivalTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
        direction: schedule.direction === 'forward' ? 'Forward' : 'Backward',
        line: schedule.line,
        minutesAway: Math.round(minutesAway),
        destination: destinationName,
        trainId: schedule.id,
        remainingStations,
      });
    }
  });

  return upcoming.sort((a, b) => a.minutesAway - b.minutesAway).slice(0, limit);
};

// Get all trains for a station on a given day
export const getAllTrainsForStation = (stationId: string): {
  time: string;
  destination: string;
  line: string;
}[] => {
  const trains: { time: string; destination: string; line: string; minutes: number }[] = [];

  trainSchedules.forEach(schedule => {
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1) return;
    if (stationIndex === schedule.stations.length - 1) return;

    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const arrivalHour = Math.floor(arrivalMinutes / 60) % 24;
    const arrivalMin = Math.floor(arrivalMinutes % 60);

    const destination = schedule.stations[schedule.stations.length - 1];
    const destinationName = destination.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    trains.push({
      time: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
      destination: destinationName,
      line: schedule.line,
      minutes: arrivalMinutes,
    });
  });

  return trains.sort((a, b) => a.minutes - b.minutes).map(({ time, destination, line }) => ({ time, destination, line }));
};

// Get last train warnings for a station
export const getLastTrainWarnings = (stationId: string): {
  line: string;
  destination: string;
  lastTrainTime: string;
  minutesRemaining: number;
}[] => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const warnings: ReturnType<typeof getLastTrainWarnings> = [];

  const destinationLastTrains = new Map<string, { line: string; arrivalMinutes: number }>();

  trainSchedules.forEach(schedule => {
    const stationIndex = schedule.stations.indexOf(stationId);
    if (stationIndex === -1 || stationIndex === schedule.stations.length - 1) return;

    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const arrivalMinutes = startMinutes + schedule.stationTimes[stationIndex];

    const destination = schedule.stations[schedule.stations.length - 1];
    const existing = destinationLastTrains.get(destination);

    if (!existing || arrivalMinutes > existing.arrivalMinutes) {
      destinationLastTrains.set(destination, { line: schedule.line, arrivalMinutes });
    }
  });

  destinationLastTrains.forEach((data, destination) => {
    const minutesRemaining = data.arrivalMinutes - currentMinutes;
    if (minutesRemaining > 0 && minutesRemaining <= 60) {
      const arrivalHour = Math.floor(data.arrivalMinutes / 60) % 24;
      const arrivalMin = Math.floor(data.arrivalMinutes % 60);
      const destinationName = destination.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      warnings.push({
        line: data.line,
        destination: destinationName,
        lastTrainTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}`,
        minutesRemaining: Math.round(minutesRemaining),
      });
    }
  });

  return warnings.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
};

// Get current train positions with metadata for geometry calculation
export const getCurrentTrainPositions = (): {
  id: string;
  line: string;
  fromStationId: string;
  toStationId: string;
  progress: number;
  destination: string;
  status: 'stopped' | 'moving';
}[] => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60000;
  const positions: ReturnType<typeof getCurrentTrainPositions> = [];

  trainSchedules.forEach(schedule => {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const journeyTime = schedule.stationTimes[schedule.stationTimes.length - 1];
    const endMinutes = startMinutes + journeyTime;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const elapsedMinutes = currentMinutes - startMinutes;

      let fromIdx = 0;
      let toIdx = 1;
      for (let i = 0; i < schedule.stationTimes.length - 1; i++) {
        if (elapsedMinutes >= schedule.stationTimes[i] && elapsedMinutes <= schedule.stationTimes[i + 1]) {
          fromIdx = i;
          toIdx = i + 1;
          break;
        }
      }

      const fromStationId = schedule.stations[fromIdx];
      const toStationId = schedule.stations[toIdx];

      if (fromStationId && toStationId) {
        const arrivalAtA = schedule.stationTimes[fromIdx];
        const arrivalAtB = schedule.stationTimes[toIdx];

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
          if (travelDuration > 0) {
            progress = (elapsedMinutes - departureFromA) / travelDuration;
          } else {
            progress = 1;
          }
        }

        const destination = schedule.stations[schedule.stations.length - 1];
        const destinationName = destination.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        positions.push({
          id: schedule.id,
          line: schedule.line,
          fromStationId,
          toStationId,
          progress,
          destination: destinationName,
          status
        });
      }
    }
  });

  return positions;
};