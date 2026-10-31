import { describe, it, expect } from 'vitest';
import { parseSearchIntent, scoreSearchMatch, matchCuratedPlaces, findNearestStationSync } from '@/lib/searchUtils';
import { popularPlaces } from '@/data/popularPlaces';
import { stations } from '@/data/metroData';

describe('Search Intent & Landmark Matching Suite', () => {
  describe('parseSearchIntent', () => {
    it('detects conversational nearest prefixes in English', () => {
      const cases = [
        { input: 'nearest of helipad exhibition', expectedClean: 'helipad exhibition' },
        { input: 'nearest to iit gandhinagar', expectedClean: 'iit gandhinagar' },
        { input: 'nearest station to helipad exhibition', expectedClean: 'helipad exhibition' },
        { input: 'nearest metro of dandi kutir', expectedClean: 'dandi kutir' },
        { input: 'closest station to infocity', expectedClean: 'infocity' },
        { input: 'closest metro to da-iict', expectedClean: 'da-iict' },
        { input: 'metro near swarnim sankul', expectedClean: 'swarnim sankul' },
        { input: 'station near nift gandhinagar', expectedClean: 'nift gandhinagar' },
        { input: 'near iit gandhinagar', expectedClean: 'iit gandhinagar' },
        { input: 'how to reach mahatma mandir', expectedClean: 'mahatma mandir' },
      ];

      for (const c of cases) {
        const intent = parseSearchIntent(c.input);
        expect(intent.isNearestIntent).toBe(true);
        expect(intent.cleanedQuery).toBe(c.expectedClean);
      }
    });

    it('detects conversational nearest suffixes in English', () => {
      const cases = [
        { input: 'helipad exhibition nearest', expectedClean: 'helipad exhibition' },
        { input: 'iit gandhinagar nearest metro', expectedClean: 'iit gandhinagar' },
        { input: 'dandi kutir closest station', expectedClean: 'dandi kutir' },
        { input: 'swarnim sankul near', expectedClean: 'swarnim sankul' },
      ];

      for (const c of cases) {
        const intent = parseSearchIntent(c.input);
        expect(intent.isNearestIntent).toBe(true);
        expect(intent.cleanedQuery).toBe(c.expectedClean);
      }
    });

    it('detects Gujarati and Hindi nearest intent', () => {
      const gu = parseSearchIntent('હેલિપેડ એક્ઝિબિશન પાસેનું સ્ટેશન');
      expect(gu.isNearestIntent).toBe(true);
      expect(gu.cleanedQuery).toBe('હેલિપેડ એક્ઝિબિશન');

      const hi = parseSearchIntent('आईआईटी गांधीनगर के पास की मेट्रो');
      expect(hi.isNearestIntent).toBe(true);
      expect(hi.cleanedQuery).toBe('आईआईटी गांधीनगर');
    });

    it('preserves clean search terms when no nearest intent is present', () => {
      const res = parseSearchIntent('helipad exhibition');
      expect(res.isNearestIntent).toBe(false);
      expect(res.cleanedQuery).toBe('helipad exhibition');
      expect(res.tokens).toEqual(['helipad', 'exhibition']);
    });
  });

  describe('Curated Landmark & Institute Matching', () => {
    it('matches The Helipad Exhibition Centre and resolves nearest metro to Mahatma Mandir', () => {
      const intent = parseSearchIntent('nearest of helipad exhibition');
      const matches = matchCuratedPlaces(popularPlaces, intent.cleanedQuery, intent.tokens);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].place.n).toContain('Helipad Exhibition');
      expect(matches[0].nearestStationId).toBe('mahatma_mandir');
      expect(matches[0].nearestStationDist).toBeLessThan(2.0); // ~1.8 km
    });

    it('matches IIT Gandhinagar and resolves nearest metro to GNLU', () => {
      const intent = parseSearchIntent('nearest to iit gandhinagar');
      const matches = matchCuratedPlaces(popularPlaces, intent.cleanedQuery, intent.tokens);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].place.n).toContain('IIT Gandhinagar');
      expect(matches[0].nearestStationId).toBe('gnlu');
    });

    it('matches DA-IICT and TCS Garima Park to Infocity', () => {
      const daiict = parseSearchIntent('daiict');
      const m1 = matchCuratedPlaces(popularPlaces, daiict.cleanedQuery, daiict.tokens);
      expect(m1.length).toBeGreaterThan(0);
      expect(m1[0].place.n).toContain('DA-IICT');
      expect(m1[0].nearestStationId).toBe('infocity');

      const tcs = parseSearchIntent('tcs garima park');
      const m2 = matchCuratedPlaces(popularPlaces, tcs.cleanedQuery, tcs.tokens);
      expect(m2.length).toBeGreaterThan(0);
      expect(m2[0].place.n).toContain('TCS Garima Park');
      expect(m2[0].nearestStationId).toBe('infocity');
    });

    it('matches out-of-order search tokens seamlessly', () => {
      const intent = parseSearchIntent('exhibition helipad');
      const matches = matchCuratedPlaces(popularPlaces, intent.cleanedQuery, intent.tokens);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].place.n).toContain('Helipad Exhibition');
    });
  });

  describe('scoreSearchMatch Multi-Token Scoring', () => {
    it('ranks exact matches higher than prefix or substring matches', () => {
      const exactScore = scoreSearchMatch('Mahatma Mandir', [], ['mahatma', 'mandir'], 'mahatma mandir');
      const prefixScore = scoreSearchMatch('Mahatma Mandir', [], ['mahatma'], 'mahatma');
      const partialScore = scoreSearchMatch('Mahatma Mandir', [], ['mandir'], 'mandir');

      expect(exactScore).toBeGreaterThan(prefixScore);
      expect(prefixScore).toBeGreaterThan(partialScore);
    });

    it('matches across station aliases seamlessly', () => {
      const score = scoreSearchMatch(
        'Mahatma Mandir',
        ['Dandi Kutir', 'Helipad Exhibition Centre'],
        ['helipad', 'exhibition'],
        'helipad exhibition'
      );
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Offline Nearest Station Resolution', () => {
    it('computes nearest station accurately for Gandhinagar landmarks', () => {
      // Swarnim Sankul (CM Office) with designated station
      const swarnim = findNearestStationSync(23.2240, 72.6570, 'sachivalaya');
      expect(swarnim.id).toBe('sachivalaya');

      // GIFT Diamond Tower -> GIFT City
      const gift = findNearestStationSync(23.1590, 72.6860);
      expect(gift.id).toBe('gift_city');

      // Narendra Modi Stadium -> Motera Stadium
      const motera = findNearestStationSync(23.0920, 72.5975);
      expect(motera.id).toBe('motera_stadium');
    });
  });
});
