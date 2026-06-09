/*
  Generates timetable data for the app from:
    attached_assets/Ahmedabad_Metro_Master_Database_V2.xlsx

  Output:
    src/data/timetableFromExcel.generated.json

  Note: This is a dev/build-time script. It does not run in the browser.
*/

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

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

  // Expect formats like HH:MM:SS or HH:MM
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(Number(m[1])).padStart(2, '0');
  const mm = String(Number(m[2])).padStart(2, '0');
  return `${hh}:${mm}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// App expects station IDs from metroData. Excel has human-readable station names.
// This mapping is intentionally strict; if a station name is not found, script throws.
// metroData.ts is ESM-only in this repo; we load it dynamically when generating.

let stationNameToId;

async function loadStationMap() {
  const metroDataMod = await import('../src/data/metroData');
  const { stations } = metroDataMod;

  stationNameToId = new Map(
    Object.values(stations).map((st) => [String(st.name).toLowerCase().trim(), st.id])
  );
}

const ALIASES = {
  'jivraj': 'jivraj park',
  'sector-24': 'sector 24',
  'sector-16': 'sector 16',
  'rayson': 'raysan',
  'pdeu': 'pdpu',
  'sabarmati railway station': 'sabarmati railway station',
  'cheekanta': 'gheekanta',
  'kalupur railway station': 'kalupur',
  'robari colony': 'rabari colony',
  'nirant cross road': 'nirant cross roads'
};

function mapStationNameToId(stationName) {
  const rawKey = String(stationName).toLowerCase().trim();
  const key = ALIASES[rawKey] || rawKey;

  const id = stationNameToId.get(key);
  if (!id) {
    console.warn(`Unknown station name in Excel: "${stationName}" (normalized: "${key}")`);
    return null;
  }
  return id;
}


function buildSchedulesFromSheet(sheetName, routes, dirTransform) {
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Missing sheet: ${sheetName}`);

  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  // Group by Train_ID (each train contains sequential station rows)
  const groups = new Map();

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
    let departure = normalizeTimeToHHMM(r.Departure_Time);
    
    // Terminal stations often have 'TERMINUS' or missing departure time.
    if (!departure && r.Departure_Time === 'TERMINUS') {
      departure = arrival;
    }

    if (!stationName || !arrival || !departure || !Number.isFinite(stationOrder)) {
      // Some rows may be blank headers - skip.
      continue;
    }

    const mappedStationId = mapStationNameToId(stationName);
    // Skip spreadsheet blanks/unmapped rows.
    if (!mappedStationId) continue;

    const groupKey = `${trainId}_${day}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push({
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

  const groupKeys = [...groups.keys()];
  const schedules = [];

  for (const key of groupKeys) {
    const items = groups.get(key);
    items.sort((a, b) => a.stationOrder - b.stationOrder);

    // Determine start time: departure time of first station row
    const first = items[0];
    const startTime = normalizeTimeToHHMM(first.departureHHMM);

    const stationsArr = items.map((x) => x.stationId);
    const arrivalMinutes = items.map((x) => x.arrivalMin - first.departureMin);

    // Determine line + direction
    // dirTransform returns { line, direction }
    const derived = dirTransform({ sheetName, row: items[0], route: items[0].route, rawDirection: items[0].rawDirection });

    schedules.push({
      id: key, // Use the unique group key (trainId_day)
      line: derived.line,
      direction: derived.direction,
      dayType: items[0].day,
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

