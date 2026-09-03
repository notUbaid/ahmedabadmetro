import { describe, it, expect } from 'vitest';
import { getCrowdLevel, getSimpleCrowdLevel, getCrowdAtStation } from '../crowding';

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
      stationList: morningApmcToGiftStations,
      date: weekdayMorning
    });
    expect(atGift.level).toBe('heavy');
  });
});
