import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2, MapPin, Train, Building2, Landmark, Clock } from 'lucide-react';
import { stations } from '@/data/metroData';

const RECENT_SEARCHES_KEY = 'metro_recent_searches';
const MAX_RECENT_SEARCHES = 3;

interface RecentSearch {
  name: string;
  lat: number;
  lng: number;
  type: 'station' | 'place' | 'landmark' | 'address';
}

const getRecentSearches = (): RecentSearch[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (search: RecentSearch) => {
  try {
    const recent = getRecentSearches();
    // Remove duplicate if exists
    const filtered = recent.filter(r => r.name.toLowerCase() !== search.name.toLowerCase());
    // Add new search at start, keep only MAX
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

interface SearchResult {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: 'station' | 'place' | 'landmark' | 'address';
  importance?: number;
}

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onStationSelect?: (stationId: string) => void;
}

// Search cache to reduce API calls
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Convert metro stations to search results
const getMetroStationResults = (): SearchResult[] => {
  return Object.values(stations).map(station => ({
    id: station.id,
    name: station.name,
    description: `Metro Station • ${station.lines.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')} Line`,
    lat: station.coordinates[0],
    lng: station.coordinates[1],
    type: 'station' as const,
    importance: station.isInterchange ? 100 : 90
  }));
};

// ORS Pelias API search
const searchPelias = async (query: string): Promise<SearchResult[]> => {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;

  if (!apiKey) {
    console.warn('ORS API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      text: query,
      'boundary.circle.lat': '23.0225',
      'boundary.circle.lon': '72.5714',
      'boundary.circle.radius': '20',
      size: '8'
    });

    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?${params}`,
      {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pelias API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.features || []).map((f: { properties?: Record<string, string | number | boolean | undefined>; geometry?: { coordinates: [number, number] } }, i: number) => {
      const props = f.properties || {};
      const name = props.name || props.label || 'Unknown';

      // Build description from available fields
      const parts = [props.locality, props.neighbourhood, props.county].filter(Boolean);
      const description = parts.length > 0 ? parts.join(', ') : props.region || 'Ahmedabad';

      // Determine type based on layer/category
      let type: SearchResult['type'] = 'place';
      const layer = (props.layer || '') as string;
      if (['venue', 'address', 'street'].includes(layer)) {
        type = layer === 'address' || layer === 'street' ? 'address' : 'landmark';
      }

      // Calculate importance based on confidence and layer
      const confidence = (props.confidence as number) || 0.5;
      const layerScore = layer === 'venue' ? 10 : layer === 'locality' ? 8 : layer === 'neighbourhood' ? 6 : 4;
      const importance = Math.round(confidence * 10 + layerScore);

      return {
        id: `pelias_${i}_${props.id || ''}`,
        name,
        description,
        lat: f.geometry?.coordinates[1] || 0,
        lng: f.geometry?.coordinates[0] || 0,
        type,
        importance
      };
    });
  } catch (error) {
    console.error('Pelias search failed:', error);
    return [];
  }
};

// Nominatim fallback search
const searchNominatim = async (query: string): Promise<SearchResult[]> => {
  try {
    const params = new URLSearchParams({
      q: `${query}, Ahmedabad, Gujarat, India`,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      viewbox: '72.35,22.85,72.85,23.25',
      bounded: '1'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AhmedabadMetroApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: { name?: string; display_name: string; osm_id?: number; address?: Record<string, string>; lat?: string; lon?: string; importance?: number }, i: number) => {
      const name = item.name || item.display_name.split(',')[0];
      const address = item.address || {};
      const parts = [address.suburb, address.city_district, address.city].filter(Boolean);
      const description = parts.length > 0 ? parts.join(', ') : 'Ahmedabad';

      return {
        id: `nominatim_${i}_${item.osm_id || ''}`,
        name,
        description,
        lat: item.lat ? parseFloat(item.lat) : 0,
        lng: item.lon ? parseFloat(item.lon) : 0,
        type: 'place' as const,
        importance: Math.round(((item.importance || 0.3) as number) * 10)
      };
    });
  } catch (error) {
    console.error('Nominatim search failed:', error);
    return [];
  }
};

export const SearchBar = ({ onLocationSelect, onStationSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const metroStations = getMetroStationResults();

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();

    // Check cache first
    const cached = searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setResults(cached.results);
      setShowResults(true);
      return;
    }

    setIsLoading(true);

    try {
      // Find matching metro stations (always prioritized)
      const matchingStations = metroStations.filter(station =>
        station.name.toLowerCase().includes(normalizedQuery)
      ).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      // Search Pelias API
      const peliasResults = await searchPelias(searchQuery);

      // Fallback to Nominatim if Pelias returns fewer than 3 results
      let nominatimResults: SearchResult[] = [];
      if (peliasResults.length < 3) {
        nominatimResults = await searchNominatim(searchQuery);
      }

      // Merge results with deduplication (by name + type to allow same-name places)
      const mergedResults: SearchResult[] = [];
      const seenKeys = new Set<string>();

      // Add matching metro stations first (highest priority)
      for (const station of matchingStations.slice(0, 3)) {
        const key = `${station.name.toLowerCase()}|${station.type}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          mergedResults.push(station);
        }
      }

      // Add Pelias results (allow same name if different type)
      for (const result of peliasResults) {
        const key = `${result.name.toLowerCase()}|${result.type}`;
        if (!seenKeys.has(key) && mergedResults.length < 10) {
          seenKeys.add(key);
          mergedResults.push(result);
        }
      }

      // Add Nominatim results (fallback)
      for (const result of nominatimResults) {
        const key = `${result.name.toLowerCase()}|${result.type}`;
        if (!seenKeys.has(key) && mergedResults.length < 10) {
          seenKeys.add(key);
          mergedResults.push(result);
        }
      }

      // Sort non-station results by importance
      const stations = mergedResults.filter(r => r.type === 'station');
      const others = mergedResults.filter(r => r.type !== 'station')
        .sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const finalResults = [...stations, ...others].slice(0, 8);

      // Cache results
      searchCache.set(normalizedQuery, {
        results: finalResults,
        timestamp: Date.now()
      });

      setResults(finalResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to metro stations only
      const localResults = metroStations.filter(station =>
        station.name.toLowerCase().includes(normalizedQuery)
      ).slice(0, 5);
      setResults(localResults);
      setShowResults(true);
    } finally {
      setIsLoading(false);
    }
  }, [metroStations]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 350); // 350ms debounce

    return () => clearTimeout(debounceTimeout);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    saveRecentSearch({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      type: result.type
    });
    setRecentSearches(getRecentSearches());

    // For metro stations, use station select handler if available
    if (result.type === 'station' && onStationSelect) {
      onStationSelect(result.id);
    } else {
      onLocationSelect(result.lat, result.lng, result.name);
    }

    setQuery(result.name);
    setShowResults(false);
    setShowRecent(false);
  };

  const handleRecentSelect = (recent: RecentSearch) => {
    // For metro stations, use station select handler if available
    if (recent.type === 'station' && onStationSelect) {
      // Find station ID from name
      const stationEntry = Object.entries(stations).find(
        ([_, s]) => s.name.toLowerCase() === recent.name.toLowerCase()
      );
      if (stationEntry) {
        onStationSelect(stationEntry[0]);
        setQuery(recent.name);
        setShowRecent(false);
        return;
      }
    }

    onLocationSelect(recent.lat, recent.lng, recent.name);
    setQuery(recent.name);
    setShowRecent(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setShowRecent(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (results.length > 0) {
      setShowResults(true);
    } else if (query.length === 0 && recentSearches.length > 0) {
      setShowRecent(true);
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'station':
        return <Train className="w-4 h-4 text-primary" />;
      case 'landmark':
        return <Landmark className="w-4 h-4 text-amber-500" />;
      case 'address':
        return <Building2 className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MapPin className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'station':
        return 'Metro Station';
      case 'landmark':
        return 'Landmark';
      case 'address':
        return 'Address';
      default:
        return 'Place';
    }
  };

  return (
    <div ref={containerRef} className="fixed top-4 left-4 right-4 z-[1001] max-w-md mx-auto pointer-events-none safe-m-top">
      <div className="relative pointer-events-auto">
        <div className="flex items-center bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden">
          <Search className="w-5 h-5 text-muted-foreground ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowRecent(false);
            }}
            onFocus={handleFocus}
            placeholder="Search stations, places, landmarks..."
            className="flex-1 px-3 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-muted-foreground mr-2 animate-spin" />}
          {query && !isLoading && (
            <button
              onClick={clearSearch}
              className="p-2 mr-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Recent searches dropdown */}
        {showRecent && recentSearches.length > 0 && !query && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border">
              Recent Searches
            </div>
            {recentSearches.map((recent, index) => (
              <button
                key={`${recent.name}-${index}`}
                onClick={() => handleRecentSelect(recent)}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex items-center gap-3"
              >
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{recent.name}</p>
                </div>
                {getIcon(recent.type)}
              </button>
            ))}
          </div>
        )}

        {/* Results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden max-h-80 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex items-start gap-3"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{result.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                      {getTypeLabel(result.type)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
