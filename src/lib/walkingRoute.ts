import { Station, stations } from '@/data/metroData';

export interface WalkingRoute {
  station: Station;
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // [lat, lng] pairs for Leaflet
}

// Haversine distance for initial filtering and fallback
export const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Estimate walking time from distance (4 km/h average walking speed)
export const estimateWalkingTime = (distanceMeters: number): number => {
  return (distanceMeters / 1000 / 4) * 3600; // returns seconds
};

// Find 3 closest stations by straight-line distance
export const findClosestStations = (lat: number, lng: number, count: number = 3): Station[] => {
  const stationsWithDist = Object.values(stations).map(station => ({
    station,
    distance: getHaversineDistance(lat, lng, station.coordinates[0], station.coordinates[1])
  }));
  
  stationsWithDist.sort((a, b) => a.distance - b.distance);
  return stationsWithDist.slice(0, count).map(s => s.station);
};

// Fetch walking route from OpenRouteService
export const fetchWalkingRoute = async (
  userLat: number,
  userLng: number,
  station: Station
): Promise<WalkingRoute | null> => {
  try {
    // Serverless proxy holds the ORS key server-side; never send keys from the client.
    const orsUrl = `/api/walking-route?startLng=${userLng}&startLat=${userLat}&endLng=${station.coordinates[1]}&endLat=${station.coordinates[0]}`;

    const response = await fetch(orsUrl);
    
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return null;
    }
    
    const data = await response.json();
    
    // GeoJSON response format
    if (!data.features || data.features.length === 0) {
      console.warn('No routes found in ORS response');
      return null;
    }
    
    const feature = data.features[0];
    const summary = feature.properties.summary;
    const coords = feature.geometry.coordinates;
    
    // Don't simplify too much - keep more points for accuracy
    // Keep every 2nd point instead of every 3rd for better visualization
    const simplifiedCoords: [number, number][] = [];
    coords.forEach((coord: number[], index: number) => {
      if (index === 0 || index === coords.length - 1 || index % 2 === 0) {
        simplifiedCoords.push([coord[1], coord[0]]);
      }
    });
    
    return {
      station,
      distance: summary.distance, // meters
      duration: summary.duration, // seconds
      geometry: simplifiedCoords
    };
  } catch (error) {
    console.error('Failed to fetch walking route:', error);
    return null;
  }
};
// Find nearest station by walking time
export const findNearestByWalking = async (
  lat: number,
  lng: number
): Promise<WalkingRoute | null> => {
  const closestStations = findClosestStations(lat, lng, 3);
  
  try {
    const routePromises = closestStations.map(station => 
      fetchWalkingRoute(lat, lng, station)
    );
    
    const routes = await Promise.all(routePromises);
    const validRoutes = routes.filter((r): r is WalkingRoute => r !== null);
    
    if (validRoutes.length === 0) {
      console.warn('No valid routes found, using fallback');
      // Fallback to straight-line calculation
      return createFallbackRoute(lat, lng, closestStations[0]);
    }
    
    // Sort by walking duration and return the shortest
    validRoutes.sort((a, b) => a.duration - b.duration);
    return validRoutes[0];
  } catch (error) {
    console.error('Walking route API failed, using fallback:', error);
    return createFallbackRoute(lat, lng, closestStations[0]);
  }
};

// Create fallback route using grid-based path approximation
const createFallbackRoute = (lat: number, lng: number, station: Station): WalkingRoute => {
  const straightLineDistance = getHaversineDistance(lat, lng, station.coordinates[0], station.coordinates[1]);
  // Walking distance is typically 1.4-1.8x straight line due to roads in urban areas
  // Using 1.6x for a more moderate estimate
  const estimatedWalkingDistance = straightLineDistance * 1.6;
  const estimatedDuration = estimateWalkingTime(estimatedWalkingDistance);
  
  // Create a simple grid-based path that simulates street navigation
  // Just 3 waypoints: start -> midpoint -> end
  const latDiff = station.coordinates[0] - lat;
  const lngDiff = station.coordinates[1] - lng;
  const midLat = lat + latDiff * 0.5;
  const midLng = lng + lngDiff * 0.5;
  
  const geometry: [number, number][] = [
    [lat, lng],           // Start point (user location)
    [midLat, midLng],     // Midpoint for slight deviation
    station.coordinates   // End at station
  ];
  
  return {
    station,
    distance: estimatedWalkingDistance,
    duration: estimatedDuration,
    geometry
  };
};
