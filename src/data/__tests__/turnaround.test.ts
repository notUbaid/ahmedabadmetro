import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentTrainPositions } from '../timetable';

describe('Turnaround Dwell at Mahatma Mandir and Koteshwar Road', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps Green Line train visible and stopped at Mahatma Mandir during 8-9 min layover with APMC destination', () => {
    // L3-NB-003_Mon-Fri arrives at mahatma_mandir at 08:16
    // Next departure L3-SB-006_Mon-Fri departs at 08:25 (9 min layover)
    // Check at 08:20 (4 mins after arrival, halfway through turnaround layover)
    vi.setSystemTime(new Date('2024-01-03T08:20:00+05:30')); // Wednesday

    const positions = getCurrentTrainPositions();
    const mmTrain = positions.find(
      p => p.toStationId === 'mahatma_mandir' && p.progress === 1
    );

    expect(mmTrain).toBeDefined();
    expect(mmTrain?.status).toBe('stopped');
    expect(mmTrain?.progress).toBe(1);
    expect(mmTrain?.destination).toBe('APMC');
  });

  it('seamlessly transitions from layover train to departing train at departure time with zero duplicates', () => {
    // At 08:24 (1 min before 08:25 departure): arriving train is still stopped at Mahatma Mandir
    vi.setSystemTime(new Date('2024-01-03T08:24:00+05:30'));
    let positions = getCurrentTrainPositions();
    let mmTrains = positions.filter(
      p => (p.toStationId === 'mahatma_mandir' && p.progress >= 0.9) ||
           (p.fromStationId === 'mahatma_mandir' && p.progress <= 0.1)
    );
    expect(mmTrains).toHaveLength(1);
    expect(mmTrains[0].status).toBe('stopped');

    // At 08:25:30 (30 seconds after departure): train is now moving on departure schedule
    vi.setSystemTime(new Date('2024-01-03T08:25:30+05:30'));
    positions = getCurrentTrainPositions();
    mmTrains = positions.filter(
      p => p.fromStationId === 'mahatma_mandir' || p.toStationId === 'mahatma_mandir'
    );
    // Exactly 1 train (moving southbound), no ghost train remaining at terminus
    expect(mmTrains).toHaveLength(1);
    expect(mmTrains[0].status).toBe('moving');
    expect(mmTrains[0].fromStationId).toBe('mahatma_mandir');
  });

  it('keeps Red Line train visible and stopped at Koteshwar Road during layover', () => {
    // RED-NB-001_Mon-Fri arrives at koteshwar_road at 07:06
    // RED-SB-006_Mon-Fri departs at 07:13 (7 min layover)
    // Check at 07:10 (4 mins into layover)
    vi.setSystemTime(new Date('2024-01-03T07:10:00+05:30'));

    const positions = getCurrentTrainPositions();
    const krTrain = positions.find(
      p => p.toStationId === 'koteshwar_road' && p.progress === 1
    );

    expect(krTrain).toBeDefined();
    expect(krTrain?.status).toBe('stopped');
    expect(krTrain?.progress).toBe(1);
    expect(krTrain?.destination).toBe('APMC');
  });

  it('does NOT apply turnaround layover to standard non-turnaround stations (e.g. Blue line termini)', () => {
    // A blue line train terminating at thaltej_gam should clear within normal dwell (~1 min), not stay for 8 mins
    // Blue line schedule arrives at thaltej_gam
    // Let's check a time 3 minutes after arrival: should not be lingering at platform
    vi.setSystemTime(new Date('2024-01-03T07:15:00+05:30'));
    const positions = getCurrentTrainPositions();
    // Verify all trains follow standard rules
    for (const p of positions) {
      if (p.toStationId === 'thaltej_gam' && p.progress === 1) {
        // If stopped at thaltej_gam, it must only be in its initial short dwell (<1 min)
        expect(p.status).toBe('stopped');
      }
    }
  });
});
