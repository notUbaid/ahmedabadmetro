import { X, Route, Share2, ArrowRight, Train, Clock, MapPin, Check, Users } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stations, LINE_COLORS, Station } from '@/data/metroData';
import { getCurrentTrainPositions, trainSchedules, lineStations, getAllAdjacentStationPairs, TrainPosition } from '@/data/timetable';
import { findNearestByWalking, findClosestStations } from '@/lib/walkingRoute';
import { calculateJourneyProgress, planRouteWithDeparture, PlannedRoute, getStationOptions } from '@/lib/routePlanner';
import { getCrowdLevel } from '@/lib/crowding';
import { getCommuteSettings, incrementDismissCount, shouldShowCommuteCard, markCommuteCardShown } from '@/lib/commuteStorage';
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
import { getStationName } from '@/lib/i18n';

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
  const routeSegmentsRef = useRef<Map<string, { geometry: [number, number][]; dists: number[]; totalDist: number }>>(new Map());
  const latestPositionsRef = useRef<Map<string, TrainPosition>>(new Map());
  const stationLabelsRef = useRef<Map<string, L.Marker>>(new Map());

  const { language } = useLanguage();
  const { toast } = useToast();
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

    // Direct route query params (e.g. ?from=gnlu&to=thaltej) for SEO & deep linking
    const routeFrom = params.get('from') || params.get('origin');
    const routeTo = params.get('to') || params.get('destination');
    if (routeFrom && routeTo && stations[routeFrom] && stations[routeTo]) {
      setRoutePlannerOrigin(routeFrom);
      setRoutePlannerDestination(routeTo);
      setIsRoutePlannerOpen(true);
      setIsPanelExpanded(false);
    }

    if (joinTrainId || (sharedOrig && sharedDest && depMinsStr)) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
        const labelIcon = L.divIcon({
          className: 'station-label',
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

    // Get walking route (includes fallback calculation)
    const walkingRoute = await findNearestByWalking(lat, lng);

    // If a new update was triggered while we were waiting, ignore this one
    if (currentUpdateId !== updateIdRef.current) return;

    if (walkingRoute && mapRef.current) {
      setNearestStation(walkingRoute.station);
      setNearestDistance(walkingRoute.distance);
      setNearestWalkingTime(walkingRoute.duration);

      // Draw the walking route on the map
      walkingRouteRef.current = L.polyline(walkingRoute.geometry, {
        color: '#3B82F6',
        weight: 4,
        dashArray: '8, 12',
        opacity: 0.8,
        lineCap: 'round'
      }).addTo(mapRef.current);

      // Check for commute card
      checkCommuteCard(lat, lng, walkingRoute.duration);
    }
  }, [checkCommuteCard]);

  // Handle location update (from locate button)
  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);

      // Clear searched location if any
      if (searchedLocationMarkerRef.current) {
        searchedLocationMarkerRef.current.remove();
        searchedLocationMarkerRef.current = null;
      }
      setSearchedLocation(null);
      setUserLocation([lat, lng]);

      // Ensure user marker and pulse effect exist on map
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([lat, lng]);
        if (userPulseRef.current) {
          userPulseRef.current.setLatLng([lat, lng]);
        }
      } else if (mapRef.current) {
        userMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#3B82F6',
          color: '#FFFFFF',
          weight: 3,
          fillOpacity: 1,
        }).addTo(mapRef.current);

        userPulseRef.current = L.circleMarker([lat, lng], {
          radius: 20,
          fillColor: '#3B82F6',
          color: '#3B82F6',
          weight: 1,
          fillOpacity: 0.2,
          opacity: 0.5,
        }).addTo(mapRef.current);
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
      iconSize: [100, 100],
      iconAnchor: [50, 50],
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
      iconSize: [100, 100],
      iconAnchor: [50, 50],
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
          iconSize: [100, 100],
          iconAnchor: [50, 50],
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

      animationFrameId = requestAnimationFrame(animateTrains);
      if (!mapRef.current) return;

      const positions = getCurrentTrainPositions();
      const existingIds = new Set(trainMarkersRef.current.keys());

      // Update latest positions ref
      latestPositionsRef.current.clear();
      positions.forEach(p => latestPositionsRef.current.set(p.id, p));

      // Update active train count only when it changes (avoids re-render per tick)
      if (positions.length !== lastTrainCount) {
        lastTrainCount = positions.length;
        setActiveTrainCount(positions.length);
      }

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

        const trainColor = '#FFB347'; // Light orange for all Metros
        const isMoving = pos.status === 'moving';
        const trainIconHtml = `
          <div class="train-icon-wrapper" style="padding: 6px;">
            <svg width="44" height="22" viewBox="0 0 44 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g${pos.id}" x1="0" x2="1">
                  <stop offset="0%" stop-color="#FFD07A" />
                  <stop offset="100%" stop-color="#FF9A3D" />
                </linearGradient>
                <filter id="s${pos.id}" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.35" />
                </filter>
              </defs>
              <!-- Train body -->
              <rect x="2" y="4" width="28" height="12" rx="4" fill="url(#g${pos.id})" stroke="#E08A2A" stroke-width="0.8" filter="url(#s${pos.id})" />
              <!-- Sleek nose -->
              <path d="M30 4 C36 11 36 11 30 18 L34 18 L40 11 L34 4 L30 4 Z" fill="url(#g${pos.id})" stroke="#E08A2A" stroke-width="0.8" />
              <!-- Highlights -->
              <rect x="5" y="6" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.32)" />
              <!-- Windows -->
              <rect x="8" y="9" width="3" height="3" rx="0.8" fill="rgba(255,255,255,0.95)" />
              <rect x="13" y="9" width="3" height="3" rx="0.8" fill="rgba(255,255,255,0.95)" />
              <rect x="18" y="9" width="3" height="3" rx="0.8" fill="rgba(255,255,255,0.95)" />
              ${isMoving ? '' : '<circle cx="18" cy="10" r="5" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" />'}
            </svg>
          </div>
        `;

        if (trainMarkersRef.current.has(pos.id)) {
          // Update existing marker position and rotation without recreating DOM icon
          const marker = trainMarkersRef.current.get(pos.id)!;
          marker.setLatLng([lat, lng]);
          const el = marker.getElement();
          if (el) {
            const wrapper = el.querySelector('.train-icon-wrapper') as HTMLElement | null;
            if (wrapper) wrapper.style.transform = `rotate(${bearing - 90}deg)`;
          }
          existingIds.delete(pos.id);
        } else {
          // Create new train marker with modern directional icon
          const trainIcon = L.divIcon({
            className: 'train-marker-icon',
            html: trainIconHtml,
            iconSize: [56, 36],
            iconAnchor: [28, 18],
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
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.preventDefault) e.preventDefault();
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
              if (wrapper) wrapper.style.transform = `rotate(${bearing - 90}deg) translateZ(0)`;
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

        // Robust helper to find continuous path between stations using all line features
        const buildLineCache = (lineStationsList: string[], features: GeoJSON.Feature[]) => {
          if (!lineStationsList || lineStationsList.length < 2) return;
          
          const nodes: [number, number][] = [];
          const adj: number[][] = [];

          // 1. Add all station coordinates as nodes
          const stationNodes = lineStationsList.map(id => {
            const st = stations[id];
            nodes.push([st.coordinates[0], st.coordinates[1]]);
            adj.push([]);
            return nodes.length - 1;
          });

          // 2. Add all GeoJSON points and connect adjacent ones
          features.forEach(f => {
            if (f.geometry.type !== 'LineString') return;
            const coords = (f.geometry as GeoJSON.LineString).coordinates as [number, number][];
            const startIdx = nodes.length;
            coords.forEach(c => {
              nodes.push([c[1], c[0]]); // GeoJSON is [lng, lat], Leaflet is [lat, lng]
              adj.push([]);
            });
            for (let i = 0; i < coords.length - 1; i++) {
              adj[startIdx + i].push(startIdx + i + 1);
              adj[startIdx + i + 1].push(startIdx + i);
            }
          });

          // 3. Connect stations to their closest track node
          const MAX_STATION_GAP = 0.05; // ~5.5km, ensures all stations find a track
          
          for (let i = 0; i < lineStationsList.length; i++) {
            let closestNode = -1;
            let minDist = MAX_STATION_GAP;
            for (let j = lineStationsList.length; j < nodes.length; j++) {
              const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
              if (dist < minDist) {
                minDist = dist;
                closestNode = j;
              }
            }
            if (closestNode !== -1) {
              adj[i].push(closestNode);
              adj[closestNode].push(i);
            }
          }

          // Find feature endpoints and connect fragmented ends
          const MAX_ENDPOINT_GAP = 0.005; // 500m
          for (let i = lineStationsList.length; i < nodes.length; i++) {
            if (adj[i].length === 1) { 
              for (let j = i + 1; j < nodes.length; j++) {
                if (adj[j].length === 1) { 
                  const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
                  if (dist < MAX_ENDPOINT_GAP) {
                    adj[i].push(j);
                    adj[j].push(i);
                  }
                }
              }
            }
          }

          // Connect all close track nodes (e.g. parallel tracks or overlaps) to allow Dijkstra to switch tracks
          for (let i = lineStationsList.length; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
              if (dist < 0.0005) { // 50m
                adj[i].push(j);
                adj[j].push(i);
              }
            }
          }

          // 4. Find shortest path between each adjacent station pair
          for (let i = 0; i < lineStationsList.length - 1; i++) {
            const startNode = i;
            const endNode = i + 1;
            const s1 = lineStationsList[i];
            const s2 = lineStationsList[i + 1];

            const dist = new Float32Array(nodes.length).fill(Infinity);
            const prev = new Int32Array(nodes.length).fill(-1);
            const visited = new Uint8Array(nodes.length);
            dist[startNode] = 0;

            for (let step = 0; step < nodes.length; step++) {
              let u = -1;
              let minDist = Infinity;
              for (let v = 0; v < nodes.length; v++) {
                if (!visited[v] && dist[v] < minDist) {
                  minDist = dist[v];
                  u = v;
                }
              }
              if (u === -1 || u === endNode) break;
              visited[u] = 1;

              for (const v of adj[u]) {
                if (visited[v]) continue;
                const dx = nodes[u][0] - nodes[v][0];
                const dy = nodes[u][1] - nodes[v][1];
                const d = Math.sqrt(dx*dx + dy*dy);
                if (dist[u] + d < dist[v]) {
                  dist[v] = dist[u] + d;
                  prev[v] = u;
                }
              }
            }

            if (prev[endNode] !== -1) {
              const path: [number, number][] = [];
              let curr = endNode;
              while (curr !== -1) {
                path.push(nodes[curr]);
                curr = prev[curr];
              }
              path.reverse();

              const dists: number[] = [0];
              let totalDist = 0;
              for (let k = 0; k < path.length - 1; k++) {
                const d = Math.sqrt(Math.pow(path[k + 1][0] - path[k][0], 2) + Math.pow(path[k + 1][1] - path[k][1], 2));
                totalDist += d;
                dists.push(totalDist);
              }

              const key1 = `${s1}-${s2}`;
              if (!routeSegmentsRef.current.has(key1)) {
                const entry = { geometry: path, dists, totalDist };
                routeSegmentsRef.current.set(key1, entry);

                const revPath = [...path].reverse();
                const revDists = [...dists].map(d => totalDist - d).reverse();
                const revEntry = { geometry: revPath, dists: revDists, totalDist };
                routeSegmentsRef.current.set(`${s2}-${s1}`, revEntry);
              }
            }
          }
        };

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

        // Build route geometry cache for train animation
        routeSegmentsRef.current.clear();
        buildLineCache(lineStations.blue, blue);
        buildLineCache(lineStations.red, red);
        buildLineCache(lineStations.green, green);
        buildLineCache(lineStations.purple, purple);

        // Fill in missing station pairs from through-running train schedules.
        // Through-running Metros (e.g. purple APMC→GIFT) traverse station pairs
        // that aren't in any single line's cache. Build those using all features.
        const allPairs = getAllAdjacentStationPairs();
        const allFeatures = [...blue, ...red, ...green, ...purple];
        const missingPairs = allPairs.filter(([s1, s2]) =>
          !routeSegmentsRef.current.has(`${s1}-${s2}`) &&
          !routeSegmentsRef.current.has(`${s2}-${s1}`)
        );
        if (missingPairs.length > 0) {
          // Build a single Dijkstra graph from ALL features to resolve missing pairs
          const missingStationIds = new Set<string>();
          missingPairs.forEach(([s1, s2]) => { missingStationIds.add(s1); missingStationIds.add(s2); });
          const missingStationsList = [...missingStationIds];

          const nodes: [number, number][] = [];
          const adj: number[][] = [];

          // Add station nodes
          const stationNodeMap = new Map<string, number>();
          missingStationsList.forEach(id => {
            const st = stations[id];
            if (!st) return;
            stationNodeMap.set(id, nodes.length);
            nodes.push([st.coordinates[0], st.coordinates[1]]);
            adj.push([]);
          });

          // Add all GeoJSON track nodes
          allFeatures.forEach(f => {
            if (f.geometry.type !== 'LineString') return;
            const coords = (f.geometry as GeoJSON.LineString).coordinates as [number, number][];
            const startIdx = nodes.length;
            coords.forEach(c => {
              nodes.push([c[1], c[0]]);
              adj.push([]);
            });
            for (let i = 0; i < coords.length - 1; i++) {
              adj[startIdx + i].push(startIdx + i + 1);
              adj[startIdx + i + 1].push(startIdx + i);
            }
          });

          // Connect stations to nearest track nodes
          for (const [id, nodeIdx] of stationNodeMap) {
            let closestNode = -1;
            let minDist = 0.05;
            for (let j = missingStationsList.length; j < nodes.length; j++) {
              const dist = Math.sqrt(Math.pow(nodes[nodeIdx][0] - nodes[j][0], 2) + Math.pow(nodes[nodeIdx][1] - nodes[j][1], 2));
              if (dist < minDist) {
                minDist = dist;
                closestNode = j;
              }
            }
            if (closestNode !== -1) {
              adj[nodeIdx].push(closestNode);
              adj[closestNode].push(nodeIdx);
            }
          }

          // Connect close track nodes (parallel tracks)
          for (let i = missingStationsList.length; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
              if (dist < 0.0005) {
                adj[i].push(j);
                adj[j].push(i);
              }
            }
          }

          // Connect fragmented endpoints
          for (let i = missingStationsList.length; i < nodes.length; i++) {
            if (adj[i].length === 1) {
              for (let j = i + 1; j < nodes.length; j++) {
                if (adj[j].length === 1) {
                  const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
                  if (dist < 0.005) {
                    adj[i].push(j);
                    adj[j].push(i);
                  }
                }
              }
            }
          }

          // Run Dijkstra for each missing pair
          for (const [s1, s2] of missingPairs) {
            const startNode = stationNodeMap.get(s1);
            const endNode = stationNodeMap.get(s2);
            if (startNode === undefined || endNode === undefined) continue;

            const dist = new Float32Array(nodes.length).fill(Infinity);
            const prev = new Int32Array(nodes.length).fill(-1);
            const visited = new Uint8Array(nodes.length);
            dist[startNode] = 0;

            for (let step = 0; step < nodes.length; step++) {
              let u = -1;
              let minD = Infinity;
              for (let v = 0; v < nodes.length; v++) {
                if (!visited[v] && dist[v] < minD) { minD = dist[v]; u = v; }
              }
              if (u === -1 || u === endNode) break;
              visited[u] = 1;
              for (const v of adj[u]) {
                if (visited[v]) continue;
                const dx = nodes[u][0] - nodes[v][0];
                const dy = nodes[u][1] - nodes[v][1];
                const d = Math.sqrt(dx*dx + dy*dy);
                if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
              }
            }

            if (prev[endNode] !== -1) {
              const path: [number, number][] = [];
              let curr = endNode;
              while (curr !== -1) { path.push(nodes[curr]); curr = prev[curr]; }
              path.reverse();

              const dists: number[] = [0];
              let totalDist = 0;
              for (let k = 0; k < path.length - 1; k++) {
                const d = Math.sqrt(Math.pow(path[k+1][0]-path[k][0],2) + Math.pow(path[k+1][1]-path[k][1],2));
                totalDist += d;
                dists.push(totalDist);
              }

              routeSegmentsRef.current.set(`${s1}-${s2}`, { geometry: path, dists, totalDist });
              const revPath = [...path].reverse();
              const revDists = [...dists].map(d => totalDist - d).reverse();
              routeSegmentsRef.current.set(`${s2}-${s1}`, { geometry: revPath, dists: revDists, totalDist });
            }
          }
        }

      })
      .catch(err => console.error('Failed to load metro routes:', err));

    // Draw station markers
    Object.values(stations).forEach(station => {
      const color = getStationColor(station);
      const isInterchange = station.isInterchange;
      const isUnderground = station.isUnderground;

      const stationIcon = L.divIcon({
        className: 'station-marker-container',
        html: `
          <div class="station-marker-rect ${isInterchange ? 'interchange' : ''} ${isUnderground ? 'underground' : ''}" 
               style="background-color: ${color}">
            ${isInterchange ? `<div class="interchange-inner" style="background-color: ${LINE_COLORS[station.lines[0]]}"></div>` : ''}
          </div>
        `,
        iconSize: [100, 100],
        iconAnchor: [50, 50],
      });

      const marker = L.marker(station.coordinates, {
        pane: 'stations',
        icon: stationIcon,
        zIndexOffset: station.isInterchange ? 50 : 0
      }).addTo(map);

      // Station label
      const labelIcon = L.divIcon({
        className: 'station-label',
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
        stationClickedRef.current = true;
        setSelectedStation(station);
        setIsPanelExpanded(true);
        map.setView(station.coordinates, 15);
      });
    });

    let pulseAnimationId: ReturnType<typeof setInterval> | null = null;

    // Request user location with continuous watching for movement
    if ('geolocation' in navigator) {
      let isFirstPosition = true;
      let permissionToastShown = false;
      let lastStatePushAt = 0;
      let lastPushedLat = 0;
      let lastPushedLng = 0;

      // Use watchPosition for continuous tracking (updates when user moves)
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          if (!isFirstPosition && position.coords.accuracy > 30) {
            // Low-confidence fix — moving the marker here causes visible jumps.
            // Escape hatch: accept it anyway if the user clearly moved (~50 m),
            // else devices with sustained >30 m accuracy would freeze the dot
            // at the first fix forever.
            const farMoved =
              Math.abs(latitude - lastPushedLat) > 0.0005 ||
              Math.abs(longitude - lastPushedLng) > 0.0005;
            if (!farMoved) return;
          }

          // Markers update imperatively below; throttle the React state push
          // (which re-renders this whole component) to once per 2 seconds, and
          // skip entirely when stationary (<10 m) so BottomPanel/SearchBar memo
          // isn't defeated by fresh array identity every tick.
          const now = Date.now();
          const movedEnough =
            Math.abs(latitude - lastPushedLat) > 0.0001 ||
            Math.abs(longitude - lastPushedLng) > 0.0001;
          if (now - lastStatePushAt > 2000 && (isFirstPosition || movedEnough)) {
            lastStatePushAt = now;
            lastPushedLat = latitude;
            lastPushedLng = longitude;
            setUserLocation([latitude, longitude]);
          }

          if (isFirstPosition) {
            // First time: create markers and center map
            isFirstPosition = false;
            
            // Add user marker
            userMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              fillColor: '#3B82F6',
              color: '#FFFFFF',
              weight: 3,
              fillOpacity: 1,
            }).addTo(map);

            // Add pulsing effect
            userPulseRef.current = L.circleMarker([latitude, longitude], {
              radius: 20,
              fillColor: '#3B82F6',
              color: '#3B82F6',
              weight: 1,
              fillOpacity: 0.2,
              opacity: 0.5,
            }).addTo(map);

            // Simple pulse animation
            let growing = true;
            pulseAnimationId = setInterval(() => {
              if (userPulseRef.current) {
                const currentRadius = userPulseRef.current.getRadius();
                if (growing) {
                  userPulseRef.current.setRadius(currentRadius + 0.5);
                  if (currentRadius >= 25) growing = false;
                } else {
                  userPulseRef.current.setRadius(currentRadius - 0.5);
                  if (currentRadius <= 15) growing = true;
                }
              }
            }, 100);

            // Center on user
            map.setView([latitude, longitude], 14);
            
            // Update nearest station only on initial position fix
            updateNearestStation(latitude, longitude);
          } else {
            // Update existing markers to new position (no nearest station update)
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([latitude, longitude]);
            }
            if (userPulseRef.current) {
              userPulseRef.current.setLatLng([latitude, longitude]);
            }
          }
        },
        (error) => {
          console.warn('Initial geolocation watch unavailable:', error.message);

          // Fit to all stations if location unavailable on startup
          if (!permissionToastShown) {
            permissionToastShown = true;
            const allCoords = Object.values(stations).map(s => s.coordinates);
            if (allCoords.length > 0) {
              map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
            }
          }
        },
        { 
          enableHighAccuracy: false, 
          timeout: 15000,
          maximumAge: 120000 // Allow cached network/GPS position up to 2 minutes old
        }
      );
    }

    return () => {
      // Clear geolocation watch
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      if (pulseAnimationId !== null) {
        clearInterval(pulseAnimationId);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // `language` intentionally omitted: including it tears down and rebuilds the
    // whole map on every language switch. The label-swap effect above (~line 200)
    // already updates station labels in place.
  }, [handleLocationUpdate, handleLocationSelect, updateNearestStation, toast]);

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
        @keyframes train-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        .train-marker-icon {
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          z-index: 1000 !important;
        }
        .train-marker-icon,
        .train-marker-icon *,
        .train-marker-icon div,
        .train-marker-icon svg {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .train-icon-wrapper {
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
          transition: transform 0.15s ease-out;
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        .train-icon-wrapper:hover {
          transform: scale(1.1);
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
      <SideMenu onOpenRoutePlanner={() => {
        // Default the journey start to the user's nearest station.
        setRoutePlannerOrigin(nearestStation?.id);
        setIsRoutePlannerOpen(true);
      }} />

      {/* Active Metros indicator */}
      {activeTrainCount > 0 && (
        <div className="fixed top-20 left-4 z-[1000] bg-background/70 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border flex items-center gap-2 animate-fade-in pointer-events-none">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-sm font-medium">{activeTrainCount} metros running</span>
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
      {selectedTrain && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTrain(null)}>
          <div 
            className="bg-background rounded-2xl shadow-2xl border border-border max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: LINE_COLORS[selectedTrain.line as keyof typeof LINE_COLORS] }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <svg width="24" height="12" viewBox="0 0 36 18" fill="none">
                      <rect x="2" y="3" width="24" height="12" rx="3" fill="white" />
                      <path d="M26 3 L34 9 L26 15 Z" fill="white" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedTrain.line.charAt(0).toUpperCase() + selectedTrain.line.slice(1)} Line</h3>
                    <p className="text-sm text-white/80">towards {selectedTrain.destination}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTrain(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-muted-foreground" />
                <span>
                  {stations[selectedTrain.fromStationId]?.name || 'Unknown'} → {stations[selectedTrain.toStationId]?.name || 'Unknown'}
                </span>
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
                    <div className="flex items-center gap-3 text-sm">
                      <Users size={16} className="text-muted-foreground" />
                      <span>Crowding: </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${crowd.bgClass} ${crowd.textClass}`}>
                        {crowd.label}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              <button
                onClick={() => {
                  setLiveTrackingDialogOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#FFB347' }}
              >
                <Share2 size={18} />
                Share This Journey
              </button>
              
              <button
                onClick={() => {
                  setTrainDetailsDialogOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl font-medium border border-border bg-muted/50 flex items-center justify-center gap-2 transition-all hover:bg-muted active:scale-[0.98]"
              >
                <Train size={18} />
                View Metro Details
              </button>
            </div>
          </div>
        </div>
      )}

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
