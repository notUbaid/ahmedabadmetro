import { useState, useCallback, useRef } from 'react';

export interface NominatimItem {
  name?: string;
  display_name: string;
  osm_id?: number;
  address?: Record<string, string>;
  lat?: string;
  lon?: string;
  importance?: number;
}

const nominatimCache = new Map<string, NominatimItem[]>();

/**
 * Executes a geocoding search via the server-side proxy endpoint (/api/nominatim)
 * with in-memory & sessionStorage caching and AbortSignal support.
 */
export const fetchNominatimSearch = async (
  query: string,
  signal?: AbortSignal
): Promise<NominatimItem[]> => {
  const trimmed = query?.trim();
  if (!trimmed) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  if (nominatimCache.has(cacheKey)) {
    return nominatimCache.get(cacheKey)!;
  }

  // Check sessionStorage cache
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem(`nom_${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        nominatimCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage read failures
  }

  try {
    const q = cacheKey.includes('ahmedabad') ? trimmed : `${trimmed} Ahmedabad`;
    const proxyUrl = `/api/nominatim?q=${encodeURIComponent(q)}`;

    const response = signal ? await fetch(proxyUrl, { signal }) : await fetch(proxyUrl);

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

    nominatimCache.set(cacheKey, data);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`nom_${cacheKey}`, JSON.stringify(data));
      }
    } catch {
      // Ignore storage write failures
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }
    console.error('Nominatim search failed:', error);
    return [];
  }
};

/**
 * Custom React hook for performing Nominatim searches with cancellation of in-flight requests.
 */
export const useNominatimSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string): Promise<NominatimItem[]> => {
    // Abort previous in-flight request if user is still typing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const results = await fetchNominatimSearch(query, controller.signal);
      return results;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return [];
      }
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
