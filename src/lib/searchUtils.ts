import { stations, Station } from '@/data/metroData';
import { PopularPlace } from '@/data/popularPlaces';
import { getHaversineDistance } from '@/lib/utils';

export interface SearchIntent {
  isNearestIntent: boolean;
  cleanedQuery: string;
  tokens: string[];
}

// Robust intent patterns for nearest station queries across English, Gujarati, and Hindi
const INTENT_PATTERNS = [
  // English prefixes
  /^\s*nearest(?:\s+(?:metro|station))?(?:\s+(?:to|of|from|around))?\s+/i,
  /^\s*closest(?:\s+(?:metro|station))?(?:\s+(?:to|of|from|around))?\s+/i,
  /^\s*(?:metro|station)\s+near(?:est)?(?:\s+(?:to|of|from|around))?\s+/i,
  /^\s*near(?:est)?(?:\s+(?:metro|station))?(?:\s+(?:to|of|from|around))?\s+/i,
  /^\s*how\s+to\s+reach\s+/i,
  /^\s*route\s+to\s+/i,

  // English suffixes
  /\s+(?:nearest|closest)(?:\s+(?:metro|station))?\s*$/i,
  /\s+(?:metro|station)\s+near(?:by)?\s*$/i,
  /\s+near(?:by)?\s*$/i,

  // Gujarati prefixes / suffixes
  /^\s*(?:સૌથી\s+)?(?:નજીક(?:નું|ની|નો)?|પાસે(?:નું|ની|નો)?)(?:\s*(?:મેટ્રો|સ્ટેશન))?\s*/i,
  /\s*(?:સૌથી\s+)?(?:નજીક(?:નું|ની|નો)?|પાસે(?:નું|ની|નો)?)(?:\s*(?:મેટ્રો|સ્ટેશન))?\s*$/i,
  /\s*નજીક\s*$/i,
  /\s*પાસે\s*$/i,

  // Hindi prefixes / suffixes
  /^\s*(?:सबसे\s+)?(?:नजदीक|नज़दीक|पास)(?:\s*(?:का|की|કે))?(?:\s*(?:मेट्रो|स्टेशन))?\s*/i,
  /\s*(?:के\s+)?(?:पास|नजदीक|नज़दीक)(?:\s*(?:की|का|के))?(?:\s*(?:मेट्रो|स्टेशन))?\s*$/i,
  /\s*नजदीक\s*$/i,
  /\s*पास\s*$/i,
];

/**
 * Extracts natural language search intent, returning whether the user is searching for
 * the nearest station and the cleaned core entity name (e.g. "helipad exhibition").
 */
export function parseSearchIntent(rawQuery: string): SearchIntent {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { isNearestIntent: false, cleanedQuery: '', tokens: [] };
  }

  let cleaned = trimmed;
  let isNearestIntent = false;

  for (const pattern of INTENT_PATTERNS) {
    if (pattern.test(cleaned)) {
      isNearestIntent = true;
      cleaned = cleaned.replace(pattern, ' ').trim();
    }
  }

  // Normalize multi-spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();

  // If the query was purely "nearest station" or "metro", don't empty it completely
  if (!cleaned && isNearestIntent) {
    cleaned = trimmed.toLowerCase();
  }

  // Tokenize into non-empty alphanumeric words
  const tokens = cleaned
    .split(/[\s,.-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return {
    isNearestIntent,
    cleanedQuery: cleaned,
    tokens,
  };
}

/**
 * Compute Haversine distance in kilometers
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return getHaversineDistance(lat1, lon1, lat2, lon2) / 1000;
}

/**
 * Find nearest station to given coordinates synchronously and offline.
 * If designatedStationId is supplied (e.g. curated campus/hall), uses that station.
 */
export function findNearestStationSync(
  lat: number,
  lng: number,
  designatedStationId?: string
): {
  id: string;
  name: string;
  distanceKm: number;
  station: Station;
} {
  // If explicitly designated station exists, prioritize it
  if (designatedStationId && stations[designatedStationId]) {
    const desStation = stations[designatedStationId];
    const dist = getDistanceKm(lat, lng, desStation.coordinates[0], desStation.coordinates[1]);
    return {
      id: desStation.id,
      name: desStation.name,
      distanceKm: dist,
      station: desStation,
    };
  }

  let nearestStation: Station = Object.values(stations)[0];
  let minDistance = Infinity;

  for (const station of Object.values(stations)) {
    const dist = getDistanceKm(lat, lng, station.coordinates[0], station.coordinates[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestStation = station;
    }
  }

  return {
    id: nearestStation.id,
    name: nearestStation.name,
    distanceKm: minDistance,
    station: nearestStation,
  };
}

/**
 * Calculate multi-token matching score between query tokens and target text + aliases.
 * Returns score > 0 if matched, 0 if no match.
 */
export function scoreSearchMatch(
  primaryText: string,
  secondaryTexts: (string | undefined)[],
  tokens: string[],
  cleanQuery: string
): number {
  const normPrimary = primaryText.toLowerCase();
  const allTexts = [normPrimary, ...secondaryTexts.filter(Boolean).map(s => s!.toLowerCase())];

  // 1. Exact match
  if (normPrimary === cleanQuery) {
    return 1000;
  }
  for (const txt of allTexts) {
    if (txt === cleanQuery) return 900;
  }

  // 2. Starts with query
  if (normPrimary.startsWith(cleanQuery)) {
    return 800;
  }
  for (const txt of allTexts) {
    if (txt.startsWith(cleanQuery)) return 750;
  }

  // 3. Full clean query is a contiguous substring
  if (normPrimary.includes(cleanQuery)) {
    return 650;
  }
  for (const txt of allTexts) {
    if (txt.includes(cleanQuery)) return 600;
  }

  // 4. Tokenized matching (all tokens must match in some field)
  if (tokens.length > 1) {
    const combined = allTexts.join(' ');
    let matchedTokenCount = 0;

    for (const token of tokens) {
      if (combined.includes(token)) {
        matchedTokenCount++;
      }
    }

    if (matchedTokenCount === tokens.length) {
      // Bonus if all tokens appear in primary text
      const allInPrimary = tokens.every(t => normPrimary.includes(t));
      return allInPrimary ? 550 : 500;
    } else if (matchedTokenCount >= Math.ceil(tokens.length * 0.75)) {
      // Partial token match (at least 75% of words matched)
      return 300 + (matchedTokenCount / tokens.length) * 100;
    }
  }

  // 5. Single token partial substring
  if (tokens.length === 1 && tokens[0].length >= 2) {
    const t = tokens[0];
    for (const txt of allTexts) {
      if (txt.includes(t)) {
        return 400;
      }
    }
  }

  return 0;
}

export interface CuratedPlaceMatch {
  place: PopularPlace;
  score: number;
  nearestStationId: string;
  nearestStationName: string;
  nearestStationDist: number;
}

/**
 * Match curated places against search query tokens with instant nearest station resolution.
 */
export function matchCuratedPlaces(
  placesList: PopularPlace[],
  cleanQuery: string,
  tokens: string[]
): CuratedPlaceMatch[] {
  if (!cleanQuery && tokens.length === 0) return [];

  const matches: CuratedPlaceMatch[] = [];

  for (const p of placesList) {
    const aliases = [p.k, p.t];
    const score = scoreSearchMatch(p.n, aliases, tokens, cleanQuery);

    if (score > 0) {
      const nearest = findNearestStationSync(p.c[0], p.c[1], p.s);
      matches.push({
        place: p,
        score,
        nearestStationId: nearest.id,
        nearestStationName: nearest.name,
        nearestStationDist: nearest.distanceKm,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
