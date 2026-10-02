/**
 * SEO & SSG Route Normalization Engine
 * 
 * Provides bidirectional resolution between clean URL slugs and internal station IDs,
 * as well as route slug parsing and line mapping.
 */

import { stations, type Station } from '../data/metroData.ts';

// Custom slug overrides for stations whose ID doesn't directly map to standard hyphenation
const ID_TO_SLUG_OVERRIDES: Record<string, string> = {
  stadium: 'sp-stadium',
};

const SLUG_TO_ID_OVERRIDES: Record<string, string> = {
  'sp-stadium': 'stadium',
  's-p-stadium': 'stadium',
  'stadium': 'stadium',
};

/**
 * Converts a station ID into a clean, SEO-friendly URL slug.
 * e.g. "motera_stadium" -> "motera-stadium", "stadium" -> "sp-stadium"
 */
export function stationToSlug(stationId: string): string {
  if (ID_TO_SLUG_OVERRIDES[stationId]) {
    return ID_TO_SLUG_OVERRIDES[stationId];
  }
  return stationId.toLowerCase().replace(/_/g, '-');
}

/**
 * Resolves a URL slug back to the canonical station ID.
 * Supports both hyphenated slugs ("motera-stadium") and direct IDs ("motera_stadium").
 */
export function slugToStationId(slug: string): string | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();

  // Check explicit overrides first
  if (SLUG_TO_ID_OVERRIDES[normalized]) {
    return SLUG_TO_ID_OVERRIDES[normalized];
  }

  // Check direct match in station registry
  if (stations[normalized]) {
    return normalized;
  }

  // Check underscore conversion
  const withUnderscore = normalized.replace(/-/g, '_');
  if (stations[withUnderscore]) {
    return withUnderscore;
  }

  // Search by station name match
  for (const [id, st] of Object.entries(stations)) {
    if (st.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === normalized) {
      return id;
    }
    if (st.aliases?.some(a => a.toLowerCase().replace(/[^a-z0-9]/g, '-') === normalized)) {
      return id;
    }
  }

  return null;
}

/**
 * Resolves a station slug to the full Station object.
 */
export function getStationFromSlug(slug: string): Station | null {
  const id = slugToStationId(slug);
  return id ? stations[id] || null : null;
}

/**
 * Converts a pair of station IDs into a clean route slug.
 * e.g. ("kalupur", "motera_stadium") -> "kalupur-to-motera-stadium"
 */
export function routeToSlug(fromId: string, toId: string): string {
  return `${stationToSlug(fromId)}-to-${stationToSlug(toId)}`;
}

/**
 * Parses a route slug (e.g. "kalupur-to-motera-stadium") into origin and destination station IDs.
 */
export function parseRouteSlug(slug: string): { fromId: string; toId: string } | null {
  if (!slug) return null;
  const parts = slug.toLowerCase().trim().split('-to-');
  if (parts.length !== 2) return null;

  const fromId = slugToStationId(parts[0]);
  const toId = slugToStationId(parts[1]);

  if (!fromId || !toId || fromId === toId) {
    return null;
  }

  return { fromId, toId };
}

export type MetroLineKey = 'blue' | 'red' | 'green' | 'purple';

export interface MetroLineInfo {
  key: MetroLineKey;
  slug: string;
  name: string;
  nameGu: string;
  nameHi: string;
  color: string;
  terminalA: string;
  terminalB: string;
  stationCount: number;
  distanceKm: number;
  operatingHours: string;
  headway: string;
}

export const METRO_LINES: Record<MetroLineKey, MetroLineInfo> = {
  blue: {
    key: 'blue',
    slug: 'blue-line',
    name: 'Blue Line (East-West Corridor)',
    nameGu: 'બ્લૂ લાઇન (પૂર્વ-પશ્ચિમ કોરિડોર)',
    nameHi: 'ब्लू लाइन (पूर्व-पश्चिम कॉरिडोर)',
    color: '#0066CC',
    terminalA: 'Thaltej Gam',
    terminalB: 'Vastral Gam',
    stationCount: 18,
    distanceKm: 21.16,
    operatingHours: '06:20 AM – 10:00 PM',
    headway: 'Peak: 5–7 mins | Off-Peak: 10–15 mins | Sunday: 12 mins',
  },
  red: {
    key: 'red',
    slug: 'red-line',
    name: 'Red Line (North-South Corridor)',
    nameGu: 'રેડ લાઇન (ઉત્તર-દક્ષિણ કોરિડોર)',
    nameHi: 'रेड लाइन (उत्तर-दक्षिण कॉरिडोर)',
    color: '#DC2626',
    terminalA: 'APMC (Vasna)',
    terminalB: 'Koteshwar Road',
    stationCount: 14,
    distanceKm: 18.87,
    operatingHours: '06:16 AM – 10:00 PM',
    headway: 'Peak: 5–7 mins | Off-Peak: 10–15 mins | Sunday: 12 mins',
  },
  green: {
    key: 'green',
    slug: 'green-line',
    name: 'Green Line (Gandhinagar Extension)',
    nameGu: 'ગ્રીન લાઇન (ગાંધીનગર લાઈન)',
    nameHi: 'ग्रीन लाइन (गांधीनगर लाइन)',
    color: '#16A34A',
    terminalA: 'Koteshwar Road',
    terminalB: 'Mahatma Mandir',
    stationCount: 19,
    distanceKm: 28.2,
    operatingHours: '07:33 AM – 08:10 PM',
    headway: '15–20 mins regular headway',
  },
  purple: {
    key: 'purple',
    slug: 'purple-line',
    name: 'Purple Line (GIFT City Branch)',
    nameGu: 'પર્પલ લાઇન (ગિફ્ટ સિટી શાખા)',
    nameHi: 'पर्पल लाइन (गिफ्ट सिटी शाखा)',
    color: '#9333EA',
    terminalA: 'GNLU',
    terminalB: 'GIFT City',
    stationCount: 3,
    distanceKm: 5.4,
    operatingHours: 'Morning: 07:36 AM – 10:18 AM | Evening: 04:06 PM – 07:15 PM',
    headway: 'Every 8–15 minutes during operating shifts',
  },
};

export function slugToLineKey(slug: string): MetroLineKey | null {
  const norm = slug.toLowerCase().replace(/-line$/, '');
  if (norm === 'blue' || norm === 'red' || norm === 'green' || norm === 'purple') {
    return norm as MetroLineKey;
  }
  return null;
}
