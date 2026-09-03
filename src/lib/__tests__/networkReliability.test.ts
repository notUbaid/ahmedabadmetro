import { describe, it, expect } from 'vitest';
import { planRoute, getAvailableDepartures, calculateFare } from '../routePlanner';
import { stations } from '@/data/metroData';
import { getServiceWindow, getCurrentTrainPositions, trainSchedules } from '@/data/timetable';

describe('Network Reliability & Timetable Verification', () => {
  const allStationIds = Object.keys(stations);

  it('verifies all 53 operational stations exist and have valid coordinates', () => {
    expect(allStationIds.length).toBe(53);
    for (const id of allStationIds) {
      const s = stations[id];
      expect(s).toBeDefined();
      expect(s.coordinates[0]).toBeGreaterThan(22.9);
      expect(s.coordinates[0]).toBeLessThan(23.4);
      expect(s.coordinates[1]).toBeGreaterThan(72.4);
      expect(s.coordinates[1]).toBeLessThan(72.8);
      expect(s.lines.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('verifies route planning across diverse cross-line origin-destination pairs', () => {
    const testPairs = [
      ['apmc', 'motera_stadium'],       // Red Line direct
      ['thaltej_gam', 'vastral_gam'],   // Blue Line direct
      ['thaltej', 'old_high_court'],    // Blue Line west
      ['old_high_court', 'kalupur'],    // Blue Line underground
      ['gnlu', 'gift_city'],            // Purple Line direct
      ['koteshwar_road', 'mahatma_mandir'], // Green Line direct
      ['thaltej', 'gnlu'],              // Blue to Green (interchange OHC)
      ['gnlu', 'thaltej'],              // Green to Blue (interchange OHC)
      ['apmc', 'gift_city'],            // Red to Purple (interchange GNLU)
      ['vastral_gam', 'mahatma_mandir'],// Blue to Green
      ['gift_city', 'thaltej_gam'],     // Purple to Blue
      ['vadaj', 'vishwakarma_college'], // Red to Green (exact fare ₹15 verified)
    ];

    for (const [from, to] of testPairs) {
      const route = planRoute(from, to);
      expect(route).toBeDefined();
      expect(route.totalTime).toBeGreaterThan(0);
      expect(route.fare).toBeGreaterThanOrEqual(5);
      expect(route.fare).toBeLessThanOrEqual(40);
      expect(route.steps.length).toBeGreaterThan(0);
    }
  }, 30000);

  it('verifies Vadaj to Vishwakarma College exact fare is ₹15', () => {
    expect(calculateFare('vadaj', 'vishwakarma_college')).toBe(15);
    const route = planRoute('vadaj', 'vishwakarma_college');
    expect(route.fare).toBe(15);
  });

  it('verifies that Gandhinagar to GIFT City always transfers at GNLU', () => {
    const route = planRoute('mahatma_mandir', 'gift_city');
    expect(route).toBeDefined();
    // Must transfer at GNLU (via Purple line train or feeder bus)
    const gnluTransfer = route.steps.find(
      s => s.station.id === 'gnlu' && (s.type === 'interchange' || s.type === 'bus')
    );
    expect(gnluTransfer).toBeDefined();
  });

  it('verifies getServiceWindow works for terminal and intermediate stations', () => {
    const sampleStations = ['thaltej_gam', 'vastral_gam', 'apmc', 'gnlu', 'gift_city', 'old_high_court'];
    for (const stationId of sampleStations) {
      const window = getServiceWindow(stationId);
      expect(window).toBeDefined();
      if (window) {
        expect(window.first).toMatch(/^\d{2}:\d{2}$/);
        expect(window.last).toMatch(/^\d{2}:\d{2}$/);
      }
    }
  });

  it('verifies simulated train positions run without crashing', () => {
    const positions = getCurrentTrainPositions();
    expect(Array.isArray(positions)).toBe(true);
    for (const pos of positions) {
      expect(pos.progress).toBeGreaterThanOrEqual(0);
      expect(pos.progress).toBeLessThanOrEqual(1);
      expect(['moving', 'stopped']).toContain(pos.status);
    }
  });

  it('verifies getAvailableDepartures produces strictly non-empty results across service hours', () => {
    const deps = getAvailableDepartures('thaltej', 'old_high_court');
    expect(deps.length).toBeGreaterThan(0);
    for (const d of deps) {
      expect(d.departureTime).toMatch(/^\d{2}:\d{2}$/);
      expect(d.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
      expect(d.arrivalMinutes).toBeGreaterThanOrEqual(d.departureMinutes);
    }
  });
});
