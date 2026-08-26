import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNominatimSearch } from '../useNominatimSearch';

describe('useNominatimSearch & fetchNominatimSearch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('fetchNominatimSearch', () => {
    it('returns empty array for empty query', async () => {
      const results = await fetchNominatimSearch('');
      expect(results).toEqual([]);
    });

    it('fetches from /api/nominatim with encoded query containing Ahmedabad', async () => {
      const mockData = [
        { display_name: 'Paldi, Ahmedabad', lat: '23.01', lon: '72.56' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response);

      const results = await fetchNominatimSearch('Paldi');

      expect(global.fetch).toHaveBeenCalledWith('/api/nominatim?q=Paldi%20Ahmedabad');
      expect(results).toEqual(mockData);
    });

    it('does not duplicate Ahmedabad if already present in query', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);

      await fetchNominatimSearch('Paldi Ahmedabad');
      expect(global.fetch).toHaveBeenCalledWith('/api/nominatim?q=Paldi%20Ahmedabad');
    });

    it('handles 429 rate limit gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      } as Response);

      const results = await fetchNominatimSearch('Thaltej');
      expect(results).toEqual([]);
    });

    it('handles network failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const results = await fetchNominatimSearch('Thaltej');
      expect(results).toEqual([]);
    });
  });
});
