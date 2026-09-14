import { describe, it, expect, vi } from 'vitest';
import rawTimetable from '../timetableFromExcel.generated.json';
import { TrainSchedule, getServiceWindow, getLastTrainWarnings } from '../timetable';

const timetable = rawTimetable as {
  trainSchedules: TrainSchedule[];
};

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

describe('Timetable Integrity Verification', () => {
  it('should have a valid schedule structure', () => {
    expect(timetable.trainSchedules).toBeDefined();
    expect(timetable.trainSchedules.length).toBeGreaterThan(0);
  });

  const checkCorridorOverlaps = (direction: 'forward' | 'backward', dayType: 'Mon-Fri' | 'Saturday' | 'Sunday') => {
    const trains = timetable.trainSchedules.filter(
      (s) => ['red', 'green', 'purple'].includes(s.line) && s.direction === direction && s.dayType === dayType
    );

    const slotMap = new Map<string, string[]>();

    trains.forEach((s) => {
      let slotTimeStr: string;

      if (direction === 'forward') {
        // From APMC
        if (s.stations[0] !== 'apmc') {
          throw new Error(`Train ${s.id} is Northbound but doesn't start at APMC!`);
        }
        slotTimeStr = s.startTime;
      } else {
        // Southbound through Koteshwar
        const kIdx = s.stations.indexOf('koteshwar_road');
        if (kIdx === -1) {
          throw new Error(`Train ${s.id} is Southbound but doesn't pass through Koteshwar Road!`);
        }
        const startMins = timeToMins(s.startTime);
        const kotMins = startMins + s.stationTimes[kIdx];
        const h = Math.floor(kotMins / 60);
        const m = kotMins % 60;
        slotTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      if (!slotMap.has(slotTimeStr)) {
        slotMap.set(slotTimeStr, []);
      }
      slotMap.get(slotTimeStr)!.push(s.line);
    });

    const overlaps = Array.from(slotMap.entries()).filter(([_, lines]) => lines.length > 1);
    
    if (overlaps.length > 0) {
      console.error(`Overlaps found in ${direction} on ${dayType}:`, overlaps);
    }

    expect(overlaps).toHaveLength(0); // Should be exactly 0 overlaps
  };

  it('should not have any overlapping corridor trains (Northbound, Mon-Fri)', () => {
    checkCorridorOverlaps('forward', 'Mon-Fri');
  });

  it('should not have any overlapping corridor trains (Southbound, Mon-Fri)', () => {
    checkCorridorOverlaps('backward', 'Mon-Fri');
  });

  it('should not have any overlapping corridor trains (Northbound, Saturday)', () => {
    checkCorridorOverlaps('forward', 'Saturday');
  });

  it('should not have any overlapping corridor trains (Southbound, Saturday)', () => {
    checkCorridorOverlaps('backward', 'Saturday');
  });

  it('should not have any overlapping corridor trains (Northbound, Sunday)', () => {
    checkCorridorOverlaps('forward', 'Sunday');
  });

  it('should not have any overlapping corridor trains (Southbound, Sunday)', () => {
    checkCorridorOverlaps('backward', 'Sunday');
  });

  it('should have properly spaced Blue Line trains', () => {
    const blueF = timetable.trainSchedules
      .filter((s) => s.line === 'blue' && s.direction === 'forward' && s.dayType === 'Mon-Fri')
      .map((s) => timeToMins(s.startTime))
      .sort((a, b) => a - b);
      
    // Check if gaps are within the expected 7-20 min range
    for (let i = 0; i < blueF.length - 1; i++) {
      const gap = blueF[i + 1] - blueF[i];
      expect(gap).toBeGreaterThanOrEqual(7);
      expect(gap).toBeLessThanOrEqual(20);
    }
  });

  it('should have valid segment timings without backward jumps', () => {
    timetable.trainSchedules.forEach((s) => {
      for (let i = 0; i < s.stationTimes.length - 1; i++) {
        expect(s.stationTimes[i + 1]).toBeGreaterThanOrEqual(s.stationTimes[i]);
      }
    });
  });

  describe('Service Windows and Operating Boundaries', () => {
    it('returns valid first and last train times for major terminals and interchange stations', () => {
      const stationsToTest = ['thaltej_gam', 'vastral_gam', 'apmc', 'motera_stadium', 'old_high_court', 'gnlu'];
      for (const stId of stationsToTest) {
        const window = getServiceWindow(stId);
        expect(window).not.toBeNull();
        if (window) {
          expect(window.first).toMatch(/^\d{2}:\d{2}$/);
          expect(window.last).toMatch(/^\d{2}:\d{2}$/);
          const firstMins = timeToMins(window.first);
          const lastMins = timeToMins(window.last);
          expect(firstMins).toBeLessThan(lastMins);
        }
      }
    });

    it('returns null for an invalid station ID', () => {
      const window = getServiceWindow('unknown_non_existent_station');
      expect(window).toBeNull();
    });

    it('returns sorted warning alerts when within 60 minutes of last train', () => {
      const stationId = 'old_high_court';
      const window = getServiceWindow(stationId);
      expect(window).not.toBeNull();

      if (window) {
        const lastMinutes = timeToMins(window.last);
        const testMinutes = lastMinutes - 25; // 25 min before last train
        const testH = Math.floor(testMinutes / 60);
        const testM = testMinutes % 60;

        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 5, 4, testH, testM, 0)); // Wednesday
        const warnings = getLastTrainWarnings(stationId, 'en');
        expect(Array.isArray(warnings)).toBe(true);
        if (warnings.length > 0) {
          expect(warnings[0].minutesRemaining).toBeLessThanOrEqual(60);
          expect(warnings[0].minutesRemaining).toBeGreaterThan(0);
          expect(warnings[0].lastTrainTime).toBeDefined();
          for (let i = 1; i < warnings.length; i++) {
            expect(warnings[i].minutesRemaining).toBeGreaterThanOrEqual(warnings[i - 1].minutesRemaining);
          }
        }
        vi.useRealTimers();
      }
    });

    it('provides multi-language warnings in Gujarati and Hindi', () => {
      const stationId = 'old_high_court';
      const window = getServiceWindow(stationId);
      if (window) {
        const testMinutes = timeToMins(window.last) - 15;
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 5, 4, Math.floor(testMinutes / 60), testMinutes % 60, 0));

        const warningsGu = getLastTrainWarnings(stationId, 'gu');
        const warningsHi = getLastTrainWarnings(stationId, 'hi');
        if (warningsGu.length > 0) {
          expect(typeof warningsGu[0].destination).toBe('string');
          expect(warningsGu[0].destination.length).toBeGreaterThan(0);
        }
        if (warningsHi.length > 0) {
          expect(typeof warningsHi[0].destination).toBe('string');
          expect(warningsHi[0].destination.length).toBeGreaterThan(0);
        }
        vi.useRealTimers();
      }
    });
  });
});

