const fs = require('fs');

const stations = {
  thaltej_gam: { coordinates: [23.0502062, 72.5070123] },
  thaltej: { coordinates: [23.049748, 72.5160152] },
  doordarshan_kendra: { coordinates: [23.0481764, 72.5244209] },
  gurukul_road: { coordinates: [23.0458829, 72.5348734] },
  gujarat_university: { coordinates: [23.0448477, 72.5435296] },
  commerce_six_road: { coordinates: [23.0407013, 72.552973] },
  stadium: { coordinates: [23.0398414, 72.5616768] },
  old_high_court: { coordinates: [23.0372892, 72.5672065] },
  shahpur: { coordinates: [23.0392105, 72.5810327] },
  gheekanta: { coordinates: [23.028794, 72.5867752] },
  kalupur: { coordinates: [23.0246913, 72.6031447] },
  kankaria_east: { coordinates: [23.0154573, 72.6070016] },
  apparel_park: { coordinates: [23.0106696, 72.6180098] },
  amraiwadi: { coordinates: [23.0076672, 72.6287279] },
  rabari_colony: { coordinates: [23.0054703, 72.6354063] },
  vastral: { coordinates: [23.0035988, 72.6475942] },
  nirant_cross_roads: { coordinates: [22.9997169, 72.658889] },
  vastral_gam: { coordinates: [22.9971397, 72.667391] },
  
  apmc: { coordinates: [22.997843, 72.538562] },
  jivraj_park: { coordinates: [23.006456, 72.540139] },
  rajiv_nagar: { coordinates: [23.013589, 72.54146] },
  shreyas: { coordinates: [23.019515, 72.542475] },
  paldi: { coordinates: [23.027051, 72.561338] },
  gandhigram: { coordinates: [23.030807, 72.565158] },
  usmanpura: { coordinates: [23.045618, 72.568449] },
  vijay_nagar: { coordinates: [23.056191, 72.562338] },
  vadaj: { coordinates: [23.067667, 72.565758] },
  ranip: { coordinates: [23.067674, 72.574083] },
  aec: { coordinates: [23.075108, 72.593291] },
  sabarmati: { coordinates: [23.085186, 72.593838] },
  motera_stadium: { coordinates: [23.096773, 72.596694] },
  koteshwar_road: { coordinates: [23.103111, 72.598584] }
};

const blueData = JSON.parse(fs.readFileSync('c:/Users/mekha/OneDrive/Desktop/Projects/ahmedabadmetro/public/blueLineRoutes.geojson', 'utf8'));
const metroData = JSON.parse(fs.readFileSync('c:/Users/mekha/OneDrive/Desktop/Projects/ahmedabadmetro/public/metroRoutes.geojson', 'utf8'));

const blue = [];
for (const f of metroData.features ?? []) {
  if (f.geometry.type !== 'LineString') continue;
  const name = String(f.properties.name ?? '').toLowerCase();
  if (name.includes('blue line')) blue.push(f);
}
for (const f of blueData.features ?? []) {
  if (f.geometry.type !== 'LineString') continue;
  blue.push(f);
}

const red = [];
for (const f of metroData.features ?? []) {
  if (f.geometry.type !== 'LineString') continue;
  const name = String(f.properties.name ?? '').toLowerCase();
  if (name.includes('red line')) red.push(f);
}

const buildLineCache = (lineStationsList, features) => {
  const routeSegments = new Map();
  if (!lineStationsList || lineStationsList.length < 2) return routeSegments;
  
  const nodes = [];
  const adj = [];

  const stationNodes = lineStationsList.map(id => {
    const st = stations[id];
    nodes.push([st.coordinates[0], st.coordinates[1]]);
    adj.push([]);
    return nodes.length - 1;
  });

  features.forEach(f => {
    if (f.geometry.type !== 'LineString') return;
    const coords = f.geometry.coordinates;
    const startIdx = nodes.length;
    coords.forEach(c => {
      nodes.push([c[1], c[0]]); // [lat, lng]
      adj.push([]);
    });
    for (let i = 0; i < coords.length - 1; i++) {
      adj[startIdx + i].push(startIdx + i + 1);
      adj[startIdx + i + 1].push(startIdx + i);
    }
  });

  const MAX_GAP = 0.05;
  for (let i = 0; i < lineStationsList.length; i++) {
    let closestNode = -1;
    let minDist = MAX_GAP;
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

  for (let i = lineStationsList.length; i < nodes.length; i++) {
    if (adj[i].length === 1) { 
      for (let j = i + 1; j < nodes.length; j++) {
        if (adj[j].length === 1) { 
          const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
          if (dist < MAX_GAP) {
            adj[i].push(j);
            adj[j].push(i);
          }
        }
      }
    }
  }

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
      const path = [];
      let curr = endNode;
      while (curr !== -1) {
        path.push(nodes[curr]);
        curr = prev[curr];
      }
      path.reverse();

      let totalDist = 0;
      for (let k = 0; k < path.length - 1; k++) {
        totalDist += Math.sqrt(Math.pow(path[k + 1][0] - path[k][0], 2) + Math.pow(path[k + 1][1] - path[k][1], 2));
      }
      routeSegments.set(`${s1}-${s2}`, { points: path.length, dist: totalDist });
    } else {
      routeSegments.set(`${s1}-${s2}`, { points: 0, dist: -1 }); // Not found
    }
  }
  return routeSegments;
};

const blueStations = [
  'thaltej_gam', 'thaltej', 'doordarshan_kendra', 'gurukul_road',
  'gujarat_university', 'commerce_six_road', 'stadium', 'old_high_court',
  'shahpur', 'gheekanta', 'kalupur', 'kankaria_east', 'apparel_park',
  'amraiwadi', 'rabari_colony', 'vastral', 'nirant_cross_roads', 'vastral_gam'
];

const redStations = [
  'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram',
  'old_high_court', 'usmanpura', 'vijay_nagar', 'ranip', 'vadaj', 'aec',
  'sabarmati', 'motera_stadium', 'koteshwar_road'
];

const blueRes = buildLineCache(blueStations, blue);
console.log('BLUE SEGMENTS:');
for (const [k, v] of blueRes.entries()) console.log(k, v);

const redRes = buildLineCache(redStations, red);
console.log('\nRED SEGMENTS:');
for (const [k, v] of redRes.entries()) console.log(k, v);
