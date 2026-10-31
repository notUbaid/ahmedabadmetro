const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const metroDataRaw = fs.readFileSync(path.join(rootDir, 'src', 'data', 'metroData.ts'), 'utf8');

// Match station keys and coordinates (handles optional aliases, whitespace, etc.)
const stationRegex = /['"]?([a-z0-9_]+)['"]?:\s*\{[\s\S]*?id:\s*['"]([^'"]+)['"][\s\S]*?coordinates:\s*\[([0-9.]+),\s*([0-9.]+)\]/g;
const stations = {};
let match;
while ((match = stationRegex.exec(metroDataRaw)) !== null) {
  stations[match[1]] = {
    id: match[1],
    coordinates: [parseFloat(match[3]), parseFloat(match[4])]
  };
}

console.log('Parsed stations count:', Object.keys(stations).length);

const LINE_STATIONS = {
  blue: [
    'thaltej_gam', 'thaltej', 'doordarshan_kendra', 'gurukul_road', 'gujarat_university',
    'commerce_six_road', 'stadium', 'old_high_court', 'shahpur', 'gheekanta', 'kalupur',
    'kankaria_east', 'apparel_park', 'amraiwadi', 'rabari_colony', 'vastral',
    'nirant_cross_roads', 'vastral_gam'
  ],
  red: [
    'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram',
    'old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec',
    'sabarmati', 'motera_stadium', 'koteshwar_road'
  ],
  green: [
    'koteshwar_road', 'vishwakarma_college', 'tapovan_circle',
    'narmada_canal', 'koba_circle', 'juna_koba', 'koba_gam', 'gnlu', 'raysan',
    'randesan', 'dholakuva_circle', 'infocity', 'sector_1', 'sector_10a', 'sachivalaya',
    'akshardham', 'juna_sachivalaya', 'sector_16', 'sector_24', 'mahatma_mandir'
  ],
  purple: ['gnlu', 'pdpu', 'gift_city']
};

const redGreenGeo = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'metroRoutes.geojson'), 'utf8'));

const routeSegments = {};

function buildLineCache(lineName, lineStationsList, features) {
  const nodes = [];
  const adj = [];

  features.forEach(f => {
    if (f.geometry.type !== 'LineString') return;
    const coords = f.geometry.coordinates;
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

  // Connect close endpoints in track segments
  const MAX_ENDPOINT_GAP = 0.005;
  for (let i = 0; i < nodes.length; i++) {
    if (adj[i].length === 1) { 
      for (let j = i + 1; j < nodes.length; j++) {
        if (adj[j].length === 1) { 
          const dist = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
          if (dist < MAX_ENDPOINT_GAP) {
            adj[i].push(j);
            adj[j].push(i);
          }
        }
      }
    }
  }

  // Connect near-coincident track nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
      if (dist < 0.0005) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  // Find closest track node for each station along this line
  const stationTrackNodes = [];
  for (let i = 0; i < lineStationsList.length; i++) {
    const sId = lineStationsList[i];
    const st = stations[sId];
    if (!st) {
      console.error(`[${lineName}] Missing station definition for ${sId}`);
      continue;
    }
    let closestNode = -1;
    let minDist = Infinity;
    for (let j = 0; j < nodes.length; j++) {
      const dist = Math.hypot(st.coordinates[0] - nodes[j][0], st.coordinates[1] - nodes[j][1]);
      if (dist < minDist) {
        minDist = dist;
        closestNode = j;
      }
    }
    stationTrackNodes.push({ sId, nodeIdx: closestNode, distMeters: minDist * 111000 });
  }

  for (let i = 0; i < lineStationsList.length - 1; i++) {
    const s1 = lineStationsList[i];
    const s2 = lineStationsList[i + 1];
    const startNode = stationTrackNodes[i]?.nodeIdx;
    const endNode = stationTrackNodes[i + 1]?.nodeIdx;

    if (startNode === undefined || endNode === undefined || startNode === -1 || endNode === -1) {
      console.error(`[${lineName}] Cannot route ${s1}-${s2}: invalid track node`);
      continue;
    }

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
        const d = Math.hypot(dx, dy);
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

      const dists = [0];
      let totalDist = 0;
      for (let k = 0; k < path.length - 1; k++) {
        const d = Math.hypot(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]);
        totalDist += d;
        dists.push(totalDist);
      }

      const key1 = `${s1}-${s2}`;
      routeSegments[key1] = { geometry: path, dists, totalDist };
      const revPath = [...path].reverse();
      const revDists = [...dists].map(d => totalDist - d).reverse();
      routeSegments[`${s2}-${s1}`] = { geometry: revPath, dists: revDists, totalDist };

      const st1 = stations[s1];
      const st2 = stations[s2];
      const straight = Math.hypot(st1.coordinates[0] - st2.coordinates[0], st1.coordinates[1] - st2.coordinates[1]);
      const ratio = totalDist / straight;
      console.log(`[${lineName}] ${key1}: pts=${path.length}, dist=${totalDist.toFixed(4)}, ratio=${ratio.toFixed(2)}`);
    } else {
      console.error(`[${lineName}] FAILED to route: ${s1}-${s2}`);
    }
  }
}

// 1. Blue Line
const blueFeatures = [];
redGreenGeo.features.forEach(f => {
  if (f.geometry.type === 'LineString' && String(f.properties?.name || '').toLowerCase().includes('blue line')) {
    blueFeatures.push(f);
  }
});
buildLineCache('blue', LINE_STATIONS.blue, blueFeatures);

// 2. Red & Green Line
const koteshwarLat = stations['koteshwar_road'].coordinates[0];
const EPS = 0.0001;
const redFeatures = [];
const greenFeatures = [];

redGreenGeo.features.forEach(f => {
  if (f.geometry.type !== 'LineString') return;
  const name = String(f.properties?.name || '').toLowerCase();
  if (name.includes('blue') || name.includes('violet') || name.includes('gift') || name.includes('line 3:')) return;

  const coords = f.geometry.coordinates;
  const anyRed = coords.some(c => c[1] < koteshwarLat - EPS);
  const anyGreen = coords.some(c => c[1] > koteshwarLat + EPS);
  if (anyRed && !anyGreen) redFeatures.push(f);
  else if (anyGreen && !anyRed) greenFeatures.push(f);
  else {
    redFeatures.push(f);
    greenFeatures.push(f);
  }
});

buildLineCache('red', LINE_STATIONS.red, redFeatures);
buildLineCache('green', LINE_STATIONS.green, greenFeatures);

// 3. Purple Line (GNLU - PDPU - GIFT City)
const purpleFeatures = [];
redGreenGeo.features.forEach(f => {
  if (f.geometry.type !== 'LineString') return;
  const name = String(f.properties?.name || '').toLowerCase();
  if (name.includes('violet') || name.includes('gift') || name.includes('line 3:')) {
    purpleFeatures.push(f);
  }
});
buildLineCache('purple', LINE_STATIONS.purple, purpleFeatures);

console.log('Total precomputed segments:', Object.keys(routeSegments).length);
const jsonStr = JSON.stringify(routeSegments);
console.log('Size uncompressed:', (jsonStr.length / 1024).toFixed(2), 'KB');
const outputPath = path.join(rootDir, 'src', 'data', 'routeSegments.generated.json');
fs.writeFileSync(outputPath, jsonStr);
console.log(`Saved to ${outputPath}`);
