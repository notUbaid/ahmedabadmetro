import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Loader2, MapPin, Train, Building2, Landmark, Clock, SearchX } from 'lucide-react';
import { stations } from '@/data/metroData';
import { popularPlaces, getPlaceLabel } from '@/data/popularPlaces';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStationName, Language } from '@/lib/i18n';
import { findNearestByWalking } from '@/lib/walkingRoute';
import { fetchNominatimSearch } from '@/hooks/useNominatimSearch';

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
  nearestStationId?: string;
  nearestStationName?: string;
  nearestStationDist?: number;
}

// Distance helper
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Find nearest station
const findNearestStation = (lat: number, lng: number) => {
  let nearestId = '';
  let nearestName = '';
  let minDistance = Infinity;
  
  Object.values(stations).forEach(station => {
    const dist = getDistance(lat, lng, station.coordinates[0], station.coordinates[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestId = station.id;
      nearestName = station.name;
    }
  });
  
  return { id: nearestId, name: nearestName, distance: minDistance };
};

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onStationSelect?: (stationId: string) => void;
}

// Search cache to reduce API calls
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Convert metro stations to search results
const getMetroStationResults = (language: Language): SearchResult[] => {
  return Object.values(stations).map(station => ({
    id: station.id,
    name: getStationName(station, language),
    description: `${t('search.metroStation', language)} • ${station.lines.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')} ${t('route.line', language)}`,
    lat: station.coordinates[0],
    lng: station.coordinates[1],
    type: 'station' as const,
    importance: station.isInterchange ? 100 : 90
  }));
};

// Curated popular places — always searched locally, no API needed.
const getPopularPlaceResults = (language: string): SearchResult[] => {
  return popularPlaces.map((p, i) => {
    const isLandmark = ['monument', 'temple', 'mosque', 'museum'].includes(p.t);
    return {
      id: `pop_${i}`,
      name: p.n,
      description: getPlaceLabel(p.t, language === 'gu' || language === 'hi' ? language : 'en'),
      lat: p.c[0],
      lng: p.c[1],
      type: isLandmark ? ('landmark' as const) : ('place' as const),
      // Above API results (~≤20), below metro stations (90-100)
      importance: 45,
    };
  });
};

const matchPopularPlaces = (popular: SearchResult[], normalizedQuery: string): SearchResult[] =>
  popular
    .filter((p, i) => {
      const entry = popularPlaces[i];
      return p.name.toLowerCase().includes(normalizedQuery) || !!entry.k?.includes(normalizedQuery);
    })
    .sort((a, b) => a.name.toLowerCase().indexOf(normalizedQuery) - b.name.toLowerCase().indexOf(normalizedQuery))
    .slice(0, 5);

// ORS Pelias API search (via serverless proxy — key stays server-side)
const searchPelias = async (query: string): Promise<SearchResult[]> => {
  try {
    const params = new URLSearchParams({ text: query });

    const response = await fetch(`/api/ors-geocode?${params}`, {
      signal: AbortSignal.timeout(8000)
    });

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

      const lat = f.geometry?.coordinates[1] || 0;
      const lng = f.geometry?.coordinates[0] || 0;
      const nearest = findNearestStation(lat, lng);

      return {
        id: `pelias_${i}_${props.id || ''}`,
        name,
        description,
        lat,
        lng,
        type,
        importance,
        nearestStationId: nearest?.id,
        nearestStationName: nearest?.name,
        nearestStationDist: nearest?.distance
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
    const data = await fetchNominatimSearch(query);

    return data.map((item, i: number) => {
      const name = item.name || item.display_name.split(',')[0];
      const address = item.address || {};
      const parts = [address.suburb, address.city_district, address.city].filter(Boolean);
      const description = parts.length > 0 ? parts.join(', ') : 'Ahmedabad';

      const lat = item.lat ? parseFloat(item.lat) : 0;
      const lng = item.lon ? parseFloat(item.lon) : 0;
      const nearest = findNearestStation(lat, lng);

      return {
        id: `nominatim_${i}_${item.osm_id || ''}`,
        name,
        description,
        lat,
        lng,
        type: 'place' as const,
        importance: Math.round(((item.importance || 0.3) as number) * 10),
        nearestStationId: nearest.id,
        nearestStationName: nearest.name,
        nearestStationDist: nearest.distance
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
  const isSelectedRef = useRef(false);
  const activeSearchIdRef = useRef(0);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(!navigator.onLine);
  const { language } = useLanguage();

  useEffect(() => {
    let timeout: number | undefined;
    const handleOffline = () => {
      setIsOfflineExpanded(true);
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setIsOfflineExpanded(false), 3000);
    };
    const handleOnline = () => {
      setIsOfflineExpanded(true);
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setIsOfflineExpanded(false), 3000);
    };

    if (!navigator.onLine) {
      timeout = window.setTimeout(() => setIsOfflineExpanded(false), 3000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, []);

  // Stable identity per language — recreating this each render would give
  // performSearch a new identity and restart the debounce on every parent re-render.
  const metroStations = useMemo(() => getMetroStationResults(language), [language]);

  // Static curated data — computed once
  const popularResults = useMemo(() => getPopularPlaceResults(language), [language]);

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

    if (isSelectedRef.current) {
      isSelectedRef.current = false;
      return;
    }

    const searchId = ++activeSearchIdRef.current;

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
      const matchingStations = metroStations.filter(station => {
        const origStation = stations[station.id];
        return (
          station.name.toLowerCase().includes(normalizedQuery) ||
          origStation?.name?.toLowerCase().includes(normalizedQuery) ||
          (origStation?.nameGu && origStation.nameGu.includes(normalizedQuery)) ||
          (origStation?.nameHi && origStation.nameHi.includes(normalizedQuery)) ||
          origStation?.aliases?.some(a => a.toLowerCase().includes(normalizedQuery)) ||
          origStation?.id?.toLowerCase().includes(normalizedQuery)
        );
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      // Curated popular places — local match, no API needed
      const matchingPopular = matchPopularPlaces(popularResults, normalizedQuery);

      // Show instant results while APIs load
      if (matchingStations.length > 0 || matchingPopular.length > 0) {
        setResults([...matchingStations.slice(0, 3), ...matchingPopular].slice(0, 8));
        setShowResults(true);
      }

      // Search Pelias API
      const peliasResults = await searchPelias(searchQuery);
      
      if (searchId !== activeSearchIdRef.current) return;

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

      // Add curated popular places (rank above API noise via importance)
      for (const place of matchingPopular) {
        const key = `${place.name.toLowerCase()}|${place.type}`;
        if (!seenKeys.has(key) && mergedResults.length < 10) {
          seenKeys.add(key);
          mergedResults.push(place);
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

      // GeoJSON Offline Fallback (If APIs found absolutely nothing)
      if (peliasResults.length === 0 && nominatimResults.length === 0) {
        try {
          const { localPlaces } = await import('../data/localPlaces');
          if (searchId !== activeSearchIdRef.current) return;
          const localMatches = localPlaces.filter((place: { n: string, t: string, c: number[] }) => 
            place.n.toLowerCase().includes(normalizedQuery)
          ).slice(0, 5);
          
          for (const [i, place] of localMatches.entries()) {
            const nearest = findNearestStation(place.c[0], place.c[1]);
            
            const formattedType = place.t.replace(/_/g, ' ');
            const description = formattedType.charAt(0).toUpperCase() + formattedType.slice(1);
            
            const localResult: SearchResult = {
              id: `offline_${i}_${place.n.replace(/\s+/g, '')}`,
              name: place.n,
              description: `Local ${description}`,
              lat: place.c[0],
              lng: place.c[1],
              type: 'place',
              importance: 40,
              nearestStationId: nearest?.id,
              nearestStationName: nearest?.name,
              nearestStationDist: nearest?.distance
            };
            
            const key = `${localResult.name.toLowerCase()}|${localResult.type}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              mergedResults.push(localResult);
            }
          }
        } catch (e) {
          console.error("Failed to load offline fallback data", e);
        }
      }

      // Sort non-station results by importance
      const stations = mergedResults.filter(r => r.type === 'station');
      const others = mergedResults.filter(r => r.type !== 'station')
        .sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const finalResults = [...stations, ...others].slice(0, 8);

      // Fetch actual walking distance for top 3 non-station results to match map behavior
      let apiCallCount = 0;
      const resultsWithRealNearest = await Promise.all(finalResults.map(async (result) => {
        if (result.type === 'station') return result;
        if (apiCallCount >= 3) return result;
        apiCallCount++;
        
        try {
          const walkingRoute = await findNearestByWalking(result.lat, result.lng);
          if (walkingRoute) {
            return {
              ...result,
              nearestStationId: walkingRoute.station.id,
              nearestStationName: walkingRoute.station.name,
              nearestStationDist: walkingRoute.distance / 1000, 
            };
          }
        } catch (e) {
          console.error("Failed to fetch real nearest station for search result", e);
        }
        return result;
      }));

      // Cache results
      searchCache.set(normalizedQuery, {
        results: resultsWithRealNearest,
        timestamp: Date.now()
      });

      if (searchId !== activeSearchIdRef.current) return;

      setResults(resultsWithRealNearest);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      if (searchId !== activeSearchIdRef.current) return;
      // Fallback to local data only
      const matchingPopular = matchPopularPlaces(popularResults, normalizedQuery);
      const localResults = [
        ...metroStations.filter(station =>
          station.name.toLowerCase().includes(normalizedQuery)
        ).slice(0, 3),
        ...matchingPopular,
      ].slice(0, 8);
      setResults(localResults);
      setShowResults(true);
    } finally {
      if (searchId === activeSearchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [metroStations, popularResults]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 350); // 350ms debounce

    return () => clearTimeout(debounceTimeout);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    activeSearchIdRef.current++; // Cancel any in-flight searches
    
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

    isSelectedRef.current = true;
    setQuery(result.name);
    setShowResults(false);
    setShowRecent(false);
    inputRef.current?.blur();
  };

  const handleRecentSelect = (recent: RecentSearch) => {
    activeSearchIdRef.current++; // Cancel any in-flight searches
    
    // For metro stations, use station select handler if available
    if (recent.type === 'station' && onStationSelect) {
      // Find station ID from name
      const stationEntry = Object.entries(stations).find(
        ([_, s]) => getStationName(s, language).toLowerCase() === recent.name.toLowerCase() || s.name.toLowerCase() === recent.name.toLowerCase()
      );
      if (stationEntry) {
        onStationSelect(stationEntry[0]);
        isSelectedRef.current = true;
        setQuery(recent.name);
        setShowRecent(false);
        inputRef.current?.blur();
        return;
      }
    }

    onLocationSelect(recent.lat, recent.lng, recent.name);
    isSelectedRef.current = true;
    setQuery(recent.name);
    setShowRecent(false);
    inputRef.current?.blur();
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
        return t('search.metroStation', language);
      case 'landmark':
        return t('search.landmark', language);
      case 'address':
        return t('search.address', language);
      default:
        return t('search.place', language);
    }
  };

  return (
    <div ref={containerRef} className={cn(
      "fixed left-4 right-4 z-[1001] max-w-md mx-auto pointer-events-none safe-m-top transition-all duration-300",
      isOfflineExpanded ? "top-12" : "top-4"
    )}>
      <div className="relative pointer-events-auto">
        <div className="flex items-center bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden">
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
            placeholder={t('search.placeholder', language)}
            enterKeyHint="search"
            className="flex-1 px-3 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-muted-foreground mr-2 animate-spin" />}
          {query && !isLoading && (
            <button
              onClick={clearSearch}
              className="p-2 mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Recent searches dropdown */}
        {showRecent && recentSearches.length > 0 && !query && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border">
              {t('search.recentSearches', language)}
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
        {showResults && (results.length > 0 || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden max-h-80 overflow-y-auto">
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
                  {result.nearestStationName && (
                    <p className="text-[10px] text-primary font-bold mt-1 flex items-center gap-1.5 bg-primary/5 w-max px-1.5 py-0.5 rounded border border-primary/10">
                      <Train className="w-3 h-3" /> {t('search.nearestMetro', language)}: {result.nearestStationName} ({(result.nearestStationDist || 0).toFixed(1)} km)
                    </p>
                  )}
                </div>
              </button>
            ))}

            {/* Skeleton Loading State */}
            {isLoading && (
              <div className="p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 px-2 py-3 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <SearchX className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t('search.noPlacesFound', language)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('search.tryDifferent', language)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
