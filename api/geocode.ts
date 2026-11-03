function formatAsNominatim(geo: any) {
  if (geo && geo.features && Array.isArray(geo.features)) {
    return geo.features.map((f: any, idx: number) => ({
      place_id: f.properties?.id ?? idx,
      osm_id: f.properties?.id ?? idx,
      osm_type: 'node',
      lat: String(f.geometry?.coordinates?.[1] ?? 0),
      lon: String(f.geometry?.coordinates?.[0] ?? 0),
      display_name: f.properties?.label || f.properties?.name || 'Ahmedabad',
      name: f.properties?.name || f.properties?.label || 'Ahmedabad',
      type: f.properties?.type || 'station',
    }));
  }
  return geo;
}
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://www.ahmedabadmetro.site',
  'https://ahmedabadmetro.site',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Ahmedabad–Gandhinagar Transit Bounding Box
export const AHMEDABAD_BOUNDS = {
  minLng: 72.40,
  minLat: 22.90,
  maxLng: 72.78,
  maxLat: 23.30,
};

// Curated local transit landmarks and stations dictionary for instant zero-latency lookup
interface LocalTransitPoint {
  id: string;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  type: 'station' | 'landmark';
}

const LOCAL_TRANSIT_POINTS: LocalTransitPoint[] = [
  // Stations
  { id: 'kalupur', name: 'Kalupur Railway Station', aliases: ['ahmedabad railway station', 'kalupur junction'], lat: 23.0274, lng: 72.6009, type: 'station' },
  { id: 'old_high_court', name: 'Old High Court', aliases: ['ohc', 'high court', 'ashram road interchange'], lat: 23.0375, lng: 72.5695, type: 'station' },
  { id: 'thaltej_gam', name: 'Thaltej Gam', aliases: ['thaltej west'], lat: 23.0569, lng: 72.5029, type: 'station' },
  { id: 'thaltej', name: 'Thaltej', aliases: ['sg highway', 'thaltej cross road'], lat: 23.0503, lng: 72.5165, type: 'station' },
  { id: 'vastral_gam', name: 'Vastral Gam', aliases: ['vastral east terminus'], lat: 23.0031, lng: 72.6685, type: 'station' },
  { id: 'vastral', name: 'Vastral', aliases: ['vastral cross roads'], lat: 23.0045, lng: 72.6565, type: 'station' },
  { id: 'motera_stadium', name: 'Motera Stadium', aliases: ['narendra modi stadium', 'motera cricket stadium'], lat: 23.0926, lng: 72.5975, type: 'station' },
  { id: 'apmc', name: 'APMC', aliases: ['vasna apmc', 'apmc market'], lat: 22.9965, lng: 72.5447, type: 'station' },
  { id: 'sabarmati', name: 'Sabarmati Railway Station', aliases: ['sabarmati junction', 'bullet train station', 'hsr'], lat: 23.0784, lng: 72.5898, type: 'station' },
  { id: 'ranip', name: 'Ranip', aliases: ['rto ranip', 'ranip gsrtc bus stand'], lat: 23.0768, lng: 72.5768, type: 'station' },
  { id: 'gnlu', name: 'GNLU', aliases: ['gujarat national law university', 'gnlu gandhinagar'], lat: 23.1608, lng: 72.6377, type: 'station' },
  { id: 'gift_city', name: 'GIFT City', aliases: ['gift city gandhinagar', 'gujarat international finance tec-city'], lat: 23.1593, lng: 72.6844, type: 'station' },
  { id: 'infocity', name: 'Infocity', aliases: ['infocity gandhinagar', 'tcs gandhinagar', 'da-iict'], lat: 23.1937, lng: 72.6318, type: 'station' },
  { id: 'sachivalaya', name: 'Sachivalaya', aliases: ['new sachivalaya', 'swarnim sankul', 'gandhinagar secretariat'], lat: 23.2151, lng: 72.6588, type: 'station' },
  { id: 'akshardham', name: 'Akshardham', aliases: ['akshardham temple gandhinagar', 'baps akshardham'], lat: 23.2237, lng: 72.6642, type: 'station' },
  { id: 'mahatma_mandir', name: 'Mahatma Mandir', aliases: ['mahatma mandir convention centre', 'gandhinagar railway station'], lat: 23.2339, lng: 72.6339, type: 'station' },
  { id: 'koteshwar_road', name: 'Koteshwar Road', aliases: ['koteshwar', 'motera koteshwar'], lat: 23.1031, lng: 72.6025, type: 'station' },
  { id: 'gujarat_university', name: 'Gujarat University', aliases: ['gu campus', 'ld engineering college'], lat: 23.0372, lng: 72.5458, type: 'station' },
  { id: 'paldi', name: 'Paldi', aliases: ['nid paldi', 'kocharab ashram', 'paldi bus station'], lat: 23.0134, lng: 72.5645, type: 'station' },
  { id: 'pdpu', name: 'PDPU (PDEU)', aliases: ['pandit deendayal energy university', 'pdpu gandhinagar'], lat: 23.1578, lng: 72.6612, type: 'station' },
  { id: 'sector_1', name: 'Sector-1', aliases: ['sector 1 gandhinagar'], lat: 23.2049, lng: 72.6432, type: 'station' },
  { id: 'sector_10a', name: 'Sector-10A', aliases: ['sector 10a gandhinagar'], lat: 23.2115, lng: 72.6502, type: 'station' },
  { id: 'sector_16', name: 'Sector 16', aliases: ['sector 16 gandhinagar'], lat: 23.2339, lng: 72.6502, type: 'station' },
  { id: 'sector_24', name: 'Sector 24', aliases: ['sector 24 gandhinagar'], lat: 23.2385, lng: 72.6415, type: 'station' },
  { id: 'kankaria_east', name: 'Kankaria East', aliases: ['kankaria lake', 'kankaria zoo', 'nagina wadi'], lat: 23.0084, lng: 72.6038, type: 'station' },

  // Prominent Gandhinagar & Ahmedabad Landmarks
  { id: 'helipad_exhibition', name: 'Helipad Exhibition Centre', aliases: ['helipad ground', 'vibrant gujarat venue'], lat: 23.2285, lng: 72.6385, type: 'landmark' },
  { id: 'iit_gandhinagar', name: 'IIT Gandhinagar', aliases: ['iitgn', 'palaj campus'], lat: 23.2118, lng: 72.6842, type: 'landmark' },
  { id: 'svpia_airport', name: 'Sardar Vallabhbhai Patel International Airport', aliases: ['ahmedabad airport', 'svpia', 'terminal 1', 'terminal 2', 't1', 't2'], lat: 23.0734, lng: 72.6266, type: 'landmark' },
  { id: 'science_city', name: 'Gujarat Science City', aliases: ['science city ahmedabad', 'science city road'], lat: 23.0789, lng: 72.4965, type: 'landmark' },
  { id: 'law_garden', name: 'Law Garden', aliases: ['law garden night market', 'ellisbridge'], lat: 23.0248, lng: 72.5574, type: 'landmark' },
  { id: 'sabarmati_ashram', name: 'Sabarmati Ashram', aliases: ['gandhi ashram', 'satyagraha ashram'], lat: 23.0605, lng: 72.5802, type: 'landmark' },
  { id: 'iscon_mall', name: 'Iscon Mega Mall', aliases: ['iscon circle', 'sg road iscon'], lat: 23.0298, lng: 72.5074, type: 'landmark' },
  { id: 'vaishnodevi_circle', name: 'Vaishnodevi Circle', aliases: ['sg highway vaishnodevi', 'nirma university'], lat: 23.1322, lng: 72.5441, type: 'landmark' },
  { id: 'swarnim_park', name: 'Swarnim Park Gandhinagar', aliases: ['central park gandhinagar', 'vidhan sabha park'], lat: 23.2201, lng: 72.6514, type: 'landmark' },
];

function findLocalMatch(query: string): LocalTransitPoint | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  for (const pt of LOCAL_TRANSIT_POINTS) {
    if (pt.name.toLowerCase() === q) return pt;
    if (pt.aliases.some(a => a.toLowerCase() === q)) return pt;
  }

  // Substring match
  for (const pt of LOCAL_TRANSIT_POINTS) {
    if (pt.name.toLowerCase().includes(q) || q.includes(pt.name.toLowerCase())) return pt;
    if (pt.aliases.some(a => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) return pt;
  }

  return null;
}

// In-memory cache for warm instances
interface CacheEntry {
  timestamp: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Upstream rate limit throttling for OSM Nominatim fallback (~1 req/sec)
let lastNominatimTimestamp = 0;
const NOMINATIM_INTERVAL_MS = 1000;

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimTimestamp;
  lastNominatimTimestamp = now;
  if (timeSinceLast < NOMINATIM_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_INTERVAL_MS - timeSinceLast));
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const queryRaw = (req.query.q || req.query.text || '') as string;
  if (!queryRaw || typeof queryRaw !== 'string' || !queryRaw.trim()) {
    return res.status(400).json({ error: 'Missing required query parameter: q or text' });
  }

  const queryStr = queryRaw.trim();
  const cacheKey = queryStr.toLowerCase();

  // Edge cache headers for all successful responses
  const edgeCacheHeader = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

  // 1. Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', edgeCacheHeader);
    res.setHeader('X-Cache', 'HIT');
    const outData = req.query.format === 'nominatim' ? formatAsNominatim(cached.data) : cached.data;
    return res.status(200).json(outData);
  }

  // 2. High-confidence local station and landmark matching (Instant, 0 upstream cost)
  const localMatch = findLocalMatch(queryStr);
  if (localMatch) {
    const localResult = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [localMatch.lng, localMatch.lat],
          },
          properties: {
            id: localMatch.id,
            label: localMatch.name,
            name: localMatch.name,
            source: 'local_transit_matcher',
            confidence: 1.0,
            type: localMatch.type,
          },
        },
      ],
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: localResult });
    res.setHeader('Cache-Control', edgeCacheHeader);
    res.setHeader('X-Source', 'local_matcher');
    const outData = req.query.format === 'nominatim' ? formatAsNominatim(localResult) : localResult;
    return res.status(200).json(outData);
  }

  // 3. OpenRouteService geocoding bounded to Ahmedabad/Gandhinagar region
  const apiKey = process.env.ORS_API_KEY;
  if (apiKey) {
    try {
      const peliasUrl = new URL('https://api.openrouteservice.org/geocode/search');
      peliasUrl.searchParams.set('text', queryStr);
      peliasUrl.searchParams.set('boundary.circle.lat', '23.0225');
      peliasUrl.searchParams.set('boundary.circle.lon', '72.5714');
      peliasUrl.searchParams.set('boundary.circle.radius', '25'); // 25 km covers Ahmedabad & Gandhinagar
      peliasUrl.searchParams.set('size', '8');

      const response = await fetch(peliasUrl.toString(), {
        headers: {
          Authorization: apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        // Edge cache ORS results
        if (cache.size >= 300) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        cache.set(cacheKey, { timestamp: Date.now(), data });
        res.setHeader('Cache-Control', edgeCacheHeader);
        res.setHeader('X-Source', 'openrouteservice');
        const outData = req.query.format === 'nominatim' ? formatAsNominatim(data) : data;
    return res.status(200).json(outData);
      }
    } catch (err) {
      console.warn('ORS Geocode failed, falling back to OSM Nominatim:', err);
    }
  }

  // 4. Rate-limited Nominatim fallback bounded to Ahmedabad–Gandhinagar coordinates
  try {
    await throttleNominatim();
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', queryStr);
    nominatimUrl.searchParams.set('format', 'geojson');
    nominatimUrl.searchParams.set('viewbox', `${AHMEDABAD_BOUNDS.minLng},${AHMEDABAD_BOUNDS.maxLat},${AHMEDABAD_BOUNDS.maxLng},${AHMEDABAD_BOUNDS.minLat}`);
    nominatimUrl.searchParams.set('bounded', '1');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '5');
    nominatimUrl.searchParams.set('email', 'contact@ahmedabadmetro.site');

    const userAgent = process.env.NOMINATIM_USER_AGENT || 'AhmedabadMetroApp/1.0 (contact@ahmedabadmetro.site)';
    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      cache.set(cacheKey, { timestamp: Date.now(), data });
      res.setHeader('Cache-Control', edgeCacheHeader);
      res.setHeader('X-Source', 'nominatim');
      const outData = req.query.format === 'nominatim' ? formatAsNominatim(data) : data;
    return res.status(200).json(outData);
    }

    return res.status(response.status).json({ error: 'Geocoding upstream service unavailable' });
  } catch (error) {
    console.error('All geocoding providers failed:', error);
    return res.status(500).json({ error: 'Failed to geocode query' });
  }
}
