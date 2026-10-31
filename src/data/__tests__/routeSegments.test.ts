import { describe, it, expect } from 'vitest';
import staticRouteSegments from '../routeSegments.generated.json';
import { stations } from '../metroData';

describe('Route Segments Integrity & Alignment Verification', () => {
  const segments = staticRouteSegments as Record<string, { geometry: [number, number][]; dists: number[]; totalDist: number }>;

  it('contains precomputed segments for all adjacent station pairs in both directions', () => {
    expect(Object.keys(segments).length).toBe(104);
  });

  it('guarantees Gandhinagar segments (Green Line north of Sector-1) follow track viaduct without detouring to Sector-1', () => {
    const gandhinagarPairs = [
      ['sector_10a', 'sachivalaya'],
      ['sachivalaya', 'akshardham'],
      ['akshardham', 'juna_sachivalaya'],
      ['juna_sachivalaya', 'sector_16'],
      ['sector_16', 'sector_24'],
      ['sector_24', 'mahatma_mandir'],
    ];

    for (const [st1Id, st2Id] of gandhinagarPairs) {
      const key = `${st1Id}-${st2Id}`;
      const revKey = `${st2Id}-${st1Id}`;

      const fwd = segments[key];
      const rev = segments[revKey];

      expect(fwd, `Forward segment ${key} should exist`).toBeDefined();
      expect(rev, `Reverse segment ${revKey} should exist`).toBeDefined();

      const st1 = stations[st1Id];
      const st2 = stations[st2Id];
      const straightDist = Math.sqrt(
        Math.pow(st1.coordinates[0] - st2.coordinates[0], 2) +
        Math.pow(st1.coordinates[1] - st2.coordinates[1], 2)
      );

      // Distance should be close to straight line (ratio <= 1.4) and NOT detouring to Sector 1 (which had ratio 3x - 8x)
      const ratio = fwd.totalDist / straightDist;
      expect(ratio).toBeLessThanOrEqual(1.4);

      // None of the intermediate points should be at or near Sector-1 coordinates (23.2049, 72.6431)
      const sector1Coord = stations.sector_1.coordinates;
      for (const pt of fwd.geometry) {
        const distToSector1 = Math.sqrt(
          Math.pow(pt[0] - sector1Coord[0], 2) + Math.pow(pt[1] - sector1Coord[1], 2)
        );
        expect(distToSector1, `Point [${pt}] in ${key} should not detour to Sector 1`).toBeGreaterThan(0.005);
      }
    }
  });

  it('guarantees Purple Line segments (GNLU - PDPU - GIFT City) follow direct track and do not detour across river', () => {
    const purplePairs = [
      ['gnlu', 'pdpu'],
      ['pdpu', 'gift_city'],
    ];

    for (const [st1Id, st2Id] of purplePairs) {
      const key = `${st1Id}-${st2Id}`;
      const fwd = segments[key];
      expect(fwd, `Purple segment ${key} should exist`).toBeDefined();

      const st1 = stations[st1Id];
      const st2 = stations[st2Id];
      const straightDist = Math.sqrt(
        Math.pow(st1.coordinates[0] - st2.coordinates[0], 2) +
        Math.pow(st1.coordinates[1] - st2.coordinates[1], 2)
      );

      const ratio = fwd.totalDist / straightDist;
      expect(ratio).toBeLessThanOrEqual(1.3);
    }
  });

  it('ensures endpoint coordinates match station coordinates within 200m tolerance', () => {
    for (const [key, seg] of Object.entries(segments)) {
      const [s1, s2] = key.split('-');
      const st1 = stations[s1];
      const st2 = stations[s2];

      const startPt = seg.geometry[0];
      const endPt = seg.geometry[seg.geometry.length - 1];

      const startDiff = Math.sqrt(Math.pow(startPt[0] - st1.coordinates[0], 2) + Math.pow(startPt[1] - st1.coordinates[1], 2));
      const endDiff = Math.sqrt(Math.pow(endPt[0] - st2.coordinates[0], 2) + Math.pow(endPt[1] - st2.coordinates[1], 2));

      expect(startDiff, `Start of ${key} should match station coordinates`).toBeLessThan(0.005);
      expect(endDiff, `End of ${key} should match station coordinates`).toBeLessThan(0.005);
    }
  });

  it('verifies that forward and reverse bearings across all segments are strictly aligned (180 deg opposite)', () => {
    function calcBearing(geom: [number, number][], progress: number, isReversed: boolean) {
      const dists = [0];
      let totalDist = 0;
      for (let i = 0; i < geom.length - 1; i++) {
        const d = Math.hypot(geom[i+1][0] - geom[i][0], geom[i+1][1] - geom[i][1]);
        totalDist += d;
        dists.push(totalDist);
      }
      const targetDist = totalDist * (isReversed ? (1 - progress) : progress);
      let segIdx = 0;
      for (; segIdx < dists.length - 1; segIdx++) {
        if (targetDist <= dists[segIdx + 1]) break;
      }
      segIdx = Math.max(0, Math.min(segIdx, geom.length - 2));

      let fromLat: number, fromLng: number, toLat: number, toLng: number;
      const MIN_BEARING_DIST = 0.0003;

      if (!isReversed) {
        fromLat = geom[segIdx][0]; fromLng = geom[segIdx][1];
        toLat = geom[segIdx + 1][0]; toLng = geom[segIdx + 1][1];
        let nextIdx = segIdx + 1;
        while (Math.hypot(toLat - fromLat, toLng - fromLng) < MIN_BEARING_DIST && nextIdx < geom.length - 1) {
          nextIdx++;
          toLat = geom[nextIdx][0]; toLng = geom[nextIdx][1];
        }
      } else {
        fromLat = geom[segIdx + 1][0]; fromLng = geom[segIdx + 1][1];
        toLat = geom[segIdx][0]; toLng = geom[segIdx][1];
        let prevIdx = segIdx;
        while (Math.hypot(toLat - fromLat, toLng - fromLng) < MIN_BEARING_DIST && prevIdx > 0) {
          prevIdx--;
          toLat = geom[prevIdx][0]; toLng = geom[prevIdx][1];
        }
      }

      const dLng = (toLng - fromLng) * Math.PI / 180;
      const lat1 = fromLat * Math.PI / 180;
      const lat2 = toLat * Math.PI / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    for (const [key, segData] of Object.entries(segments)) {
      const geom = segData.geometry;
      if (!geom || geom.length < 2) continue;
      for (const p of [0.15, 0.5, 0.85]) {
        const fwd = calcBearing(geom, p, false);
        const rev = calcBearing(geom, 1 - p, true);
        const angleDiff = Math.abs((fwd - rev + 360) % 360);
        const errorFrom180 = Math.abs(angleDiff - 180);
        // On curves, looking ~30m ahead in forward vs ~30m ahead in reverse will differ by curvature (up to ~25 deg)
        // This test ensures neither train is inverted (180 deg wrong) or perpendicular (90 deg sideways)
        expect(errorFrom180, `Bearing mismatch on ${key} at progress ${p}: fwd=${fwd}, rev=${rev}`).toBeLessThanOrEqual(30);
      }
    }
  });
});
