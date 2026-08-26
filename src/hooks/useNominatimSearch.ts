import { useState, useCallback } from 'react';

export interface NominatimItem {
  name?: string;
  display_name: string;
  osm_id?: number;
  address?: Record<string, string>;
  lat?: string;
  lon?: string;
  importance?: number;
}

/**
 * Executes a geocoding search via the server-side proxy endpoint (/api/nominatim)
 * to comply with OpenStreetMap Nominatim usage policies (User-Agent, rate limiting, headers).
 */
export const fetchNominatimSearch = async (query: string): Promise<NominatimItem[]> => {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const q = query.toLowerCase().includes('ahmedabad') ? query : `${query} Ahmedabad`;
    const proxyUrl = `/api/nominatim?q=${encodeURIComponent(q)}`;

    const response = await fetch(proxyUrl);

    if (response.status === 429) {
      console.warn('Nominatim rate limit exceeded');
      return [];
    }

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status}`);
      return [];
    }

    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data;
  } catch (error) {
    console.error('Nominatim search failed:', error);
    return [];
  }
};

/**
 * Custom React hook for performing Nominatim searches with state management.
 */
export const useNominatimSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<NominatimItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await fetchNominatimSearch(query);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nominatim search failed';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    search,
    isLoading,
    error,
  };
};
