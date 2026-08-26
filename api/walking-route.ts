import type { VercelRequest, VercelResponse } from '@vercel/node';

// Restrict CORS to the deployed app origin (localhost for dev)
const ALLOWED_ORIGINS = [
  'https://www.ahmedabadmetro.site',
  'https://ahmedabadmetro.site',
  'http://localhost:5173',
  'http://localhost:4173',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
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

  const { startLng, startLat, endLng, endLat } = req.query;

  // Validate parameters — numeric coordinates only
  const coords = [startLng, startLat, endLng, endLat];
  if (coords.some(c => typeof c !== 'string' || !/^-?\d+(\.\d+)?$/.test(c))) {
    return res.status(400).json({ error: 'Missing or invalid parameters: startLng, startLat, endLng, endLat' });
  }

  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    console.error('No ORS_API_KEY configured in server environment');
    return res.status(500).json({
      error: 'ORS API key not configured'
    });
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${encodeURIComponent(apiKey)}&start=${coords[0]},${coords[1]}&end=${coords[2]},${coords[3]}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ORS API error response:', response.status, errorData);
      return res.status(response.status).json({
        error: 'ORS API error',
        status: response.status
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Walking route API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch walking route'
    });
  }
}
