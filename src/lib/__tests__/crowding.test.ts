import { describe, it, expect } from 'vitest';
import {
  getCrowdLevel,
  getSimpleCrowdLevel,
  getCrowdAtStation,
  isPeakHour,
  isWeekend,
  isCorridorService,
  getServiceType,
} from '../crowding';

describe('GIFT City Commuter Crowding', () => {
  const eveningGiftToApmcStations = [
    'gift_city', 'pdpu', 'gnlu', 'koba_gam', 'juna_koba', 'koba_circle',
    'narmada_canal', 'tapovan_circle', 'vishwakarma_college', 'koteshwar_road',
    'motera_stadium', 'sabarmati', 'aec', 'ranip', 'vadaj', 'vijay_nagar',
    'usmanpura', 'old_high_court', 'gandhigram', 'paldi', 'shreyas',
    'rajiv_nagar', 'jivraj_park', 'apmc'
  ];

  const morningApmcToGiftStations = [...eveningGiftToApmcStations].reverse();

  // Test date on a weekday at 18:00 (evening)
  const weekdayEvening = new Date(2025, 5, 4, 18, 0, 0); // Wednesday 6:00 PM
  // Test date on a weekday at 08:30 (morning)
  const weekdayMorning = new Date(2025, 5, 4, 8, 30, 0); // Wednesday 8:30 AM

  it('sets heavy crowding right from GIFT City till Old High Court in the evening, and moderate after', () => {
    const ohcIndex = eveningGiftToApmcStations.indexOf('old_high_court');
    expect(ohcIndex).toBeGreaterThan(0);

    // Right at GIFT City (station index 0)
    const atGift = getCrowdLevel('purple', 'L4-SB-030', {
      stationIndex: 0,
      totalStations: eveningGiftToApmcStations.length,
      stationList: eveningGiftToApmcStations,
      date: weekdayEvening
    });
    expect(atGift.level).toBe('heavy');

    // Midway: Motera Stadium (before OHC)
    const moteraIdx = eveningGiftToApmcStations.indexOf('motera_stadium');
    const atMotera = getCrowdLevel('purple', 'L4-SB-030', {
      stationIndex: moteraIdx,
      totalStations: eveningGiftToApmcStations.length,
      stationList: eveningGiftToApmcStations,
      date: weekdayEvening
    });
    expect(atMotera.level).toBe('heavy');

    // At Old High Court
    const atOhc = getCrowdLevel('purple', 'L4-SB-030', {
      stationIndex: ohcIndex,
      totalStations: eveningGiftToApmcStations.length,
      stationList: eveningGiftToApmcStations,
      date: weekdayEvening
    });
    expect(atOhc.level).toBe('heavy');

    // After Old High Court: Gandhigram
    const ggIdx = eveningGiftToApmcStations.indexOf('gandhigram');
    const atGg = getCrowdLevel('purple', 'L4-SB-030', {
      stationIndex: ggIdx,
      totalStations: eveningGiftToApmcStations.length,
      stationList: eveningGiftToApmcStations,
      date: weekdayEvening
    });
    expect(atGg.level).toBe('moderate');

    // Terminus: APMC
    const apmcIdx = eveningGiftToApmcStations.indexOf('apmc');
    const atApmc = getCrowdLevel('purple', 'L4-SB-030', {
      stationIndex: apmcIdx,
      totalStations: eveningGiftToApmcStations.length,
      stationList: eveningGiftToApmcStations,
      date: weekdayEvening
    });
    expect(atApmc.level).toBe('moderate');
  });

  it('sets moderate crowding up to Old High Court and heavy after Old High Court in the morning towards GIFT City', () => {
    const ohcIndex = morningApmcToGiftStations.indexOf('old_high_court');
    expect(ohcIndex).toBeGreaterThan(0);

    // At APMC (origin)
    const atApmc = getCrowdLevel('purple', 'L4-NB-007', {
      stationIndex: 0,
      totalStations: morningApmcToGiftStations.length,
      stationList: morningApmcToGiftStations,
      date: weekdayMorning
    });
    expect(atApmc.level).toBe('moderate');

    // At Paldi (before OHC)
    const paldiIdx = morningApmcToGiftStations.indexOf('paldi');
    const atPaldi = getCrowdLevel('purple', 'L4-NB-007', {
      stationIndex: paldiIdx,
      totalStations: morningApmcToGiftStations.length,
      stationList: morningApmcToGiftStations,
      date: weekdayMorning
    });
    expect(atPaldi.level).toBe('moderate');

    // At Old High Court
    const atOhc = getCrowdLevel('purple', 'L4-NB-007', {
      stationIndex: ohcIndex,
      totalStations: morningApmcToGiftStations.length,
      stationList: morningApmcToGiftStations,
      date: weekdayMorning
    });
    expect(atOhc.level).toBe('moderate');

    // After Old High Court: Usmanpura
    const usmIdx = morningApmcToGiftStations.indexOf('usmanpura');
    const atUsm = getCrowdLevel('purple', 'L4-NB-007', {
      stationIndex: usmIdx,
      totalStations: morningApmcToGiftStations.length,
      stationList: morningApmcToGiftStations,
      date: weekdayMorning
    });
    expect(atUsm.level).toBe('heavy');

    // After Old High Court: Motera Stadium
    const moteraIdx = morningApmcToGiftStations.indexOf('motera_stadium');
    const atMotera = getCrowdLevel('purple', 'L4-NB-007', {
      stationIndex: moteraIdx,
      totalStations: morningApmcToGiftStations.length,
      stationList: morningApmcToGiftStations,
      date: weekdayMorning
    });
    expect(atMotera.level).toBe('heavy');

    // At final stop: GIFT City (should remain heavy)
    const giftIdx = morningApmcToGiftStations.indexOf('gift_city');
    const atGift = getCrowdLevel('purple', 'L4-NB-007', {
      stationIndex: giftIdx,
      totalStations: morningApmcToGiftStations.length,
      date: weekdayMorning
    });
    expect(atGift.level).toBe('heavy');
  });

  describe('Peak Hours and Weekend Rules', () => {
    it('correctly identifies peak vs off-peak hours on weekdays', () => {
      // Wednesday at 08:30 (Peak)
      expect(isPeakHour(new Date(2025, 5, 4, 8, 30, 0))).toBe(true);
      // Wednesday at 10:45 (Peak)
      expect(isPeakHour(new Date(2025, 5, 4, 10, 45, 0))).toBe(true);
      // Wednesday at 14:00 (Off-Peak)
      expect(isPeakHour(new Date(2025, 5, 4, 14, 0, 0))).toBe(false);
      // Wednesday at 17:15 (Peak)
      expect(isPeakHour(new Date(2025, 5, 4, 17, 15, 0))).toBe(true);
      // Wednesday at 21:00 (Off-Peak)
      expect(isPeakHour(new Date(2025, 5, 4, 21, 0, 0))).toBe(false);

      // Saturday/Sunday peak should always be false
      expect(isPeakHour(new Date(2025, 5, 7, 9, 0, 0))).toBe(false);
      expect(isPeakHour(new Date(2025, 5, 8, 18, 0, 0))).toBe(false);
    });

    it('correctly identifies weekends', () => {
      expect(isWeekend(new Date(2025, 5, 7, 10, 0, 0))).toBe(true); // Saturday
      expect(isWeekend(new Date(2025, 5, 8, 10, 0, 0))).toBe(true); // Sunday
      expect(isWeekend(new Date(2025, 5, 4, 10, 0, 0))).toBe(false); // Wednesday
    });
  });

  describe('Service Type Classification & Corridor Determination', () => {
    it('identifies corridor service vs individual lines', () => {
      expect(isCorridorService('L3-NB-001')).toBe(true);
      expect(isCorridorService('L1-NB-001')).toBe(false);

      expect(getServiceType('green', 'L3-NB-001')).toBe('corridor');
      expect(getServiceType('blue', 'L1-EB-001')).toBe('blue_line');
      expect(getServiceType('red', 'L2-NB-001')).toBe('red_local');
      expect(getServiceType('green', 'L2-NB-001')).toBe('green_local');
      expect(getServiceType('purple', 'L4-NB-001')).toBe('purple_line');
      expect(getServiceType('unknown', 'L9-001')).toBe('blue_line');
    });
  });

  describe('Blue Line Bell Curve Crowding', () => {
    const blueLineStations = [
      'thaltej_gam', 'thaltej', 'doordarshan_kendra', 'gurukul_road', 'gujarat_university',
      'commerce_six_road', 'stadium', 'old_high_court', 'sabarmati_riverfront', 'shahpur',
      'gheekanta', 'kalupur_railway_station', 'kankaria_east', 'apparel_park', 'amraiwadi',
      'rabari_colony', 'vastral', 'nirant_cross_road', 'vastral_gam'
    ];

    it('exhibits lower crowd at beginning and terminal ends, but peak crowding in the center', () => {
      // Station index 1 (near beginning: thaltej)
      const nearStart = getCrowdLevel('blue', 'L1-EB-005', {
        stationIndex: 1,
        totalStations: blueLineStations.length,
        stationList: blueLineStations,
        date: weekdayMorning
      });
      expect(nearStart.level).toBe('low');

      // Station index 8 (center: sabarmati_riverfront) during peak hour
      const midPeak = getCrowdLevel('blue', 'L1-EB-005', {
        stationIndex: 8,
        totalStations: blueLineStations.length,
        stationList: blueLineStations,
        date: weekdayMorning
      });
      expect(midPeak.level).toBe('heavy');

      // Station index 17 (near terminal end: nirant_cross_road)
      const nearEnd = getCrowdLevel('blue', 'L1-EB-005', {
        stationIndex: 17,
        totalStations: blueLineStations.length,
        stationList: blueLineStations,
        date: weekdayMorning
      });
      expect(nearEnd.level).toBe('low');
    });
  });

  describe('Corridor Route Dynamic Progression', () => {
    const corridorStations = [
      'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram',
      'old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec',
      'sabarmati', 'motera_stadium', 'koteshwar_road', 'vishwakarma_college',
      'tapovan_circle', 'narmada_canal', 'koba_circle', 'juna_koba', 'koba_gam',
      'gnlu', 'raysan', 'randesan', 'dholakuva', 'infocity', 'sector_1',
      'sector_10a', 'sector_16', 'sector_24', 'mahatma_mandir'
    ];

    it('handles Northbound corridor from APMC to Gandhinagar progression', () => {
      const paldiIdx = corridorStations.indexOf('paldi');
      const ohcIdx = corridorStations.indexOf('old_high_court');
      const gnluIdx = corridorStations.indexOf('gnlu');
      const infoIdx = corridorStations.indexOf('infocity');

      // Before Paldi
      const beforePaldi = getCrowdLevel('green', 'L3-NB-005', {
        stationIndex: paldiIdx - 1,
        totalStations: corridorStations.length,
        stationList: corridorStations,
        originStationId: 'apmc',
        destinationStationId: 'mahatma_mandir',
        date: weekdayMorning
      });
      expect(['low', 'moderate']).toContain(beforePaldi.level);

      // Between OHC and GNLU
      const nearGnlu = getCrowdLevel('green', 'L3-NB-005', {
        stationIndex: gnluIdx,
        totalStations: corridorStations.length,
        stationList: corridorStations,
        originStationId: 'apmc',
        destinationStationId: 'mahatma_mandir',
        date: weekdayMorning
      });
      expect(nearGnlu.level).toBe('heavy');
    });

    it('handles Southbound corridor towards APMC progression', () => {
      const reversed = [...corridorStations].reverse();
      const ohcIdx = reversed.indexOf('old_high_court');

      const atOhc = getCrowdLevel('green', 'L3-SB-005', {
        stationIndex: ohcIdx,
        totalStations: reversed.length,
        stationList: reversed,
        originStationId: 'mahatma_mandir',
        destinationStationId: 'apmc',
        date: weekdayMorning
      });
      expect(atOhc.level).toBe('heavy');
    });
  });

  describe('Fallback and getSimpleCrowdLevel', () => {
    it('returns valid simple crowd levels without detailed station options', () => {
      const simpleCorridor = getSimpleCrowdLevel('green', 'L3-NB-001');
      expect(['low', 'moderate', 'heavy']).toContain(simpleCorridor.level);
      expect(simpleCorridor.label).toMatch(/^~/);
      expect(simpleCorridor.bgClass).toBeDefined();
      expect(simpleCorridor.textClass).toBeDefined();

      const simpleBlue = getSimpleCrowdLevel('blue', 'L1-EB-001');
      expect(['low', 'moderate', 'heavy']).toContain(simpleBlue.level);

      const simpleRed = getSimpleCrowdLevel('red', 'L2-NB-001');
      expect(['low', 'moderate', 'heavy']).toContain(simpleRed.level);
    });

    it('getCrowdAtStation wraps getCrowdLevel accurately', () => {
      const crowd = getCrowdAtStation('blue', 'L1-EB-001', 5, 10, ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']);
      expect(crowd).toBeDefined();
      expect(crowd.level).toBeDefined();
    });
  });
});

