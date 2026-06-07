# Ahmedabad Metro Route Planner

## Overview
A Progressive Web App (PWA) for real-time Ahmedabad Metro route planning with live train tracking. Built with modern React ecosystem and designed for mobile-first experience.

## Technologies
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Leaflet
- **State Management**: TanStack React Query
- **Routing**: React Router v6

## Project Structure
```
src/
├── components/    - React components (MetroMap, RoutePlanner, BottomPanel, etc.)
├── data/          - Metro data, timetables, fare matrices, segment timings
├── lib/           - Utilities (routePlanner, utils)
public/            - Static assets (PWA icons, GeoJSON route data)
index.html         - Entry HTML file
vite.config.ts     - Vite configuration
```

## Development
- **Port**: 5000 (configured for Replit)
- **Start**: `npm run dev`
- **Build**: `npm run build`

## Key Features
- Interactive metro map with all stations
- Route planning between stations with accurate timing
- Real-time train tracking display (50ms refresh for smooth animation)
- Journey sharing via URL parameters
- Friend coordination for shared travel segments
- PWA support for offline usage
- Responsive mobile-first design

## Metro Lines (Updated 16.01.2026)

### LINE 1 - Blue Line (Vastral Gam ↔ Thaltej Gam)
- 18 stations, 21.1 km, 45 min travel time
- Frequency: 7 min (peak), 10 min (off-peak weekday), 12 min (Sunday)
- Operating: 06:20 - 22:00

### LINE 2 - Red Line (APMC ↔ Koteshwar Road)
- 15 stations, 20.2 km, 35 min travel time
- Frequency: Every 12 minutes (all days)
- Operating: 06:16 - 22:11
- Local services + corridor through-running services

### LINE 3 - Green Line (Koteshwar Road ↔ Mahatma Mandir)
- 20 stations, 20.87 km, 43 min travel time
- Frequency: Average 24 minutes
- Operating: 07:33 - 20:09
- Local services + corridor through-running services from APMC

### LINE 4 - Purple Line (GNLU ↔ GIFT City)
- 3 stations, 5.8 km, 6 min travel time
- Limited service with bus gap 10:18 - 16:06
- Morning: ~49 min avg, Evening: ~57 min avg
- Operating: 07:36 - 19:13

## Service Patterns
1. **Corridor Services (Through-running)**: Direct APMC → Mahatma Mandir/GIFT City trains (no transfer required)
2. **Local Line Services**: Separate line operations with transfer at Koteshwar Road
3. **Conflict Resolution**: Local services are skipped when within 5 minutes of corridor services to avoid duplicate trains

## Crowding System (Updated 21.01.2026)

Dynamic crowding levels based on service type, time of day, and position along route.

### Base Crowding Rules
| Service Type | Peak Hours (8-11, 17-20) | Off-Peak | Weekend |
|--------------|--------------------------|----------|---------|
| Corridor (APMC ↔ Mahatma Mandir) | Heavy | Heavy | Heavy |
| Blue Line (Thaltej ↔ Vastral) | Heavy | Moderate | Low |
| Red Local (APMC ↔ Koteshwar) | Moderate | Low | Low |
| Green Local (Koteshwar ↔ Mahatma Mandir) | Moderate | Low | Low |
| Purple Line | Moderate | Low | Low |

### Dynamic Position Modifiers
- Early in journey (0-30% of route): One level lower
- Middle of journey (30-70%): Base level
- Late in journey (70-100%): One level higher
- Morning peak: Inbound trains get more crowded
- Evening peak: Outbound trains get more crowded

## Key Files
- `src/data/timetable.ts` - Train schedules, corridor departures, schedule generation
- `src/data/segmentTimings.ts` - Travel times between segments
- `src/lib/routePlanner.ts` - Route planning algorithms, journey progress calculation
- `src/lib/crowding.ts` - Dynamic crowding calculation system
- `src/lib/commuteStorage.ts` - Daily commute localStorage persistence
- `src/components/MetroMap.tsx` - Map rendering, live train tracking, train share popup
- `src/components/RoutePlanner.tsx` - Journey planning UI, sharing functionality
- `src/components/FriendsJourneyViewer.tsx` - Shared journey viewing and coordination
- `src/components/CommuteCard.tsx` - Smart commute popup card
- `src/components/OfflineIndicator.tsx` - Offline/online status banner

## Additional Features (Updated 21.01.2026)
- **Daily Commute**: Save home/work stations, get smart popup with next 3 trains when near commute stations
- **Simulated Location**: Long-press (mobile) or right-click (desktop) anywhere on map to simulate "if I start from here"
- **Map Bounds**: Locked to Gujarat region (minZoom 10) to keep focus on metro coverage
- **Continuous Location**: Uses watchPosition for automatic nearest station updates as user moves
- **Offline Mode**: Service worker caches all app assets, map tiles, and geocoding results

## Environment Variables
- `VITE_ORS_API_KEY` - OpenRouteService API key for walking route calculations

## Deployment
- **Type**: Static site (PWA)
- **Build**: `npm run build`
- **Output**: `dist/` directory
- Production builds drop console logs and enable full PWA caching
