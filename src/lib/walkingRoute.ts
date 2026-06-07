import { Station, stations } from '@/data/metroData';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || '';

// Warn if API key is missing
if (!ORS_API_KEY) {
  console.warn('VITE_ORS_API_KEY not set. Using fallback walking route estimation. Please set the environment variable for accurate routing.');
}

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
    const apiKey = ORS_API_KEY;
    
    // Always use the API proxy to avoid CORS issues
    // The proxy will use the server-side ORS_API_KEY on production
    // For local dev, we'll add the API key as a query parameter that gets passed through
    let orsUrl: string;
    
    if (apiKey) {
      // Send API key to proxy, proxy will use it if available
      console.log('Using API proxy with client API key');
      orsUrl = `/api/walking-route?startLng=${userLng}&startLat=${userLat}&endLng=${station.coordinates[1]}&endLat=${station.coordinates[0]}&apiKey=${encodeURIComponent(apiKey)}`;
    } else {
      // No client API key, rely on server-side key
      console.log('Using API proxy with server-side API key');
      orsUrl = `/api/walking-route?startLng=${userLng}&startLat=${userLat}&endLng=${station.coordinates[1]}&endLat=${station.coordinates[0]}`;
    }
    
    const response = await fetch(orsUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ORS API error:', response.status, errorData);
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
    
    console.log('Walking route fetched successfully:', {
      distance: summary.distance,
      duration: summary.duration,
      points: simplifiedCoords.length
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
  
  console.log('Finding nearest station by walking from:', { lat, lng });
  console.log('Closest stations by distance:', closestStations.map(s => ({ id: s.id, name: s.name })));
  
  try {
    const routePromises = closestStations.map(station => 
      fetchWalkingRoute(lat, lng, station)
    );
    
    const routes = await Promise.all(routePromises);
    console.log('Walking routes fetched:', routes.map(r => r ? { 
      station: r.station.name, 
      distance: r.distance, 
      duration: r.duration,
      geometryPoints: r.geometry.length 
    } : null));
    
    const validRoutes = routes.filter((r): r is WalkingRoute => r !== null);
    
    if (validRoutes.length === 0) {
      console.warn('No valid routes found, using fallback');
      // Fallback to straight-line calculation
      return createFallbackRoute(lat, lng, closestStations[0]);
    }
    
    // Sort by walking duration and return the shortest
    validRoutes.sort((a, b) => a.duration - b.duration);
    console.log('Selected best route:', { 
      station: validRoutes[0].station.name, 
      distance: validRoutes[0].distance,
      duration: validRoutes[0].duration,
      geometryPoints: validRoutes[0].geometry.length
    });
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
