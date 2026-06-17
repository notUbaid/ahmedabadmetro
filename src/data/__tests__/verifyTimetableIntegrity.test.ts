import { describe, it, expect } from 'vitest';
import rawTimetable from '../timetableFromExcel.generated.json';
import { TrainSchedule } from '../timetable';

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
});
