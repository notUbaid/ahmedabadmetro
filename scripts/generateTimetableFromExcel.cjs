/*
  Generates timetable data for the app from:
    attached_assets/Ahmedabad_Metro_Master_Database_V2.xlsx

  Output:
    src/data/timetableFromExcel.generated.json

  Note: This is a dev/build-time script. It does not run in the browser.
*/

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const PROJECT_ROOT = process.cwd();
const EXCEL_PATH = path.join(PROJECT_ROOT, 'attached_assets', 'Ahmedabad_Metro_Master_Database_V2.xlsx');
const OUT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'timetableFromExcel.generated.json');

const DAY_TYPES_TO_KEEP = new Set(['Mon-Fri', 'Saturday', 'Sunday']);

function normalizeTimeToHHMM(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    // Excel time as fraction of day
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  const s = String(value).trim();
  if (!s) return null;

  // Handle TERMINUS for last station
  if (s.toUpperCase() === 'TERMINUS') {
    // Return a placeholder that indicates this is a terminus
    return 'TERMINUS';
  }

  // Expect formats like HH:MM:SS or HH:MM
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(Number(m[1])).padStart(2, '0');
  const mm = String(Number(m[2])).padStart(2, '0');
  return `${hh}:${mm}`;
}

function toMinutes(hhmm) {
  if (hhmm === 'TERMINUS') return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// App expects station IDs from metroData. Excel has human-readable station names.
// This mapping is intentionally strict; if a station name is not found, script throws.
// metroData.ts is ESM-only in this repo; load it dynamically.
let stationNameToId;

async function loadStationMap() {
const metroDataMod = await import('../src/data/metroData.ts');



  const { stations } = metroDataMod;
  stationNameToId = new Map(
    Object.values(stations).map((st) => [String(st.name).toLowerCase().trim(), st.id])
  );
}

function mapStationNameToId(stationName) {
  const raw = String(stationName).toLowerCase().trim();
  const key = raw
    .replace(/\s+/g, ' ')
    .replace(/\./g, '')
    .replace(/railway station/g, 'railway')
    .replace(/road/g, 'road')
    .replace(/ rd\b/g, ' road')
    .replace(/ cross road/g, ' cross roads')
    .replace(/ cheekanta/g, ' cheekanta');

  // Hand-tuned aliases from Excel v2 to metroData station ids.
  const aliases = {
    'cheekanta': 'gheekanta',
    'kalupur railway': 'kalupur',
    'kalupur': 'kalupur',
    'robari colony': 'rabari_colony',
    'nirant cross road': 'nirant_cross_roads',
    'nirant cross roads': 'nirant_cross_roads',
    'kankaria': 'kankaria_east',
    'vastral gam': 'vastral_gam',
    'sabarmati railway': 'sabarmati',
    'jivraj': 'jivraj_park',
    'pdeu': 'gandhigram',
    'sector-24': 'sector_24',
    'sector-16': 'sector_16',
    'rayson': 'ranip',
    'kankaria east': 'kankaria_east'
  };

  if (aliases[key]) {
    return aliases[key];
  }

  return stationNameToId.get(key) ?? null;
}



function buildSchedulesFromSheet(sheetName, routes, dirTransform) {
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Missing sheet: ${sheetName}`);

  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  // Group by Train_ID (each train contains sequential station rows)
  const groups = new Map();

  // Debug counters
  const nullStationIds = { total: 0 };
  const nullStationNames = new Map();

  for (const r of rows) {

    const dayType = r.Day_Type || '';
    // Northbound/southbound sheets use Route + Direction and may not have Day_Type
    // We'll keep all rows but only the app needs a consistent daily schedule.
    // For this script we: if Day_Type exists, keep it; otherwise treat as 'Mon-Fri'.
    const day = DAY_TYPES_TO_KEEP.has(dayType) ? dayType : (dayType ? null : 'Mon-Fri');
    if (!day) continue;

    const trainId = String(r.Train_ID || '').trim();
    if (!trainId) continue;

    const stationOrder = Number(r.Station_Order);
    const stationName = r.Station_Name;
    const arrival = normalizeTimeToHHMM(r.Arrival_Time);
    const departure = normalizeTimeToHHMM(r.Departure_Time);

    if (!stationName || !arrival || !stationOrder) {
      // Some rows may be blank headers - skip.
      continue;
    }

    const mappedStationId = mapStationNameToId(stationName);

    if (!groups.has(trainId)) groups.set(trainId, []);
    groups.get(trainId).push({
      day,
      trainId,
      route: r.Route || '',
      rawDirection: r.Direction || '',
      stationOrder,
      stationId: mappedStationId,
      stationName,
      arrivalHHMM: arrival,
      departureHHMM: departure,
      arrivalMin: toMinutes(arrival),
      departureMin: toMinutes(departure),
    });
  }

  const trainIds = [...groups.keys()];
  const schedules = [];

  for (const trainId of trainIds) {
    const items = groups.get(trainId);
    // Only keep stations with valid IDs and deduplicate by stationId
    const seenStations = new Set();
    const uniqueItems = [];
    for (const item of items) {
      if (item.stationId !== null && !seenStations.has(item.stationId)) {
        seenStations.add(item.stationId);
        uniqueItems.push(item);
      }
    }
    
    if (uniqueItems.length === 0) continue;
    
    // Sort by station order (or by arrival time if order is same)
    uniqueItems.sort((a, b) => a.stationOrder - b.stationOrder || (a.departureMin ?? a.arrivalMin) - (b.departureMin ?? b.arrivalMin));

    // Determine start time: departure time of first station row (or arrival if departure is TERMINUS)
    const first = uniqueItems[0];
    const firstDeparture = first.departureMin;
    const startTime = normalizeTimeToHHMM(firstDeparture ? first.departureHHMM : first.arrivalHHMM);
    const baseDepartureMin = firstDeparture || first.arrivalMin;

    const stationsArr = uniqueItems.map((x) => x.stationId);
    const arrivalMinutes = uniqueItems.map((x) => x.arrivalMin - baseDepartureMin);

    // Determine line + direction
    // dirTransform returns { line, direction }
    const derived = dirTransform({ sheetName, row: uniqueItems[0], route: uniqueItems[0].route, rawDirection: uniqueItems[0].rawDirection });

    schedules.push({
      id: trainId,
      line: derived.line,
      direction: derived.direction,
      startTime,
      stations: stationsArr,
      stationTimes: arrivalMinutes,
    });
  }

  return schedules;
}

async function main() {
  await loadStationMap();

  const wb = xlsx.readFile(EXCEL_PATH);

  if (!wb) throw new Error('Failed to read Excel');

  const sheets = wb.SheetNames;

  // Direction + line mapping rules based on sheet and Route values.
  // Sheet: Line_1_East_West => blue
  // Sheet: Lines_2_3_4_Northbound => Northbound (L2,L3,L4)
  // Sheet: Lines_2_3_4_Southbound => Southbound (L2,L3,L4)
  const schedules = [];

  const add = (arr) => schedules.push(...arr);

  add(buildSchedulesFromSheet('Line_1_East_West', null, ({ rawDirection }) => {
    const direction = rawDirection === 'Eastbound' ? 'forward' : 'backward';
    return { line: 'blue', direction };
  }));

  const mapRouteToLine = (route) => {
    // Excel route field values seen: L2, L3, L4
    if (route === 'L2') return 'red';
    if (route === 'L3') return 'green';
    if (route === 'L4') return 'purple';
    throw new Error(`Unknown Excel Route: ${route}`);
  };

  add(buildSchedulesFromSheet('Lines_2_3_4_Northbound', null, ({ route, rawDirection }) => {
    const line = mapRouteToLine(route);
    // Northbound corresponds to forward for these app line conventions
    // (We map by comparing to existing app terminal conventions.)
    const direction = rawDirection === 'Northbound' ? 'forward' : 'backward';
    return { line, direction };
  }));

  add(buildSchedulesFromSheet('Lines_2_3_4_Southbound', null, ({ route, rawDirection }) => {
    const line = mapRouteToLine(route);
    const direction = rawDirection === 'Southbound' ? 'forward' : 'backward';
    return { line, direction };
  }));

  // Deduplicate: if IDs repeat across days (unlikely), keep the one with most stations.
  const byId = new Map();
  for (const s of schedules) {
    const existing = byId.get(s.id);
    if (!existing || s.stations.length > existing.stations.length) byId.set(s.id, s);
  }

  const final = [...byId.values()];

  // Validate basic invariants
  for (const s of final) {
    if (!s.startTime || !s.stations?.length || s.stations.length !== s.stationTimes.length) {
      throw new Error(`Invalid schedule for ${s.id}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), trainSchedules: final }, null, 2), 'utf8');
  console.log(`Generated ${final.length} train schedules -> ${OUT_PATH}`);
}

main();

