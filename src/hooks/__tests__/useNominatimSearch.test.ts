import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNominatimSearch } from '../useNominatimSearch';

describe('fetchNominatimSearch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

    await fetchNominatimSearch('Kalupur Ahmedabad');

    expect(global.fetch).toHaveBeenCalledWith('/api/nominatim?q=Kalupur%20Ahmedabad');
  });

  it('handles 429 rate limit gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
    } as Response);

    const results = await fetchNominatimSearch('Thaltej');
    expect(results).toEqual([]);
  });

  it('handles network failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const results = await fetchNominatimSearch('Thaltej');
    expect(results).toEqual([]);
  });

  it('returns empty array when response is not ok (e.g. 500 error)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    } as Response);

    const results = await fetchNominatimSearch('Old High Court');
    expect(results).toEqual([]);
  });

  it('returns empty array when content-type is non-JSON (e.g. HTML error page)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null,
      },
      json: async () => '<html>Error</html>',
    } as unknown as Response);

    const results = await fetchNominatimSearch('Vastral');
    expect(results).toEqual([]);
  });

  it('returns empty array when returned JSON data is not an array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ error: 'unexpected format' }),
    } as unknown as Response);

    const results = await fetchNominatimSearch('Sabarmati');
    expect(results).toEqual([]);
  });
});
