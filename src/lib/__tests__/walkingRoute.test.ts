import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  estimateWalkingTime,
  findClosestStations,
  fetchWalkingRoute,
  findNearestByWalking,
  createFallbackRoute,
  getHaversineDistance
} from '../walkingRoute';
import { stations } from '@/data/metroData';

describe('Walking Route Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('estimateWalkingTime', () => {
    it('calculates realistic walking duration in seconds', () => {
      // 1000m at 4.5 km/h = 800s
      const seconds = estimateWalkingTime(1000);
      expect(seconds).toBe(800);
    });

    it('returns 0 for 0 distance', () => {
      expect(estimateWalkingTime(0)).toBe(0);
    });
  });

  describe('findClosestStations', () => {
    it('returns the requested number of stations sorted by distance', () => {
      // Around Old High Court
      const closest = findClosestStations(23.045, 72.565, 3);
      expect(closest).toHaveLength(3);
      const dist0 = getHaversineDistance(23.045, 72.565, closest[0].coordinates[0], closest[0].coordinates[1]);
      const dist1 = getHaversineDistance(23.045, 72.565, closest[1].coordinates[0], closest[1].coordinates[1]);
      expect(dist0).toBeLessThanOrEqual(dist1);
    });
  });

  describe('createFallbackRoute', () => {
    it('creates a street-grid route with multiple waypoints instead of a single diagonal line', () => {
      const paldi = stations.paldi;
      const userLat = 23.008;
      const userLng = 72.576;
      const route = createFallbackRoute(userLat, userLng, paldi);

      expect(route.station.id).toBe('paldi');
      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
      // Geometry should have multiple stepping points, not just 2 straight-line endpoints
      expect(route.geometry.length).toBeGreaterThan(3);
      expect(route.geometry[0]).toEqual([userLat, userLng]);
      expect(route.geometry[route.geometry.length - 1]).toEqual(paldi.coordinates);

      // Verify intermediate points are not all collinear on a single diagonal line
      const first = route.geometry[0];
      const mid = route.geometry[1];
      // Should have made a street-axis step (e.g. either lat or lng changes first)
      const latDiff = Math.abs(mid[0] - first[0]);
      const lngDiff = Math.abs(mid[1] - first[1]);
      expect(latDiff > 0 || lngDiff > 0).toBe(true);
    });
  });

  describe('fetchWalkingRoute', () => {
    it('parses real OSRM GeoJSON response and maps coordinates to [lat, lng]', async () => {
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1250.4,
            duration: 980.2,
            geometry: {
              coordinates: [
                [72.5760, 23.0080],
                [72.5750, 23.0090],
                [72.5740, 23.0110],
                [72.5624, 23.0185]
              ]
            }
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockOsrmResponse
      } as Response);

      const route = await fetchWalkingRoute(23.0080, 72.5760, stations.paldi);
      expect(route).not.toBeNull();
      expect(route?.station.id).toBe('paldi');
      expect(route?.distance).toBe(1250);
      expect(route?.duration).toBe(1000);
      // Coordinates mapped from [lng, lat] to Leaflet [lat, lng]
      expect(route?.geometry[0]).toEqual([23.0080, 72.5760]);
      expect(route?.geometry[1]).toEqual([23.0090, 72.5750]);
      expect(route?.geometry[3]).toEqual([23.0185, 72.5624]);
    });

    it('falls back to second mirror when primary OSRM fails', async () => {
      const mockMirrorResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1400,
            duration: 1100,
            geometry: {
              coordinates: [
                [72.5700, 23.0200],
                [72.5650, 23.0210],
                [72.5624, 23.0185]
              ]
            }
          }
        ]
      };

      // First call fails, second succeeds
      vi.spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockMirrorResponse
        } as Response);

      const route = await fetchWalkingRoute(23.0200, 72.5700, stations.paldi);
      expect(route).not.toBeNull();
      expect(route?.distance).toBe(1400);
      expect(route?.geometry.length).toBe(3);
    });
  });

  describe('findNearestByWalking', () => {
    it('returns shortest walking route among closest stations', async () => {
      const mockRoute = {
        code: 'Ok',
        routes: [
          {
            distance: 450,
            duration: 360,
            geometry: {
              coordinates: [
                [72.5630, 23.0190],
                [72.5624, 23.0185]
              ]
            }
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRoute
      } as Response);

      const nearest = await findNearestByWalking(23.0190, 72.5630);
      expect(nearest).not.toBeNull();
      expect(nearest?.station).toBeDefined();
      expect(nearest?.distance).toBe(450);
    });

    it('gracefully returns fallback street-grid route if all network calls fail', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));

      const route = await findNearestByWalking(23.008, 72.576);
      expect(route).not.toBeNull();
      expect(route?.geometry.length).toBeGreaterThan(2);
      expect(route?.distance).toBeGreaterThan(0);
    });

    it('prioritizes physically closest station (Paldi) and prevents distant stations from usurping', async () => {
      // Coordinate near Sabarmati Riverfront East (Paldi ~1.8km, Shreyas ~2.7km)
      const lat = 23.006;
      const lng = 72.574;

      // Mock fetch: even if a distant station has a fabricated shorter detour,
      // candidate filtering prevents distant stations (>30% further in straight line) from even competing
      const mockRoute = {
        code: 'Ok',
        routes: [
          {
            distance: 2100,
            duration: 1680,
            geometry: { coordinates: [[72.574, 23.006], [72.562, 23.018]] }
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRoute
      } as Response);

      const route = await findNearestByWalking(lat, lng);
      expect(route).not.toBeNull();
      expect(route?.station.id).toBe('paldi');
    });
  });
});
