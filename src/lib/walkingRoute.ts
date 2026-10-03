import { Station, stations } from '@/data/metroData';
import { getHaversineDistance } from '@/lib/utils';
export { getHaversineDistance };

export interface WalkingRoute {
  station: Station;
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // [lat, lng] pairs for Leaflet
}

// In-memory cache to prevent redundant network requests and provide instantaneous response
const routeCache = new Map<string, { route: WalkingRoute; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 60;

// Estimate walking time from distance (4.5 km/h average brisk walking speed)
export const estimateWalkingTime = (distanceMeters: number): number => {
  return (distanceMeters / 1000 / 4.5) * 3600; // returns seconds
};

// Find closest stations by straight-line distance
export const findClosestStations = (lat: number, lng: number, count: number = 3): Station[] => {
  const stationsWithDist = Object.values(stations).map(station => ({
    station,
    distance: getHaversineDistance(lat, lng, station.coordinates[0], station.coordinates[1])
  }));
  
  stationsWithDist.sort((a, b) => a.distance - b.distance);
  return stationsWithDist.slice(0, count).map(s => s.station);
};

// Fetch real walking route from public pedestrian routing services with multi-tier fallback
export const fetchWalkingRoute = async (
  userLat: number,
  userLng: number,
  station: Station
): Promise<WalkingRoute | null> => {
  const cacheKey = `${userLat.toFixed(4)},${userLng.toFixed(4)}->${station.id}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.route;
  }

  const stationLat = station.coordinates[0];
  const stationLng = station.coordinates[1];

  // Pedestrian routing service endpoints in order of priority:
  // 1. OSRM Public Foot Routing (free, CORS-enabled, real OpenStreetMap pedestrian network)
  // 2. OpenStreetMap DE Foot Routing Mirror (robust secondary mirror)
  // 3. Vercel Serverless ORS Proxy (if deployed with ORS_API_KEY)
  const endpoints = [
    `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${stationLng},${stationLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${userLng},${userLat};${stationLng},${stationLat}?overview=full&geometries=geojson`,
    `/api/walking-route?startLng=${userLng}&startLat=${userLat}&endLng=${stationLng}&endLat=${stationLat}`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) continue;

      const contentType = response.headers?.get?.('content-type');
      if (contentType && !contentType.includes('application/json')) continue;

      const data = await response.json();

      // Handle OSRM GeoJSON format
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry?.coordinates || [];
        if (rawCoords.length >= 2) {
          let geometry: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          let walkDist = Math.round(route.distance);

          // Check for excessive detour due to isolated pedestrian walkways (e.g. riverfront lower promenade trap)
          const straightDist = getHaversineDistance(userLat, userLng, stationLat, stationLng);
          if (straightDist > 400 && walkDist / straightDist > 2.4) {
            try {
              // Attempt to test an offset towards the street network
              const inlandAngle = Math.atan2(stationLat - userLat, stationLng - userLng);
              const offsetDist = 70; // 70 meters
              const offsetLat = userLat + (offsetDist / 111320) * Math.sin(inlandAngle);
              const offsetLng = userLng + (offsetDist / (111320 * Math.cos(userLat * Math.PI / 180))) * Math.cos(inlandAngle);
              const offsetUrl = `https://router.project-osrm.org/route/v1/foot/${offsetLng},${offsetLat};${stationLng},${stationLat}?overview=full&geometries=geojson`;
              const offsetRes = await fetch(offsetUrl, { signal: AbortSignal.timeout(2500) });
              if (offsetRes.ok) {
                const offsetData = await offsetRes.json();
                if (offsetData.routes && offsetData.routes.length > 0 && offsetData.routes[0].distance < walkDist * 0.75) {
                  const rawOffset: [number, number][] = offsetData.routes[0].geometry?.coordinates || [];
                  geometry = [[userLat, userLng], ...rawOffset.map(([lng, lat]) => [lat, lng] as [number, number])];
                  walkDist = Math.round(offsetData.routes[0].distance + offsetDist);
                }
              }
            } catch {
              // Keep original route
            }
          }

          const result: WalkingRoute = {
            station,
            distance: walkDist,
            duration: Math.round(estimateWalkingTime(walkDist)),
            geometry
          };

          if (routeCache.size >= MAX_CACHE_ENTRIES) {
            const firstKey = routeCache.keys().next().value;
            if (firstKey) routeCache.delete(firstKey);
          }
          routeCache.set(cacheKey, { route: result, timestamp: Date.now() });
          return result;
        }
      }

      // Handle OpenRouteService GeoJSON format (via /api/walking-route)
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const summary = feature.properties?.summary;
        const rawCoords: [number, number][] = feature.geometry?.coordinates || [];
        if (rawCoords.length >= 2 && summary) {
          const geometry: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          const walkDist = Math.round(summary.distance);
          const result: WalkingRoute = {
            station,
            distance: walkDist,
            duration: Math.round(estimateWalkingTime(walkDist)),
            geometry
          };

          if (routeCache.size >= MAX_CACHE_ENTRIES) {
            const firstKey = routeCache.keys().next().value;
            if (firstKey) routeCache.delete(firstKey);
          }
          routeCache.set(cacheKey, { route: result, timestamp: Date.now() });
          return result;
        }
      }
    } catch {
      // Try next endpoint
      continue;
    }
  }

  return null;
};

// Create realistic street-grid path for offline or fallback scenarios
export const createFallbackRoute = (lat: number, lng: number, station: Station): WalkingRoute => {
  const straightLineDist = getHaversineDistance(lat, lng, station.coordinates[0], station.coordinates[1]);
  // Real walking distance along urban streets is ~1.4 - 1.6x straight-line distance
  const estimatedWalkingDistance = Math.round(straightLineDist * 1.5);
  const estimatedDuration = Math.round(estimateWalkingTime(estimatedWalkingDistance));

  const targetLat = station.coordinates[0];
  const targetLng = station.coordinates[1];

  // Synthesize realistic street-grid walking geometry with street corners
  // instead of a single diagonal line cutting across buildings
  const geometry: [number, number][] = [];
  geometry.push([lat, lng]);

  const latDiff = targetLat - lat;
  const lngDiff = targetLng - lng;

  // If distance is short (< 150m), an L-shaped street turn
  if (straightLineDist < 150) {
    geometry.push([lat, targetLng]);
  } else {
    // Break into authentic street blocks (each block roughly 100-150m)
    const numBlocks = Math.min(Math.max(Math.round(straightLineDist / 120), 2), 6);
    let currentLat = lat;
    let currentLng = lng;
    const latStep = latDiff / numBlocks;
    const lngStep = lngDiff / numBlocks;

    for (let i = 1; i <= numBlocks; i++) {
      // Step along latitude street corridor first, then turn at intersection along longitude
      currentLat += latStep;
      geometry.push([currentLat, currentLng]);
      currentLng += lngStep;
      if (i < numBlocks) {
        geometry.push([currentLat, currentLng]);
      }
    }
  }

  geometry.push([targetLat, targetLng]);

  return {
    station,
    distance: estimatedWalkingDistance,
    duration: estimatedDuration,
    geometry
  };
};

// Find nearest station by walking time
export const findNearestByWalking = async (
  lat: number,
  lng: number
): Promise<WalkingRoute | null> => {
  const allClosest = findClosestStations(lat, lng, 3);
  if (allClosest.length === 0) return null;

  const primaryStation = allClosest[0];
  const primaryDist = getHaversineDistance(lat, lng, primaryStation.coordinates[0], primaryStation.coordinates[1]);

  // Only consider candidate stations that are legitimate competitors to the geographically closest station.
  // A secondary station that is > 30% further in straight line (or > 400m further) cannot usurp the primary
  // station due to transient routing anomalies or missing pedestrian connections across water bodies.
  const candidateStations = allClosest.filter(station => {
    const dist = getHaversineDistance(lat, lng, station.coordinates[0], station.coordinates[1]);
    return dist <= Math.max(primaryDist * 1.30, primaryDist + 400);
  });

  try {
    const routePromises = candidateStations.map(station => 
      fetchWalkingRoute(lat, lng, station)
    );
    
    const routes = await Promise.all(routePromises);
    const validRoutes = routes.filter((r): r is WalkingRoute => r !== null);
    
    if (validRoutes.length > 0) {
      // Sort by walking duration and return the fastest
      validRoutes.sort((a, b) => a.duration - b.duration);
      return validRoutes[0];
    }
  } catch (error) {
    console.warn('Walking route API failed, using fallback:', error);
  }

  // Fallback to street-grid route for the geographically closest station
  return createFallbackRoute(lat, lng, primaryStation);
};
