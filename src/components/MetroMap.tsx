import { X, Route, Share2, ArrowRight, Train, Clock, MapPin, Check, Users } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stations, LINE_COLORS, Station } from '@/data/metroData';
import { getCurrentTrainPositions, trainSchedules, lineStations, TrainPosition } from '@/data/timetable';
import { findNearestByWalking, findClosestStations, getHaversineDistance, estimateWalkingTime } from '@/lib/walkingRoute';
import { planRouteWithDeparture, PlannedRoute } from '@/lib/routePlanner';
import { slugToStationId, parseRouteSlug } from '@/lib/seoRoutes';
import { getCrowdLevel } from '@/lib/crowding';
import { getCommuteSettings, shouldShowCommuteCard, markCommuteCardShown } from '@/lib/commuteStorage';
import staticRouteSegments from '@/data/routeSegments.generated.json';
import { cn } from '@/lib/utils';
import SearchBar from './SearchBar';
import BottomPanel from './BottomPanel';
import RoutePlanner from './RoutePlanner';
import { FriendsJourneyViewer } from './FriendsJourneyViewer';
import SideMenu from './SideMenu';
import { JoinRideDialog } from './JoinRideDialog';
import { CommuteCard } from './CommuteCard';
import { TrainDetailsDialog } from './TrainDetailsDialog';
import { LiveTrainTrackingDialog } from './LiveTrainTrackingDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStationName } from '@/lib/i18n';
import { track } from '@vercel/analytics';

const CENTER: [number, number] = [23.0700, 72.5900];
const DEFAULT_ZOOM = 12;

const getStationColor = (station: Station): string => {
  if (station.isInterchange) return '#FFFFFF';
  return LINE_COLORS[station.lines[0]];
};

const getStationBorderColor = (station: Station): string => {
  if (station.isInterchange) return '#1F2937';
  return LINE_COLORS[station.lines[0]];
};

const LINE_TRAIN_THEMES: Record<string, { lineColor: string; accentColor: string; badgeColor: string }> = {
  blue: {
    lineColor: '#2563EB',
    accentColor: '#93C5FD',
    badgeColor: '#1D4ED8',
  },
  red: {
    lineColor: '#DC2626',
    accentColor: '#FCA5A5',
    badgeColor: '#B91C1C',
  },
  green: {
    lineColor: '#16A34A',
    accentColor: '#86EFAC',
    badgeColor: '#15803D',
  },
  purple: {
    lineColor: '#9333EA',
    accentColor: '#D8B4FE',
    badgeColor: '#7E22CE',
  },
};

const DEFAULT_TRAIN_THEME = {
  lineColor: '#2563EB',
  accentColor: '#93C5FD',
  badgeColor: '#1D4ED8',
};

export const MetroMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const nearestLineRef = useRef<L.Polyline | null>(null);
  const walkingRouteRef = useRef<L.Polyline | null>(null);
  const trainMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayersRef = useRef<L.Layer[]>([]);
  // Use a ref to store precise route segments between stations: "stationA-stationB" -> coordinates[]
  // Cache route geometry plus precomputed distances to avoid per-frame recomputation
  const routeSegmentsRef = useRef<Map<string, { geometry: [number, number][]; dists: number[]; totalDist: number }>>(
    new Map(Object.entries(staticRouteSegments as unknown as Record<string, { geometry: [number, number][]; dists: number[]; totalDist: number }>))
  );
  const latestPositionsRef = useRef<Map<string, TrainPosition>>(new Map());
  const stationLabelsRef = useRef<Map<string, L.Marker>>(new Map());
  const trainBearingsRef = useRef<Map<string, number>>(new Map());
  const trainRotatorsRef = useRef<Map<string, HTMLElement>>(new Map());
  const selectedTrainIdRef = useRef<string | null>(null);

  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<[number, number] | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [nearestStation, setNearestStation] = useState<Station | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [nearestWalkingTime, setNearestWalkingTime] = useState<number | null>(null);
  const searchedLocationMarkerRef = useRef<L.Marker | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const stationClickedRef = useRef(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [routePlannerDestination, setRoutePlannerDestination] = useState<string | undefined>(undefined);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null);
  const [activeTrainCount, setActiveTrainCount] = useState(0);
  const userPulseRef = useRef<L.CircleMarker | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const [friendsJourneyData, setFriendsJourneyData] = useState<{ origin: string; dest: string; depMins: number; segments: { trainId: string; stations: string[] }[] } | null>(null);
  const [isFriendsViewerOpen, setIsFriendsViewerOpen] = useState(false);
  const [isCoordinating, setIsCoordinating] = useState(false);
  const [routePlannerOrigin, setRoutePlannerOrigin] = useState<string | undefined>(undefined);

  // Join Ride Logic
  const [joinRide, setJoinRide] = useState<{ isOpen: boolean; trainId: string; destination?: string }>({
    isOpen: false,
    trainId: '',
  });

  // Train share popup state
  const [selectedTrain, setSelectedTrain] = useState<{
    id: string;
    line: string;
    destination: string;
    fromStationId: string;
    toStationId: string;
  } | null>(null);

  // Train dialogs state
  const [trainDetailsDialogOpen, setTrainDetailsDialogOpen] = useState(false);
  const [liveTrackingDialogOpen, setLiveTrackingDialogOpen] = useState(false);

  useEffect(() => {
    selectedTrainIdRef.current = selectedTrain?.id ?? null;
  }, [selectedTrain]);

  // Commute card state
  const [commuteCard, setCommuteCard] = useState<{
    show: boolean;
    direction: 'homeToWork' | 'workToHome';
    fromStation: Station;
    toStation: Station;
    walkingTime: number | null;
  } | null>(null);
  const commuteCardShownRef = useRef(false);
  const updateIdRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinTrainId = params.get('joinTrain');
    const dest = params.get('dest');

    // Shared Journey params
    const sharedOrig = params.get('orig');
    const sharedDest = params.get('dest');
    const depMinsStr = params.get('depMins');

    if (joinTrainId) {
      setJoinRide({
        isOpen: true,
        trainId: joinTrainId,
        destination: dest || undefined
      });
      // Clean URL (handled below)
    }

    if (sharedOrig && sharedDest && depMinsStr) {
      const depMins = parseFloat(depMinsStr);
      const route = planRouteWithDeparture(sharedOrig, sharedDest, depMins);
      if (route) {
        const segments = route.steps
          .filter(s => !!s.trainId)
          .map(s => ({
            trainId: s.trainId!,
            stations: s.allStations || []
          }));

        setFriendsJourneyData({
          origin: sharedOrig,
          dest: sharedDest,
          depMins,
          segments
        });
        setPlannedRoute(route);
        setIsFriendsViewerOpen(true);
        setIsPanelExpanded(false);
      }
    }

    // Support both clean SEO paths (/station/:slug, /route/:slug) and query params (?station=, ?from=&to=)
    const pathname = window.location.pathname.toLowerCase();
    let stationIdFromPath: string | null = null;
    let routeFromPath: { fromId: string; toId: string } | null = null;

    if (pathname.startsWith('/station/')) {
      const slug = pathname.replace(/^\/station\//, '').replace(/\/$/, '');
      stationIdFromPath = slugToStationId(slug);
    } else if (pathname.startsWith('/route/')) {
      const slug = pathname.replace(/^\/route\//, '').replace(/\/$/, '');
      routeFromPath = parseRouteSlug(slug);
    } else if (pathname === '/routes' || pathname === '/routes/' || pathname === '/route' || pathname === '/route/') {
      setIsRoutePlannerOpen(true);
      setIsPanelExpanded(false);
    } else if (pathname === '/stations' || pathname === '/stations/') {
      setIsPanelExpanded(true);
    } else if (pathname === '/interchange' || pathname === '/interchange/') {
      stationIdFromPath = 'old_high_court';
    } else if (pathname === '/airport' || pathname === '/airport/') {
      stationIdFromPath = 'koteshwar_road';
    }

    const routeFrom = routeFromPath ? routeFromPath.fromId : (params.get('from') || params.get('origin'));
    const routeTo = routeFromPath ? routeFromPath.toId : (params.get('to') || params.get('destination'));
    if (routeFrom && routeTo && stations[routeFrom] && stations[routeTo]) {
      setRoutePlannerOrigin(routeFrom);
      setRoutePlannerDestination(routeTo);
      setIsRoutePlannerOpen(true);
      setIsPanelExpanded(false);
    } else {
      const stationParam = stationIdFromPath || params.get('station') || params.get('st');
      if (stationParam && stations[stationParam]) {
        setSelectedStation(stations[stationParam]);
        setIsPanelExpanded(true);
      }
    }

    if (joinTrainId || (sharedOrig && sharedDest && depMinsStr)) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!selectedTrain) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTrain(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrain]);

  // Check if user is near commute stations and show card
  const checkCommuteCard = useCallback((lat: number, lng: number, walkingTime: number | null) => {
    if (commuteCardShownRef.current) return;
    
    const settings = getCommuteSettings();
    if (!settings || !settings.homeStation || !settings.workStation) return;

    const homeStation = stations[settings.homeStation];
    const workStation = stations[settings.workStation];
    if (!homeStation || !workStation) return;

    const userLoc = L.latLng(lat, lng);
    const homeLoc = L.latLng(homeStation.coordinates[0], homeStation.coordinates[1]);
    const workLoc = L.latLng(workStation.coordinates[0], workStation.coordinates[1]);

    const distToHome = userLoc.distanceTo(homeLoc);
    const distToWork = userLoc.distanceTo(workLoc);

    const nearestStations = findClosestStations(lat, lng, 1);
    const nearestId = nearestStations.length > 0 ? nearestStations[0].id : null;

    // Trigger threshold: 3.5 km from station (allows comfortable vicinity coverage)
    const MAX_COMMUTE_TRIGGER_DIST = 3500;  

    if (distToHome < distToWork && distToHome <= MAX_COMMUTE_TRIGGER_DIST) {
      if (shouldShowCommuteCard('homeToWork')) {
        markCommuteCardShown('homeToWork');
        commuteCardShownRef.current = true;
        const walkSeconds = walkingTime !== null && nearestId === settings.homeStation
          ? walkingTime
          : Math.round(distToHome / 1.2);

        setCommuteCard({
          show: true,
          direction: 'homeToWork',
          fromStation: homeStation,
          toStation: workStation,
          walkingTime: walkSeconds
        });
      }
    } else if (distToWork < distToHome && distToWork <= MAX_COMMUTE_TRIGGER_DIST) {
      if (shouldShowCommuteCard('workToHome')) {
        markCommuteCardShown('workToHome');
        commuteCardShownRef.current = true;
        const walkSeconds = walkingTime !== null && nearestId === settings.workStation
          ? walkingTime
          : Math.round(distToWork / 1.2);

        setCommuteCard({
          show: true,
          direction: 'workToHome',
          fromStation: workStation,
          toStation: homeStation,
          walkingTime: walkSeconds
        });
      }
    }
  }, []);

  // Update station labels when language changes
  useEffect(() => {
    stationLabelsRef.current.forEach((marker, stationId) => {
      const station = stations[stationId];
      if (station) {
        const isHub = station.isInterchange || ['apmc', 'thaltej_gam', 'vastral_gam', 'mahatma_mandir', 'gift_city', 'kalupur'].includes(station.id);
        const labelIcon = L.divIcon({
          className: `station-label ${isHub ? 'hub-label' : ''}`,
          html: `<div class="station-name ${station.isUnderground ? 'underground' : ''} ${station.isInterchange ? 'interchange' : ''}">${getStationName(station, language)}</div>`,
          iconSize: [100, 20],
          iconAnchor: [50, -8],
        });
        marker.setIcon(labelIcon);
      }
    });
  }, [language]);

  // Update nearest station with real walking route
  const updateNearestStation = useCallback(async (lat: number, lng: number) => {
    const currentUpdateId = ++updateIdRef.current;

    // Clear old walking route
    if (walkingRouteRef.current) {
      walkingRouteRef.current.remove();
      walkingRouteRef.current = null;
    }
    if (nearestLineRef.current) {
      nearestLineRef.current.remove();
      nearestLineRef.current = null;
    }

    // 1. Instant zero-latency nearest station calculation (straight-line)
    const closestStations = findClosestStations(lat, lng, 3);
    const primaryStation = closestStations[0];
    if (primaryStation) {
      const straightDist = getHaversineDistance(lat, lng, primaryStation.coordinates[0], primaryStation.coordinates[1]);
      const estimatedWalkingDist = straightDist * 1.6;
      setNearestStation(primaryStation);
      setNearestDistance(estimatedWalkingDist);
      setNearestWalkingTime(estimateWalkingTime(estimatedWalkingDist));
      setIsPanelExpanded(true);
    }

    // 2. Asynchronous walking route refinement
    const walkingRoute = await findNearestByWalking(lat, lng);

    // If a new update was triggered while we were waiting, ignore this one
    if (currentUpdateId !== updateIdRef.current) return;

    if (walkingRoute && mapRef.current) {
      setNearestStation(walkingRoute.station);
      setNearestDistance(walkingRoute.distance);
      setNearestWalkingTime(walkingRoute.duration);

      // Draw the walking route on the map only if user is within service area (<= 30km)
      if (walkingRoute.distance <= 30000) {
        walkingRouteRef.current = L.polyline(walkingRoute.geometry, {
          color: '#3B82F6',
          weight: 4.5,
          dashArray: '6, 8',
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(mapRef.current);

        // Check for commute card
        checkCommuteCard(lat, lng, walkingRoute.duration);
      }
    }
  }, [checkCommuteCard]);

  // Handle location update (from locate button)
  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    if (mapRef.current) {
      const isInsideServiceArea = lat >= 22.8 && lat <= 23.3 && lng >= 72.4 && lng <= 72.75;
      if (isInsideServiceArea) {
        mapRef.current.setView([lat, lng], 15);
      } else {
        // Outside Ahmedabad/Gandhinagar: preserve network view
        const allCoords = Object.values(stations).map(s => s.coordinates);
        if (allCoords.length > 0) {
          mapRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
        }
      }

      // Clear searched location if any
      if (searchedLocationMarkerRef.current) {
        searchedLocationMarkerRef.current.remove();
        searchedLocationMarkerRef.current = null;
      }
      setSearchedLocation(null);
      setUserLocation([lat, lng]);

      // Ensure user marker and pulse effect exist on map if in service area
      if (isInsideServiceArea) {
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
          if (userPulseRef.current) {
            userPulseRef.current.setLatLng([lat, lng]);
          }
        } else if (mapRef.current) {
          userMarkerRef.current = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#2563EB',
            color: '#FFFFFF',
            weight: 3,
            fillOpacity: 1,
          }).addTo(mapRef.current);

          userPulseRef.current = L.circleMarker([lat, lng], {
            radius: 22,
            fillColor: '#3B82F6',
            color: '#60A5FA',
            weight: 1,
            fillOpacity: 0.15,
            opacity: 0.35,
          }).addTo(mapRef.current);
        }
      }

      updateNearestStation(lat, lng);
      setSelectedStation(null);
      setIsPanelExpanded(true); // Show panel when located
    }
  }, [updateNearestStation]);

  // Handle location search result
  const handleLocationSelect = useCallback((lat: number, lng: number, _name: string) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);

      if (searchedLocationMarkerRef.current) {
        searchedLocationMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #EF4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        searchedLocationMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      }

      setSearchedLocation([lat, lng]);
      updateNearestStation(lat, lng);
      setSelectedStation(null);
      setIsPanelExpanded(true);
    }
  }, [updateNearestStation]);

  // Handle station selection from search
  const handleStationSelect = useCallback((stationId: string) => {
    const station = stations[stationId];
    if (station && mapRef.current) {
      setSelectedStation(station);
      setIsPanelExpanded(true);
      mapRef.current.setView(station.coordinates, 15);
      try {
        track('station_tap', { stationId: station.id, stationName: station.name, source: 'search' });
      } catch {
        // Ignore analytics in dev/offline
      }
    }
  }, []);

  // Draw route on map when plannedRoute changes
  const drawRouteOnMap = useCallback((route: PlannedRoute | null) => {
    // Clear existing route layers
    routeLayersRef.current.forEach(layer => layer.remove());
    routeLayersRef.current = [];

    if (!route || !mapRef.current) return;

    const map = mapRef.current;

    // Create a pane for route highlight if it doesn't exist
    if (!map.getPane('routeHighlight')) {
      map.createPane('routeHighlight');
      map.getPane('routeHighlight')!.style.zIndex = '445';
    }

    // Collect all coordinates for this route
    const allStationsInRoute: Station[] = [];

    // Extract stations from steps
    route.steps.forEach(step => {
      if (step.type === 'board' || step.type === 'interchange') {
        allStationsInRoute.push(step.station);
      }
      if (step.type === 'travel' && step.stations) {
        allStationsInRoute.push(...step.stations);
      }
      if (step.type === 'travel' || step.type === 'interchange' || step.type === 'alight' || step.type === 'bus') {
        allStationsInRoute.push(step.station);
      }
    });

    // Remove duplicates
    const seenStations = new Set<string>();
    const uniqueStations = allStationsInRoute.filter(s => {
      if (seenStations.has(s.id)) return false;
      seenStations.add(s.id);
      return true;
    });

    // Helper to get detailed curved track coordinates between two adjacent stations
    const getTrackCoordsBetween = (s1: Station, s2: Station): [number, number][] => {
      const segKey = `${s1.id}-${s2.id}`;
      const revKey = `${s2.id}-${s1.id}`;
      const segEntry = routeSegmentsRef.current.get(segKey);
      const revEntry = routeSegmentsRef.current.get(revKey);

      if (segEntry && segEntry.geometry.length > 0) {
        return segEntry.geometry;
      }
      if (revEntry && revEntry.geometry.length > 0) {
        return [...revEntry.geometry].reverse();
      }
      return [s1.coordinates, s2.coordinates];
    };

    // Draw segments with line colors
    let currentLine: keyof typeof LINE_COLORS | undefined;
    let currentBoardingStation: Station | null = null;
    let segmentCoords: [number, number][] = [];

    const appendTrackSection = (s1: Station, s2: Station) => {
      const trackPoints = getTrackCoordsBetween(s1, s2);
      trackPoints.forEach((pt, pIdx) => {
        if (pIdx === 0 && segmentCoords.length > 0) {
          const lastPt = segmentCoords[segmentCoords.length - 1];
          if (Math.abs(lastPt[0] - pt[0]) < 0.00001 && Math.abs(lastPt[1] - pt[1]) < 0.00001) {
            return;
          }
        }
        segmentCoords.push(pt);
      });
    };

    const flushSegment = () => {
      if (segmentCoords.length >= 2 && currentLine) {
        const lineColor = LINE_COLORS[currentLine] || '#DC2626';

        // Draw glow/outline
        const glow = L.polyline(segmentCoords, {
          pane: 'routeHighlight',
          color: '#FFFFFF',
          weight: 12,
          opacity: 0.6,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        routeLayersRef.current.push(glow);

        // Draw main line
        const line = L.polyline(segmentCoords, {
          pane: 'routeHighlight',
          color: lineColor,
          weight: 7,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        routeLayersRef.current.push(line);
      }
      segmentCoords = [];
    };

    // Build segments from steps
    route.steps.forEach((step) => {
      if (step.type === 'board') {
        currentLine = step.line;
        currentBoardingStation = step.station;
      } else if (step.type === 'travel') {
        const travelStationList = [
          ...(currentBoardingStation ? [currentBoardingStation] : []),
          ...(step.stations || []),
          step.station
        ];
        for (let i = 0; i < travelStationList.length - 1; i++) {
          appendTrackSection(travelStationList[i], travelStationList[i + 1]);
        }
        currentBoardingStation = step.station;
      } else if (step.type === 'interchange') {
        flushSegment();
        currentLine = step.line;
        currentBoardingStation = step.station;
      } else if (step.type === 'bus') {
        flushSegment();
        if (currentBoardingStation) {
          const busCoords = [currentBoardingStation.coordinates, step.station.coordinates];
          const busLine = L.polyline(busCoords, {
            pane: 'routeHighlight',
            color: '#10B981',
            weight: 5,
            dashArray: '8, 12',
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          routeLayersRef.current.push(busLine);
        }
        currentBoardingStation = step.station;
      } else if (step.type === 'alight') {
        flushSegment();
      }
    });

    // Draw origin marker
    const originIcon = L.divIcon({
      className: 'station-marker-container',
      html: `
        <div class="station-marker-rect" style="background-color: #22C55E; border-color: #166534; width: 20px; height: 20px; border-width: 2px;">
          <div class="w-full h-full flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-sm"></div>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    const originMarker = L.marker(route.origin.coordinates, {
      pane: 'routeHighlight',
      icon: originIcon,
      zIndexOffset: 100
    }).addTo(map);
    routeLayersRef.current.push(originMarker);

    // Draw destination marker
    const destIcon = L.divIcon({
      className: 'station-marker-container',
      html: `
        <div class="station-marker-rect" style="background-color: #EF4444; border-color: #991B1B; width: 20px; height: 20px; border-width: 2px;">
          <div class="w-full h-full flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-sm"></div>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    const destMarker = L.marker(route.destination.coordinates, {
      pane: 'routeHighlight',
      icon: destIcon,
      zIndexOffset: 100
    }).addTo(map);
    routeLayersRef.current.push(destMarker);

    // Draw interchange markers
    route.steps.forEach(step => {
      if (step.type === 'interchange') {
        const intIcon = L.divIcon({
          className: 'station-marker-container',
          html: `
            <div class="station-marker-rect interchange" style="width: 22px; height: 22px;">
              <div class="interchange-inner" style="background-color: #F59E0B; width: 14px; height: 14px;"></div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        const interchangeMarker = L.marker(step.station.coordinates, {
          pane: 'routeHighlight',
          icon: intIcon,
          zIndexOffset: 90
        }).addTo(map);
        routeLayersRef.current.push(interchangeMarker);
      }
    });

    // Fit map to show the route
    const bounds = L.latLngBounds(uniqueStations.map(s => s.coordinates));
    map.fitBounds(bounds, { padding: [80, 80] });
  }, []);

  // Update route visualization when plannedRoute changes
  useEffect(() => {
    drawRouteOnMap(plannedRoute);
  }, [plannedRoute, drawRouteOnMap]);

  // Handle route change from RoutePlanner
  const handleRouteChange = useCallback((route: PlannedRoute | null) => {
    setPlannedRoute(route);
  }, []);

  // Clear route when route planner is closed
  const handleCloseRoutePlanner = useCallback(() => {
    setIsRoutePlannerOpen(false);
    setPlannedRoute(null);
    setRoutePlannerDestination(undefined);
    setRoutePlannerOrigin(undefined);
    setIsCoordinating(false);
  }, []);

  // Handle plan route from station panel
  const handlePlanRouteFromStation = useCallback((stationId: string) => {
    if (nearestStation) {
      setRoutePlannerOrigin(nearestStation.id);
    }
    setRoutePlannerDestination(stationId);
    setIsRoutePlannerOpen(true);
  }, [nearestStation]);

  // Train animation - smooth real-time movement
  useEffect(() => {
    let animationFrameId: number;
    let lastTickAt = 0;
    let lastTrainCount = -1;

    const animateTrains = () => {
      // Trains move <0.5% of a segment per frame — recomputing positions at
      // 60-144 Hz wastes a full timetable scan per frame. Throttle to ~5 Hz.
      const now = Date.now();
      if (now - lastTickAt < 200) {
        animationFrameId = requestAnimationFrame(animateTrains);
        return;
      }
      lastTickAt = now;
      if (!mapRef.current) return;

      const positions = getCurrentTrainPositions();
      const existingIds = new Set(trainMarkersRef.current.keys());

      // Update latest positions ref
      latestPositionsRef.current.clear();
      positions.forEach(p => latestPositionsRef.current.set(p.id, p));

      // Update active train count and line counts only when count changes
      if (positions.length !== lastTrainCount) {
        lastTrainCount = positions.length;
        setActiveTrainCount(positions.length);
      }

      // Precalculate frame constants outside of the positions loop
      const currentZoom = mapRef.current?.getZoom() ?? DEFAULT_ZOOM;
      const zoomScale = currentZoom <= 12 ? 0.68 : currentZoom <= 14 ? 0.85 : 1.0;
      const activeSelectedId = selectedTrainIdRef.current;

      positions.forEach(pos => {
        // Calculate precise position using cached geometry
        let lat = 0, lng = 0;

        if (pos.status === 'stopped') {
          // If stopped, metro is exactly at the station
          const station = stations[pos.fromStationId];
          if (station) {
            lat = station.coordinates[0];
            lng = station.coordinates[1];
          }
        } else {
          // Moving Logic - use cached geometry entries (geometry + precomputed dists)
          const segmentKey = `${pos.fromStationId}-${pos.toStationId}`;
          const reverseKey = `${pos.toStationId}-${pos.fromStationId}`;
          const isReversed = !routeSegmentsRef.current.has(segmentKey) && routeSegmentsRef.current.has(reverseKey);
          const entry = routeSegmentsRef.current.get(segmentKey) || routeSegmentsRef.current.get(reverseKey);
          const progress = pos.progress;

          const fromStation = stations[pos.fromStationId];
          const toStation = stations[pos.toStationId];

          if (entry && entry.geometry && entry.geometry.length > 1) {
            const geometry = entry.geometry;
            const dists = entry.dists;
            const totalDist = entry.totalDist;

            // Quick sanity: ensure endpoints are near actual stations
            const startDist = fromStation ? Math.sqrt(Math.pow(geometry[0][0] - fromStation.coordinates[0], 2) + Math.pow(geometry[0][1] - fromStation.coordinates[1], 2)) : Infinity;
            const endDist = toStation ? Math.sqrt(Math.pow(geometry[geometry.length - 1][0] - toStation.coordinates[0], 2) + Math.pow(geometry[geometry.length - 1][1] - toStation.coordinates[1], 2)) : Infinity;
            if (startDist <= 0.01 && endDist <= 0.01 && totalDist > 0) {
              // If we are using the reverse geometry, progress should be flipped!
              const targetDist = totalDist * (isReversed ? (1 - progress) : progress);

              // Find segment index
              let i = 0;
              for (; i < dists.length - 1; i++) {
                if (targetDist <= dists[i + 1]) break;
              }

              const segLen = dists[i + 1] - dists[i] || 0;
              const segProgress = segLen > 0 ? (targetDist - dists[i]) / segLen : 0;

              lat = geometry[i][0] + (geometry[i + 1][0] - geometry[i][0]) * segProgress;
              lng = geometry[i][1] + (geometry[i + 1][1] - geometry[i][1]) * segProgress;

            } else {
              // Geometry unreliable; fallback to straight line
              lat = fromStation.coordinates[0] + (toStation.coordinates[0] - fromStation.coordinates[0]) * pos.progress;
              lng = fromStation.coordinates[1] + (toStation.coordinates[1] - fromStation.coordinates[1]) * pos.progress;
              pos._isGeometryUnreliable = true; // Flag for bearing calculation
            }
          } else if (fromStation && toStation) {
            // Fallback to straight line between stations
            lat = fromStation.coordinates[0] + (toStation.coordinates[0] - fromStation.coordinates[0]) * pos.progress;
            lng = fromStation.coordinates[1] + (toStation.coordinates[1] - fromStation.coordinates[1]) * pos.progress;
            pos._isGeometryUnreliable = true;
          }
        }

        if (lat === 0 && lng === 0) return; // Skip if invalid

        // Calculate bearing for train direction based on actual geometry
        let bearing = 0;
        
        // Try to get bearing from the geometry the metro is on (use cached entry)
        const segKey = `${pos.fromStationId}-${pos.toStationId}`;
        const revKey = `${pos.toStationId}-${pos.fromStationId}`;
        const bearingEntry = routeSegmentsRef.current.get(segKey) || routeSegmentsRef.current.get(revKey);
        
        // If geometry is missing or unreliable (e.g. disconnected station), fallback to straight line bearing
        if (bearingEntry && bearingEntry.geometry.length >= 2 && !pos._isGeometryUnreliable) {
          const geomForBearing = bearingEntry.geometry;
          const dists = bearingEntry.dists;
          const totalDist = bearingEntry.totalDist;
          const targetDist = totalDist * pos.progress;

          let segIdx = 0;
          for (; segIdx < dists.length - 1; segIdx++) {
            if (targetDist <= dists[segIdx + 1]) break;
          }

          let fromLat = geomForBearing[segIdx][0];
          let fromLng = geomForBearing[segIdx][1];
          let toLat = geomForBearing[segIdx + 1][0];
          let toLng = geomForBearing[segIdx + 1][1];

          // Look ahead to smooth out micro-segments (e.g. station perpendicular connecting to track)
          const MIN_BEARING_DIST = 0.0005; // ~50 meters
          let nextIdx = segIdx + 1;
          while (nextIdx < geomForBearing.length) {
            const d = Math.sqrt(Math.pow(geomForBearing[nextIdx][0] - fromLat, 2) + Math.pow(geomForBearing[nextIdx][1] - fromLng, 2));
            if (d >= MIN_BEARING_DIST || nextIdx === geomForBearing.length - 1) {
              toLat = geomForBearing[nextIdx][0];
              toLng = geomForBearing[nextIdx][1];
              break;
            }
            nextIdx++;
          }

          // If we reached the end and distance is still too short, look behind
          if (nextIdx === geomForBearing.length - 1 && Math.sqrt(Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2)) < MIN_BEARING_DIST) {
            let prevIdx = segIdx;
            while (prevIdx >= 0) {
              const d = Math.sqrt(Math.pow(geomForBearing[prevIdx][0] - toLat, 2) + Math.pow(geomForBearing[prevIdx][1] - toLng, 2));
              if (d >= MIN_BEARING_DIST || prevIdx === 0) {
                fromLat = geomForBearing[prevIdx][0];
                fromLng = geomForBearing[prevIdx][1];
                break;
              }
              prevIdx--;
            }
          }

          const dLng = (toLng - fromLng) * Math.PI / 180;
          const lat1 = fromLat * Math.PI / 180;
          const lat2 = toLat * Math.PI / 180;
          const y = Math.sin(dLng) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
          bearing = Math.atan2(y, x) * 180 / Math.PI;

          // If we are traversing the reverse geometry, flip the bearing 180 degrees!
          const isReversed = !routeSegmentsRef.current.has(segKey) && routeSegmentsRef.current.has(revKey);
          if (isReversed) {
            bearing = (bearing + 180) % 360;
          }
        } else {
          // Fallback to station-to-station bearing
          const fromStation = stations[pos.fromStationId];
          const toStation = stations[pos.toStationId];
          if (fromStation && toStation) {
            const [fromLat, fromLng] = fromStation.coordinates;
            const [toLat, toLng] = toStation.coordinates;
            const dLng = (toLng - fromLng) * Math.PI / 180;
            const lat1 = fromLat * Math.PI / 180;
            const lat2 = toLat * Math.PI / 180;
            const y = Math.sin(dLng) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
            bearing = Math.atan2(y, x) * 180 / Math.PI;
          }
        }

        // Shortest-arc angular smoothing (prevents 360-degree reverse spin when bearing crosses North)
        const prevBearing = trainBearingsRef.current.get(pos.id) ?? bearing;
        const diff = ((bearing - prevBearing + 540) % 360) - 180;
        const smoothBearing = prevBearing + diff;
        trainBearingsRef.current.set(pos.id, smoothBearing);

        // Check if marker already exists for fast path
        if (trainMarkersRef.current.has(pos.id)) {
          // FAST PATH: Marker already exists! Update coordinates & rotation without rebuilding DOM
          const marker = trainMarkersRef.current.get(pos.id)!;
          marker.setLatLng([lat, lng]);

          // Direct rotator transform update without querySelector
          const rotator = trainRotatorsRef.current.get(pos.id);
          if (rotator) {
            rotator.style.transform = `rotate(${smoothBearing - 90}deg) scale(${zoomScale})`;
          }

          // Direct marker element opacity/filter updates for selection
          const markerEl = marker.getElement();
          if (markerEl) {
            if (activeSelectedId === pos.id) {
              markerEl.classList.add('selected-train');
            } else {
              markerEl.classList.remove('selected-train');
            }
          }

          existingIds.delete(pos.id);
        } else {
          // SLOW PATH: First time this train appears
          const theme = LINE_TRAIN_THEMES[pos.line] || DEFAULT_TRAIN_THEME;

          const trainIconHtml = `
            <div class="train-marker-inner" style="position: relative; width: 68px; height: 24px; pointer-events: auto;">
              <!-- Rotating 3-Car Articulated EMU Trainset -->
              <div class="train-icon-wrapper" style="width: 68px; height: 24px; transform: rotate(${smoothBearing - 90}deg) scale(${zoomScale}); will-change: transform;">
                <svg width="68" height="24" viewBox="0 0 68 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="bodyGrad-${pos.id}" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#FFFFFF" />
                      <stop offset="35%" stop-color="#F8FAFC" />
                      <stop offset="70%" stop-color="#E2E8F0" />
                      <stop offset="100%" stop-color="#CBD5E1" />
                    </linearGradient>
                    <linearGradient id="roofGrad-${pos.id}" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
                      <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0.3" />
                    </linearGradient>
                    <linearGradient id="glassGrad-${pos.id}" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#0F172A" />
                      <stop offset="60%" stop-color="#1E293B" />
                      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.75" />
                    </linearGradient>
                  </defs>

                  <g>
                    <!-- Car 3: Rear Driving Motor Car -->
                    <path d="M 6.5 4.5 L 21 4.5 L 21 16.5 L 6.5 16.5 C 5 16.5 4 15 4 13.5 L 4 7.5 C 4 6 5 4.5 6.5 4.5 Z" fill="url(#bodyGrad-${pos.id})" stroke="#0F172A" stroke-width="0.8" />
                    <rect x="5.5" y="4.5" width="15.5" height="2" fill="url(#roofGrad-${pos.id})" />
                    <!-- Windows & Door Posts -->
                    <rect x="7" y="7.5" width="13" height="4.5" rx="0.5" fill="#0F172A" />
                    <rect x="7.8" y="8" width="4.8" height="3.5" rx="0.4" fill="#334155" />
                    <rect x="14.2" y="8" width="4.8" height="3.5" rx="0.4" fill="#334155" />
                    <line x1="13.5" y1="7.5" x2="13.5" y2="16.5" stroke="#94A3B8" stroke-width="0.5" opacity="0.6" />
                    <!-- Livery Striping -->
                    <line x1="4.8" y1="13.2" x2="21" y2="13.2" stroke="${theme.lineColor}" stroke-width="1.6" />
                    <line x1="6.5" y1="6.5" x2="21" y2="6.5" stroke="${theme.accentColor}" stroke-width="0.6" />
                    <!-- Rear Red Marker Taillights -->
                    <circle cx="4.6" cy="7.8" r="0.85" fill="#EF4444" />
                    <circle cx="4.6" cy="13.2" r="0.85" fill="#EF4444" />

                    <!-- Coupler / Gangway Bellows 1 -->
                    <rect x="21" y="6" width="2.5" height="9" rx="0.3" fill="#0F172A" />
                    <line x1="22.2" y1="6" x2="22.2" y2="15" stroke="#334155" stroke-width="0.6" />

                    <!-- Car 2: Intermediate Motor Car (Pantograph + HVAC) -->
                    <rect x="23.5" y="4.5" width="18" height="12" rx="0.5" fill="url(#bodyGrad-${pos.id})" stroke="#0F172A" stroke-width="0.8" />
                    <rect x="23.5" y="4.5" width="18" height="2" fill="url(#roofGrad-${pos.id})" />
                    <!-- Rooftop HVAC Unit -->
                    <rect x="26.5" y="2.7" width="12" height="1.8" rx="0.4" fill="#475569" stroke="#334155" stroke-width="0.3" />
                    <line x1="28.5" y1="3.6" x2="36.5" y2="3.6" stroke="#94A3B8" stroke-width="0.5" stroke-dasharray="1.2,1" />
                    <!-- Pantograph Collector Arm -->
                    <line x1="31.5" y1="2.7" x2="33.5" y2="1.1" stroke="#64748B" stroke-width="0.75" />
                    <line x1="33.5" y1="1.1" x2="36.5" y2="1.1" stroke="#CBD5E1" stroke-width="0.8" />
                    <!-- Windows & Door Posts -->
                    <rect x="24.5" y="7.5" width="16" height="4.5" rx="0.5" fill="#0F172A" />
                    <rect x="25.2" y="8" width="4" height="3.5" rx="0.4" fill="#334155" />
                    <rect x="30.5" y="8" width="4" height="3.5" rx="0.4" fill="#334155" />
                    <rect x="35.8" y="8" width="4" height="3.5" rx="0.4" fill="#334155" />
                    <line x1="30" y1="7.5" x2="30" y2="16.5" stroke="#94A3B8" stroke-width="0.5" opacity="0.6" />
                    <line x1="35.3" y1="7.5" x2="35.3" y2="16.5" stroke="#94A3B8" stroke-width="0.5" opacity="0.6" />
                    <!-- Livery Striping -->
                    <line x1="23.5" y1="13.2" x2="41.5" y2="13.2" stroke="${theme.lineColor}" stroke-width="1.6" />
                    <line x1="23.5" y1="6.5" x2="41.5" y2="6.5" stroke="${theme.accentColor}" stroke-width="0.6" />

                    <!-- Coupler / Gangway Bellows 2 -->
                    <rect x="41.5" y="6" width="2.5" height="9" rx="0.3" fill="#0F172A" />
                    <line x1="42.7" y1="6" x2="42.7" y2="15" stroke="#334155" stroke-width="0.6" />

                    <!-- Car 1: Lead Driving Motor Car (Aerodynamic Bullet Cab) -->
                    <path d="M 44 4.5 L 54.5 4.5 Q 61.5 4.5 63.5 10.5 Q 61.5 16.5 54.5 16.5 L 44 16.5 Z" fill="url(#bodyGrad-${pos.id})" stroke="#0F172A" stroke-width="0.8" />
                    <path d="M 44 4.5 L 53.5 4.5 Q 57.5 4.5 59.5 6.5 L 44 6.5 Z" fill="url(#roofGrad-${pos.id})" />
                    <!-- Passenger Windows -->
                    <rect x="45" y="7.5" width="6.5" height="4.5" rx="0.5" fill="#0F172A" />
                    <rect x="45.6" y="8" width="5.2" height="3.5" rx="0.4" fill="#334155" />
                    <!-- Aerodynamic Windshield Mask & Glass -->
                    <path d="M 52.5 6.2 Q 59 6.8 61 10.5 Q 59 14.2 52.5 14.8 L 51.5 14.8 L 51.5 6.2 Z" fill="#0B132B" stroke="#0F172A" stroke-width="0.5" />
                    <path d="M 53 7.2 Q 57.5 7.8 59 10.5 L 57 10.5 Q 55.5 8.8 53 8 Z" fill="url(#glassGrad-${pos.id})" opacity="0.85" />
                    <!-- Destination Display Board -->
                    <path d="M 54.5 5.5 Q 58 5.7 59.5 6.8 L 58.5 7.1 Q 57 6.2 54.5 6 Z" fill="${theme.badgeColor}" />
                    <!-- Livery Striping along Nose Curve -->
                    <path d="M 44 13.2 L 53.5 13.2 Q 59 13.2 62 10.5" stroke="${theme.lineColor}" stroke-width="1.6" fill="none" />
                    <path d="M 44 6.5 L 53.5 6.5 Q 57 6.5 58.5 7.5" stroke="${theme.accentColor}" stroke-width="0.6" fill="none" />
                    <!-- High-Intensity Xenon LED Headlights with White Cores -->
                    <circle cx="61.8" cy="8.6" r="1.15" fill="#FEF08A" />
                    <circle cx="61.8" cy="12.4" r="1.15" fill="#FEF08A" />
                    <circle cx="61.8" cy="8.6" r="0.55" fill="#FFFFFF" />
                    <circle cx="61.8" cy="12.4" r="0.55" fill="#FFFFFF" />

                    <!-- Sleek Undercarriage Bogie Skirts -->
                    <line x1="7" y1="16.9" x2="20" y2="16.9" stroke="#0F172A" stroke-width="0.9" />
                    <line x1="24.5" y1="16.9" x2="40.5" y2="16.9" stroke="#0F172A" stroke-width="0.9" />
                    <line x1="45" y1="16.9" x2="56" y2="16.9" stroke="#0F172A" stroke-width="0.9" />
                  </g>
                </svg>
              </div>
            </div>
          `;

          const trainIcon = L.divIcon({
            className: 'train-marker-icon',
            html: trainIconHtml,
            iconSize: [68, 24],
            iconAnchor: [34, 12],
          });

          const marker = L.marker([lat, lng], {
            pane: 'Metros',
            icon: trainIcon,
            zIndexOffset: 100,
            interactive: true,
            bubblingMouseEvents: false
          }).addTo(mapRef.current!);

          // Create click handler that uses latest position
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handleClick = (e?: any) => {
            if (e) {
              if (e.stopPropagation) e.stopPropagation();
              if (e.preventDefault) e.preventDefault();
              try { L.DomEvent.stopPropagation(e); } catch { /* ignore */ }
              try { L.DomEvent.preventDefault(e); } catch { /* ignore */ }
            }
            const currentPos = latestPositionsRef.current.get(pos.id);
            if (currentPos) {
              setSelectedTrain({
                id: currentPos.id,
                line: currentPos.line,
                destination: currentPos.destination,
                fromStationId: currentPos.fromStationId,
                toStationId: currentPos.toStationId
              });
            }
          };

          // Add tooltip showing train direction
          marker.bindTooltip(pos.destination, {
            permanent: false,
            direction: 'top',
            offset: [0, -8],
            className: 'train-tooltip'
          });

          // Add click handler to show share popup
          marker.on('click', handleClick);

          // Attach DOM click listener and set initial rotation after marker is added to DOM
          requestAnimationFrame(() => {
            const el = marker.getElement();
            if (el) {
              el.style.cursor = 'pointer';
              el.style.pointerEvents = 'auto';

              const wrapper = el.querySelector('.train-icon-wrapper') as HTMLElement | null;
              if (wrapper) {
                wrapper.style.transform = `rotate(${smoothBearing - 90}deg) scale(${zoomScale})`;
                trainRotatorsRef.current.set(pos.id, wrapper);
              }

              if (activeSelectedId === pos.id) {
                el.classList.add('selected-train');
              }

              el.onclick = handleClick;
            }
          });

          trainMarkersRef.current.set(pos.id, marker);
        }
      });

      // Remove Metros that are no longer active
      existingIds.forEach(id => {
        trainMarkersRef.current.get(id)?.remove();
        trainMarkersRef.current.delete(id);
        trainBearingsRef.current.delete(id);
        trainRotatorsRef.current.delete(id);
      });
      
      // Keep loop running
      animationFrameId = requestAnimationFrame(animateTrains);
    };
    
    // Start loop
    animationFrameId = requestAnimationFrame(animateTrains);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Ahmedabad & Gandhinagar bounds - restrict panning to this specific region to prevent loading unnecessary black chunks
    const ahmedabadBounds = L.latLngBounds(
      [22.8, 72.4],   // Southwest corner (South of APMC/Ahmedabad)
      [23.3, 72.75]   // Northeast corner (North of GIFT City/Gandhinagar)
    );

    const map = L.map(mapContainerRef.current, {
      center: CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      scrollWheelZoom: true,
      minZoom: 11,
      maxBounds: ahmedabadBounds,
      maxBoundsViscosity: 1.0
    });

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dynamic zoom state for decluttering station labels and sizing trains
    const updateZoomState = () => {
      const currentZoom = map.getZoom();
      const el = mapContainerRef.current;
      if (!el) return;
      if (currentZoom <= 12) {
        el.classList.add('map-zoom-low');
        el.classList.remove('map-zoom-mid', 'map-zoom-high');
      } else if (currentZoom <= 14) {
        el.classList.add('map-zoom-mid');
        el.classList.remove('map-zoom-low', 'map-zoom-high');
      } else {
        el.classList.add('map-zoom-high');
        el.classList.remove('map-zoom-low', 'map-zoom-mid');
      }
    };
    map.on('zoomend', updateZoomState);
    updateZoomState();

    // Collapse panel only on direct map background click (not on station markers, drag, or zoom)
    map.on('click', () => {
      // Only collapse if we didn't just click a station marker
      setTimeout(() => {
        if (!stationClickedRef.current) {
          setIsPanelExpanded(false);
          setSelectedStation(null);
        }
        stationClickedRef.current = false;
      }, 10);
    });

    // Right-click (contextmenu) for desktop
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      handleLocationSelect(e.latlng.lat, e.latlng.lng, 'Dropped Pin');
    });

    // Long press for mobile
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressTriggered = false;

    const mapContainer = map.getContainer();
    
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      longPressTriggered = false;
      const touch = e.touches[0];
      
longPressTimer = setTimeout(() => {
         longPressTriggered = true;
         const point = map.containerPointToLatLng([touch.clientX - mapContainer.getBoundingClientRect().left, touch.clientY - mapContainer.getBoundingClientRect().top]);
         handleLocationSelect(point.lat, point.lng, 'Dropped Pin');
         // Vibrate feedback if available
         if (navigator.vibrate) navigator.vibrate(50);
       }, 500);
    };

    const onTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onTouchMove = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    mapContainer.addEventListener('touchstart', onTouchStart, { passive: true });
    mapContainer.addEventListener('touchend', onTouchEnd);
    mapContainer.addEventListener('touchmove', onTouchMove, { passive: true });

    mapRef.current = map;

    // Create custom panes for layering
    map.createPane('routes');
    map.createPane('stations');
    map.createPane('Metros');
    map.createPane('labels');
    map.getPane('routes')!.style.zIndex = '400';
    map.getPane('stations')!.style.zIndex = '450';
    map.getPane('Metros')!.style.zIndex = '650'; // Ensure Metros are above everything
    map.getPane('Metros')!.style.pointerEvents = 'auto';
    map.getPane('labels')!.style.zIndex = '460';
    map.getPane('labels')!.style.pointerEvents = 'none'; // Labels shouldn't block clicks

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxNativeZoom: 19,
      maxZoom: 22,
      updateWhenIdle: false, // Loads tiles instantly while scrolling instead of waiting
      keepBuffer: 12 // Keeps tiles in memory so they never go black again when panning back
    }).addTo(map);

    tileLayer.on('tileerror', (e: { tile: HTMLImageElement }) => {
      const originalSrc = e.tile.src;
      // Fallback to Carto Voyager tiles if OSM fails to load (prevents black chunks)
      const fallbackUrl = originalSrc.replace('tile.openstreetmap.org', 'basemaps.cartocdn.com/rastertiles/voyager');
      if (originalSrc !== fallbackUrl) {
        e.tile.src = fallbackUrl;
      }
    });

    // Fetch and draw metro routes
    Promise.all([
      fetch('/metroRoutes.geojson').then(res => res.json()),
      fetch('/yellowLineRoutes.geojson').then(res => res.json()),
      fetch('/blueLineRoutes.geojson').then(res => res.json()),
    ])
      .then(([metroData, yellowData, blueData]: [GeoJSON.FeatureCollection, GeoJSON.FeatureCollection, GeoJSON.FeatureCollection]) => {
        const blue: GeoJSON.Feature[] = [];
        const redCandidates: GeoJSON.Feature[] = [];
        const purple: GeoJSON.Feature[] = [];
        const greenCandidates: GeoJSON.Feature[] = [];

        const koteshwarLat = stations.koteshwar_road?.coordinates?.[0] ?? 23.1031114;
        const EPS = 0.0003;



        const classifyPoint = (lat: number): 'red' | 'green' | 'neutral' => {
          if (lat < koteshwarLat - EPS) return 'red';
          if (lat > koteshwarLat + EPS) return 'green';
          return 'neutral';
        };

        const makeSegmentFeature = (src: GeoJSON.Feature, coords: number[][]): GeoJSON.Feature => ({
          type: 'Feature',
          properties: { ...(src.properties ?? {}) },
          geometry: {
            type: 'LineString',
            coordinates: coords as unknown as GeoJSON.Position[],
          } as GeoJSON.LineString,
        });

        const splitLineByMotera = (f: GeoJSON.Feature): { red: GeoJSON.Feature[]; green: GeoJSON.Feature[] } => {
          if (f?.geometry?.type !== 'LineString') return { red: [], green: [] };
          const coords = (f.geometry as GeoJSON.LineString).coordinates as unknown as number[][];
          if (!coords?.length) return { red: [], green: [] };

          const out: { red: GeoJSON.Feature[]; green: GeoJSON.Feature[] } = { red: [], green: [] };

          let initial: 'red' | 'green' = 'green';
          for (const c of coords) {
            const s = classifyPoint(c[1]);
            if (s !== 'neutral') {
              initial = s;
              break;
            }
          }

          let currentSide: 'red' | 'green' = initial;
          let current: number[][] = [coords[0]];

          for (let i = 1; i < coords.length; i++) {
            const prev = coords[i - 1];
            const curr = coords[i];

            const prevRaw = classifyPoint(prev[1]);
            const currRaw = classifyPoint(curr[1]);

            const prevSide: 'red' | 'green' = prevRaw === 'neutral' ? currentSide : prevRaw;
            const currSide: 'red' | 'green' = currRaw === 'neutral' ? currentSide : currRaw;

            if (prevSide !== currSide) {
              const lat1 = prev[1];
              const lat2 = curr[1];
              const lng1 = prev[0];
              const lng2 = curr[0];

              if (lat1 !== lat2) {
                const t = (koteshwarLat - lat1) / (lat2 - lat1);
                const tt = Math.min(1, Math.max(0, t));
                const boundaryLng = lng1 + (lng2 - lng1) * tt;
                const boundary: number[] = [boundaryLng, koteshwarLat];

                current.push(boundary);
                if (current.length >= 2) out[currentSide].push(makeSegmentFeature(f, current));

                currentSide = currSide;
                current = [boundary, curr];
                continue;
              }
            }

            current.push(curr);
            currentSide = currSide;
          }

          if (current.length >= 2) out[currentSide].push(makeSegmentFeature(f, current));
          return out;
        };

        for (const f of metroData.features ?? []) {
          if (f?.geometry?.type !== 'LineString') continue;
          const name = String(f.properties?.name ?? '').toLowerCase();

          if (name.includes('blue line')) blue.push(f);
          else if (name.includes('red line')) redCandidates.push(f);
          else if (name.includes('violet line') || name.includes('line 3:') || name.includes('gift city-gnlu')) purple.push(f);
        }

        for (const f of blueData.features ?? []) {
          if (f?.geometry?.type !== 'LineString') continue;
          blue.push(f);
        }

        for (const f of yellowData.features ?? []) {
          if (f?.geometry?.type !== 'LineString') continue;
          greenCandidates.push(f);
        }

        const red: GeoJSON.Feature[] = [];
        const green: GeoJSON.Feature[] = [];

        const pushSplit = (f: GeoJSON.Feature) => {
          const { red: r, green: g } = splitLineByMotera(f);
          red.push(...r);
          green.push(...g);
        };

        for (const f of redCandidates) pushSplit(f);
        for (const f of greenCandidates) pushSplit(f);

        const addRouteLayer = (features: GeoJSON.Feature[], color: string) => {
          if (!features.length) return null;
          return L.geoJSON({ type: 'FeatureCollection', features } as GeoJSON.FeatureCollection, {
            pane: 'routes',
            style: {
              color,
              weight: 5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }).addTo(map);
        };

        addRouteLayer(blue, LINE_COLORS.blue);
        addRouteLayer(purple, LINE_COLORS.purple);
        addRouteLayer(red, LINE_COLORS.red);
        const greenLayer = addRouteLayer(green, LINE_COLORS.green);
        greenLayer?.bringToFront();



      })
      .catch(err => console.error('Failed to load metro routes:', err));

    // Draw station markers
    Object.values(stations).forEach(station => {
      const color = getStationColor(station);
      const isInterchange = station.isInterchange;
      const isUnderground = station.isUnderground;

      const isHub = station.isInterchange || ['apmc', 'thaltej_gam', 'vastral_gam', 'mahatma_mandir', 'gift_city', 'kalupur'].includes(station.id);
      const stationIcon = L.divIcon({
        className: 'station-marker-container',
        html: `
          <div class="station-marker-rect ${isInterchange ? 'interchange' : ''} ${isUnderground ? 'underground' : ''}" 
               style="background-color: ${color}">
            ${isInterchange ? `<div class="interchange-inner" style="background-color: ${LINE_COLORS[station.lines[0]]}"></div>` : ''}
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker(station.coordinates, {
        pane: 'stations',
        icon: stationIcon,
        zIndexOffset: station.isInterchange ? 50 : 0
      }).addTo(map);

      // Station label
      const labelIcon = L.divIcon({
        className: `station-label ${isHub ? 'hub-label' : ''}`,
        html: `<div class="station-name ${station.isUnderground ? 'underground' : ''} ${station.isInterchange ? 'interchange' : ''}">${getStationName(station, language)}</div>`,
        iconSize: [100, 20],
        iconAnchor: [50, -8],
      });

      const labelMarker = L.marker(station.coordinates, {
        pane: 'labels',
        icon: labelIcon,
        interactive: false,
      }).addTo(map);

      stationLabelsRef.current.set(station.id, labelMarker);

      // Click handler
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if ('vibrate' in navigator) {
          navigator.vibrate(30);
        }
        stationClickedRef.current = true;
        setSelectedStation(station);
        setIsPanelExpanded(true);
        map.setView(station.coordinates, 15);
        if (window.innerWidth <= 768) {
          map.panBy([0, 95], { animate: true });
        }
        try {
          track('station_tap', { stationId: station.id, stationName: station.name, source: 'map_marker' });
        } catch {
          // Ignore analytics in dev/offline
        }
      });
    });

    // Notify startup splash that map and stations are mounted and ready
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ahm-map-ready'));
    }

    // If a specific station or route was requested via URL/path, center map on it
    const urlParams = new URLSearchParams(window.location.search);
    let targetStationId = urlParams.get('station') || urlParams.get('st');
    const pathLow = window.location.pathname.toLowerCase();
    if (!targetStationId && pathLow.startsWith('/station/')) {
      const slug = pathLow.replace(/^\/station\//, '').replace(/\/$/, '');
      targetStationId = slugToStationId(slug);
    } else if (!targetStationId && (pathLow === '/interchange' || pathLow === '/interchange/')) {
      targetStationId = 'old_high_court';
    } else if (!targetStationId && (pathLow === '/airport' || pathLow === '/airport/')) {
      targetStationId = 'koteshwar_road';
    }

    if (targetStationId && stations[targetStationId]) {
      map.setView(stations[targetStationId].coordinates, 15);
    } else if (pathLow.startsWith('/route/')) {
      const slug = pathLow.replace(/^\/route\//, '').replace(/\/$/, '');
      const parsed = parseRouteSlug(slug);
      if (parsed && stations[parsed.fromId] && stations[parsed.toId]) {
        const bounds = L.latLngBounds([
          stations[parsed.fromId].coordinates,
          stations[parsed.toId].coordinates,
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Request user location with proactive initial fix and continuous watching for movement
    if ('geolocation' in navigator) {
      let isFirstPosition = true;
      let permissionToastShown = false;
      let lastStatePushAt = 0;
      let lastPushedLat = 0;
      let lastPushedLng = 0;

      const onPositionAcquired = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        if (!targetStationId) {
          handleLocationUpdate(latitude, longitude);
        } else {
          setUserLocation([latitude, longitude]);
          updateNearestStation(latitude, longitude);
        }
      };

      // 1. Proactively query user location immediately on mount for instant nearest station display
      navigator.geolocation.getCurrentPosition(
        onPositionAcquired,
        (err) => {
          console.debug('Initial getCurrentPosition unavailable:', err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 180000,
        }
      );

      // 2. Use watchPosition for continuous tracking (updates when user moves)
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          if (isFirstPosition) {
            isFirstPosition = false;
            onPositionAcquired(position);
            return;
          }

          if (position.coords.accuracy > 30) {
            const farMoved =
              Math.abs(latitude - lastPushedLat) > 0.0005 ||
              Math.abs(longitude - lastPushedLng) > 0.0005;
            if (!farMoved) return;
          }

          const now = Date.now();
          const movedEnough =
            Math.abs(latitude - lastPushedLat) > 0.0001 ||
            Math.abs(longitude - lastPushedLng) > 0.0001;
          if (now - lastStatePushAt > 2000 && movedEnough) {
            lastStatePushAt = now;
            lastPushedLat = latitude;
            lastPushedLng = longitude;
            setUserLocation([latitude, longitude]);
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([latitude, longitude]);
            }
            if (userPulseRef.current) {
              userPulseRef.current.setLatLng([latitude, longitude]);
            }
          }
        },
        (error) => {
          console.debug('Initial geolocation watch unavailable:', error.message);

          // Fit to all stations if location unavailable on startup
          if (!permissionToastShown && !targetStationId) {
            permissionToastShown = true;
            const allCoords = Object.values(stations).map(s => s.coordinates);
            if (allCoords.length > 0) {
              map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
            }
          }
        },
        { 
          enableHighAccuracy: false, 
          timeout: 12000,
          maximumAge: 300000
        }
      );
    }

    return () => {
      // Clear geolocation watch
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      userMarkerRef.current = null;
      userPulseRef.current = null;
    };
    // `language` intentionally omitted: including it tears down and rebuilds the
    // whole map on every language switch. The label-swap effect above (~line 200)
    // already updates station labels in place.
  }, [handleLocationUpdate, handleLocationSelect, updateNearestStation]);

  const handleClosePanel = () => {
    setSelectedStation(null);
    setIsPanelExpanded(false);
  };

  return (
    <div className="w-full h-full absolute inset-0">
      <style>{`
        .station-label {
          background: transparent;
          border: none;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .map-zoom-low .station-label:not(.hub-label) {
          opacity: 0;
          pointer-events: none;
        }
        .map-zoom-low .station-label.hub-label {
          opacity: 0.95;
        }
        .station-name {
          font-size: 10px;
          font-weight: 500;
          color: hsl(var(--foreground));
          text-align: center;
          white-space: nowrap;
          text-shadow: 
            1px 1px 0 hsl(var(--background)),
            -1px 1px 0 hsl(var(--background)),
            1px -1px 0 hsl(var(--background)),
            -1px -1px 0 hsl(var(--background)),
            0 1px 0 hsl(var(--background)),
            0 -1px 0 hsl(var(--background)),
            1px 0 0 hsl(var(--background)),
            -1px 0 0 hsl(var(--background));
        }
        .station-name.underground {
          font-style: italic;
        }
        .station-name.interchange {
          font-weight: 700;
          font-size: 11px;
        }
        .dark .leaflet-tile-pane {
          filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9);
        }
        .dark .leaflet-container {
          background: hsl(222.2 84% 4.9%);
        }
        .train-tooltip {
          background: hsl(var(--background) / 0.95);
          border: 1px solid hsl(var(--border));
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 500;
          color: hsl(var(--foreground));
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .train-tooltip::before {
          display: none;
        }
        .train-marker-icon {
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          z-index: 1000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: visible !important;
          transition: opacity 0.25s ease, filter 0.25s ease;
        }
        .train-marker-inner {
          position: relative;
          width: 68px;
          height: 24px;
          overflow: visible;
        .train-marker-icon.selected-train .train-icon-wrapper {
          filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.95)) drop-shadow(0 3px 7px rgba(0, 0, 0, 0.6)) !important;
          z-index: 1050;
        }
        .train-marker-icon svg,
        .train-marker-icon svg * {
          pointer-events: none !important;
        }
        .train-icon-wrapper {
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45));
          cursor: pointer !important;
          pointer-events: auto !important;
          will-change: transform;
          transform-origin: center center;
          transition: filter 0.2s ease;
        }
        .train-icon-wrapper:hover {
          filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.65));
        }
        .train-icon-wrapper svg {
          display: block;
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .leaflet-pane.leaflet-Metros-pane {
          pointer-events: auto !important;
        }
        .leaflet-pane.leaflet-Metros-pane .leaflet-marker-icon {
          pointer-events: auto !important;
        }
        
        /* Ensure map is always clickable */
        .leaflet-container {
          pointer-events: auto !important;
        }
        
        /* Ensure markers are clickable */
        .leaflet-marker-pane,
        .leaflet-pane {
          pointer-events: auto !important;
        }
      `}</style>

      <div ref={mapContainerRef} className="w-full h-full" style={{ pointerEvents: 'auto' }} />

      <SearchBar onLocationSelect={handleLocationSelect} onStationSelect={handleStationSelect} />
      <SideMenu onOpenRoutePlanner={(origin, destination) => {
        if (origin && destination) {
          setRoutePlannerOrigin(origin);
          setRoutePlannerDestination(destination);
        } else {
          // Default the journey start to the user's nearest station.
          setRoutePlannerOrigin(nearestStation?.id);
          setRoutePlannerDestination(undefined);
        }
        setIsRoutePlannerOpen(true);
      }} />

      {/* Active Metros indicator */}
      {activeTrainCount > 0 && (
        <div className="fixed top-20 left-4 z-[1000] bg-background/70 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border flex items-center gap-2 animate-fade-in pointer-events-none">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-sm font-medium">
            {t('map.metrosRunning', language).replace('{count}', String(activeTrainCount))}
          </span>
        </div>
      )}

      <FriendsJourneyViewer
        isOpen={isFriendsViewerOpen}
        onClose={() => setIsFriendsViewerOpen(false)}
        data={friendsJourneyData}
        onCoordinate={(customDest) => {
          setIsFriendsViewerOpen(false);
          setIsCoordinating(true);
          setRoutePlannerDestination(customDest || friendsJourneyData?.dest);
          if (nearestStation) setRoutePlannerOrigin(nearestStation.id);
          setIsRoutePlannerOpen(true);
        }}
      />

      <RoutePlanner
        isOpen={isRoutePlannerOpen}
        onClose={handleCloseRoutePlanner}
        onRouteChange={handleRouteChange}
        initialOrigin={routePlannerOrigin}
        initialDestination={routePlannerDestination}
        isCoordinating={isCoordinating}
        sharedSegments={friendsJourneyData?.segments}
        friendDepMins={friendsJourneyData?.depMins}
        nearestStation={nearestStation}
      />

      <BottomPanel
        selectedStation={selectedStation}
        nearestStation={nearestStation}
        distance={selectedStation ? null : nearestDistance}
        walkingTime={selectedStation ? null : nearestWalkingTime}
        onClose={handleClosePanel}
        isExpanded={isPanelExpanded}
        onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
        onLocate={handleLocationUpdate}
        onPlanRoute={handlePlanRouteFromStation}
        onOpenRoutePlanner={() => {
          setIsRoutePlannerOpen(true);
          setIsPanelExpanded(false);
        }}
        userLocation={userLocation}
        searchedLocation={searchedLocation}
      />

      <JoinRideDialog
        isOpen={joinRide.isOpen}
        onClose={() => setJoinRide(prev => ({ ...prev, isOpen: false }))}
        trainId={joinRide.trainId}
        initialDestination={joinRide.destination}
        onNavigate={() => {
          setJoinRide(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Commute Card */}
      {commuteCard?.show && (
        <CommuteCard
          fromStation={commuteCard.fromStation}
          toStation={commuteCard.toStation}
          walkingTime={commuteCard.walkingTime}
          onDismiss={() => {
            commuteCardShownRef.current = false;
            markCommuteCardShown(commuteCard.direction);
            setCommuteCard(null);
          }}
          onPlanRoute={() => {
            commuteCardShownRef.current = false;
            markCommuteCardShown(commuteCard.direction);
            setRoutePlannerOrigin(commuteCard.fromStation.id);
            setRoutePlannerDestination(commuteCard.toStation.id);
            setIsRoutePlannerOpen(true);
            setCommuteCard(null);
          }}
        />
      )}

      {/* Train Share Popup */}
      {selectedTrain && (() => {
        const livePos = latestPositionsRef.current.get(selectedTrain.id);
        const isMoving = livePos ? livePos.status === 'moving' : true;
        const progressPercent = livePos ? Math.max(5, Math.min(95, Math.round(livePos.progress * 100))) : 50;
        const fromStation = stations[selectedTrain.fromStationId];
        const toStation = stations[selectedTrain.toStationId];
        const lineColor = LINE_COLORS[selectedTrain.line as keyof typeof LINE_COLORS] || '#2563EB';

        return (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTrain(null)}>
            <div 
              className="bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border max-w-sm w-full overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 safe-p-bottom"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with aerodynamic train theme */}
              <div 
                className="p-4 text-white relative overflow-hidden"
                style={{ backgroundColor: lineColor }}
              >
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-2">
                  <Train size={110} />
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Train size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">
                        {(() => {
                          const sched = trainSchedules.find(s => s.id === selectedTrain.id);
                          if (sched && sched.stations.length > 1) {
                            const originSt = stations[sched.stations[0]];
                            const destSt = stations[sched.stations[sched.stations.length - 1]];
                            const lineBase = t(`route.${selectedTrain.line}Line` as Parameters<typeof t>[0], language);
                            if (originSt && destSt) {
                              return `${lineBase} (${getStationName(originSt, language)} ↔ ${getStationName(destSt, language)})`;
                            }
                          }
                          return t(`line.${selectedTrain.line}` as Parameters<typeof t>[0], language);
                        })()}
                      </h3>
                      <p className="text-xs text-white/85 font-medium mt-0.5">
                        {t('map.towards', language)}{' '}
                        {(() => {
                          const sched = trainSchedules.find(s => s.id === selectedTrain.id);
                          const destSt = sched ? stations[sched.stations[sched.stations.length - 1]] : null;
                          return destSt ? getStationName(destSt, language) : selectedTrain.destination;
                        })()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTrain(null)}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                    aria-label={t('common.close', language)}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-3.5">
                {/* Live Real-Time Segment & Progress Card */}
                <div className="bg-muted/40 p-3 rounded-2xl border border-border/70 space-y-2.5">
                  <div className="flex items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", isMoving ? "bg-emerald-500" : "bg-amber-500")} />
                      {isMoving ? t('map.liveTrainEnRoute', language) : t('map.liveTrainBoarding', language)} {toStation ? getStationName(toStation, language) : ''}
                    </span>
                  </div>

                  {/* Animated Visual Track Progress Bar */}
                  <div className="space-y-1">
                    <div className="relative h-2 bg-muted/80 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progressPercent}%`,
                          backgroundColor: lineColor
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-0.5">
                      <span className="truncate max-w-[48%] flex items-center gap-1">
                        <MapPin size={10} className="text-muted-foreground flex-shrink-0" />
                        {fromStation ? getStationName(fromStation, language) : 'Unknown'}
                      </span>
                      <span className="truncate max-w-[48%] text-right font-semibold text-foreground">
                        {toStation ? getStationName(toStation, language) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const schedule = trainSchedules.find(s => s.id === selectedTrain.id);
                  if (schedule) {
                    const currentStationIndex = schedule.stations.indexOf(selectedTrain.fromStationId);
                    const crowd = getCrowdLevel(selectedTrain.line, selectedTrain.id, {
                      stationIndex: currentStationIndex >= 0 ? currentStationIndex : 0,
                      totalStations: schedule.stations.length,
                      stationList: schedule.stations,
                      originStationId: schedule.stations[0],
                      destinationStationId: schedule.stations[schedule.stations.length - 1]
                    });
                    return (
                      <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-xl border border-border/40 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Users size={14} className="text-muted-foreground" />
                          {t('map.crowding', language)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${crowd.bgClass} ${crowd.textClass}`}>
                          {crowd.label}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      setLiveTrackingDialogOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-sm cursor-pointer min-h-[44px]"
                    style={{ backgroundColor: lineColor }}
                  >
                    <Share2 size={18} />
                    {t('map.shareJourney', language)}
                  </button>
                  
                  <button
                    onClick={() => {
                      setTrainDetailsDialogOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl font-medium border border-border bg-muted/40 hover:bg-muted text-foreground flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
                  >
                    <Train size={18} />
                    {t('map.viewMetroDetails', language)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Metro Details Dialog */}
      {selectedTrain && (
        <TrainDetailsDialog
          isOpen={trainDetailsDialogOpen}
          onClose={() => {
            setTrainDetailsDialogOpen(false);
            setSelectedTrain(null);
          }}
          trainId={selectedTrain.id}
          line={selectedTrain.line as 'blue' | 'red' | 'green' | 'purple'}
        />
      )}

      {/* Live Metro Tracking Dialog */}
      {selectedTrain && (
        <LiveTrainTrackingDialog
          isOpen={liveTrackingDialogOpen}
          onClose={() => {
            setLiveTrackingDialogOpen(false);
            setSelectedTrain(null);
          }}
          trainId={selectedTrain.id}
          line={selectedTrain.line as 'blue' | 'red' | 'green' | 'purple'}
        />
      )}
    </div>
  );
};

export default React.memo(MetroMap);
