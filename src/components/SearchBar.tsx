import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Loader2, MapPin, Train, Building2, Landmark, Clock, SearchX, Sparkles } from 'lucide-react';
import { stations } from '@/data/metroData';
import { popularPlaces, getPlaceLabel } from '@/data/popularPlaces';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStationName, Language } from '@/lib/i18n';
import { findNearestByWalking } from '@/lib/walkingRoute';
import { fetchNominatimSearch } from '@/hooks/useNominatimSearch';
import { parseSearchIntent, findNearestStationSync, scoreSearchMatch } from '@/lib/searchUtils';

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
    const filtered = recent.filter(r => r.name.toLowerCase() !== search.name.toLowerCase());
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
  isNearestRecommendation?: boolean;
}

// Find nearest station helper using synchronous searchUtils
const findNearestStation = (lat: number, lng: number) => {
  const nearest = findNearestStationSync(lat, lng);
  return { id: nearest.id, name: nearest.name, distance: nearest.distanceKm };
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

// Curated popular places — with synchronous nearest station resolution pre-calculated
const getPopularPlaceResults = (language: string): SearchResult[] => {
  return popularPlaces.map((p, i) => {
    const isLandmark = ['monument', 'temple', 'mosque', 'museum', 'exhibition', 'college', 'government', 'park'].includes(p.t);
    const nearest = findNearestStationSync(p.c[0], p.c[1], p.s);
    return {
      id: `pop_${i}`,
      name: p.n,
      description: getPlaceLabel(p.t, language === 'gu' || language === 'hi' ? language : 'en'),
      lat: p.c[0],
      lng: p.c[1],
      type: isLandmark ? ('landmark' as const) : ('place' as const),
      importance: 60,
      nearestStationId: nearest.id,
      nearestStationName: nearest.name,
      nearestStationDist: nearest.distanceKm,
    };
  });
};

const matchPopularPlaces = (
  popular: SearchResult[],
  cleanedQuery: string,
  tokens: string[]
): { result: SearchResult; score: number }[] => {
  if (!cleanedQuery && tokens.length === 0) return [];
  const matches: { result: SearchResult; score: number }[] = [];

  popular.forEach((p, i) => {
    const orig = popularPlaces[i];
    const aliases = [orig.k, orig.t];
    const score = scoreSearchMatch(p.name, aliases, tokens, cleanedQuery);
    if (score > 0) {
      matches.push({ result: p, score });
    }
  });

  return matches.sort((a, b) => b.score - a.score);
};

// ORS Pelias API search (via serverless proxy — key stays server-side)
const searchPelias = async (query: string, signal?: AbortSignal): Promise<SearchResult[]> => {
  try {
    const params = new URLSearchParams({ text: query });
    const response = await fetch(`/api/geocode?${params}`, {
      signal: signal ?? AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Pelias API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.features || []).map((f: { properties?: Record<string, string | number | boolean | undefined>; geometry?: { coordinates: [number, number] } }, i: number) => {
      const props = f.properties || {};
      const name = (props.name || props.label || 'Unknown') as string;

      const parts = [props.locality, props.neighbourhood, props.county].filter(Boolean);
      const description = parts.length > 0 ? parts.join(', ') : ((props.region as string) || 'Ahmedabad');

      let type: SearchResult['type'] = 'place';
      const layer = (props.layer || '') as string;
      if (['venue', 'address', 'street'].includes(layer)) {
        type = layer === 'address' || layer === 'street' ? 'address' : 'landmark';
      }

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
const searchNominatim = async (query: string, signal?: AbortSignal): Promise<SearchResult[]> => {
  try {
    const data = await fetchNominatimSearch(query, signal);

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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectedRef = useRef(false);
  const activeSearchIdRef = useRef(0);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(!navigator.onLine);
  const { language } = useLanguage();

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results, showResults, showRecent]);

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

  const metroStations = useMemo(() => getMetroStationResults(language), [language]);
  const popularResults = useMemo(() => getPopularPlaceResults(language), [language]);

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
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const { isNearestIntent, cleanedQuery, tokens } = parseSearchIntent(searchQuery);

    if (cleanedQuery.length < 2 && tokens.length === 0) {
      setResults([]);
      return;
    }

    if (isSelectedRef.current) {
      isSelectedRef.current = false;
      return;
    }

    const searchId = ++activeSearchIdRef.current;
    const cacheKey = `${language}:${isNearestIntent ? 'nearest:' : ''}${cleanedQuery}`;

    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setResults(cached.results);
      setShowResults(true);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Find matching metro stations using multi-token score matching
      const scoredStations: { result: SearchResult; score: number }[] = [];
      for (const station of metroStations) {
        const origStation = stations[station.id];
        const aliases = [
          origStation?.nameGu,
          origStation?.nameHi,
          ...(origStation?.aliases || []),
          origStation?.id,
        ];
        const score = scoreSearchMatch(station.name, aliases, tokens, cleanedQuery);
        if (score > 0) {
          scoredStations.push({
            result: station,
            score: score + (station.importance || 0),
          });
        }
      }
      scoredStations.sort((a, b) => b.score - a.score);
      const matchingStations = scoredStations.map(s => s.result);

      // 2. Curated popular places — instant local match with pre-computed nearest stations
      const scoredPopular = matchPopularPlaces(popularResults, cleanedQuery, tokens);
      const matchingPopular = scoredPopular.map(s => s.result);

      // 3. If user asked with "nearest" intent and a place matches, generate a prioritized station recommendation
      let recommendationResult: SearchResult | null = null;
      if (isNearestIntent && matchingPopular.length > 0) {
        const topPlace = matchingPopular[0];
        if (topPlace.nearestStationId && stations[topPlace.nearestStationId]) {
          const stn = stations[topPlace.nearestStationId];
          const stnName = getStationName(stn, language);
          const distStr = topPlace.nearestStationDist !== undefined
            ? ` (${topPlace.nearestStationDist.toFixed(1)} km)`
            : '';
          recommendationResult = {
            id: `rec_station_${stn.id}`,
            name: stnName,
            description: `${t('search.nearestMetroFor', language)} ${topPlace.name}${distStr}`,
            lat: stn.coordinates[0],
            lng: stn.coordinates[1],
            type: 'station',
            importance: 250,
            nearestStationId: stn.id,
            nearestStationName: stnName,
            nearestStationDist: topPlace.nearestStationDist,
            isNearestRecommendation: true,
          };
        }
      }

      // Show instant results immediately while API calls execute
      const instantList: SearchResult[] = [];
      if (recommendationResult) {
        instantList.push(recommendationResult);
      }
      instantList.push(...matchingStations.slice(0, 3));
      instantList.push(...matchingPopular);

      if (instantList.length > 0) {
        setResults(instantList.slice(0, 8));
        setShowResults(true);
      }

      // 4. Query Pelias API using the stripped cleanedQuery (free of conversational filler)
      const peliasResults = await searchPelias(cleanedQuery, abortController.signal);
      if (searchId !== activeSearchIdRef.current) return;

      // 5. Fallback to Nominatim if Pelias returns fewer than 3 results
      let nominatimResults: SearchResult[] = [];
      if (peliasResults.length < 3) {
        nominatimResults = await searchNominatim(cleanedQuery, abortController.signal);
      }
      if (searchId !== activeSearchIdRef.current) return;

      // Merge and deduplicate results
      const mergedResults: SearchResult[] = [];
      const seenKeys = new Set<string>();

      if (recommendationResult) {
        seenKeys.add(`${recommendationResult.name.toLowerCase()}|station`);
        mergedResults.push(recommendationResult);
      }

      for (const station of matchingStations.slice(0, 3)) {
        const key = `${station.name.toLowerCase()}|${station.type}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          mergedResults.push(station);
        }
      }

      for (const place of matchingPopular) {
        const key = `${place.name.toLowerCase()}|${place.type}`;
        if (!seenKeys.has(key) && mergedResults.length < 10) {
          seenKeys.add(key);
          mergedResults.push(place);
        }
      }

      for (const result of peliasResults) {
        const key = `${result.name.toLowerCase()}|${result.type}`;
        if (!seenKeys.has(key) && mergedResults.length < 10) {
          seenKeys.add(key);
          mergedResults.push(result);
        }
      }

      for (const result of nominatimResults) {
        const key = `${result.name.toLowerCase()}|${result.type}`;
        if (!seenKeys.has(key) && mergedResults.length < 10) {
          seenKeys.add(key);
          mergedResults.push(result);
        }
      }

      // Offline GeoJSON fallback if APIs found nothing and no popular places matched
      if (peliasResults.length === 0 && nominatimResults.length === 0 && matchingPopular.length === 0) {
        try {
          const { localPlaces } = await import('../data/localPlaces');
          if (searchId !== activeSearchIdRef.current) return;
          const localMatches = localPlaces.filter((place: { n: string; t: string; c: number[] }) => 
            place.n.toLowerCase().includes(cleanedQuery)
          ).slice(0, 5);
          
          for (const [i, place] of localMatches.entries()) {
            const nearest = findNearestStationSync(place.c[0], place.c[1]);
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
              nearestStationId: nearest.id,
              nearestStationName: nearest.name,
              nearestStationDist: nearest.distanceKm
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

      const stationsList = mergedResults.filter(r => r.type === 'station');
      const others = mergedResults.filter(r => r.type !== 'station')
        .sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const finalResults = [...stationsList, ...others].slice(0, 8);

      // Fetch actual walking distance for top 3 non-curated API results if needed
      let apiCallCount = 0;
      const resultsWithRealNearest = await Promise.all(finalResults.map(async (result) => {
        if (result.type === 'station') return result;
        if (result.id.startsWith('pop_')) return result; // Curated places already have exact distances
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

      searchCache.set(cacheKey, {
        results: resultsWithRealNearest,
        timestamp: Date.now()
      });

      if (searchId !== activeSearchIdRef.current) return;

      setResults(resultsWithRealNearest);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      if (searchId !== activeSearchIdRef.current) return;
      const scoredPopular = matchPopularPlaces(popularResults, cleanedQuery, tokens);
      const localResults = [
        ...metroStations.filter(station =>
          station.name.toLowerCase().includes(cleanedQuery)
        ).slice(0, 3),
        ...scoredPopular.map(s => s.result),
      ].slice(0, 8);
      setResults(localResults);
      setShowResults(true);
    } finally {
      if (searchId === activeSearchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [metroStations, popularResults, language]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 350);

    return () => clearTimeout(debounceTimeout);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    activeSearchIdRef.current++;
    
    saveRecentSearch({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      type: result.type
    });
    setRecentSearches(getRecentSearches());

    if (result.type === 'station' && onStationSelect) {
      const targetStationId = result.nearestStationId || (result.id.startsWith('rec_station_') ? result.id.replace('rec_station_', '') : result.id);
      onStationSelect(targetStationId);
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
    activeSearchIdRef.current++;
    
    if (recent.type === 'station' && onStationSelect) {
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

  const getIcon = (result: SearchResult) => {
    if (result.isNearestRecommendation) {
      return <Sparkles className="w-4 h-4 text-primary animate-pulse" />;
    }
    switch (result.type) {
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

  const getTypeLabel = (result: SearchResult) => {
    if (result.isNearestRecommendation) {
      return t('search.recommendedStation', language);
    }
    switch (result.type) {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowResults(false);
      setShowRecent(false);
      inputRef.current?.blur();
      return;
    }

    const currentListLength = showResults ? results.length : (showRecent ? recentSearches.length : 0);
    if (currentListLength === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % currentListLength);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? currentListLength - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < currentListLength) {
        e.preventDefault();
        if (showResults) {
          handleSelect(results[selectedIndex]);
        } else if (showRecent) {
          handleRecentSelect(recentSearches[selectedIndex]);
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={cn(
      "fixed left-4 right-16 sm:right-4 z-[1001] max-w-md sm:mx-auto pointer-events-none safe-m-top transition-all duration-300",
      isOfflineExpanded ? "top-12" : "top-4"
    )}>
      <div 
        className="relative pointer-events-auto"
        role="combobox"
        aria-expanded={showResults || showRecent}
        aria-haspopup="listbox"
      >
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
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={t('search.placeholder', language)}
            enterKeyHint="search"
            aria-autocomplete="list"
            aria-controls="search-results-list"
            aria-activedescendant={selectedIndex >= 0 ? `search-item-${selectedIndex}` : undefined}
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
          <div 
            id="search-results-list"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden"
          >
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium border-b border-border">
              {t('search.recentSearches', language)}
            </div>
            {recentSearches.map((recent, index) => (
              <button
                key={`${recent.name}-${index}`}
                id={`search-item-${index}`}
                role="option"
                aria-selected={selectedIndex === index}
                onClick={() => handleRecentSelect(recent)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors border-b border-border last:border-0 flex items-center gap-3",
                  selectedIndex === index ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                )}
              >
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{recent.name}</p>
                </div>
                {recent.type === 'station' ? (
                  <Train className="w-4 h-4 text-primary" />
                ) : recent.type === 'landmark' ? (
                  <Landmark className="w-4 h-4 text-amber-500" />
                ) : recent.type === 'address' ? (
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results dropdown */}
        {showResults && (results.length > 0 || isLoading) && (
          <div 
            id="search-results-list"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-background/70 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden max-h-80 overflow-y-auto"
          >
            {results.map((result, index) => (
              <button
                key={result.id}
                id={`search-item-${index}`}
                role="option"
                aria-selected={selectedIndex === index}
                onClick={() => handleSelect(result)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors border-b border-border last:border-0 flex items-start gap-3",
                  selectedIndex === index ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                  result.isNearestRecommendation && "bg-primary/5 hover:bg-primary/10 border-primary/20"
                )}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(result)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      result.isNearestRecommendation && "font-semibold text-primary"
                    )}>
                      {result.name}
                    </p>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded flex-shrink-0",
                      result.isNearestRecommendation 
                        ? "bg-primary/20 text-primary font-semibold"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getTypeLabel(result)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                  {result.nearestStationName && !result.isNearestRecommendation && (
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
