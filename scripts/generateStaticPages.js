/**
 * Comprehensive Static Site Generation (SSG) & Deep Route Indexing Engine
 * 
 * Generates pre-rendered static HTML landing pages for:
 * 1. All 53 Metro Stations (/station/[slug]/index.html)
 * 2. 342+ Top Commuter Routes (/route/[fromSlug]-to-[toSlug]/index.html)
 *    - Title: "Ahmedabad Metro: [From] to [To] Route, Fare & Stations | AhmMetro"
 *    - Detailed stop-by-stop station sequence with line badges
 * 3. High-Intent Core Search Landing Pages:
 *    - /map/index.html (Ahmedabad Metro map)
 *    - /stations/index.html (Ahmedabad Metro stations directory)
 *    - /routes/index.html & /route/index.html (Ahmedabad Metro route planner)
 *    - /fare/index.html & /fare-chart/index.html (Ahmedabad Metro fare calculator)
 *    - /timings/index.html (Ahmedabad Metro timings & schedule)
 *    - /airport/index.html (Ahmedabad Metro to airport guide)
 *    - /parking/index.html (Ahmedabad Metro parking facilities & charges)
 *    - /interchange/index.html (Ahmedabad Metro interchange stations guide)
 * 4. 4 Metro Line Corridors (/line/[lineSlug]/index.html)
 */

import fs from 'fs';
import path from 'path';
import { stations } from '../src/data/metroData.ts';
import { NETWORK_FARE_MATRIX, ALL_STATIONS_INDEX } from '../src/data/fareData.ts';
import { stationToSlug, routeToSlug, METRO_LINES } from '../src/lib/seoRoutes.ts';

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const TIMETABLE_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'timetableFromExcel.generated.json');

const CURRENT_DATE = new Date();
const CURRENT_MONTH_NAME = CURRENT_DATE.toLocaleString('en-US', { month: 'long' });
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH_YEAR = `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;

const timetable = JSON.parse(fs.readFileSync(TIMETABLE_PATH, 'utf8'));

// Helper: Convert "HH:MM" to minutes from midnight
function timeToMins(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Helper: Convert minutes from midnight to "HH:MM AM/PM"
function minsToTime(mins) {
  if (mins === null || mins === undefined) return '06:20 AM';
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = String(m).padStart(2, '0');
  return `${String(displayH).padStart(2, '0')}:${displayM} ${period}`;
}

// Corridors ordered station list
const CORRIDORS = {
  blue: [
    'thaltej_gam', 'thaltej', 'doordarshan_kendra', 'gurukul_road',
    'gujarat_university', 'commerce_six_road', 'stadium', 'old_high_court',
    'shahpur', 'gheekanta', 'kalupur', 'kankaria_east',
    'apparel_park', 'amraiwadi', 'rabari_colony', 'vastral',
    'nirant_cross_roads', 'vastral_gam'
  ],
  red: [
    'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas',
    'paldi', 'gandhigram', 'old_high_court', 'usmanpura',
    'vijay_nagar', 'vadaj', 'ranip', 'aec',
    'sabarmati', 'motera_stadium', 'koteshwar_road'
  ],
  green: [
    'koteshwar_road', 'vishwakarma_college', 'tapovan_circle', 'narmada_canal',
    'koba_circle', 'juna_koba', 'koba_gam', 'gnlu',
    'raysan', 'randesan', 'dholakuva_circle', 'infocity',
    'sector_1', 'sector_10a', 'sachivalaya', 'akshardham',
    'juna_sachivalaya', 'sector_16', 'sector_24', 'mahatma_mandir'
  ],
  purple: [
    'gnlu', 'pdpu', 'gift_city'
  ]
};

// Compute exact intermediate station sequence between fromId and toId
function computeStationSequence(fromId, toId) {
  // Check if same corridor
  for (const [line, list] of Object.entries(CORRIDORS)) {
    const i = list.indexOf(fromId);
    const j = list.indexOf(toId);
    if (i !== -1 && j !== -1) {
      const slice = i <= j ? list.slice(i, j + 1) : list.slice(j, i + 1).reverse();
      return {
        isDirect: true,
        interchange: null,
        stations: slice,
      };
    }
  }

  // Check Blue <-> Red via Old High Court
  const fromBlue = CORRIDORS.blue.indexOf(fromId) !== -1;
  const toRed = CORRIDORS.red.indexOf(toId) !== -1;
  const fromRed = CORRIDORS.red.indexOf(fromId) !== -1;
  const toBlue = CORRIDORS.blue.indexOf(toId) !== -1;

  if ((fromBlue && toRed) || (fromRed && toBlue)) {
    const leg1 = fromBlue
      ? computeStationSequence(fromId, 'old_high_court').stations
      : computeStationSequence(fromId, 'old_high_court').stations;
    const leg2 = toRed
      ? computeStationSequence('old_high_court', toId).stations
      : computeStationSequence('old_high_court', toId).stations;
    return {
      isDirect: false,
      interchange: 'Old High Court',
      stations: [...leg1, ...leg2.slice(1)],
    };
  }

  // Check Red <-> Green via Koteshwar Road
  const toGreen = CORRIDORS.green.indexOf(toId) !== -1;
  const fromGreen = CORRIDORS.green.indexOf(fromId) !== -1;
  if ((fromRed && toGreen) || (fromGreen && toRed)) {
    const leg1 = computeStationSequence(fromId, 'koteshwar_road').stations;
    const leg2 = computeStationSequence('koteshwar_road', toId).stations;
    return {
      isDirect: false,
      interchange: 'Koteshwar Road',
      stations: [...leg1, ...leg2.slice(1)],
    };
  }

  // Check Green <-> Purple via GNLU
  const toPurple = CORRIDORS.purple.indexOf(toId) !== -1;
  const fromPurple = CORRIDORS.purple.indexOf(fromId) !== -1;
  if ((fromGreen && toPurple) || (fromPurple && toGreen)) {
    const leg1 = computeStationSequence(fromId, 'gnlu').stations;
    const leg2 = computeStationSequence('gnlu', toId).stations;
    return {
      isDirect: false,
      interchange: 'GNLU',
      stations: [...leg1, ...leg2.slice(1)],
    };
  }

  // Check Blue <-> Green via Old High Court & Koteshwar Road
  if (fromBlue && toGreen) {
    const leg1 = computeStationSequence(fromId, 'old_high_court').stations;
    const leg2 = computeStationSequence('old_high_court', 'koteshwar_road').stations;
    const leg3 = computeStationSequence('koteshwar_road', toId).stations;
    return {
      isDirect: false,
      interchange: 'Old High Court',
      stations: [...leg1, ...leg2.slice(1), ...leg3.slice(1)],
    };
  }
  if (fromGreen && toBlue) {
    const leg1 = computeStationSequence(fromId, 'koteshwar_road').stations;
    const leg2 = computeStationSequence('koteshwar_road', 'old_high_court').stations;
    const leg3 = computeStationSequence('old_high_court', toId).stations;
    return {
      isDirect: false,
      interchange: 'Old High Court',
      stations: [...leg1, ...leg2.slice(1), ...leg3.slice(1)],
    };
  }

  // Check Blue/Red <-> Purple via GNLU
  if (toPurple) {
    const seqToGnlu = computeStationSequence(fromId, 'gnlu');
    const leg2 = computeStationSequence('gnlu', toId).stations;
    return {
      isDirect: false,
      interchange: seqToGnlu.interchange || 'GNLU',
      stations: [...seqToGnlu.stations, ...leg2.slice(1)],
    };
  }
  if (fromPurple) {
    const leg1 = computeStationSequence(fromId, 'gnlu').stations;
    const seqFromGnlu = computeStationSequence('gnlu', toId);
    return {
      isDirect: false,
      interchange: 'GNLU',
      stations: [...leg1, ...seqFromGnlu.stations.slice(1)],
    };
  }

  return {
    isDirect: false,
    interchange: 'Old High Court',
    stations: [fromId, toId],
  };
}

// Build station transit statistics
const stationStats = {};
for (const [id, st] of Object.entries(stations)) {
  stationStats[id] = {
    id,
    slug: stationToSlug(id),
    name: st.name,
    nameGu: st.nameGu || st.name,
    nameHi: st.nameHi || st.name,
    lines: st.lines,
    isUnderground: Boolean(st.isUnderground),
    isInterchange: Boolean(st.isInterchange),
    coordinates: st.coordinates,
    firstTrainWeekday: null,
    lastTrainWeekday: null,
    firstTrainSunday: null,
    lastTrainSunday: null,
    dailyTripsWeekday: 0,
    dailyTripsSunday: 0,
  };
}

for (const trip of timetable.trainSchedules) {
  const startMins = timeToMins(trip.startTime);
  const isSunday = trip.dayType === 'Sunday';

  trip.stations.forEach((stId, idx) => {
    const stat = stationStats[stId];
    if (!stat) return;

    const depMins = startMins + trip.stationTimes[idx];

    if (isSunday) {
      stat.dailyTripsSunday++;
      if (stat.firstTrainSunday === null || depMins < stat.firstTrainSunday) {
        stat.firstTrainSunday = depMins;
      }
      if (stat.lastTrainSunday === null || depMins > stat.lastTrainSunday) {
        stat.lastTrainSunday = depMins;
      }
    } else {
      stat.dailyTripsWeekday++;
      if (stat.firstTrainWeekday === null || depMins < stat.firstTrainWeekday) {
        stat.firstTrainWeekday = depMins;
      }
      if (stat.lastTrainWeekday === null || depMins > stat.lastTrainWeekday) {
        stat.lastTrainWeekday = depMins;
      }
    }
  });
}

function getLineBadgesHtml(lineKeys) {
  return lineKeys.map(key => {
    const line = METRO_LINES[key];
    if (!line) return '';
    return `<span class="badge" style="background-color: ${line.color}15; color: ${line.color}; border: 1px solid ${line.color}40;">
      <span class="dot" style="background-color: ${line.color};"></span>
      ${line.name.split('(')[0].trim()}
    </span>`;
  }).join(' ');
}

const LINE_NAMES = {
  blue: 'Blue Line (East-West Corridor)',
  red: 'Red Line (North-South Corridor)',
  green: 'Green Line (Gandhinagar Extension)',
  purple: 'Purple Line (GIFT City Branch)',
};

function getLegDirection(fromId, toId) {
  for (const [line, list] of Object.entries(CORRIDORS)) {
    const i = list.indexOf(fromId);
    const j = list.indexOf(toId);
    if (i !== -1 && j !== -1) {
      const lineName = line === 'blue' ? 'Blue Line (East-West)'
        : line === 'red' ? 'Red Line (North-South)'
        : line === 'green' ? 'Green Line (Gandhinagar Corridor)'
        : 'Purple Line (GIFT City Branch)';
      const terminalId = i < j ? list[list.length - 1] : list[0];
      const terminalName = stations[terminalId]?.name || terminalId;
      return { line, lineName, terminalName, isForward: i < j };
    }
  }
  return { line: 'blue', lineName: 'Metro Line', terminalName: 'Terminal', isForward: true };
}

const KEY_HUBS = [
  'kalupur', 'thaltej', 'thaltej_gam', 'vastral_gam', 'vastral', 'motera_stadium',
  'apmc', 'paldi', 'old_high_court', 'ranip', 'sabarmati',
  'gnlu', 'gift_city', 'infocity', 'sachivalaya', 'akshardham',
  'mahatma_mandir', 'koteshwar_road', 'kankaria_east', 'gujarat_university',
  'gurukul_road', 'doordarshan_kendra', 'commerce_six_road', 'stadium',
  'shahpur', 'gheekanta', 'apparel_park', 'amraiwadi', 'rabari_colony',
  'jivraj_park', 'gandhigram', 'usmanpura', 'vadaj', 'aec',
  'nirant_cross_roads', 'shreyas', 'randesan', 'raysan',
];

// Generate commuter routes
const ROUTE_LIST = [];
for (const fromId of KEY_HUBS) {
  for (const toId of KEY_HUBS) {
    if (fromId === toId) continue;

    const fromIdx = ALL_STATIONS_INDEX[fromId];
    const toIdx = ALL_STATIONS_INDEX[toId];
    if (fromIdx === undefined || toIdx === undefined) continue;

    const fare = NETWORK_FARE_MATRIX[fromIdx][toIdx] || 20;
    const discountFare = Math.round(fare * 0.9 * 10) / 10;
    const fromSt = stationStats[fromId];
    const toSt = stationStats[toId];

    const seqInfo = computeStationSequence(fromId, toId);
    const stopsCount = Math.max(1, seqInfo.stations.length - 1);
    const travelTimeMins = stopsCount * 2 + (seqInfo.interchange ? 5 : 0);
    const distanceKm = (stopsCount * 1.3).toFixed(1);

    const firstTrain = minsToTime(fromSt.firstTrainWeekday || 380);
    const lastTrain = minsToTime(fromSt.lastTrainWeekday || 1320);

    let boardingGuideHtml = '';
    if (seqInfo.isDirect) {
      const dir = getLegDirection(fromId, toId);
      boardingGuideHtml = `At <strong>${fromSt.name}</strong>, head to the platform and board the <strong>${dir.lineName}</strong> train heading towards <strong>${dir.terminalName}</strong>. Travel ${stopsCount} stops and alight at <strong>${toSt.name}</strong>.`;
    } else if (seqInfo.interchange === 'Old High Court') {
      const dir1 = getLegDirection(fromId, 'old_high_court');
      const dir2 = getLegDirection('old_high_court', toId);
      boardingGuideHtml = `1. At <strong>${fromSt.name}</strong>, board the <strong>${dir1.lineName}</strong> train heading towards <strong>${dir1.terminalName}</strong>.<br>2. Alight at <strong>Old High Court Interchange</strong> and follow overhead illuminated signage to transfer between Level 1 (Blue Line) and Level 2 (Red Line) without exiting the paid fare gates.<br>3. Board the <strong>${dir2.lineName}</strong> train heading towards <strong>${dir2.terminalName}</strong> and alight at your destination: <strong>${toSt.name}</strong>.`;
    } else if (seqInfo.interchange === 'Koteshwar Road') {
      const dir1 = getLegDirection(fromId, 'koteshwar_road');
      const dir2 = getLegDirection('koteshwar_road', toId);
      boardingGuideHtml = `1. At <strong>${fromSt.name}</strong>, board the <strong>${dir1.lineName}</strong> train heading towards <strong>${dir1.terminalName}</strong>.<br>2. Alight at <strong>Koteshwar Road Interchange</strong> and transfer between Red Line and Green Line.<br>3. Board the <strong>${dir2.lineName}</strong> train heading towards <strong>${dir2.terminalName}</strong> and alight at <strong>${toSt.name}</strong>.`;
    } else if (seqInfo.interchange === 'GNLU') {
      const dir1 = getLegDirection(fromId, 'gnlu');
      const dir2 = getLegDirection('gnlu', toId);
      boardingGuideHtml = `1. At <strong>${fromSt.name}</strong>, board the <strong>${dir1.lineName}</strong> train heading towards <strong>${dir1.terminalName}</strong>.<br>2. Alight at <strong>GNLU Interchange</strong> and head to the GIFT City branch platform.<br>3. Board the <strong>${dir2.lineName}</strong> shuttle train heading towards <strong>${dir2.terminalName}</strong> and alight at <strong>${toSt.name}</strong>.`;
    } else {
      boardingGuideHtml = `Board metro train from <strong>${fromSt.name}</strong> towards your destination <strong>${toSt.name}</strong>. Follow directional platform signage.`;
    }

    ROUTE_LIST.push({
      fromId,
      fromName: fromSt.name,
      fromSlug: stationToSlug(fromId),
      toId,
      toName: toSt.name,
      toSlug: stationToSlug(toId),
      routeSlug: routeToSlug(fromId, toId),
      fare,
      discountFare,
      stopsCount,
      travelTimeMins,
      distanceKm,
      interchange: seqInfo.interchange,
      firstTrain,
      lastTrain,
      fromLines: fromSt.lines,
      toLines: toSt.lines,
      pathStationIds: seqInfo.stations,
      boardingGuideHtml,
    });
  }
}

// Extract base HTML template assets from dist/index.html or index.html
let baseTemplateHtml = '';
const distIndexHtmlPath = path.join(DIST_DIR, 'index.html');
const rootIndexHtmlPath = path.join(PROJECT_ROOT, 'index.html');

if (fs.existsSync(distIndexHtmlPath)) {
  baseTemplateHtml = fs.readFileSync(distIndexHtmlPath, 'utf8');
} else if (fs.existsSync(rootIndexHtmlPath)) {
  baseTemplateHtml = fs.readFileSync(rootIndexHtmlPath, 'utf8');
}

const stylesheetLinks = (baseTemplateHtml.match(/<link[^>]*rel="stylesheet"[^>]*>/gi) || []).join('\n    ');
const fontLinks = (baseTemplateHtml.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi) || []).join('\n    ');
const scriptTags = (baseTemplateHtml.match(/<script[^>]*src="\/assets\/[^>]*>.*?<\/script>/gi) || []).join('\n    ');
const pwaScript = baseTemplateHtml.includes('/registerSW.js') ? '<script id="vite-plugin-pwa:register-sw" src="/registerSW.js"></script>' : '';

const STATIC_CSS = `
  :root {
    --brand-blue: #0066CC;
    --brand-blue-dark: #004C99;
    --brand-red: #DC2626;
    --brand-green: #16A34A;
    --brand-purple: #9333EA;
    --bg-main: #0B1120;
    --bg-card: #131D31;
    --bg-card-hover: #1A2642;
    --text-primary: #F8FAFC;
    --text-secondary: #94A3B8;
    --text-muted: #64748B;
    --border-color: #1E293B;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--bg-main);
    color: var(--text-primary);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: #38BDF8; text-decoration: none; transition: color 0.15s ease; }
  a:hover { color: #7DD3FC; text-decoration: underline; }
  .header {
    border-bottom: 1px solid var(--border-color);
    background: rgba(11, 17, 32, 0.85);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 0.75rem 1.25rem;
  }
  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand-logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 1.35rem;
    font-weight: 800;
    color: #FFFFFF;
    text-decoration: none !important;
  }
  .brand-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #0066CC, #38BDF8);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    font-size: 0.88rem;
    font-weight: 500;
  }
  .nav-links a { color: var(--text-secondary); }
  .nav-links a:hover { color: #FFFFFF; text-decoration: none; }
  .cta-btn {
    background: #0066CC;
    color: #FFFFFF !important;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.88rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    transition: background 0.15s ease;
    text-decoration: none !important;
  }
  .cta-btn:hover { background: #0052A3; }
  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
  }
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .breadcrumbs a { color: var(--text-secondary); }
  .hero-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  }
  .badge-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
  }
  .badge .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .badge-gray {
    background: #1E293B;
    color: #94A3B8;
    border: 1px solid #334155;
  }
  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }
  .regional-names {
    font-size: 1.15rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  .hero-desc {
    font-size: 1.05rem;
    color: #CBD5E1;
    max-width: 850px;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }
  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
  }
  .stat-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
    font-weight: 600;
  }
  .stat-val {
    font-size: 1.4rem;
    font-weight: 700;
    color: #F8FAFC;
  }
  .stat-sub {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-top: 0.2rem;
  }
  .section-title {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 2.5rem 0 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .table-wrapper {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow-x: auto;
    margin-bottom: 2rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
    text-align: left;
  }
  th {
    background: rgba(30, 41, 59, 0.7);
    padding: 0.9rem 1.1rem;
    color: var(--text-secondary);
    font-weight: 600;
    border-bottom: 1px solid var(--border-color);
  }
  td {
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid var(--border-color);
    color: #E2E8F0;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }
  .stations-timeline {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.75rem;
    margin-bottom: 2rem;
  }
  .timeline-item {
    display: flex;
    gap: 1.25rem;
    position: relative;
    padding-bottom: 1.5rem;
  }
  .timeline-item:last-child { padding-bottom: 0; }
  .timeline-item::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 28px;
    bottom: 0;
    width: 2px;
    background: #1E293B;
  }
  .timeline-item:last-child::before { display: none; }
  .timeline-item.active::before { background: #0066CC; }
  .timeline-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1E293B;
    border: 2px solid #334155;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: #94A3B8;
    flex-shrink: 0;
    z-index: 1;
  }
  .timeline-item.origin .timeline-dot {
    background: #0066CC;
    border-color: #38BDF8;
    color: #FFFFFF;
  }
  .timeline-item.dest .timeline-dot {
    background: #16A34A;
    border-color: #86EFAC;
    color: #FFFFFF;
  }
  .timeline-item.transfer .timeline-dot {
    background: #9333EA;
    border-color: #C084FC;
    color: #FFFFFF;
  }
  .timeline-content {
    flex: 1;
    padding-top: 0.2rem;
  }
  .timeline-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: #F8FAFC;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .timeline-sub {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-top: 0.15rem;
  }
  .route-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .route-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    transition: transform 0.15s ease, border-color 0.15s ease;
    display: block;
    color: inherit !important;
    text-decoration: none !important;
  }
  .route-card:hover {
    transform: translateY(-2px);
    border-color: #0066CC;
  }
  .route-card-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.6rem;
  }
  .route-dest {
    font-size: 1.1rem;
    font-weight: 700;
    color: #F8FAFC;
  }
  .route-fare {
    font-size: 1.1rem;
    font-weight: 800;
    color: #38BDF8;
  }
  .route-details {
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    gap: 0.75rem;
  }
  .faq-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    margin-bottom: 0.75rem;
    overflow: hidden;
  }
  summary {
    padding: 1.1rem 1.25rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #F1F5F9;
  }
  summary::-webkit-details-marker { display: none; }
  summary::after {
    content: '+';
    font-size: 1.3rem;
    color: var(--text-muted);
  }
  details[open] summary::after {
    content: '−';
  }
  .faq-body {
    padding: 0 1.25rem 1.25rem;
    font-size: 0.93rem;
    color: #CBD5E1;
    line-height: 1.6;
    border-top: 1px solid var(--border-color);
    padding-top: 0.9rem;
  }
  .footer {
    border-top: 1px solid var(--border-color);
    background: #080D1A;
    padding: 3rem 1.25rem 2rem;
    color: var(--text-muted);
    font-size: 0.88rem;
  }
  .footer-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }
  .footer-col h4 {
    color: #F8FAFC;
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }
  .footer-col ul { list-style: none; }
  .footer-col li { margin-bottom: 0.5rem; }
  .footer-col a { color: var(--text-secondary); font-size: 0.85rem; }
  .footer-col a:hover { color: #FFFFFF; }
  .footer-bottom {
    max-width: 1100px;
    margin: 0 auto;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  @media (max-width: 768px) {
    h1 { font-size: 1.75rem; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .container { padding-top: 1.25rem; }
    .nav-links { display: none; }
  }
`;

function buildHtmlPage({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  jsonLdArray,
  bodyContent,
}) {
  const jsonLdScripts = jsonLdArray.map(obj => 
    `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`
  ).join('\n  ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="google-play-app" content="app-id=ahmedabadmetro.site" />
    <link rel="alternate" href="android-app://ahmedabadmetro.site/https/www.ahmedabadmetro.site/" />
    <link rel="alternate" hreflang="en-IN" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
    
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="https://www.ahmedabadmetro.site/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="AhmMetro" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="https://www.ahmedabadmetro.site/og-image.png" />
    
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
    <link rel="apple-touch-icon" href="/pwa-192x192.png" />
    <meta name="theme-color" content="#0066CC" />

    ${fontLinks}
    ${stylesheetLinks}
    <style>${STATIC_CSS}</style>
    ${jsonLdScripts}
  </head>
  <body>
    <div id="root">
      ${bodyContent}
    </div>
    
    ${scriptTags}
    ${pwaScript}
  </body>
</html>`;
}

function renderHeader() {
  return `
    <header class="header">
      <div class="header-inner">
        <a href="/" class="brand-logo">
          <div class="brand-icon">🚇</div>
          <span>AhmMetro</span>
        </a>
        <nav class="nav-links">
          <a href="/routes">Route Planner</a>
          <a href="/map">Metro Map</a>
          <a href="/stations">Stations</a>
          <a href="/fare">Fare Calculator</a>
          <a href="/timings">Timings</a>
          <a href="/airport">Airport Guide</a>
          <a href="/parking">Parking</a>
          <a href="/interchange">Interchange</a>
        </nav>
        <a href="/" class="cta-btn">
          <span>Open Interactive Map</span>
          <span>→</span>
        </a>
      </div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-col">
          <h4>AhmMetro Network</h4>
          <ul>
            <li><a href="/map">Full Network Metro Map</a></li>
            <li><a href="/stations">All 53 Stations Directory</a></li>
            <li><a href="/line/blue-line">Blue Line (East-West)</a></li>
            <li><a href="/line/red-line">Red Line (North-South)</a></li>
            <li><a href="/line/green-line">Green Line (Gandhinagar)</a></li>
            <li><a href="/line/purple-line">Purple Line (GIFT City)</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Essential Commuter Guides</h4>
          <ul>
            <li><a href="/fare">Official Metro Fare Slabs</a></li>
            <li><a href="/timings">Network Operating Timetable</a></li>
            <li><a href="/airport">Ahmedabad Metro to Airport</a></li>
            <li><a href="/parking">Metro Parking Rates &amp; Stations</a></li>
            <li><a href="/interchange">Interchange Guide (Old High Court)</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Top Commuter Routes</h4>
          <ul>
            <li><a href="/route/thaltej-to-vastral-gam">Thaltej to Vastral Route</a></li>
            <li><a href="/route/kalupur-to-motera-stadium">Kalupur to Motera Stadium</a></li>
            <li><a href="/route/thaltej-to-kalupur">Thaltej to Kalupur</a></li>
            <li><a href="/route/kalupur-to-gift-city">Kalupur to GIFT City</a></li>
            <li><a href="/route/gnlu-to-gift-city">GNLU to GIFT City</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Mobile Transit App</h4>
          <p style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.85rem;">Offline timetables, GPS nearest station finder, and live route animations on Android.</p>
          <a href="https://play.google.com/store/apps/details?id=ahmedabadmetro.site" class="cta-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
            <span>Get on Google Play</span>
          </a>
        </div>
      </div>
      <div class="footer-bottom">
        <div>© ${new Date().getFullYear()} AhmMetro. Community transit guide for Gujarat Metro Rail Corporation (GMRC) network.</div>
        <div>
          <a href="/privacy.html" style="margin-right: 1rem;">Privacy Policy</a>
          <a href="/sitemap.xml">XML Sitemap</a>
        </div>
      </div>
    </footer>
  `;
}

function writeHtmlFile(relPath, content) {
  const distTarget = path.join(DIST_DIR, relPath);
  const publicTarget = path.join(PUBLIC_DIR, relPath);

  fs.mkdirSync(path.dirname(distTarget), { recursive: true });
  fs.writeFileSync(distTarget, content, 'utf8');

  fs.mkdirSync(path.dirname(publicTarget), { recursive: true });
  fs.writeFileSync(publicTarget, content, 'utf8');
}

// ==========================================
// 1. GENERATE ALL 53 STATION PAGES
// ==========================================
console.log('Generating 53 Station Static Pages...');
let stationCount = 0;

for (const [id, st] of Object.entries(stationStats)) {
  const slug = st.slug;
  const canonicalUrl = `https://www.ahmedabadmetro.site/station/${slug}`;
  const stationLinesStr = st.lines.map(l => LINE_NAMES[l] || l).join(' & ');
  const title = `${st.name} Metro Station Timings, First & Last Train, Fare & Facilities | Ahmedabad Metro`;
  const description = `Complete guide for ${st.name} Metro Station on ${stationLinesStr}. First train ${minsToTime(st.firstTrainWeekday)}, last train ${minsToTime(st.lastTrainWeekday)}. Fares, platforms, interchange, live schedule, and facilities.`;

  const popularDests = KEY_HUBS
    .filter(destId => destId !== id)
    .slice(0, 10)
    .map(destId => {
      const destSt = stationStats[destId];
      const fromIdx = ALL_STATIONS_INDEX[id];
      const toIdx = ALL_STATIONS_INDEX[destId];
      const fare = fromIdx !== undefined && toIdx !== undefined ? NETWORK_FARE_MATRIX[fromIdx][toIdx] || 20 : 20;
      const stops = Math.max(3, Math.min(Math.abs(fromIdx - toIdx) || 5, 25));
      const timeMins = stops * 2 + (st.isInterchange || destSt.isInterchange ? 5 : 0);
      return {
        destName: destSt.name,
        destSlug: stationToSlug(destId),
        routeSlug: routeToSlug(id, destId),
        fare,
        stops,
        timeMins,
      };
    });

  const transitStopSchema = {
    '@context': 'https://schema.org',
    '@type': 'TransitStop',
    name: `${st.name} Metro Station`,
    alternateName: [st.nameGu, st.nameHi],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: st.coordinates[0],
      longitude: st.coordinates[1],
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${st.coordinates[0]},${st.coordinates[1]}`,
    isAccessibleForFree: false,
    publicTransportDetails: {
      '@type': 'BusOrCoachReservation',
      provider: {
        '@type': 'Organization',
        name: 'Gujarat Metro Rail Corporation (GMRC)',
      },
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Stations', item: 'https://www.ahmedabadmetro.site/stations' },
      { '@type': 'ListItem', position: 3, name: `${st.name} Metro Station`, item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the first and last train timing at ${st.name} Metro Station?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `On weekdays, the first metro train departs from ${st.name} at ${minsToTime(st.firstTrainWeekday)}, and the last train departs at ${minsToTime(st.lastTrainWeekday)}. On Sundays, service operates from ${minsToTime(st.firstTrainSunday)} to ${minsToTime(st.lastTrainSunday)}.`,
        },
      },
      {
        '@type': 'Question',
        name: `Which metro line is ${st.name} located on?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${st.name} is served by the ${stationLinesStr}. ${st.isInterchange ? 'It is an official interchange station allowing commuters to switch lines.' : ''}`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the ticket fare from ${st.name} Metro Station?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Metro fares from ${st.name} start at ₹5 for adjacent stations and max out at ₹30 for long-distance journeys across the network. Commuters using a GMRC Smart Card or NCMC card receive a 10% discount on every trip.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is ${st.name} an elevated or underground metro station?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${st.name} is an ${st.isUnderground ? 'underground' : 'elevated'} station equipped with ticketing counters, automatic fare collection (AFC) gates, lifts, escalators, and full accessibility features.`,
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <a href="/stations">Stations</a> <span>›</span>
        <span style="color: #F8FAFC;">${st.name}</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          ${getLineBadgesHtml(st.lines)}
          <span class="badge badge-gray">${st.isUnderground ? 'Underground' : 'Elevated'}</span>
          ${st.isInterchange ? '<span class="badge" style="background:#1E3A8A;color:#93C5FD;border:1px solid #3B82F6;">🔄 Interchange Station</span>' : ''}
        </div>
        <h1>${st.name} Metro Station</h1>
        <div class="regional-names">${st.nameGu} • ${st.nameHi}</div>
        <p class="hero-desc">
          Official guide to ${st.name} metro station on the Ahmedabad &amp; Gandhinagar Metro network. Check train arrival schedules, first and last metro timings, official ticket fares, platform information, and nearby connections.
        </p>
        <div class="hero-actions">
          <a href="/?station=${id}" class="cta-btn">
            <span>View on Live Map</span>
            <span>📍</span>
          </a>
          <a href="/fare" class="cta-btn" style="background:#1E293B;color:#F8FAFC;">
            <span>Fare Calculator</span>
          </a>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">First Train (Weekday)</div>
          <div class="stat-val">${minsToTime(st.firstTrainWeekday)}</div>
          <div class="stat-sub">Sunday: ${minsToTime(st.firstTrainSunday)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last Train (Weekday)</div>
          <div class="stat-val">${minsToTime(st.lastTrainWeekday)}</div>
          <div class="stat-sub">Sunday: ${minsToTime(st.lastTrainSunday)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Peak Frequency</div>
          <div class="stat-val">5–7 min</div>
          <div class="stat-sub">Off-peak: 10–15 min</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ticket Fare Range</div>
          <div class="stat-val">₹5 – ₹30</div>
          <div class="stat-sub">10% Off with Smart Card</div>
        </div>
      </section>

      <h2 class="section-title">🕒 Train Timings &amp; Daily Schedule</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Service Type</th>
              <th>First Departure</th>
              <th>Last Departure</th>
              <th>Peak Headway</th>
              <th>Daily Trains</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Monday to Saturday (Weekday)</strong></td>
              <td>${minsToTime(st.firstTrainWeekday)}</td>
              <td>${minsToTime(st.lastTrainWeekday)}</td>
              <td>Every 5–7 minutes</td>
              <td>~${st.dailyTripsWeekday || 72} trips/day</td>
            </tr>
            <tr>
              <td><strong>Sunday &amp; Public Holidays</strong></td>
              <td>${minsToTime(st.firstTrainSunday)}</td>
              <td>${minsToTime(st.lastTrainSunday)}</td>
              <td>Every 12–15 minutes</td>
              <td>~${st.dailyTripsSunday || 50} trips/day</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">🗺️ Popular Routes &amp; Fares from ${st.name}</h2>
      <div class="route-cards-grid">
        ${popularDests.map(r => `
          <a href="/route/${r.routeSlug}" class="route-card">
            <div class="route-card-header">
              <span class="route-dest">to ${r.destName}</span>
              <span class="route-fare">₹${r.fare}</span>
            </div>
            <div class="route-details">
              <span>⏱️ ~${r.timeMins} mins</span>
              <span>•</span>
              <span>🚉 ${r.stops} stops</span>
              <span>•</span>
              <span style="color:#38BDF8;">View Route →</span>
            </div>
          </a>
        `).join('')}
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>What are the first and last train timings at ${st.name}?</summary>
          <div class="faq-body">
            The first metro train departs from ${st.name} at <strong>${minsToTime(st.firstTrainWeekday)}</strong> on weekdays and <strong>${minsToTime(st.firstTrainSunday)}</strong> on Sundays. The last train departs at <strong>${minsToTime(st.lastTrainWeekday)}</strong> on weekdays and <strong>${minsToTime(st.lastTrainSunday)}</strong> on Sundays.
          </div>
        </details>
        <details class="faq-card">
          <summary>What is the metro ticket fare from ${st.name}?</summary>
          <div class="faq-body">
            Official GMRC ticket fares from ${st.name} range from ₹5 for the shortest distance up to ₹30 for maximum distance journeys. Passengers paying with a GMRC Smart Card or RuPay NCMC card receive an automatic 10% discount on each ride.
          </div>
        </details>
        <details class="faq-card">
          <summary>Which lines and connections are available at ${st.name}?</summary>
          <div class="faq-body">
            ${st.name} is on the ${stationLinesStr}. ${st.isInterchange ? 'This station serves as an interchange hub, allowing commuters to switch lines without exiting the fare gates.' : 'It connects seamlessly to city bus (AMTS/BRTS) and local transit hubs.'}
          </div>
        </details>
        <details class="faq-card">
          <summary>What facilities are available at ${st.name} Metro Station?</summary>
          <div class="faq-body">
            ${st.name} is equipped with lifts and escalators for accessibility, automatic ticket vending machines (TVM), security checkpoints, clean drinking water, accessible restrooms, and customer service desks.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [transitStopSchema, breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('station', slug, 'index.html'), html);
  stationCount++;
}

console.log(`Generated ${stationCount} station static pages successfully.`);

// ==========================================
// 2. GENERATE 342 COMMUTER ROUTE PAGES
// User Requirement: "Ahmedabad Metro: Thaltej to Vastral Route, Fare & Stations"
// ==========================================
console.log(`Generating Commuter Route Static Pages (Total: ${ROUTE_LIST.length})...`);
let routeCount = 0;

for (const r of ROUTE_LIST) {
  const canonicalUrl = `https://www.ahmedabadmetro.site/route/${r.routeSlug}`;
  // High-CTR keyword format as requested by user
  const title = `Ahmedabad Metro: ${r.fromName} to ${r.toName} Route, Fare & Stations | AhmMetro`;
  const description = `Complete route guide from ${r.fromName} to ${r.toName} by Ahmedabad Metro. Ticket fare ₹${r.fare} (₹${r.discountFare} with Smart Card), travel time ~${r.travelTimeMins} mins across ${r.stopsCount} stations, first train ${r.firstTrain}, last train ${r.lastTrain}, ${r.interchange ? `transfer at ${r.interchange}` : 'direct train'}.`;

  const trainTripSchema = {
    '@context': 'https://schema.org',
    '@type': 'TrainTrip',
    name: `Ahmedabad Metro: ${r.fromName} to ${r.toName} Route`,
    departureStation: {
      '@type': 'TransitStop',
      name: `${r.fromName} Metro Station`,
    },
    arrivalStation: {
      '@type': 'TransitStop',
      name: `${r.toName} Metro Station`,
    },
    offers: {
      '@type': 'Offer',
      price: r.fare,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: r.stopsCount,
      itemListElement: r.pathStationIds.map((stId, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: `${stations[stId]?.name || stId} Metro Station`,
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Routes', item: 'https://www.ahmedabadmetro.site/routes' },
      { '@type': 'ListItem', position: 3, name: `${r.fromName} to ${r.toName}`, item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the metro ticket price from ${r.fromName} to ${r.toName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The single journey paper token ticket fare from ${r.fromName} to ${r.toName} is ₹${r.fare}. If you use a GMRC Metro Smart Card or NCMC card, you receive an automatic 10% discount, making the fare ₹${r.discountFare}.`,
        },
      },
      {
        '@type': 'Question',
        name: `How long does it take from ${r.fromName} to ${r.toName} by metro?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The journey takes approximately ${r.travelTimeMins} minutes across ${r.stopsCount} stations. ${r.interchange ? `An interchange transfer is required at ${r.interchange}.` : 'This is a direct journey with no train change required.'}`,
        },
      },
      {
        '@type': 'Question',
        name: `Which stations come between ${r.fromName} and ${r.toName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The stations on this route in order are: ${r.pathStationIds.map(id => stations[id]?.name || id).join(' → ')}. Total ${r.stopsCount} stations.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the first and last metro from ${r.fromName} towards ${r.toName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The first metro departs from ${r.fromName} at ${r.firstTrain}, and the last train departs at ${r.lastTrain}. Trains run every 5 to 7 minutes during peak rush hours.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is there any interchange required between ${r.fromName} and ${r.toName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: r.interchange
            ? `Yes, passengers need to switch trains at ${r.interchange} station. Follow the interchange directional signs on the platform.`
            : `No, this is a direct metro route with no line transfer required.`,
        },
      },
      {
        '@type': 'Question',
        name: `Which platform and train direction should I board at ${r.fromName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: r.boardingGuideHtml.replace(/<[^>]+>/g, ''),
        },
      },
      {
        '@type': 'Question',
        name: `What is the luggage allowance on Ahmedabad Metro?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Passengers are permitted up to 15 kg of personal baggage free of charge, with maximum dimensions not exceeding 60 cm x 45 cm x 25 cm. Baggage scanners operate at all station security checkpoints.`,
        },
      },
    ],
  };

  const reverseRouteSlug = routeToSlug(r.toId, r.fromId);

  // Render station timeline HTML
  let timelineHtml = '';
  r.pathStationIds.forEach((stId, idx) => {
    const isOrigin = idx === 0;
    const isDest = idx === r.pathStationIds.length - 1;
    const isTransfer = stId === 'old_high_court' || stId === 'koteshwar_road' || stId === 'gnlu';
    const stObj = stations[stId];
    if (!stObj) return;

    let itemClass = 'timeline-item';
    if (isOrigin) itemClass += ' origin active';
    else if (isDest) itemClass += ' dest';
    else if (isTransfer && r.interchange) itemClass += ' transfer active';
    else itemClass += ' active';

    timelineHtml += `
      <div class="${itemClass}">
        <div class="timeline-dot">${idx + 1}</div>
        <div class="timeline-content">
          <div class="timeline-name">
            <a href="/station/${stationToSlug(stId)}">${stObj.name}</a>
            ${isOrigin ? '<span class="badge" style="background:#0066CC30;color:#38BDF8;font-size:0.75rem;">Board Here</span>' : ''}
            ${isDest ? '<span class="badge" style="background:#16A34A30;color:#86EFAC;font-size:0.75rem;">Destination</span>' : ''}
            ${!isOrigin && !isDest && isTransfer && r.interchange ? `<span class="badge" style="background:#9333EA30;color:#C084FC;font-size:0.75rem;">🔄 Interchange: Transfer Line</span>` : ''}
          </div>
          <div class="timeline-sub">${stObj.nameGu || ''} • ${stObj.nameHi || ''} • ${stObj.isUnderground ? 'Underground' : 'Elevated'}</div>
        </div>
      </div>
    `;
  });

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <a href="/routes">Routes</a> <span>›</span>
        <span style="color: #F8FAFC;">${r.fromName} to ${r.toName}</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">🚆 Commuter Route</span>
          ${r.interchange ? `<span class="badge" style="background:#1E3A8A;color:#93C5FD;border:1px solid #3B82F6;">Transfer at ${r.interchange}</span>` : '<span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">Direct Metro (No Transfer)</span>'}
        </div>
        <h1>Ahmedabad Metro: ${r.fromName} to ${r.toName} Route, Fare &amp; Stations</h1>
        <p class="hero-desc">
          Traveling from <strong>${r.fromName}</strong> to <strong>${r.toName}</strong> by metro? Complete journey breakdown including ticket fare, travel duration, intermediate station sequence, first &amp; last train schedule, and interchange details.
        </p>
        <div class="hero-actions">
          <a href="/?from=${r.fromId}&to=${r.toId}" class="cta-btn">
            <span>Open in Interactive Route Planner</span>
            <span>🚀</span>
          </a>
          <a href="/route/${reverseRouteSlug}" class="cta-btn" style="background:#1E293B;color:#F8FAFC;">
            <span>Reverse: ${r.toName} to ${r.fromName} 🔄</span>
          </a>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Paper Token Fare</div>
          <div class="stat-val">₹${r.fare}</div>
          <div class="stat-sub">Standard single ride</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Smart Card Fare</div>
          <div class="stat-val" style="color:#4ADE80;">₹${r.discountFare}</div>
          <div class="stat-sub">10% discount applied</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Travel Time &amp; Distance</div>
          <div class="stat-val">~${r.travelTimeMins} min</div>
          <div class="stat-sub">${r.stopsCount} stops • ~${r.distanceKm} km</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Interchange Required</div>
          <div class="stat-val" style="font-size:1.15rem;">${r.interchange ? r.interchange : 'None (Direct)'}</div>
          <div class="stat-sub">${r.interchange ? 'Platform transfer required' : 'Single train journey'}</div>
        </div>
      </section>

      <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 2rem;">
        <div style="font-weight: 700; color: #38BDF8; font-size: 1.05rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>🧭</span>
          <span>Platform &amp; Boarding Instructions</span>
        </div>
        <div style="color: #E2E8F0; font-size: 0.95rem; line-height: 1.6;">
          ${r.boardingGuideHtml}
        </div>
      </div>

      <h2 class="section-title">🚉 Stations on this Route (${r.stopsCount} Stops)</h2>
      <div class="stations-timeline">
        ${timelineHtml}
      </div>

      <h2 class="section-title">⏰ First &amp; Last Metro Timings</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Station</th>
              <th>First Metro Departure</th>
              <th>Last Metro Departure</th>
              <th>Peak Frequency</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${r.fromName} (Origin)</strong></td>
              <td>${r.firstTrain}</td>
              <td>${r.lastTrain}</td>
              <td>Every 5–7 mins</td>
            </tr>
            <tr>
              <td><strong>${r.toName} (Destination)</strong></td>
              <td>${r.firstTrain}</td>
              <td>${r.lastTrain}</td>
              <td>Every 5–7 mins</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>How much does the metro cost from ${r.fromName} to ${r.toName}?</summary>
          <div class="faq-body">
            A standard paper token costs <strong>₹${r.fare}</strong>. If you pay using a GMRC Smart Card or NCMC card, you receive an automatic 10% discount, making the total fare <strong>₹${r.discountFare}</strong>.
          </div>
        </details>
        <details class="faq-card">
          <summary>How long is the travel time from ${r.fromName} to ${r.toName}?</summary>
          <div class="faq-body">
            The expected journey time is approximately <strong>${r.travelTimeMins} minutes</strong> across <strong>${r.stopsCount} stops</strong> covering roughly <strong>${r.distanceKm} km</strong>. Travel times may vary slightly during peak rush hours.
          </div>
        </details>
        <details class="faq-card">
          <summary>Which stations come between ${r.fromName} and ${r.toName}?</summary>
          <div class="faq-body">
            The stations on this route in order are: ${r.pathStationIds.map(id => stations[id]?.name || id).join(', ')}.
          </div>
        </details>
        <details class="faq-card">
          <summary>Do I need to change trains between ${r.fromName} and ${r.toName}?</summary>
          <div class="faq-body">
            ${r.interchange
              ? `Yes, you must transfer trains at <strong>${r.interchange}</strong>. You do not need to exit the fare gates or buy a new ticket.`
              : `No, this is a direct metro route. You can remain on the same train from start to finish.`}
          </div>
        </details>
        <details class="faq-card">
          <summary>Which platform and train direction should I board at ${r.fromName}?</summary>
          <div class="faq-body">
            ${r.boardingGuideHtml}
          </div>
        </details>
        <details class="faq-card">
          <summary>What is the luggage allowance on Ahmedabad Metro?</summary>
          <div class="faq-body">
            Passengers are permitted up to <strong>15 kg</strong> of personal baggage free of charge, with maximum dimensions not exceeding 60 cm x 45 cm x 25 cm. Baggage scanners and security screening are active at all station entry points.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [trainTripSchema, breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('route', r.routeSlug, 'index.html'), html);
  routeCount++;
}

console.log(`Generated ${routeCount} commuter route static pages successfully.`);

// ==========================================
// 3. GENERATE HIGH-INTENT TARGET QUERY PAGES
// ==========================================
console.log('Generating High-Intent Core Search Pages (Map, Stations, Routes, Airport, Parking, Interchange, Fare, Timings)...');

// 3.1 Ahmedabad Metro Map (/map)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/map';
  const title = `Ahmedabad Metro Map ${CURRENT_YEAR} - High-Resolution Schematic & Interactive Network Map | AhmMetro`;
  const description = 'Official high-resolution Ahmedabad Metro map covering all 53 operational stations across Blue Line, Red Line, Green Line (Gandhinagar), and Purple Line (GIFT City). Interactive stations, interchanges & route map.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Metro Map', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many metro lines are operational in Ahmedabad?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'There are currently 4 operational metro lines in the Ahmedabad-Gandhinagar network: Blue Line (East-West), Red Line (North-South), Green Line (Gandhinagar Extension), and Purple Line (GIFT City Branch), spanning 53 stations across 73.63 km.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where do the Blue Line and Red Line intersect?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Blue Line (East-West) and Red Line (North-South) intersect at the Old High Court Metro Station. This is a 2-level interchange station allowing passengers to transfer lines seamlessly without exiting the paid concourse.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which metro line connects Ahmedabad to Gandhinagar and GIFT City?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Green Line connects Ahmedabad (from Koteshwar Road) to Gandhinagar (Mahatma Mandir). The Purple Line connects GNLU to GIFT City with direct branch shuttles.',
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Ahmedabad Metro Map</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">4 Operational Lines</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">53 Stations Active</span>
          <span class="badge" style="background:#9333EA20;color:#C084FC;border:1px solid #9333EA50;">73.63 km Network</span>
        </div>
        <h1>Ahmedabad Metro Map (${CURRENT_YEAR} Schematic &amp; Live Map)</h1>
        <p class="hero-desc">
          Official network schematic for Gujarat Metro Rail Corporation (GMRC). Connecting East-West Ahmedabad (Thaltej Gam to Vastral Gam), North-South Ahmedabad (APMC to Koteshwar Road), Gandhinagar Capital Corridor (Koteshwar Road to Mahatma Mandir), and GIFT City (GNLU to GIFT City).
        </p>
        <div class="hero-actions" style="display:flex;flex-wrap:wrap;gap:0.75rem;">
          <a href="/?action=map" class="cta-btn">
            <span>Open Fullscreen Interactive Map</span>
            <span>🗺️</span>
          </a>
          <a href="/?station=old_high_court" class="cta-btn" style="background:#1E293B;color:#38BDF8;border:1px solid #334155;">
            <span>Old High Court Hub 🔍</span>
          </a>
          <a href="/?station=kalupur" class="cta-btn" style="background:#1E293B;color:#38BDF8;border:1px solid #334155;">
            <span>Kalupur Railway Station 🚂</span>
          </a>
          <a href="/?station=motera_stadium" class="cta-btn" style="background:#1E293B;color:#38BDF8;border:1px solid #334155;">
            <span>Motera Stadium 🏟️</span>
          </a>
          <a href="/?station=gift_city" class="cta-btn" style="background:#1E293B;color:#38BDF8;border:1px solid #334155;">
            <span>GIFT City 🏙️</span>
          </a>
        </div>
      </section>

      <h2 class="section-title">🗺️ Network Schematic Diagram</h2>
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:2rem;text-align:center;margin-bottom:2rem;">
        <svg viewBox="0 0 800 480" width="100%" height="auto" style="max-height:420px;font-family:system-ui,sans-serif;" aria-label="Ahmedabad Metro Schematic Network Diagram">
          <rect width="100%" height="100%" fill="#0F172A" rx="12" />
          
          <!-- Green Line (Gandhinagar Corridor) -->
          <line x1="400" y1="50" x2="400" y2="180" stroke="#22C55E" stroke-width="8" stroke-linecap="round" />
          
          <!-- Purple Line (GIFT City Spur) -->
          <line x1="400" y1="120" x2="620" y2="120" stroke="#A855F7" stroke-width="7" stroke-linecap="round" />

          <!-- Red Line (North-South Corridor) -->
          <line x1="400" y1="180" x2="400" y2="440" stroke="#EF4444" stroke-width="8" stroke-linecap="round" />

          <!-- Blue Line (East-West Corridor) -->
          <line x1="100" y1="300" x2="700" y2="300" stroke="#0066CC" stroke-width="8" stroke-linecap="round" />

          <!-- Interchange Dots -->
          <!-- Old High Court (Blue x Red) -->
          <circle cx="400" cy="300" r="14" fill="#FFFFFF" stroke="#0066CC" stroke-width="5" />
          <circle cx="400" cy="300" r="6" fill="#EF4444" />
          <text x="420" y="306" fill="#F8FAFC" font-weight="700" font-size="14">Old High Court (Interchange)</text>

          <!-- Koteshwar Road (Red x Green) -->
          <circle cx="400" cy="180" r="12" fill="#FFFFFF" stroke="#EF4444" stroke-width="4" />
          <circle cx="400" cy="180" r="5" fill="#22C55E" />
          <text x="420" y="185" fill="#F8FAFC" font-weight="700" font-size="13">Koteshwar Road (Interchange)</text>

          <!-- GNLU (Green x Purple) -->
          <circle cx="400" cy="120" r="12" fill="#FFFFFF" stroke="#22C55E" stroke-width="4" />
          <circle cx="400" cy="120" r="5" fill="#A855F7" />
          <text x="320" y="125" fill="#F8FAFC" font-weight="700" font-size="13">GNLU</text>

          <!-- Terminals -->
          <!-- Thaltej Gam -->
          <circle cx="100" cy="300" r="9" fill="#0066CC" stroke="#FFFFFF" stroke-width="2" />
          <text x="40" y="335" fill="#38BDF8" font-weight="600" font-size="12">Thaltej Gam</text>

          <!-- Vastral Gam -->
          <circle cx="700" cy="300" r="9" fill="#0066CC" stroke="#FFFFFF" stroke-width="2" />
          <text x="660" y="335" fill="#38BDF8" font-weight="600" font-size="12">Vastral Gam</text>

          <!-- APMC -->
          <circle cx="400" cy="440" r="9" fill="#EF4444" stroke="#FFFFFF" stroke-width="2" />
          <text x="420" y="445" fill="#F87171" font-weight="600" font-size="12">APMC (Vasna)</text>

          <!-- Mahatma Mandir -->
          <circle cx="400" cy="50" r="9" fill="#22C55E" stroke="#FFFFFF" stroke-width="2" />
          <text x="420" y="55" fill="#4ADE80" font-weight="600" font-size="12">Mahatma Mandir (Gandhinagar)</text>

          <!-- GIFT City -->
          <circle cx="620" cy="120" r="9" fill="#A855F7" stroke="#FFFFFF" stroke-width="2" />
          <text x="635" y="125" fill="#C084FC" font-weight="600" font-size="12">GIFT City</text>

          <!-- Legend -->
          <rect x="50" y="40" width="220" height="120" rx="8" fill="#1E293B" opacity="0.9" />
          <circle cx="70" cy="60" r="5" fill="#0066CC" />
          <text x="85" y="64" fill="#E2E8F0" font-size="11">Blue Line: Thaltej ⇄ Vastral</text>
          <circle cx="70" cy="85" r="5" fill="#EF4444" />
          <text x="85" y="89" fill="#E2E8F0" font-size="11">Red Line: APMC ⇄ Koteshwar</text>
          <circle cx="70" cy="110" r="5" fill="#22C55E" />
          <text x="85" y="114" fill="#E2E8F0" font-size="11">Green Line: Koteshwar ⇄ Mandir</text>
          <circle cx="70" cy="135" r="5" fill="#A855F7" />
          <text x="85" y="139" fill="#E2E8F0" font-size="11">Purple Line: GNLU ⇄ GIFT City</text>
        </svg>
      </div>

      <h2 class="section-title">🚇 Metro Corridors Overview</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Corridor</th>
              <th>Terminals</th>
              <th>Stations</th>
              <th>Length</th>
              <th>Operating Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span style="color:#38BDF8;font-weight:700;">● Blue Line</span> (East-West)</td>
              <td>Thaltej Gam ⇄ Vastral Gam</td>
              <td>18 Stations</td>
              <td>21.16 km</td>
              <td>06:20 AM – 10:00 PM</td>
            </tr>
            <tr>
              <td><span style="color:#EF4444;font-weight:700;">● Red Line</span> (North-South)</td>
              <td>APMC (Vasna) ⇄ Koteshwar Road</td>
              <td>15 Stations</td>
              <td>18.87 km</td>
              <td>06:16 AM – 10:00 PM</td>
            </tr>
            <tr>
              <td><span style="color:#22C55E;font-weight:700;">● Green Line</span> (Gandhinagar)</td>
              <td>Koteshwar Road ⇄ Mahatma Mandir</td>
              <td>20 Stations</td>
              <td>28.20 km</td>
              <td>07:33 AM – 08:10 PM</td>
            </tr>
            <tr>
              <td><span style="color:#A855F7;font-weight:700;">● Purple Line</span> (GIFT City)</td>
              <td>GNLU ⇄ GIFT City</td>
              <td>3 Stations</td>
              <td>5.40 km</td>
              <td>Peak Shift Timings</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">🔄 Key Interchange Stations</h2>
      <div class="route-cards-grid">
        <a href="/interchange" class="route-card">
          <div class="route-card-header">
            <span class="route-dest">Old High Court</span>
            <span class="badge" style="background:#0066CC30;color:#38BDF8;">Central Hub</span>
          </div>
          <div class="route-details">
            <span>Blue Line ⇄ Red Line</span>
            <span>•</span>
            <span>Level 1 / Level 2 transfer</span>
          </div>
        </a>
        <a href="/interchange" class="route-card">
          <div class="route-card-header">
            <span class="route-dest">Koteshwar Road</span>
            <span class="badge" style="background:#16A34A30;color:#86EFAC;">North Junction</span>
          </div>
          <div class="route-details">
            <span>Red Line ⇄ Green Line</span>
            <span>•</span>
            <span>Ahmedabad to Gandhinagar</span>
          </div>
        </a>
        <a href="/interchange" class="route-card">
          <div class="route-card-header">
            <span class="route-dest">GNLU (Gujarat National Law Univ)</span>
            <span class="badge" style="background:#9333EA30;color:#C084FC;">GIFT Branch</span>
          </div>
          <div class="route-details">
            <span>Green Line ⇄ Purple Line</span>
            <span>•</span>
            <span>Transfer for GIFT City</span>
          </div>
        </a>
      </div>

      <h2 class="section-title">⚙️ Technical &amp; Operational Network Specifications</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>System Parameter</th>
              <th>Specification Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Track Gauge</strong></td>
              <td>1,435 mm Standard Gauge</td>
            </tr>
            <tr>
              <td><strong>Electrification</strong></td>
              <td>750 V DC Third Rail bottom-contact power collection</td>
            </tr>
            <tr>
              <td><strong>Signalling &amp; Safety</strong></td>
              <td>CBTC (Communication-Based Train Control) with Automatic Train Protection (ATP)</td>
            </tr>
            <tr>
              <td><strong>Trainset Capacity</strong></td>
              <td>3-Car stainless steel rolling stock (expandable to 6 cars), fully air-conditioned</td>
            </tr>
            <tr>
              <td><strong>Maximum Operating Speed</strong></td>
              <td>80 km/h (average commercial speed: 34–36 km/h including station dwell time)</td>
            </tr>
            <tr>
              <td><strong>Accessibility Features</strong></td>
              <td>100% barrier-free: elevators, dual-speed escalators, tactile guidance paths, and wheelchair bays</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>How many metro lines are operational in Ahmedabad?</summary>
          <div class="faq-body">
            There are currently 4 operational metro lines in the Ahmedabad-Gandhinagar network: Blue Line (East-West), Red Line (North-South), Green Line (Gandhinagar Extension), and Purple Line (GIFT City Branch), spanning 53 stations across 73.63 km.
          </div>
        </details>
        <details class="faq-card">
          <summary>Where do the Blue Line and Red Line intersect?</summary>
          <div class="faq-body">
            The Blue Line (East-West) and Red Line (North-South) intersect at the <strong>Old High Court Metro Station</strong>. This is a 2-level interchange station allowing passengers to transfer lines seamlessly without exiting the paid concourse.
          </div>
        </details>
        <details class="faq-card">
          <summary>Which metro line connects Ahmedabad to Gandhinagar and GIFT City?</summary>
          <div class="faq-body">
            The <strong>Green Line</strong> connects Ahmedabad (from Koteshwar Road) to Gandhinagar (Mahatma Mandir). The <strong>Purple Line</strong> connects GNLU to GIFT City with direct branch shuttles.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('map', 'index.html'), html);
}

// 3.2 Ahmedabad Metro Stations Directory (/stations)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/stations';
  const title = `Ahmedabad Metro Stations Directory ${CURRENT_YEAR} - All 53 Operational Stations, Facilities & Lines | AhmMetro`;
  const description = 'Complete directory of all 53 Ahmedabad & Gandhinagar Metro stations. Filter by Blue, Red, Green, and Purple lines, underground vs elevated stations, interchanges, operating hours, and facilities.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Stations Directory', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many metro stations are there in Ahmedabad and Gandhinagar?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'There are currently 53 operational metro stations across Ahmedabad, Gandhinagar, and GIFT City across 4 lines (Blue, Red, Green, and Purple).',
        },
      },
      {
        '@type': 'Question',
        name: 'Which metro stations are underground in Ahmedabad?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'There are 4 underground metro stations on the Blue Line in Ahmedabad: Shahpur, Gheekanta, Kalupur (Ahmedabad Junction Railway Station), and Kankaria East. All other 49 stations are elevated.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the interchange stations on the Ahmedabad Metro?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The 3 official interchange stations are: 1. Old High Court (Blue Line ⇄ Red Line), 2. Koteshwar Road (Red Line ⇄ Green Line), and 3. GNLU (Green Line ⇄ Purple Line GIFT City branch).',
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">All 53 Stations</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">53 Operational Stations</span>
          <span class="badge badge-gray">4 Underground Stations</span>
          <span class="badge badge-gray">3 Interchange Hubs</span>
        </div>
        <h1>Ahmedabad &amp; Gandhinagar Metro Stations Directory</h1>
        <p class="hero-desc">
          Complete, verified directory of all 53 operational metro stations across Ahmedabad, Gandhinagar, and GIFT City. Browse stations by corridor sequence or alphabetical order to check first and last train timings, ticket fares, platform layouts, and landmark connections.
        </p>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Stations</div>
          <div class="stat-val">53 Active</div>
          <div class="stat-sub">Across 4 network lines</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Underground Stations</div>
          <div class="stat-val" style="color:#38BDF8;">4 Stations</div>
          <div class="stat-sub">Shahpur to Kankaria East</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Elevated Stations</div>
          <div class="stat-val">49 Stations</div>
          <div class="stat-sub">Viaduct &amp; platform structures</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Interchange Hubs</div>
          <div class="stat-val" style="color:#C084FC;">3 Hubs</div>
          <div class="stat-sub">Old High Court, Koteshwar, GNLU</div>
        </div>
      </section>

      <h2 class="section-title">🚇 Stations by Metro Corridor Sequence</h2>

      <!-- Blue Line -->
      <h3 style="color:#38BDF8;margin:1.5rem 0 0.75rem;font-size:1.15rem;display:flex;align-items:center;gap:0.5rem;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#0066CC;"></span>
        Blue Line (East-West Corridor: 18 Stations)
      </h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Station Name</th>
              <th>Gujarati / Hindi</th>
              <th>Type</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>
            ${CORRIDORS.blue.map((id, idx) => {
              const st = stationStats[id];
              if (!st) return '';
              return `<tr>
                <td><strong>${idx + 1}</strong></td>
                <td><a href="/station/${st.slug}"><strong>${st.name}</strong></a></td>
                <td>${st.nameGu} / ${st.nameHi}</td>
                <td>${st.isUnderground ? 'Underground' : 'Elevated'} ${st.isInterchange ? '• 🔄 Interchange' : ''}</td>
                <td><a href="/station/${st.slug}">View Timetable →</a></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Red Line -->
      <h3 style="color:#EF4444;margin:2rem 0 0.75rem;font-size:1.15rem;display:flex;align-items:center;gap:0.5rem;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#EF4444;"></span>
        Red Line (North-South Corridor: 15 Stations)
      </h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Station Name</th>
              <th>Gujarati / Hindi</th>
              <th>Type</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>
            ${CORRIDORS.red.map((id, idx) => {
              const st = stationStats[id];
              if (!st) return '';
              return `<tr>
                <td><strong>${idx + 1}</strong></td>
                <td><a href="/station/${st.slug}"><strong>${st.name}</strong></a></td>
                <td>${st.nameGu} / ${st.nameHi}</td>
                <td>${st.isUnderground ? 'Underground' : 'Elevated'} ${st.isInterchange ? '• 🔄 Interchange' : ''}</td>
                <td><a href="/station/${st.slug}">View Timetable →</a></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Green Line -->
      <h3 style="color:#22C55E;margin:2rem 0 0.75rem;font-size:1.15rem;display:flex;align-items:center;gap:0.5rem;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#22C55E;"></span>
        Green Line (Gandhinagar Extension: 20 Stations)
      </h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Station Name</th>
              <th>Gujarati / Hindi</th>
              <th>Type</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>
            ${CORRIDORS.green.map((id, idx) => {
              const st = stationStats[id];
              if (!st) return '';
              return `<tr>
                <td><strong>${idx + 1}</strong></td>
                <td><a href="/station/${st.slug}"><strong>${st.name}</strong></a></td>
                <td>${st.nameGu} / ${st.nameHi}</td>
                <td>${st.isUnderground ? 'Underground' : 'Elevated'} ${st.isInterchange ? '• 🔄 Interchange' : ''}</td>
                <td><a href="/station/${st.slug}">View Timetable →</a></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Purple Line -->
      <h3 style="color:#A855F7;margin:2rem 0 0.75rem;font-size:1.15rem;display:flex;align-items:center;gap:0.5rem;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#A855F7;"></span>
        Purple Line (GIFT City Branch: 3 Stations)
      </h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Station Name</th>
              <th>Gujarati / Hindi</th>
              <th>Type</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>
            ${CORRIDORS.purple.map((id, idx) => {
              const st = stationStats[id];
              if (!st) return '';
              return `<tr>
                <td><strong>${idx + 1}</strong></td>
                <td><a href="/station/${st.slug}"><strong>${st.name}</strong></a></td>
                <td>${st.nameGu} / ${st.nameHi}</td>
                <td>${st.isUnderground ? 'Underground' : 'Elevated'} ${st.isInterchange ? '• 🔄 Interchange' : ''}</td>
                <td><a href="/station/${st.slug}">View Timetable →</a></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <h2 class="section-title">🔤 Alphabetical Master Directory (A–Z)</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Station Name</th>
              <th>Gujarati / Hindi</th>
              <th>Metro Line</th>
              <th>Structure</th>
              <th>Timetable</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(stationStats).sort((a,b) => a.name.localeCompare(b.name)).map(st => `
              <tr>
                <td><a href="/station/${st.slug}"><strong>${st.name}</strong></a></td>
                <td>${st.nameGu} / ${st.nameHi}</td>
                <td>${getLineBadgesHtml(st.lines)}</td>
                <td>${st.isUnderground ? 'Underground' : 'Elevated'} ${st.isInterchange ? '• 🔄 Interchange' : ''}</td>
                <td><a href="/station/${st.slug}">View Timetable →</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>How many metro stations are there in Ahmedabad and Gandhinagar?</summary>
          <div class="faq-body">
            There are currently 53 operational metro stations across Ahmedabad, Gandhinagar, and GIFT City across 4 lines (Blue, Red, Green, and Purple).
          </div>
        </details>
        <details class="faq-card">
          <summary>Which metro stations are underground in Ahmedabad?</summary>
          <div class="faq-body">
            There are 4 underground metro stations on the Blue Line in Ahmedabad: <strong>Shahpur, Gheekanta, Kalupur (Railway Station), and Kankaria East</strong>. All other 49 stations are elevated.
          </div>
        </details>
        <details class="faq-card">
          <summary>What are the interchange stations on the Ahmedabad Metro?</summary>
          <div class="faq-body">
            The 3 official interchange stations are: 1. <strong>Old High Court</strong> (Blue Line ⇄ Red Line), 2. <strong>Koteshwar Road</strong> (Red Line ⇄ Green Line), and 3. <strong>GNLU</strong> (Green Line ⇄ Purple Line GIFT City branch).
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('stations', 'index.html'), html);
}

// 3.3 Ahmedabad Metro Route Planner (/routes and /route)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/routes';
  const title = `Ahmedabad Metro Route Planner ${CURRENT_YEAR} - Find Routes, Interchanges & Travel Times | AhmMetro`;
  const description = 'Search and calculate any metro journey across Ahmedabad and Gandhinagar. Check direct trains, interchange stations (Old High Court, Koteshwar, GNLU), travel duration, stop counts, and ticket fares.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Route Planner', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I plan a metro journey in Ahmedabad?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Select your origin and destination station in the AhmMetro Route Planner. The system automatically computes the shortest travel duration, intermediate station sequence, required platform transfers at Old High Court, Koteshwar Road, or GNLU, and exact token / smart card ticket fares.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to buy a separate ticket when transferring lines at Old High Court?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. A single token or Metro Smart Card is valid for your entire journey across both lines. Simply follow the overhead signs between Level 1 and Level 2 without passing through the exit fare gates.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the peak hours for Ahmedabad Metro trains?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Peak hours operate from 08:00 AM to 11:00 AM in the morning and 05:00 PM to 08:00 PM in the evening, during which trains run every 5 to 7 minutes. Off-peak trains run every 10 to 12 minutes.',
        },
      },
    ],
  };

  // Filter top routes by category
  const blueRoutes = ROUTE_LIST.filter(r => r.fromLines.includes('blue') && r.toLines.includes('blue')).slice(0, 8);
  const redRoutes = ROUTE_LIST.filter(r => r.fromLines.includes('red') && r.toLines.includes('red')).slice(0, 8);
  const gnGfitRoutes = ROUTE_LIST.filter(r => r.toLines.includes('green') || r.toLines.includes('purple') || r.fromLines.includes('green') || r.fromLines.includes('purple')).slice(0, 8);
  const transitHubRoutes = ROUTE_LIST.filter(r => ['kalupur', 'sabarmati', 'ranip', 'motera_stadium'].includes(r.fromId) || ['kalupur', 'sabarmati', 'ranip', 'motera_stadium'].includes(r.toId)).slice(0, 8);

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Route Planner</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">Smart Route Engine</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">Instant Fare &amp; Transfer Info</span>
          <span class="badge" style="background:#9333EA20;color:#C084FC;border:1px solid #9333EA50;">53 Stations Linked</span>
        </div>
        <h1>Ahmedabad Metro Route Planner &amp; Journey Finder</h1>
        <p class="hero-desc">
          Plan your commute across all 53 stations in Ahmedabad, Gandhinagar, and GIFT City. Find fastest routes, intermediate stops, transfer stations, ticket prices, and first/last metro timings.
        </p>
        <div class="hero-actions">
          <a href="/?action=route" class="cta-btn">
            <span>Launch Interactive Route Planner</span>
            <span>🚀</span>
          </a>
          <a href="/map" class="cta-btn" style="background:#1E293B;color:#F8FAFC;">
            <span>View Full Metro Map</span>
          </a>
        </div>
      </section>

      <h2 class="section-title">🚆 East-West Corridor (Blue Line) Top Routes</h2>
      <div class="route-cards-grid">
        ${blueRoutes.map(r => `
          <a href="/route/${r.routeSlug}" class="route-card">
            <div class="route-card-header">
              <span class="route-dest">${r.fromName} → ${r.toName}</span>
              <span class="route-fare">₹${r.fare}</span>
            </div>
            <div class="route-details">
              <span>⏱️ ~${r.travelTimeMins} mins</span>
              <span>•</span>
              <span>Direct Train</span>
            </div>
          </a>
        `).join('')}
      </div>

      <h2 class="section-title">🚆 North-South Corridor (Red Line) Top Routes</h2>
      <div class="route-cards-grid">
        ${redRoutes.map(r => `
          <a href="/route/${r.routeSlug}" class="route-card">
            <div class="route-card-header">
              <span class="route-dest">${r.fromName} → ${r.toName}</span>
              <span class="route-fare">₹${r.fare}</span>
            </div>
            <div class="route-details">
              <span>⏱️ ~${r.travelTimeMins} mins</span>
              <span>•</span>
              <span>Direct Train</span>
            </div>
          </a>
        `).join('')}
      </div>

      <h2 class="section-title">🏛️ Gandhinagar &amp; GIFT City Commuter Routes</h2>
      <div class="route-cards-grid">
        ${gnGfitRoutes.map(r => `
          <a href="/route/${r.routeSlug}" class="route-card">
            <div class="route-card-header">
              <span class="route-dest">${r.fromName} → ${r.toName}</span>
              <span class="route-fare">₹${r.fare}</span>
            </div>
            <div class="route-details">
              <span>⏱️ ~${r.travelTimeMins} mins</span>
              <span>•</span>
              <span>${r.interchange ? `Transfer at ${r.interchange}` : 'Direct Train'}</span>
            </div>
          </a>
        `).join('')}
      </div>

      <h2 class="section-title">🚉 Major Transit Hub Connections (Railway, Bus &amp; Stadium)</h2>
      <div class="route-cards-grid">
        ${transitHubRoutes.map(r => `
          <a href="/route/${r.routeSlug}" class="route-card">
            <div class="route-card-header">
              <span class="route-dest">${r.fromName} → ${r.toName}</span>
              <span class="route-fare">₹${r.fare}</span>
            </div>
            <div class="route-details">
              <span>⏱️ ~${r.travelTimeMins} mins</span>
              <span>•</span>
              <span>${r.interchange ? `Transfer at ${r.interchange}` : 'Direct Train'}</span>
            </div>
          </a>
        `).join('')}
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>How do I plan a metro journey in Ahmedabad?</summary>
          <div class="faq-body">
            Select your origin and destination station in the AhmMetro Route Planner. The system automatically computes the shortest travel duration, intermediate station sequence, required platform transfers at Old High Court, Koteshwar Road, or GNLU, and exact token / smart card ticket fares.
          </div>
        </details>
        <details class="faq-card">
          <summary>Do I need to buy a separate ticket when transferring lines at Old High Court?</summary>
          <div class="faq-body">
            No. A single token or Metro Smart Card is valid for your entire journey across both lines. Simply follow the overhead signs between Level 1 and Level 2 without passing through the exit fare gates.
          </div>
        </details>
        <details class="faq-card">
          <summary>What are the peak hours for Ahmedabad Metro trains?</summary>
          <div class="faq-body">
            Peak hours operate from <strong>08:00 AM to 11:00 AM</strong> in the morning and <strong>05:00 PM to 08:00 PM</strong> in the evening, during which trains run every 5 to 7 minutes. Off-peak trains run every 10 to 12 minutes.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const routesHtml = buildHtmlPage({
    title,
    description,
    canonicalUrl: 'https://www.ahmedabadmetro.site/routes',
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });
  writeHtmlFile(path.join('routes', 'index.html'), routesHtml);

  const routeBreadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Route Planner', item: 'https://www.ahmedabadmetro.site/route' },
    ],
  };
  const routeHtml = buildHtmlPage({
    title,
    description,
    canonicalUrl: 'https://www.ahmedabadmetro.site/route',
    jsonLdArray: [routeBreadcrumbSchema, faqSchema],
    bodyContent,
  });
  writeHtmlFile(path.join('route', 'index.html'), routeHtml);
}

// 3.4 Ahmedabad Metro to Airport Guide (/airport)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/airport';
  const title = `Ahmedabad Metro to Airport Guide ${CURRENT_YEAR} - Nearest Stations, Route & Feeder Transit | AhmMetro`;
  const description = 'Complete verified guide to reaching Ahmedabad SVPIA Airport via metro. Phase 2A airport spur status, nearest active stations (Koteshwar Road 6.8 km, Motera Stadium 7.5 km), luggage rules, and feeder transit.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Airport Transit Guide', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is there a direct metro station inside Ahmedabad Airport (SVPIA)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `No. As of ${CURRENT_YEAR}, there is no operational metro station inside Sardar Vallabhbhai Patel International Airport (SVPIA). A dedicated 6 km airport spur corridor (Phase 2A) with 4 elevated stations and 1 underground airport terminal station is currently under construction by GMRC.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Which is the nearest operational metro station to Ahmedabad Airport?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The closest operational metro station to Ahmedabad Airport is Koteshwar Road Metro Station (approximately 6.8 km away on the Red/Green corridor), followed by Motera Stadium Metro Station (approximately 7.5 km away). From either station, commuters take a metered auto-rickshaw or app-based cab (Uber/Ola) to reach Terminal 1 (Domestic) or Terminal 2 (International) in approximately 12 to 18 minutes.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do auto-rickshaws and cabs operate from the nearest metro station to the airport?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Auto-rickshaws in Ahmedabad operate on digital distance meters or fixed app pricing (Uber Auto / Ola Auto). Ride-hailing cabs (Uber, Ola, and BluSmart) can be booked directly for pickup at the station exit gates. Inside airport arrival terminals, pre-paid taxi counters and dedicated app-cab pickup zones are available.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the luggage rules for air travelers taking Ahmedabad Metro?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Air travelers may carry 1 standard baggage item weighing up to 25 kg with maximum dimensions of 80 cm x 50 cm x 30 cm free of charge per passenger. Oversized commercial parcels or hazardous cargo are strictly prohibited.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I use the metro for early morning flights from Ahmedabad Airport?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ahmedabad Metro begins morning train operations at 06:16 AM (Red Line) and 06:20 AM (Blue Line). For early morning flights requiring check-in before 07:30 AM, taking the metro is not feasible; travelers should book a direct taxi or cab.',
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Ahmedabad Metro to Airport</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">Airport Feeder Guide</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">SVPIA Terminals 1 &amp; 2</span>
          <span class="badge badge-gray">Phase 2A Airport Line Under Construction</span>
        </div>
        <h1>How to Reach Ahmedabad Airport by Metro (${CURRENT_YEAR})</h1>
        <p class="hero-desc">
          Verified guide for air travelers traveling to or from Sardar Vallabhbhai Patel International Airport (AMD / SVPIA). Because direct airport metro tracks are currently under construction as part of GMRC Phase 2A, air travelers connect via the nearest operational Red/Green Line stations and last-mile feeder options.
        </p>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Closest Operational Metro</div>
          <div class="stat-val" style="font-size:1.25rem;">Koteshwar Road</div>
          <div class="stat-sub">6.8 km (12–15 min drive to Terminal 1 / 2)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Second Closest Metro</div>
          <div class="stat-val" style="font-size:1.25rem;">Motera Stadium</div>
          <div class="stat-sub">7.5 km (High cab and auto availability)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Phase 2A Airport Link</div>
          <div class="stat-val" style="font-size:1.25rem;">Under Construction</div>
          <div class="stat-sub">6 km dedicated spur with underground airport station</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Luggage Allowance</div>
          <div class="stat-val" style="font-size:1.25rem;">25 kg Free</div>
          <div class="stat-sub">1 standard bag (max 80 x 50 x 30 cm) per passenger</div>
        </div>
      </section>

      <h2 class="section-title">✈️ Nearest Operational Metro Stations to Airport</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Metro Station</th>
              <th>Corridor / Line</th>
              <th>Road Distance to SVPIA</th>
              <th>Typical Drive Time</th>
              <th>Feeder Transit Options</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/station/koteshwar-road"><strong>Koteshwar Road</strong></a> (Closest)</td>
              <td>Red &amp; Green Lines</td>
              <td><strong>6.8 km</strong></td>
              <td>12 – 15 mins</td>
              <td>Metered Auto-Rickshaw, Uber Auto / Ola Auto, App Cabs</td>
            </tr>
            <tr>
              <td><a href="/station/motera-stadium"><strong>Motera Stadium</strong></a></td>
              <td>Red Line</td>
              <td><strong>7.5 km</strong></td>
              <td>15 – 18 mins</td>
              <td>Metered Auto-Rickshaw, Uber / Ola Cabs &amp; Autos</td>
            </tr>
            <tr>
              <td><a href="/station/ranip"><strong>Ranip (Bus Terminal)</strong></a></td>
              <td>Red Line</td>
              <td><strong>8.5 km</strong></td>
              <td>18 – 20 mins</td>
              <td>GSRTC / AMTS feeder buses, Metered Auto, App Cabs</td>
            </tr>
            <tr>
              <td><a href="/station/sabarmati"><strong>Sabarmati</strong></a></td>
              <td>Red Line</td>
              <td><strong>9.0 km</strong></td>
              <td>20 – 22 mins</td>
              <td>Western Railway junction connection, Metered Auto, Cabs</td>
            </tr>
            <tr>
              <td><a href="/station/kalupur"><strong>Kalupur (Railway Junction)</strong></a></td>
              <td>Blue Line</td>
              <td><strong>9.2 km</strong></td>
              <td>22 – 25 mins</td>
              <td>AMTS Bus Route 15 (Direct to Airport), Auto, App Cabs</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">🗺️ Recommended Metro Routes to Airport</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">From Kalupur Railway Station</div>
          <div class="stat-val" style="font-size:1.15rem;">Blue Line → Red Line</div>
          <div class="stat-sub">Board Blue Line at Kalupur, switch at Old High Court to Red Line, alight at Koteshwar Road (6.8 km feeder to Airport). Or board direct AMTS Bus 15 outside station.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">From Thaltej / SG Highway</div>
          <div class="stat-val" style="font-size:1.15rem;">Blue Line → Red Line</div>
          <div class="stat-sub">Board at Thaltej, switch at Old High Court to northbound Red Line, alight at Koteshwar Road. Total ~30 min metro ride + short auto to airport.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">From Gandhinagar / GIFT City</div>
          <div class="stat-val" style="font-size:1.15rem;">Green Line Direct</div>
          <div class="stat-sub">Take Green Line directly south towards Koteshwar Road. Quickest connection for Gandhinagar and Secretariat flyers.</div>
        </div>
      </div>

      <h2 class="section-title">🏗️ GMRC Phase 2A Airport Metro Status</h2>
      <div class="hero-card" style="background:#131D31;border:1px solid #1E293B;">
        <p style="font-size:0.95rem;color:#CBD5E1;line-height:1.7;">
          To provide seamless rapid rail transit directly into the flight terminals, Gujarat Metro Rail Corporation (GMRC) has designed <strong>Phase 2A</strong>: a dedicated 6 km spur corridor extending from the main corridor directly to Sardar Vallabhbhai Patel International Airport. The alignment includes 4 elevated stations and an underground station situated adjacent to the airport terminal building. Construction is currently underway.
        </p>
      </div>

      <h2 class="section-title">❓ Airport Metro Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>Is there a direct metro station inside Ahmedabad Airport (SVPIA)?</summary>
          <div class="faq-body">
            No. As of ${CURRENT_YEAR}, there is no operational metro station inside Sardar Vallabhbhai Patel International Airport (SVPIA). A dedicated 6 km airport spur corridor (Phase 2A) with 4 elevated stations and 1 underground airport terminal station is currently under construction by GMRC.
          </div>
        </details>
        <details class="faq-card">
          <summary>Which is the nearest operational metro station to Ahmedabad Airport?</summary>
          <div class="faq-body">
            The closest operational metro station to Ahmedabad Airport is <strong>Koteshwar Road Metro Station (6.8 km away)</strong>, followed by <strong>Motera Stadium Metro Station (7.5 km away)</strong> on the Red/Green corridor. From either station, commuters take a metered auto-rickshaw or app-based cab (Uber/Ola) to reach Terminal 1 (Domestic) or Terminal 2 (International) in approximately 12 to 18 minutes.
          </div>
        </details>
        <details class="faq-card">
          <summary>How do auto-rickshaws and cabs operate from the nearest metro station to the airport?</summary>
          <div class="faq-body">
            Auto-rickshaws in Ahmedabad operate on digital distance meters or fixed app pricing (Uber Auto / Ola Auto). Ride-hailing cabs (Uber, Ola, and BluSmart) can be booked directly for pickup at the station exit gates. Inside airport arrival terminals, pre-paid taxi counters and dedicated app-cab pickup zones are available.
          </div>
        </details>
        <details class="faq-card">
          <summary>What are the luggage rules for air travelers taking Ahmedabad Metro?</summary>
          <div class="faq-body">
            Air travelers may carry <strong>1 standard baggage item weighing up to 25 kg</strong> with maximum dimensions of 80 cm x 50 cm x 30 cm free of charge per passenger. Oversized commercial parcels or hazardous cargo are strictly prohibited.
          </div>
        </details>
        <details class="faq-card">
          <summary>Can I use the metro for early morning flights from Ahmedabad Airport?</summary>
          <div class="faq-body">
            Ahmedabad Metro begins morning train operations at <strong>06:16 AM</strong> (Red Line) and <strong>06:20 AM</strong> (Blue Line). For early morning flights requiring check-in before 07:30 AM, taking the metro is not feasible; travelers should book a direct taxi or cab.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('airport', 'index.html'), html);
}

// 3.5 Ahmedabad Metro Parking Guide (/parking)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/parking';
  const title = `Ahmedabad Metro Parking Guide ${CURRENT_YEAR} - Stations, AMC Pay & Park Plots & Rules | AhmMetro`;
  const description = 'Verified guide to vehicle parking at Ahmedabad Metro stations. Learn about dedicated AMC Pay & Park plots, Park & Ride facilities at Vastral Gam, Thaltej, APMC, and Vadaj, and parking guidelines.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Parking Guide', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do all Ahmedabad Metro stations have dedicated parking facilities?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Because Gujarat Metro Rail Corporation (GMRC) stations are built as elevated structures along road medians, GMRC does not operate standardized metro-owned parking complexes at every station. Instead, dedicated commuter parking is provided through designated Ahmedabad Municipal Corporation (AMC) plots at major terminal hubs (such as Vastral Gam, Thaltej Gam, APMC, Vadaj, and Sabarmati), municipal Pay & Park sites, and on-street designated parking bays.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I pay for metro parking using the GMRC Metro Smart Card?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. GMRC Metro Smart Cards and RuPay NCMC transit cards are currently valid only for automatic fare collection (AFC) turnstiles on train platforms. Parking lots are managed independently by the Ahmedabad Municipal Corporation (AMC) or authorized local contractors, where parking charges are collected via cash, UPI, or municipal parking receipts.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which Ahmedabad Metro stations are best for Park & Ride?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The best stations for Park & Ride are terminal and major multi-modal transit stations that have dedicated surface parking plots: Vastral Gam (East terminus), Thaltej Gam / Thaltej (West terminus), APMC Vasna (South terminus), Motera Stadium, Ranip (GSRTC Bus Terminal), and Sabarmati / AEC (Railway Junction). Intermediate high-density stations like Old High Court or Commerce Six Road have very limited parking.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is overnight parking permitted at Ahmedabad Metro stations?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Overnight parking is not available at standard elevated metro stations. For overnight or long-duration vehicle parking, commuters are advised to use 24-hour guarded municipal or railway parking complexes, such as Ahmedabad Junction (Kalupur) or Sabarmati Railway Station.',
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Metro Parking</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">AMC &amp; Municipal Facilities</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">Park &amp; Ride Terminals</span>
          <span class="badge badge-gray">Verified Transit Guide</span>
        </div>
        <h1>Ahmedabad Metro Parking Guide (${CURRENT_YEAR})</h1>
        <p class="hero-desc">
          Everything commuters need to know about vehicle parking across the Gujarat Metro Rail Corporation (GMRC) network. Because Ahmedabad Metro operates on elevated viaducts along road medians, parking is managed in coordination with the Ahmedabad Municipal Corporation (AMC) through dedicated plots and municipal Pay &amp; Park facilities at major transit hubs.
        </p>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Parking Availability</div>
          <div class="stat-val" style="font-size:1.15rem;">Selected Hubs Only</div>
          <div class="stat-sub">Dedicated plots at major terminus &amp; railway junction stations; limited on-street bays at minor stops.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Operating Authority</div>
          <div class="stat-val" style="font-size:1.15rem;">AMC &amp; Contractors</div>
          <div class="stat-sub">Managed by Ahmedabad Municipal Corporation (AMC) and appointed local parking operators.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Smart Card Payment</div>
          <div class="stat-val" style="font-size:1.15rem;">Not Integrated</div>
          <div class="stat-sub">Metro Smart Cards cannot be used for parking. Payments are made via cash, UPI, or municipal slip.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Best Park &amp; Ride</div>
          <div class="stat-val" style="font-size:1.15rem;">Terminus Stations</div>
          <div class="stat-sub">Vastral Gam, Thaltej Gam, APMC, Motera Stadium, Ranip, and Sabarmati.</div>
        </div>
      </section>

      <h2 class="section-title">🅿️ Station-by-Station Parking Facilities &amp; Capacity</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Station / Transit Hub</th>
              <th>Corridor</th>
              <th>Parking Type</th>
              <th>Suitable Vehicles</th>
              <th>Commuter Advice &amp; Tips</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/station/vastral-gam"><strong>Vastral Gam</strong></a></td>
              <td>Blue Line (East Terminus)</td>
              <td>Dedicated AMC Surface Plot</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Primary Park &amp; Ride hub for commuters arriving from Vastral, Odhav, and Ring Road. High parking capacity.</td>
            </tr>
            <tr>
              <td><a href="/station/thaltej-gam"><strong>Thaltej Gam</strong></a> / <a href="/station/thaltej"><strong>Thaltej</strong></a></td>
              <td>Blue Line (West Terminus)</td>
              <td>AMC Plot &amp; Service Road Bays</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Convenient for commuters from SG Highway, Bopal, and Shilaj. Two-wheeler parking fills quickly during morning peak.</td>
            </tr>
            <tr>
              <td><a href="/station/apmc"><strong>APMC (Vasna)</strong></a></td>
              <td>Red Line (South Terminus)</td>
              <td>Surface Parking Area</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Spacious ground parking adjacent to APMC market area. Excellent starting point for Northbound travel towards Gandhinagar.</td>
            </tr>
            <tr>
              <td><a href="/station/motera-stadium"><strong>Motera Stadium</strong></a></td>
              <td>Red Line</td>
              <td>Stadium Grounds &amp; Viaduct Bays</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Ample parking on non-event days. On IPL and international match days, special traffic &amp; security cordons apply.</td>
            </tr>
            <tr>
              <td><a href="/station/vadaj"><strong>Vadaj</strong></a></td>
              <td>Red Line</td>
              <td>AMC Identified Plot</td>
              <td>Two-Wheelers &amp; Autos</td>
              <td>Multimodal connection with Vadaj AMTS bus terminus. Convenient for central city commuters.</td>
            </tr>
            <tr>
              <td><a href="/station/sabarmati"><strong>Sabarmati</strong></a> / <a href="/station/aec"><strong>AEC</strong></a></td>
              <td>Red Line</td>
              <td>Railway Station Complex</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Direct pedestrian integration with Sabarmati Railway Station parking facilities (24-hour guarded options available).</td>
            </tr>
            <tr>
              <td><a href="/station/ranip"><strong>Ranip</strong></a></td>
              <td>Red Line</td>
              <td>GSRTC Bus Terminal Hub</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Multi-level and surface parking inside Ranip Central Bus Station complex. Guarded with standard municipal/GSRTC rates.</td>
            </tr>
            <tr>
              <td><a href="/station/kalupur"><strong>Kalupur (Railway Junction)</strong></a></td>
              <td>Blue Line</td>
              <td>Railway Station Parking</td>
              <td>Two-Wheelers &amp; Cars</td>
              <td>Heavy commercial area. Use Western Railway’s designated pay-and-park lots on Platform 1 or Platform 12 sides.</td>
            </tr>
            <tr>
              <td><a href="/station/old-high-court"><strong>Old High Court</strong></a></td>
              <td>Blue &amp; Red Interchange</td>
              <td>Very Limited Street Bays</td>
              <td>Two-Wheelers Only</td>
              <td>No dedicated metro parking lot along Ashram Road. Commuters are strongly advised to walk, take feeder autos, or bus.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">⚠️ Essential Parking Rules &amp; Towing Warnings</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">No Parking Under Viaducts</div>
          <div class="stat-val" style="font-size:1.15rem;">Strict Tow-Away Zones</div>
          <div class="stat-sub">Parking along road medians or BRTS corridors under metro pillars without signage is strictly prohibited by Ahmedabad Traffic Police.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Use Authorized Lots</div>
          <div class="stat-val" style="font-size:1.15rem;">Insist on Receipt</div>
          <div class="stat-sub">Always park in designated AMC Pay &amp; Park areas where authorized attendants provide a valid printed or digital slip.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Helmet &amp; Valuables</div>
          <div class="stat-val" style="font-size:1.15rem;">Commuter Responsibility</div>
          <div class="stat-sub">Do not leave bags, electronics, or unattended helmets on vehicles. Lock two-wheelers securely in authorized bays.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overnight Commuters</div>
          <div class="stat-val" style="font-size:1.15rem;">Use Railway Hubs</div>
          <div class="stat-sub">Standard roadside metro parking bays are not guarded overnight. Use 24/7 parking at Kalupur or Sabarmati railway stations for multi-day trips.</div>
        </div>
      </div>

      <h2 class="section-title">❓ Parking Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>Do all Ahmedabad Metro stations have dedicated parking facilities?</summary>
          <div class="faq-body">
            No. GMRC stations are elevated structures constructed on road medians, so GMRC does not operate standardized metro-owned parking complexes at every station. Instead, commuter parking is provided through designated Ahmedabad Municipal Corporation (AMC) plots at major terminal hubs (such as <strong>Vastral Gam, Thaltej Gam, APMC, Vadaj, and Sabarmati</strong>), municipal Pay &amp; Park sites, and on-street designated parking bays.
          </div>
        </details>
        <details class="faq-card">
          <summary>Can I pay for metro parking using the GMRC Metro Smart Card?</summary>
          <div class="faq-body">
            No. GMRC Metro Smart Cards and RuPay NCMC transit cards are currently valid only for automatic fare collection (AFC) turnstiles on train platforms. Parking lots are managed independently by the Ahmedabad Municipal Corporation (AMC) or authorized local contractors, where charges are collected via cash, UPI, or municipal parking receipts.
          </div>
        </details>
        <details class="faq-card">
          <summary>Which Ahmedabad Metro stations are best for Park &amp; Ride?</summary>
          <div class="faq-body">
            The best stations for Park &amp; Ride are terminal and major multi-modal transit stations that have dedicated surface parking plots: <strong>Vastral Gam</strong> (East terminus), <strong>Thaltej Gam / Thaltej</strong> (West terminus), <strong>APMC Vasna</strong> (South terminus), <strong>Motera Stadium</strong>, <strong>Ranip</strong> (GSRTC Bus Terminal), and <strong>Sabarmati / AEC</strong> (Railway Junction). Intermediate high-density stations like Old High Court or Commerce Six Road have very limited parking.
          </div>
        </details>
        <details class="faq-card">
          <summary>Is overnight parking permitted at Ahmedabad Metro stations?</summary>
          <div class="faq-body">
            Overnight parking is not available at standard elevated metro stations. For overnight or long-duration vehicle parking, commuters are advised to use 24-hour guarded municipal or railway parking complexes, such as Ahmedabad Junction (Kalupur) or Sabarmati Railway Station.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('parking', 'index.html'), html);
}

// 3.6 Ahmedabad Metro Interchange Guide (/interchange)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/interchange';
  const title = 'Ahmedabad Metro Interchange Guide - Old High Court, Koteshwar Road & GNLU Stations | AhmMetro';
  const description = 'Complete guide to Ahmedabad Metro interchange stations: Old High Court (Blue ⇄ Red), Koteshwar Road (Red ⇄ Green), and GNLU (Green ⇄ Purple). How to change trains, platform levels, walking times, and ticketing rules.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Interchange Guide', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I transfer between the Blue Line and Red Line at Old High Court?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Old High Court is a 2-level stacked interchange station. Blue Line (East-West) runs on Level 1, while Red Line (North-South) runs on Level 2. Commuters simply take the escalators or elevators between levels inside the paid fare concourse without passing through exit gates.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to buy two tickets to travel on both metro lines?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. A single token or Metro Smart Card covers your entire journey across all connected lines. The fare is calculated automatically based on total stations traveled, with zero extra surcharge for transferring lines.',
        },
      },
      {
        '@type': 'Question',
        name: 'How long does an interchange transfer take at Old High Court?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Walking between platforms takes approximately 2 to 3 minutes. Dual-speed escalators and wide elevators provide rapid, barrier-free access between levels.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where is the Gandhinagar and GIFT City interchange?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Transfer from Ahmedabad Red Line to Gandhinagar Green Line occurs at Koteshwar Road Metro Station. Transfer to the Purple Line (GIFT City branch shuttle) takes place at GNLU Metro Station.',
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Interchange Guide</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#1E3A8A;color:#93C5FD;border:1px solid #3B82F6;">🔄 Seamless Transfers</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">Single Ticket For Whole Trip</span>
          <span class="badge" style="background:#9333EA20;color:#C084FC;border:1px solid #9333EA50;">Level 1 ⇄ Level 2</span>
        </div>
        <h1>Ahmedabad Metro Interchange Stations Guide (${CURRENT_YEAR})</h1>
        <p class="hero-desc">
          How to transfer lines smoothly between Blue Line (East-West), Red Line (North-South), Green Line (Gandhinagar), and Purple Line (GIFT City). Everything about platform navigation, escalators, lifts, and ticketing rules.
        </p>
      </section>

      <h2 class="section-title">🔄 The 3 Official Interchange Hubs</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Interchange Station</th>
              <th>Lines Connected</th>
              <th>Platform Layout</th>
              <th>Transfer Time</th>
              <th>Extra Ticket Required?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/station/old-high-court"><strong>Old High Court</strong></a> (Primary Hub)</td>
              <td>Blue Line (East-West) ⇄ Red Line (North-South)</td>
              <td>Level 1 (Blue) &amp; Level 2 (Red) via escalators/lifts</td>
              <td>~2 – 3 minutes</td>
              <td><strong>NO (Included in fare)</strong></td>
            </tr>
            <tr>
              <td><a href="/station/koteshwar-road"><strong>Koteshwar Road</strong></a></td>
              <td>Red Line ⇄ Green Line (Gandhinagar Extension)</td>
              <td>Cross-platform and concourse transfer</td>
              <td>~2 minutes</td>
              <td><strong>NO (Included in fare)</strong></td>
            </tr>
            <tr>
              <td><a href="/station/gnlu"><strong>GNLU</strong></a> (GIFT City Junction)</td>
              <td>Green Line (Gandhinagar) ⇄ Purple Line (GIFT City)</td>
              <td>Direct platform shuttle connection</td>
              <td>~1 – 2 minutes</td>
              <td><strong>NO (Included in fare)</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">💡 Essential Interchange Tips for Commuters</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Ticketing Rule</div>
          <div class="stat-val" style="font-size:1.15rem;">Do NOT Tap Out</div>
          <div class="stat-sub">Stay inside the paid fare concourse when transferring. Tapping out will end your journey.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Directional Signs</div>
          <div class="stat-val" style="font-size:1.15rem;">Follow Color Paths</div>
          <div class="stat-sub">Follow floor markers and overhead illuminated signages matching the destination line color.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Accessibility</div>
          <div class="stat-val" style="font-size:1.15rem;">100% Barrier-Free</div>
          <div class="stat-sub">Dedicated elevators and wide escalators connect all platform levels at interchange hubs.</div>
        </div>
      </div>

      <h2 class="section-title">❓ Interchange Frequently Asked Questions</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>How do I transfer between the Blue Line and Red Line at Old High Court?</summary>
          <div class="faq-body">
            Old High Court is a 2-level stacked interchange station. <strong>Blue Line (East-West)</strong> runs on Level 1, while <strong>Red Line (North-South)</strong> runs on Level 2. Commuters simply take the escalators or elevators between levels inside the paid fare concourse without passing through exit gates.
          </div>
        </details>
        <details class="faq-card">
          <summary>Do I need to buy two tickets to travel on both metro lines?</summary>
          <div class="faq-body">
            No. A single token or Metro Smart Card covers your entire journey across all connected lines. The fare is calculated automatically based on total stations traveled, with zero extra surcharge for transferring lines.
          </div>
        </details>
        <details class="faq-card">
          <summary>How long does an interchange transfer take at Old High Court?</summary>
          <div class="faq-body">
            Walking between platforms takes approximately <strong>2 to 3 minutes</strong>. Dual-speed escalators and wide elevators provide rapid, barrier-free access between levels.
          </div>
        </details>
        <details class="faq-card">
          <summary>Where is the Gandhinagar and GIFT City interchange?</summary>
          <div class="faq-body">
            Transfer from Ahmedabad Red Line to Gandhinagar Green Line occurs at <strong>Koteshwar Road Metro Station</strong>. Transfer to the Purple Line (GIFT City branch shuttle) takes place at <strong>GNLU Metro Station</strong>.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('interchange', 'index.html'), html);
}

// 3.7 Ahmedabad Metro Fare Guide (/fare and /fare-chart)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/fare';
  const title = `Ahmedabad Metro Fare ${CURRENT_YEAR} - Official Ticket Price Calculator, Slabs & Smart Card Discounts | AhmMetro`;
  const description = 'Official Ahmedabad & Gandhinagar Metro fare chart and ticket price calculator. Distance slabs from ₹5 to ₹25 (city) and up to ₹40 (Gandhinagar), 10% Smart Card / NCMC discounts, rules, and child policy.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Fare Calculator', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the minimum and maximum metro fare in Ahmedabad?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The minimum fare on the Ahmedabad Metro is ₹5 (for short distances up to 2.5 km or 1 station). Within the Ahmedabad city Phase 1 network (Blue Line and Red Line), the maximum fare is capped at ₹25. Across the entire extended inter-city network connecting Gandhinagar (Mahatma Mandir) and GIFT City, fares range up to ₹40. When using an Ahmedabad Metro Smart Card or RuPay NCMC card, commuters receive a flat 10% discount on every trip (making city fares ₹4.50 to ₹22.50, and max network fare ₹36.00).',
        },
      },
      {
        '@type': 'Question',
        name: 'How much is the ticket fare between Thaltej and Vastral Gam?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The one-way standard paper token fare between Thaltej / Thaltej Gam and Vastral Gam is ₹25 (not ₹30). If paying with an Ahmedabad Metro Smart Card or RuPay NCMC card, the discounted fare is ₹22.50. For journeys between Thaltej and Vastral station, the fare is ₹20 (₹18.00 with card).',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the Ahmedabad Metro fare slab system work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Gujarat Metro Rail Corporation (GMRC) operates on distance-based fare slabs: Slab 1 (0–2.5 km): ₹5; Slab 2 (2.5–7.5 km): ₹10; Slab 3 (7.5–12.5 km): ₹15; Slab 4 (12.5–17.5 km): ₹20; Slab 5 (17.5+ km - Ahmedabad Phase 1 maximum): ₹25. Long-distance inter-city trips connecting Gandhinagar and GIFT City range into higher slabs of ₹30, ₹35, and ₹40.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I purchase Ahmedabad Metro tickets?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Passengers can purchase tickets via: 1) Paper QR code tokens at station automatic ticket vending machines (TVMs) and manned ticket counters using cash or UPI; 2) GMRC Contactless Smart Cards (₹50 refundable deposit, 10% discount on every trip); 3) National Common Mobility Cards (NCMC RuPay debit/prepaid cards from any Indian bank); 4) Digital QR tickets through WhatsApp chatbots and the official GMRC mobile application.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are children charged for metro tickets in Ahmedabad?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Up to two children under 3 feet (90 cm) in height travel completely free when accompanied by a ticket-holding adult. Children taller than 3 feet require a regular full-fare passenger ticket.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the penalty for overstaying inside the metro station?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Commuters are permitted to stay inside the paid station area for up to 120 minutes (2 hours) for point-to-point journeys. Overstaying incurs a penalty of ₹10 per hour up to a maximum penalty of ₹50. For entering and exiting the exact same station, passengers must exit within 20 minutes (minimum fare ₹5); overstaying beyond 20 minutes attracts standard overstay charges.',
        },
      },
    ],
  };

  const renderFareBody = (currentCanonical) => `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Fare Calculator</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">Official GMRC Distance Matrix</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">10% Smart Card / NCMC Discount</span>
          <span class="badge badge-gray">Updated ${CURRENT_MONTH_YEAR}</span>
        </div>
        <h1>Ahmedabad Metro Fare Slabs &amp; Ticket Prices (${CURRENT_YEAR})</h1>
        <p class="hero-desc">
          Official Gujarat Metro Rail Corporation (GMRC) fare matrix covering all 53 operational stations across Blue Line, Red Line, Green Line (Gandhinagar), and Purple Line (GIFT City). Fares start at ₹5, cap at ₹25 within Ahmedabad city, and extend up to ₹40 for Gandhinagar inter-city travel, with a 10% discount on Smart Card &amp; NCMC payments.
        </p>
        <div class="hero-actions">
          <a href="/routes" class="cta-btn">
            <span>Find Route &amp; Calculate Fare</span>
            <span>→</span>
          </a>
          <a href="/timings" class="cta-btn" style="background:#1E293B;color:#F8FAFC;">
            <span>Check Train Timings</span>
          </a>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Minimum Fare</div>
          <div class="stat-val">₹5</div>
          <div class="stat-sub">0 – 2.5 km (₹4.50 with Card)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ahmedabad City Cap</div>
          <div class="stat-val">₹25</div>
          <div class="stat-sub">Phase 1 maximum (₹22.50 with Card)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Full Network Cap</div>
          <div class="stat-val">₹40</div>
          <div class="stat-sub">To Mahatma Mandir (₹36.00 with Card)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Children Policy</div>
          <div class="stat-val">Free &lt; 3 ft</div>
          <div class="stat-sub">Two children &lt; 90 cm per adult</div>
        </div>
      </section>

      <h2 class="section-title">📊 Official GMRC Distance Fare Slabs</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fare Slab</th>
              <th>Distance Range</th>
              <th>Paper Token Fare</th>
              <th>Smart Card / NCMC (10% Off)</th>
              <th>Applicable Route Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Slab 1</strong></td>
              <td>0 – 2.5 km</td>
              <td><strong>₹5</strong></td>
              <td><strong>₹4.50</strong></td>
              <td>Thaltej to Thaltej Gam, Paldi to Shreyas, Motera to Sabarmati</td>
            </tr>
            <tr>
              <td><strong>Slab 2</strong></td>
              <td>2.5 – 7.5 km</td>
              <td><strong>₹10</strong></td>
              <td><strong>₹9.00</strong></td>
              <td>Kalupur to Old High Court, Vastral to Kalupur, APMC to Paldi</td>
            </tr>
            <tr>
              <td><strong>Slab 3</strong></td>
              <td>7.5 – 12.5 km</td>
              <td><strong>₹15</strong></td>
              <td><strong>₹13.50</strong></td>
              <td>Thaltej to Kalupur, Vastral Gam to Kalupur, APMC to Usmanpura</td>
            </tr>
            <tr>
              <td><strong>Slab 4</strong></td>
              <td>12.5 – 17.5 km</td>
              <td><strong>₹20</strong></td>
              <td><strong>₹18.00</strong></td>
              <td>APMC to Motera Stadium, Thaltej to Vastral, Motera to Sector 1</td>
            </tr>
            <tr>
              <td><strong>Slab 5 (City Cap)</strong></td>
              <td>17.5+ km (Phase 1)</td>
              <td><strong>₹25</strong></td>
              <td><strong>₹22.50</strong></td>
              <td>Thaltej Gam to Vastral Gam, Koteshwar Rd to Mahatma Mandir</td>
            </tr>
            <tr>
              <td><strong>Phase 2 Inter-City</strong></td>
              <td>Long-Distance Corridors</td>
              <td><strong>₹30 – ₹40</strong></td>
              <td><strong>₹27.00 – ₹36.00</strong></td>
              <td>Old High Court to GIFT City (₹30), Thaltej to Mahatma Mandir (₹40)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">🚆 Popular Commuter Routes Official Fare Table</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Origin Station</th>
              <th>Destination Station</th>
              <th>Corridor / Transfer</th>
              <th>Paper QR Token</th>
              <th>Smart Card (10% Off)</th>
              <th>Route Guide</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/station/thaltej-gam"><strong>Thaltej Gam</strong></a></td>
              <td><a href="/station/vastral-gam"><strong>Vastral Gam</strong></a></td>
              <td>Blue Line Direct (17 stops)</td>
              <td><strong>₹25</strong></td>
              <td><strong style="color:#4ADE80;">₹22.50</strong></td>
              <td><a href="/route/thaltej-to-vastral-gam">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/thaltej"><strong>Thaltej</strong></a></td>
              <td><a href="/station/vastral"><strong>Vastral</strong></a></td>
              <td>Blue Line Direct (14 stops)</td>
              <td><strong>₹20</strong></td>
              <td><strong style="color:#4ADE80;">₹18.00</strong></td>
              <td><a href="/route/thaltej-to-vastral-gam">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/apmc"><strong>APMC (Vasna)</strong></a></td>
              <td><a href="/station/motera-stadium"><strong>Motera Stadium</strong></a></td>
              <td>Red Line Direct (14 stops)</td>
              <td><strong>₹20</strong></td>
              <td><strong style="color:#4ADE80;">₹18.00</strong></td>
              <td><a href="/route/apmc-to-motera-stadium">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/kalupur"><strong>Kalupur Railway Station</strong></a></td>
              <td><a href="/station/old-high-court"><strong>Old High Court</strong></a></td>
              <td>Blue Line Direct (3 stops)</td>
              <td><strong>₹10</strong></td>
              <td><strong style="color:#4ADE80;">₹9.00</strong></td>
              <td><a href="/route/kalupur-to-old-high-court">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/thaltej"><strong>Thaltej</strong></a></td>
              <td><a href="/station/kalupur"><strong>Kalupur Railway Station</strong></a></td>
              <td>Blue Line Direct (9 stops)</td>
              <td><strong>₹15</strong></td>
              <td><strong style="color:#4ADE80;">₹13.50</strong></td>
              <td><a href="/route/thaltej-to-kalupur">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/vastral-gam"><strong>Vastral Gam</strong></a></td>
              <td><a href="/station/kalupur"><strong>Kalupur Railway Station</strong></a></td>
              <td>Blue Line Direct (8 stops)</td>
              <td><strong>₹15</strong></td>
              <td><strong style="color:#4ADE80;">₹13.50</strong></td>
              <td><a href="/route/vastral-to-kalupur">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/vastral"><strong>Vastral</strong></a></td>
              <td><a href="/station/kalupur"><strong>Kalupur Railway Station</strong></a></td>
              <td>Blue Line Direct (6 stops)</td>
              <td><strong>₹10</strong></td>
              <td><strong style="color:#4ADE80;">₹9.00</strong></td>
              <td><a href="/route/vastral-to-kalupur">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/old-high-court"><strong>Old High Court</strong></a></td>
              <td><a href="/station/gift-city"><strong>GIFT City</strong></a></td>
              <td>Red → Purple (Transfer GNLU)</td>
              <td><strong>₹30</strong></td>
              <td><strong style="color:#4ADE80;">₹27.00</strong></td>
              <td><a href="/route/old-high-court-to-gift-city">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/motera-stadium"><strong>Motera Stadium</strong></a></td>
              <td><a href="/station/sector-1"><strong>Sector 1 (Gandhinagar)</strong></a></td>
              <td>Red → Green Corridor</td>
              <td><strong>₹20</strong></td>
              <td><strong style="color:#4ADE80;">₹18.00</strong></td>
              <td><a href="/route/motera-stadium-to-sector-1">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/koteshwar-road"><strong>Koteshwar Road</strong></a></td>
              <td><a href="/station/mahatma-mandir"><strong>Mahatma Mandir</strong></a></td>
              <td>Green Line Direct (20 stops)</td>
              <td><strong>₹25</strong></td>
              <td><strong style="color:#4ADE80;">₹22.50</strong></td>
              <td><a href="/route/koteshwar-road-to-mahatma-mandir">View Route →</a></td>
            </tr>
            <tr>
              <td><a href="/station/thaltej-gam"><strong>Thaltej Gam</strong></a></td>
              <td><a href="/station/mahatma-mandir"><strong>Mahatma Mandir</strong></a></td>
              <td>Blue → Green (Transfer Old High Court)</td>
              <td><strong>₹40</strong></td>
              <td><strong style="color:#4ADE80;">₹36.00</strong></td>
              <td><a href="/routes">View Route →</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">💳 Ticketing Options &amp; Payment Modes</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Paper QR Token</div>
          <div class="stat-val" style="font-size:1.15rem;">Single Journey</div>
          <div class="stat-sub">Purchasable at station TVMs and counters using cash or UPI. Must enter station within 30 minutes of purchase.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">GMRC Smart Card</div>
          <div class="stat-val" style="font-size:1.15rem;">10% Discount</div>
          <div class="stat-sub">Contactless RFID card. ₹50 refundable security deposit. Recharge in multiples of ₹50 up to ₹3,000.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">NCMC RuPay Cards</div>
          <div class="stat-val" style="font-size:1.15rem;">National Mobility</div>
          <div class="stat-sub">Use any bank RuPay NCMC debit/prepaid card directly at the AFC gates. Automatic 10% fare concession applies.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">WhatsApp &amp; Mobile QR</div>
          <div class="stat-val" style="font-size:1.15rem;">Digital Booking</div>
          <div class="stat-sub">Generate digital QR tickets via official messaging chatbots and GMRC mobile app. Scan phone directly at AFC scanner.</div>
        </div>
      </div>

      <h2 class="section-title">⚠️ Travel Rules &amp; Station Overstay Penalty</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Maximum Travel Time</div>
          <div class="stat-val" style="font-size:1.15rem;">120 Minutes</div>
          <div class="stat-sub">You have 2 hours from station entry to exit your destination station before overstay penalty applies.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Same Station Exit</div>
          <div class="stat-val" style="font-size:1.15rem;">20 Minutes (₹5)</div>
          <div class="stat-sub">If you enter and exit the exact same station within 20 mins, a flat charge of ₹5 is deducted.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Overstay Penalty</div>
          <div class="stat-val" style="font-size:1.15rem;">₹10 / Hour</div>
          <div class="stat-sub">Exceeding permitted station duration results in a fine of ₹10 per hour up to a network cap of ₹50.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Baggage Allowance</div>
          <div class="stat-val" style="font-size:1.15rem;">25 kg Free</div>
          <div class="stat-sub">1 luggage item per passenger up to 25 kg (max 80 x 50 x 30 cm). Bulky luggage &gt; 25 kg is not permitted.</div>
        </div>
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions about Ahmedabad Metro Fare</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>What is the minimum and maximum metro fare in Ahmedabad?</summary>
          <div class="faq-body">
            The minimum fare on Ahmedabad Metro is <strong>₹5</strong> (0–2.5 km). Within the Ahmedabad city Phase 1 network (Blue Line and Red Line), the maximum fare is capped at <strong>₹25</strong>. Across the entire extended inter-city network connecting Gandhinagar (Mahatma Mandir) and GIFT City, fares range up to <strong>₹40</strong>. When using an Ahmedabad Metro Smart Card or RuPay NCMC card, commuters receive a flat 10% discount on every trip (making city fares ₹4.50 to ₹22.50, and max network fare ₹36.00).
          </div>
        </details>
        <details class="faq-card">
          <summary>How much is the ticket fare between Thaltej and Vastral Gam?</summary>
          <div class="faq-body">
            The standard paper token fare between Thaltej / Thaltej Gam and Vastral Gam is <strong>₹25</strong> (not ₹30). If paying with an Ahmedabad Metro Smart Card or RuPay NCMC card, the discounted fare is <strong>₹22.50</strong>. Between Thaltej and Vastral station, the fare is <strong>₹20</strong> (₹18.00 with card).
          </div>
        </details>
        <details class="faq-card">
          <summary>How does the Ahmedabad Metro fare slab system work?</summary>
          <div class="faq-body">
            GMRC operates on official distance-based fare slabs:
            <ul style="margin: 0.5rem 0 0.5rem 1.5rem;">
              <li>Slab 1 (0–2.5 km): ₹5 (₹4.50 with card)</li>
              <li>Slab 2 (2.5–7.5 km): ₹10 (₹9.00 with card)</li>
              <li>Slab 3 (7.5–12.5 km): ₹15 (₹13.50 with card)</li>
              <li>Slab 4 (12.5–17.5 km): ₹20 (₹18.00 with card)</li>
              <li>Slab 5 (17.5+ km - Phase 1 City Cap): ₹25 (₹22.50 with card)</li>
              <li>Phase 2 Inter-City Slabs: ₹30, ₹35, and ₹40 maximum for Gandhinagar &amp; GIFT City journeys</li>
            </ul>
          </div>
        </details>
        <details class="faq-card">
          <summary>How can I purchase Ahmedabad Metro tickets?</summary>
          <div class="faq-body">
            Tickets can be bought via: 1) Paper QR tokens at station TVMs and manned counters using Cash or UPI; 2) GMRC Contactless Smart Card (10% discount, ₹50 refundable deposit); 3) Any bank RuPay NCMC card at AFC entry gates; 4) WhatsApp QR tickets &amp; the official mobile app.
          </div>
        </details>
        <details class="faq-card">
          <summary>Are children charged for metro tickets in Ahmedabad?</summary>
          <div class="faq-body">
            Up to two children under 3 feet (90 cm) in height travel completely free when accompanied by a ticket-holding adult. Children taller than 3 feet require a regular full-fare ticket.
          </div>
        </details>
        <details class="faq-card">
          <summary>What is the penalty for overstaying inside the metro station?</summary>
          <div class="faq-body">
            Commuters can remain inside the paid network area for up to 120 minutes (2 hours). Overstaying incurs an overstay penalty of <strong>₹10 per hour</strong> up to a maximum fee of ₹50. For entering and exiting at the same station, exit must occur within 20 minutes (₹5 fee).
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const fareHtml = buildHtmlPage({
    title,
    description,
    canonicalUrl: 'https://www.ahmedabadmetro.site/fare',
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent: renderFareBody('https://www.ahmedabadmetro.site/fare'),
  });
  writeHtmlFile(path.join('fare', 'index.html'), fareHtml);

  const fareChartBreadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Fare Chart', item: 'https://www.ahmedabadmetro.site/fare-chart' },
    ],
  };
  const fareChartHtml = buildHtmlPage({
    title,
    description,
    canonicalUrl: 'https://www.ahmedabadmetro.site/fare-chart',
    jsonLdArray: [fareChartBreadcrumbSchema, faqSchema],
    bodyContent: renderFareBody('https://www.ahmedabadmetro.site/fare-chart'),
  });
  writeHtmlFile(path.join('fare-chart', 'index.html'), fareChartHtml);
}

// 3.8 Ahmedabad Metro Timings Guide (/timings)
{
  const canonicalUrl = 'https://www.ahmedabadmetro.site/timings';
  const title = `Ahmedabad Metro Timings ${CURRENT_YEAR} - First & Last Train Schedule, Frequencies | AhmMetro`;
  const description = 'Complete Ahmedabad Metro network schedule. First and last train timings across all 4 corridors (Blue, Red, Green & Purple Lines). Peak hours headway, Sunday timetable, and holiday operating hours.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Timings', item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What are the first and last train timings for Ahmedabad Metro?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'On the Blue Line (Thaltej Gam to Vastral Gam) and Red Line (APMC to Koteshwar Road), trains begin operations at 06:20 AM and 06:16 AM respectively, with the last train departing at 10:00 PM every night. The Green Line to Gandhinagar operates from 07:33 AM to 08:10 PM.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does Ahmedabad Metro run on Sundays and public holidays?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Ahmedabad Metro operates 365 days a year, including Sundays and public holidays. On Sundays and gazetted holidays, service begins at 07:00 AM on Blue and Red Lines with a uniform headway of 10–12 minutes throughout the day.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the train frequency during peak office hours?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'During morning peak hours (08:00 AM – 11:00 AM) and evening peak hours (05:00 PM – 08:00 PM), trains run every 5 to 7 minutes on both the Blue Line and Red Line. During off-peak afternoon hours, frequency is 10 to 12 minutes.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the metro timings for GIFT City?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Purple Line branch connecting GNLU to GIFT City operates during peak business hours in two operational shifts: morning service runs from 07:36 AM to 10:18 AM, and evening service runs from 04:06 PM to 07:15 PM, perfectly aligned with corporate office hours.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the metro timings from Ahmedabad Junction (Kalupur) railway station?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'From Kalupur Railway Station (Blue Line), the first westbound train towards Thaltej Gam departs at 06:30 AM and the first eastbound train towards Vastral Gam departs at 06:32 AM. The last train in both directions departs Kalupur at approximately 10:15 PM.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are metro operating hours extended during cricket matches at Narendra Modi Stadium?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, during major cricket matches and IPL events hosted at Narendra Modi Stadium (Motera Stadium station), GMRC runs special late-night trains until 12:00 AM (midnight) or later to accommodate stadium crowds, with trains departing every 3 to 5 minutes immediately following the match.',
        },
      },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <span style="color: #F8FAFC;">Network Timings</span>
      </nav>

      <section class="hero-card">
        <div class="badge-list">
          <span class="badge" style="background:#0066CC20;color:#38BDF8;border:1px solid #0066CC50;">725 Daily Scheduled Trips</span>
          <span class="badge" style="background:#14532D;color:#86EFAC;border:1px solid #22C55E;">5–7 Min Peak Headway</span>
          <span class="badge badge-gray">Updated ${CURRENT_MONTH_YEAR}</span>
        </div>
        <h1>Ahmedabad Metro Timetable &amp; Schedule (${CURRENT_YEAR})</h1>
        <p class="hero-desc">
          Verified operational timetable for the entire Gujarat Metro Rail Corporation (GMRC) network in Ahmedabad and Gandhinagar. Check first and last train departures, peak and off-peak train frequencies, Sunday timings, and late-night cricket match schedules.
        </p>
        <div class="hero-actions">
          <a href="/routes" class="cta-btn">
            <span>Find Metro Routes &amp; Transfers</span>
            <span>→</span>
          </a>
          <a href="/fare" class="cta-btn" style="background:#1E293B;color:#F8FAFC;">
            <span>Fare Calculator</span>
          </a>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Network Starts</div>
          <div class="stat-val">06:20 AM</div>
          <div class="stat-sub">Blue &amp; Red Lines (07:00 AM Sunday)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Network Closes</div>
          <div class="stat-val">10:00 PM</div>
          <div class="stat-sub">Last train departure across terminals</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Morning Peak Hours</div>
          <div class="stat-val">08:00 – 11:00 AM</div>
          <div class="stat-sub">Every 5–7 mins frequency</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Evening Peak Hours</div>
          <div class="stat-val">05:00 – 08:00 PM</div>
          <div class="stat-sub">Every 5–7 mins frequency</div>
        </div>
      </section>

      <h2 class="section-title">🕒 Line-by-Line Operating Schedule</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Metro Line</th>
              <th>Terminal Stations</th>
              <th>First Train</th>
              <th>Last Train</th>
              <th>Peak Headway</th>
              <th>Off-Peak Headway</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Blue Line (East-West)</strong></td>
              <td>Thaltej Gam ⇄ Vastral Gam</td>
              <td>06:20 AM</td>
              <td>10:00 PM</td>
              <td>5–7 mins</td>
              <td>10–12 mins</td>
            </tr>
            <tr>
              <td><strong>Red Line (North-South)</strong></td>
              <td>APMC (Vasna) ⇄ Koteshwar Road</td>
              <td>06:16 AM</td>
              <td>10:00 PM</td>
              <td>5–7 mins</td>
              <td>10–12 mins</td>
            </tr>
            <tr>
              <td><strong>Green Line (Gandhinagar)</strong></td>
              <td>Koteshwar Road ⇄ Mahatma Mandir</td>
              <td>07:33 AM</td>
              <td>08:10 PM</td>
              <td>15–20 mins</td>
              <td>20 mins</td>
            </tr>
            <tr>
              <td><strong>Purple Line (GIFT City)</strong></td>
              <td>GNLU ⇄ GIFT City</td>
              <td>07:36 AM / 04:06 PM</td>
              <td>10:18 AM / 07:15 PM</td>
              <td>8–12 mins</td>
              <td>15 mins</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">🚉 First &amp; Last Train Timings by Major Stations</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Station Name</th>
              <th>Corridor / Line</th>
              <th>Train Direction / Destination</th>
              <th>First Train</th>
              <th>Last Train</th>
              <th>Station Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/station/thaltej-gam"><strong>Thaltej Gam</strong></a></td>
              <td>Blue Line</td>
              <td>Eastbound towards Vastral Gam</td>
              <td><strong>06:20 AM</strong></td>
              <td><strong>10:00 PM</strong></td>
              <td><a href="/station/thaltej-gam">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/vastral-gam"><strong>Vastral Gam</strong></a></td>
              <td>Blue Line</td>
              <td>Westbound towards Thaltej Gam</td>
              <td><strong>06:20 AM</strong></td>
              <td><strong>10:00 PM</strong></td>
              <td><a href="/station/vastral-gam">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/apmc"><strong>APMC (Vasna)</strong></a></td>
              <td>Red Line</td>
              <td>Northbound towards Koteshwar Road</td>
              <td><strong>06:16 AM</strong></td>
              <td><strong>10:00 PM</strong></td>
              <td><a href="/station/apmc">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/koteshwar-road"><strong>Koteshwar Road</strong></a></td>
              <td>Red &amp; Green Lines</td>
              <td>Southbound towards APMC (Vasna)</td>
              <td><strong>06:16 AM</strong></td>
              <td><strong>10:00 PM</strong></td>
              <td><a href="/station/koteshwar-road">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/kalupur"><strong>Kalupur (Railway Junction)</strong></a></td>
              <td>Blue Line</td>
              <td>Westbound towards Thaltej Gam</td>
              <td><strong>06:30 AM</strong></td>
              <td><strong>10:15 PM</strong></td>
              <td><a href="/station/kalupur">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/kalupur"><strong>Kalupur (Railway Junction)</strong></a></td>
              <td>Blue Line</td>
              <td>Eastbound towards Vastral Gam</td>
              <td><strong>06:32 AM</strong></td>
              <td><strong>10:15 PM</strong></td>
              <td><a href="/station/kalupur">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/old-high-court"><strong>Old High Court (Interchange)</strong></a></td>
              <td>Blue &amp; Red Lines</td>
              <td>All directions (East/West/North/South)</td>
              <td><strong>06:25 AM</strong></td>
              <td><strong>10:12 PM</strong></td>
              <td><a href="/station/old-high-court">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/motera-stadium"><strong>Motera Stadium</strong></a></td>
              <td>Red Line</td>
              <td>Southbound towards APMC</td>
              <td><strong>06:22 AM</strong></td>
              <td><strong>10:08 PM</strong></td>
              <td><a href="/station/motera-stadium">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/mahatma-mandir"><strong>Mahatma Mandir (Gandhinagar)</strong></a></td>
              <td>Green Line</td>
              <td>Southbound towards Koteshwar Road</td>
              <td><strong>07:33 AM</strong></td>
              <td><strong>08:10 PM</strong></td>
              <td><a href="/station/mahatma-mandir">Timetable →</a></td>
            </tr>
            <tr>
              <td><a href="/station/gift-city"><strong>GIFT City</strong></a></td>
              <td>Purple Line</td>
              <td>Westbound towards GNLU Interchange</td>
              <td><strong>07:45 AM / 04:15 PM</strong></td>
              <td><strong>10:18 AM / 07:15 PM</strong></td>
              <td><a href="/station/gift-city">Timetable →</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">⏱️ Train Headway &amp; Frequency Breakdown</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Morning Rush Hours</div>
          <div class="stat-val" style="font-size:1.15rem;">5 – 7 Mins</div>
          <div class="stat-sub">08:00 AM – 11:00 AM. Highest passenger volume with rapid train turnarounds.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Midday Regular Hours</div>
          <div class="stat-val" style="font-size:1.15rem;">10 – 12 Mins</div>
          <div class="stat-sub">11:00 AM – 05:00 PM. Steady midday schedule across all active stations.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Evening Rush Hours</div>
          <div class="stat-val" style="font-size:1.15rem;">5 – 7 Mins</div>
          <div class="stat-sub">05:00 PM – 08:00 PM. Return commute service with increased fleet capacity.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Night Hours</div>
          <div class="stat-val" style="font-size:1.15rem;">12 – 15 Mins</div>
          <div class="stat-sub">08:00 PM – 10:00 PM. Gradual wind-down until final terminal departures.</div>
        </div>
      </div>

      <h2 class="section-title">📅 Sunday &amp; Special Event Operating Timetable</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Sundays &amp; Gazetted Holidays</div>
          <div class="stat-val" style="font-size:1.15rem;">07:00 AM – 10:00 PM</div>
          <div class="stat-sub">Services begin slightly later on Sunday mornings with a steady 10–12 minute headway throughout the day.</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Match Days at Motera Stadium</div>
          <div class="stat-val" style="font-size:1.15rem;">Extended till 12:00 AM</div>
          <div class="stat-sub">During IPL and international cricket matches at Narendra Modi Stadium, trains run past midnight at 3–5 min intervals.</div>
        </div>
      </div>

      <h2 class="section-title">❓ Frequently Asked Questions about Ahmedabad Metro Timings</h2>
      <div class="faq-list">
        <details class="faq-card" open>
          <summary>What are the first and last train timings for Ahmedabad Metro?</summary>
          <div class="faq-body">
            On the Blue Line (Thaltej Gam ⇄ Vastral Gam) and Red Line (APMC ⇄ Koteshwar Road), operations start at <strong>06:20 AM</strong> and <strong>06:16 AM</strong> respectively, and close with the final departure at <strong>10:00 PM</strong> daily. The Green Line operates from 07:33 AM to 08:10 PM.
          </div>
        </details>
        <details class="faq-card">
          <summary>Does Ahmedabad Metro run on Sundays and public holidays?</summary>
          <div class="faq-body">
            Yes, Ahmedabad Metro runs 365 days a year. On Sundays and national holidays, morning operations begin at <strong>07:00 AM</strong> with consistent 10–12 minute train frequencies throughout the afternoon and evening.
          </div>
        </details>
        <details class="faq-card">
          <summary>What is the train frequency during peak office hours?</summary>
          <div class="faq-body">
            During peak morning rush (08:00 AM to 11:00 AM) and evening rush (05:00 PM to 08:00 PM), trains arrive every <strong>5 to 7 minutes</strong> on Blue and Red Lines. Off-peak midday headway is 10 to 12 minutes.
          </div>
        </details>
        <details class="faq-card">
          <summary>What are the metro timings for GIFT City?</summary>
          <div class="faq-body">
            The Purple Line connects GNLU to GIFT City during tech park office shifts in two windows: morning service runs from <strong>07:36 AM to 10:18 AM</strong> and evening service runs from <strong>04:06 PM to 07:15 PM</strong>.
          </div>
        </details>
        <details class="faq-card">
          <summary>What are the metro timings from Ahmedabad Junction (Kalupur) railway station?</summary>
          <div class="faq-body">
            At Kalupur Railway Station, the first westbound train toward Thaltej Gam departs at <strong>06:30 AM</strong>, while the first eastbound train toward Vastral Gam departs at <strong>06:32 AM</strong>. The last train in both directions departs at approximately <strong>10:15 PM</strong>.
          </div>
        </details>
        <details class="faq-card">
          <summary>Are metro operating hours extended during cricket matches at Narendra Modi Stadium?</summary>
          <div class="faq-body">
            Yes! For IPL matches and international cricket games at Narendra Modi Stadium (Motera Stadium station), GMRC operates special post-match trains until <strong>12:00 AM (midnight)</strong> or later, running every 3 to 5 minutes to disperse stadium crowds safely.
          </div>
        </details>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [breadcrumbSchema, faqSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('timings', 'index.html'), html);
}

// ==========================================
// 4. GENERATE 4 METRO LINE PAGES
// ==========================================
console.log('Generating Metro Line Static Pages...');
const LINE_KEYS = ['blue', 'red', 'green', 'purple'];

for (const key of LINE_KEYS) {
  const line = METRO_LINES[key];
  const canonicalUrl = `https://www.ahmedabadmetro.site/line/${line.slug}`;
  const title = `${line.name} Ahmedabad Metro - Route, Stations, Timings & Map | AhmMetro`;
  const description = `Explore the ${line.name} of Ahmedabad & Gandhinagar Metro. ${line.stationCount} stations from ${line.terminalA} to ${line.terminalB} (${line.distanceKm} km). Timings: ${line.operatingHours}. Frequency: ${line.headway}.`;

  const lineStationsList = Object.values(stationStats).filter(st => st.lines.includes(key));

  const transitLineSchema = {
    '@context': 'https://schema.org',
    '@type': 'TransitLine',
    name: line.name,
    alternateName: [line.nameGu, line.nameHi],
    startStation: { '@type': 'TransitStop', name: line.terminalA },
    endStation: { '@type': 'TransitStop', name: line.terminalB },
    distance: `${line.distanceKm} km`,
    operatingHours: line.operatingHours,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ahmedabadmetro.site/' },
      { '@type': 'ListItem', position: 2, name: 'Lines', item: 'https://www.ahmedabadmetro.site/map' },
      { '@type': 'ListItem', position: 3, name: line.name, item: canonicalUrl },
    ],
  };

  const bodyContent = `
    ${renderHeader()}
    <main class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>›</span>
        <a href="/map">Metro Lines</a> <span>›</span>
        <span style="color: #F8FAFC;">${line.name}</span>
      </nav>

      <section class="hero-card" style="border-left: 6px solid ${line.color};">
        <div class="badge-list">
          <span class="badge" style="background-color: ${line.color}20; color: ${line.color}; border: 1px solid ${line.color}50;">
            <span class="dot" style="background-color: ${line.color};"></span>
            ${line.name.split('(')[0].trim()}
          </span>
          <span class="badge badge-gray">${line.distanceKm} km</span>
          <span class="badge badge-gray">${line.stationCount} Operational Stations</span>
        </div>
        <h1>${line.name}</h1>
        <div class="regional-names">${line.nameGu} • ${line.nameHi}</div>
        <p class="hero-desc">
          Connecting <strong>${line.terminalA}</strong> to <strong>${line.terminalB}</strong> across ${line.distanceKm} km. Operating hours: ${line.operatingHours}. Frequency: ${line.headway}.
        </p>
        <div class="hero-actions">
          <a href="/?line=${line.key}" class="cta-btn" style="background: ${line.color};">
            <span>Explore Line on Interactive Map</span>
            <span>🗺️</span>
          </a>
          <a href="/fare" class="cta-btn" style="background:#1E293B;color:#F8FAFC;">
            <span>Fare Calculator</span>
          </a>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Corridor Length</div>
          <div class="stat-val">${line.distanceKm} km</div>
          <div class="stat-sub">${line.stationCount} total stations</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Operating Schedule</div>
          <div class="stat-val" style="font-size:1.15rem;">${line.operatingHours.split('–')[0].trim()} – ${line.operatingHours.split('–')[1]?.trim() || '10:00 PM'}</div>
          <div class="stat-sub">7 days a week</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Train Headway</div>
          <div class="stat-val">5–7 min</div>
          <div class="stat-sub">Peak hours rush</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ticket Fare Slabs</div>
          <div class="stat-val">₹5 – ₹30</div>
          <div class="stat-sub">10% discount on Smart Card</div>
        </div>
      </section>

      <h2 class="section-title">🚉 Complete Station Directory on ${line.name.split('(')[0].trim()}</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Station Name</th>
              <th>Gujarati / Hindi</th>
              <th>Type</th>
              <th>Interchange</th>
              <th>Timetable</th>
            </tr>
          </thead>
          <tbody>
            ${lineStationsList.map((st, i) => `
              <tr>
                <td><strong>${i + 1}</strong></td>
                <td><a href="/station/${st.slug}"><strong>${st.name}</strong></a></td>
                <td>${st.nameGu} / ${st.nameHi}</td>
                <td>${st.isUnderground ? 'Underground' : 'Elevated'}</td>
                <td>${st.isInterchange ? '🔄 Interchange' : '—'}</td>
                <td><a href="/station/${st.slug}">View Timings →</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </main>
    ${renderFooter()}
  `;

  const html = buildHtmlPage({
    title,
    description,
    canonicalUrl,
    jsonLdArray: [transitLineSchema, breadcrumbSchema],
    bodyContent,
  });

  writeHtmlFile(path.join('line', line.slug, 'index.html'), html);
}

console.log('All static pages generated successfully!');
