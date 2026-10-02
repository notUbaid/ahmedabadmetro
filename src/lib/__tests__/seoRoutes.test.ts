import { describe, it, expect } from 'vitest';
import { stations } from '../../data/metroData';
import {
  stationToSlug,
  slugToStationId,
  getStationFromSlug,
  routeToSlug,
  parseRouteSlug,
  METRO_LINES,
  slugToLineKey,
} from '../seoRoutes';

describe('SEO & SSG Route Engine (Gate 1)', () => {
  it('bidirectionally resolves all 53 stations to slugs and back', () => {
    const stationIds = Object.keys(stations);
    expect(stationIds.length).toBe(53);

    for (const id of stationIds) {
      const slug = stationToSlug(id);
      expect(slug).toBeTruthy();
      expect(slug).not.toContain('_');

      const resolvedId = slugToStationId(slug);
      expect(resolvedId).toBe(id);

      const st = getStationFromSlug(slug);
      expect(st).toBeDefined();
      expect(st?.id).toBe(id);
    }
  });

  it('handles custom overrides for stadium', () => {
    expect(stationToSlug('stadium')).toBe('sp-stadium');
    expect(slugToStationId('sp-stadium')).toBe('stadium');
    expect(slugToStationId('stadium')).toBe('stadium');
  });

  it('parses route slugs accurately', () => {
    const routeSlug = routeToSlug('kalupur', 'motera_stadium');
    expect(routeSlug).toBe('kalupur-to-motera-stadium');

    const parsed = parseRouteSlug(routeSlug);
    expect(parsed).toEqual({
      fromId: 'kalupur',
      toId: 'motera_stadium',
    });
  });

  it('returns null for invalid route slugs', () => {
    expect(parseRouteSlug('')).toBeNull();
    expect(parseRouteSlug('kalupur')).toBeNull();
    expect(parseRouteSlug('kalupur-to-kalupur')).toBeNull();
    expect(parseRouteSlug('unknown-to-motera-stadium')).toBeNull();
  });

  it('maps metro lines correctly', () => {
    expect(slugToLineKey('blue-line')).toBe('blue');
    expect(slugToLineKey('red')).toBe('red');
    expect(slugToLineKey('green-line')).toBe('green');
    expect(slugToLineKey('purple-line')).toBe('purple');
    expect(slugToLineKey('yellow')).toBeNull();

    expect(Object.keys(METRO_LINES).length).toBe(4);
    expect(METRO_LINES.blue.stationCount).toBe(18);
    expect(METRO_LINES.red.stationCount).toBe(14);
    expect(METRO_LINES.green.stationCount).toBe(19);
    expect(METRO_LINES.purple.stationCount).toBe(3);
  });
});
