import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const { startLng, startLat, endLng, endLat, apiKey: clientApiKey } = req.query;

  // Validate parameters
  if (!startLng || !startLat || !endLng || !endLat) {
    return res.status(400).json({ error: 'Missing required parameters: startLng, startLat, endLng, endLat' });
  }

  // Use client API key if provided, otherwise use server-side key
  const apiKey = clientApiKey || process.env.ORS_API_KEY;
  
  if (!apiKey) {
    console.error('No ORS_API_KEY available (neither from client nor server environment)');
    return res.status(500).json({ 
      error: 'ORS API key not configured',
      message: 'Please set ORS_API_KEY environment variable or provide apiKey in request'
    });
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ORS API error response:', response.status, errorData);
      return res.status(response.status).json({ 
        error: 'ORS API error',
        status: response.status,
        details: errorData
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Walking route API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch walking route',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
