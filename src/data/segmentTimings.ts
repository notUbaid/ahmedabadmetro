// Precise segment-by-segment travel times for Ahmedabad Metro
// Based on official timetable data w.e.f. 28/09/2025
// Using exact anchor times from official schedule

// Stop duration rules (in seconds)
export const NORMAL_STOP = 45; // Regular station dwell time
export const INTERCHANGE_STOP = 70; // Interchange station dwell time

// Interchange stations
export const INTERCHANGE_STATIONS = ['old_high_court', 'koteshwar_road', 'gnlu'];

// ============= VERIFIED TIMINGS FROM OFFICIAL TIMETABLE =============
// Using first train (APMC 06:48) as reference:
// APMC 06:48 → OHC 07:02 → Motera 07:20 → GNLU 07:41 → PDEU 07:46 → GIFT 07:49

// Section journey times (in minutes, including all stops):
// APMC → Old High Court: 14 min (6 segments, 5 intermediate stops)
// Old High Court → Motera Stadium: 18 min (7 segments, 6 intermediate stops)  
// Motera Stadium → GNLU: 21 min (8 segments, 7 intermediate stops)
// GNLU → Infocity: 19 min (4 segments, 3 intermediate stops) [estimated from schedule gaps]
// Infocity → Sachivalaya: 12 min (3 segments, 2 intermediate stops) [estimated]
// GNLU → GIFT City: 8 min (2 segments, 1 intermediate stop)

// Calculate travel time per segment (excluding stop time)
// Formula: (total_time - num_intermediate_stops * stop_time) / num_segments

interface SectionTiming {
  stations: string[];
  totalMinutes: number;
  // Calculated values
  travelPerSegmentSec: number;
  cumulativeMinutes: number[];
}

// APMC → Old High Court (Red Line south)
export const APMC_TO_OHC: SectionTiming = {
  stations: ['apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram', 'old_high_court'],
  totalMinutes: 14, // Hit 14m OHC arrival exactly
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Old High Court → Koteshwar Road (Red Line north - now ends at Koteshwar Road)
export const OHC_TO_KOTESHWAR: SectionTiming = {
  stations: ['old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'sabarmati_railway_station', 'aec', 'sabarmati', 'motera_stadium', 'koteshwar_road'],
  totalMinutes: 21, // Added 2 minutes for the missing station
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Legacy alias for backward compatibility
export const OHC_TO_MOTERA = OHC_TO_KOTESHWAR;

// Koteshwar Road → GNLU (Green Line first part - now starts from Koteshwar Road)
export const KOTESHWAR_TO_GNLU: SectionTiming = {
  stations: ['koteshwar_road', 'vishwakarma_college', 'tapovan_circle', 'narmada_canal', 'koba_circle', 'juna_koba', 'koba_gam', 'gnlu'],
  totalMinutes: 18, // Koteshwar to GNLU (previously Motera to GNLU was ~20m)
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Legacy alias for backward compatibility
export const MOTERA_TO_GNLU = KOTESHWAR_TO_GNLU;

// GNLU → Infocity (Green Line middle)
export const GNLU_TO_INFOCITY: SectionTiming = {
  stations: ['gnlu', 'raysan', 'randesan', 'dholakuva_circle', 'infocity'],
  totalMinutes: 11.25, // To hit +12m Infocity arrival from GNLU departure
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Infocity → Sachivalaya (Green Line end)
const INFOCITY_TO_SACHIVALAYA: SectionTiming = {
  stations: ['infocity', 'sector_1', 'sector_10a', 'sachivalaya'],
  totalMinutes: 13, // Matches schedule gap
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Sachivalaya → Mahatma Mandir (Green Line extension)
export const SACHIVALAYA_TO_MAHATMA_MANDIR: SectionTiming = {
  stations: ['sachivalaya', 'akshardham', 'juna_sachivalaya', 'sector_16', 'sector_24', 'mahatma_mandir'],
  totalMinutes: 12, // Estimated ~2.5 min per segment
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// GNLU → GIFT City (Purple Line)
const GNLU_TO_GIFT: SectionTiming = {
  stations: ['gnlu', 'pdpu', 'gift_city'],
  totalMinutes: 6, // 5.8 km, 6 min travel time (per Phase 2 timetable)
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Blue Line: Thaltej Gam → Vastral Gam
const THALTEJ_TO_VASTRAL: SectionTiming = {
  stations: [
    'thaltej_gam', 'thaltej', 'doordarshan_kendra', 'gurukul_road', 'gujarat_university',
    'commerce_six_road', 'stadium', 'old_high_court', 'shahpur', 'gheekanta',
    'kalupur', 'kankaria_east', 'apparel_park', 'amraiwadi', 'rabari_colony',
    'vastral', 'nirant_cross_roads', 'vastral_gam'
  ],
  totalMinutes: 45, // Official journey time
  travelPerSegmentSec: 0,
  cumulativeMinutes: [],
};

// Calculate cumulative times for a section
function calculateSectionTimes(section: SectionTiming): void {
  const numSegments = section.stations.length - 1;
  const numIntermediateStops = numSegments - 1; // All stops except last

  // Count interchange stops in intermediate stations
  let interchangeStops = 0;
  let normalStops = 0;
  for (let i = 1; i < section.stations.length - 1; i++) {
    if (INTERCHANGE_STATIONS.includes(section.stations[i])) {
      interchangeStops++;
    } else {
      normalStops++;
    }
  }

  const totalStopTime = (interchangeStops * INTERCHANGE_STOP + normalStops * NORMAL_STOP) / 60; // in minutes
  const travelTimeMinutes = section.totalMinutes - totalStopTime;
  section.travelPerSegmentSec = (travelTimeMinutes * 60) / numSegments;

  // Calculate cumulative arrival times
  section.cumulativeMinutes = [0]; // First station is 0
  let cumulative = 0;

  for (let i = 1; i < section.stations.length; i++) {
    // Add travel time for this segment
    cumulative += section.travelPerSegmentSec / 60;

    // Add stop time at previous station (if not first segment)
    if (i > 1) {
      const prevStation = section.stations[i - 1];
      const stopTime = INTERCHANGE_STATIONS.includes(prevStation) ? INTERCHANGE_STOP : NORMAL_STOP;
      cumulative += stopTime / 60;
    }

    section.cumulativeMinutes.push(Math.round(cumulative * 10) / 10);
  }
}

// Calculate all section times
calculateSectionTimes(APMC_TO_OHC);
calculateSectionTimes(OHC_TO_MOTERA);
calculateSectionTimes(MOTERA_TO_GNLU);
calculateSectionTimes(GNLU_TO_INFOCITY);
calculateSectionTimes(INFOCITY_TO_SACHIVALAYA);
calculateSectionTimes(SACHIVALAYA_TO_MAHATMA_MANDIR);
calculateSectionTimes(GNLU_TO_GIFT);
calculateSectionTimes(THALTEJ_TO_VASTRAL);

// ============= LINE TIMING DATA =============

interface LineTimingData {
  stations: string[];
  arrivalMinutes: number[]; // Minutes from first station departure
}

// Join sections for full lines
export function joinSections(...sections: SectionTiming[]): LineTimingData {
  const stations: string[] = [];
  const arrivalMinutes: number[] = [];
  let baseTime = 0;

  sections.forEach((section, sectionIdx) => {
    section.stations.forEach((station, stationIdx) => {
      // Skip first station of subsequent sections (already in previous)
      if (sectionIdx > 0 && stationIdx === 0) {
        // Add interchange stop time at junction
        const junctionStation = section.stations[0];
        const stopTime = INTERCHANGE_STATIONS.includes(junctionStation) ? INTERCHANGE_STOP : NORMAL_STOP;
        baseTime += stopTime / 60;
        return;
      }

      stations.push(station);
      arrivalMinutes.push(Math.round((baseTime + section.cumulativeMinutes[stationIdx]) * 10) / 10);
    });

    // Update base time for next section
    baseTime += section.cumulativeMinutes[section.cumulativeMinutes.length - 1];
  });

  // Round to whole minutes for final output
  return {
    stations,
    arrivalMinutes: arrivalMinutes.map(m => Math.round(m)),
  };
}

// Full line timings
export const LINE_TIMINGS = {
  blue: joinSections(THALTEJ_TO_VASTRAL),
  red: joinSections(APMC_TO_OHC, OHC_TO_KOTESHWAR),
  green: joinSections(KOTESHWAR_TO_GNLU, GNLU_TO_INFOCITY, INFOCITY_TO_SACHIVALAYA, SACHIVALAYA_TO_MAHATMA_MANDIR),
  purple: joinSections(GNLU_TO_GIFT),
};

// Corridor timings for through-running services
export const CORRIDOR_TIMINGS = {
  // APMC → GNLU (Red to Koteshwar Road + Green to GNLU)
  apmcToGnlu: joinSections(APMC_TO_OHC, OHC_TO_KOTESHWAR, KOTESHWAR_TO_GNLU),

  // APMC → Sachivalaya (Red to Koteshwar Road + full Green to old terminus)
  apmcToSachivalaya: joinSections(APMC_TO_OHC, OHC_TO_KOTESHWAR, KOTESHWAR_TO_GNLU, GNLU_TO_INFOCITY, INFOCITY_TO_SACHIVALAYA),

  // APMC → Mahatma Mandir (Red to Koteshwar Road + full Green extended)
  apmcToMahatmaMandir: joinSections(APMC_TO_OHC, OHC_TO_KOTESHWAR, KOTESHWAR_TO_GNLU, GNLU_TO_INFOCITY, INFOCITY_TO_SACHIVALAYA, SACHIVALAYA_TO_MAHATMA_MANDIR),

  // APMC → GIFT City (Red to Koteshwar Road + Green to GNLU + Purple)
  apmcToGift: joinSections(APMC_TO_OHC, OHC_TO_KOTESHWAR, KOTESHWAR_TO_GNLU, GNLU_TO_GIFT),
};

// Reverse direction timings (Mahatma Mandir/Sachivalaya/GIFT → APMC)
export const REVERSE_CORRIDOR_TIMINGS = {
  // GNLU → APMC
  gnluToApmc: (() => {
    const forward = CORRIDOR_TIMINGS.apmcToGnlu;
    const maxTime = forward.arrivalMinutes[forward.arrivalMinutes.length - 1];
    return {
      stations: [...forward.stations].reverse(),
      arrivalMinutes: forward.arrivalMinutes.map(t => maxTime - t).reverse(),
    };
  })(),

  // Sachivalaya → APMC
  sachivalayaToApmc: (() => {
    const forward = CORRIDOR_TIMINGS.apmcToSachivalaya;
    const maxTime = forward.arrivalMinutes[forward.arrivalMinutes.length - 1];
    return {
      stations: [...forward.stations].reverse(),
      arrivalMinutes: forward.arrivalMinutes.map(t => maxTime - t).reverse(),
    };
  })(),

  // Mahatma Mandir → APMC
  mahatmaMandirToApmc: (() => {
    const forward = CORRIDOR_TIMINGS.apmcToMahatmaMandir;
    const maxTime = forward.arrivalMinutes[forward.arrivalMinutes.length - 1];
    return {
      stations: [...forward.stations].reverse(),
      arrivalMinutes: forward.arrivalMinutes.map(t => maxTime - t).reverse(),
    };
  })(),

  // GIFT City → APMC
  giftToApmc: (() => {
    const forward = CORRIDOR_TIMINGS.apmcToGift;
    const maxTime = forward.arrivalMinutes[forward.arrivalMinutes.length - 1];
    return {
      stations: [...forward.stations].reverse(),
      arrivalMinutes: forward.arrivalMinutes.map(t => maxTime - t).reverse(),
    };
  })(),
};


