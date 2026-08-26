import type { VercelRequest, VercelResponse } from '@vercel/node';

// Server-side proxy for ORS Pelias geocoding — keeps the API key out of the
// client bundle. Mirrors api/nominatim.ts caching/throttling pattern.

const ALLOWED_ORIGINS = [
  'https://www.ahmedabadmetro.site',
  'https://ahmedabadmetro.site',
  'http://localhost:5173',
  'http://localhost:4173',
];

// In-memory cache for warm instances (edge CDN does the heavy lifting via s-maxage)
interface CacheEntry {
  timestamp: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

  const { text } = req.query;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing required query parameter: text' });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.error('No ORS_API_KEY configured in server environment');
    return res.status(500).json({ error: 'Geocoding not configured' });
  }

  const queryStr = text.trim();
  const cacheKey = queryStr.toLowerCase();

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json(cached.data);
  }

  try {
    const peliasUrl = new URL('https://api.openrouteservice.org/geocode/search');
    peliasUrl.searchParams.set('text', queryStr);
    peliasUrl.searchParams.set('boundary.circle.lat', '23.0225');
    peliasUrl.searchParams.set('boundary.circle.lon', '72.5714');
    peliasUrl.searchParams.set('boundary.circle.radius', '20');
    peliasUrl.searchParams.set('size', '8');

    const response = await fetch(peliasUrl.toString(), {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 429) {
      console.warn('ORS geocode rate limit exceeded upstream');
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ORS geocode error (${response.status}):`, errorText);
      return res.status(response.status).json({ error: 'Geocoding error' });
    }

    const data = await response.json();

    if (cache.size >= 200) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(cacheKey, { timestamp: Date.now(), data });

    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (error) {
    console.error('ORS geocode proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch geocoding results' });
  }
}
