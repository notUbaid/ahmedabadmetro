import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory cache for search queries (1 hour TTL)
interface CacheEntry {
  timestamp: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Upstream rate limit throttling (~1 request per second to OSM Nominatim)
let lastUpstreamCallTimestamp = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

async function throttleUpstream(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastUpstreamCallTimestamp;
  
  if (timeSinceLastCall < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastCall;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  
  lastUpstreamCallTimestamp = Date.now();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'Missing required query parameter: q' });
  }

  const queryStr = q.trim();
  const cacheKey = queryStr.toLowerCase();

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached.data);
  }

  try {
    // Throttled execution to satisfy OSM terms (1 req/sec)
    await throttleUpstream();

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', queryStr);
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '5');
    nominatimUrl.searchParams.set('email', 'contact@ahmedabadmetro.site');

    const userAgent = process.env.NOMINATIM_USER_AGENT || 'AhmedabadMetroApp/1.0 (contact@ahmedabadmetro.site)';
    const referer = process.env.NOMINATIM_REFERER || 'https://ahmedabadmetro.site';

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': userAgent,
        'Referer': referer,
        'Accept': 'application/json',
      },
      // Don't let a hung upstream hold the serverless function indefinitely.
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 429) {
      console.warn('Nominatim rate limit exceeded upstream');
      return res.status(429).json({ error: 'Nominatim rate limit exceeded' });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Nominatim API error (${response.status}):`, errorText);
      return res.status(response.status).json({
        error: 'Nominatim API error',
        status: response.status,
      });
    }

    const data = await response.json();

    // Store in cache — bounded so a warm instance can't grow without limit.
    if (cache.size >= 200) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data,
    });

    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Nominatim server-side proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch geocoding results',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
