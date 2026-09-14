const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const metroDataRaw = fs.readFileSync(path.join(rootDir, 'src', 'data', 'metroData.ts'), 'utf8');

// Match station keys and coordinates
const stationRegex = /['"]?([a-z0-9_]+)['"]?:\s*{\s*id:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],\s*nameGu:\s*['"]([^'"]+)['"],\s*nameHi:\s*['"]([^'"]+)['"],\s*coordinates:\s*\[([0-9.]+),\s*([0-9.]+)\],/g;
const stations = {};
let match;
while ((match = stationRegex.exec(metroDataRaw)) !== null) {
  stations[match[1]] = {
    id: match[1],
    name: match[3],
    coordinates: [parseFloat(match[6]), parseFloat(match[7])]
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

const blueGeo = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'blueLineRoutes.geojson'), 'utf8'));
const redGreenGeo = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'metroRoutes.geojson'), 'utf8'));
const yellowGeo = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'yellowLineRoutes.geojson'), 'utf8'));

const routeSegments = {};

function buildLineCache(lineName, lineStationsList, features) {
  const nodes = [];
  const adj = [];

  lineStationsList.forEach(sId => {
    const s = stations[sId];
    if (s) {
      nodes.push(s.coordinates);
      adj.push([]);
    }
  });

  features.forEach(f => {
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

  const MAX_STATION_GAP = 0.05;
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

  const MAX_ENDPOINT_GAP = 0.005;
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

  for (let i = lineStationsList.length; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.sqrt(Math.pow(nodes[i][0] - nodes[j][0], 2) + Math.pow(nodes[i][1] - nodes[j][1], 2));
      if (dist < 0.0005) {
        adj[i].push(j);
        adj[j].push(i);
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

      const dists = [0];
      let totalDist = 0;
      for (let k = 0; k < path.length - 1; k++) {
        const d = Math.sqrt(Math.pow(path[k + 1][0] - path[k][0], 2) + Math.pow(path[k + 1][1] - path[k][1], 2));
        totalDist += d;
        dists.push(totalDist);
      }

      const key1 = `${s1}-${s2}`;
      if (!routeSegments[key1]) {
        routeSegments[key1] = { geometry: path, dists, totalDist };
        const revPath = [...path].reverse();
        const revDists = [...dists].map(d => totalDist - d).reverse();
        routeSegments[`${s2}-${s1}`] = { geometry: revPath, dists: revDists, totalDist };
      }
    }
  }
}

// Build Blue
buildLineCache('blue', LINE_STATIONS.blue, blueGeo.features);

// Split Red and Green
const koteshwarLat = stations['koteshwar_road'].coordinates[0];
const EPS = 0.0001;
const redFeatures = [];
const greenFeatures = [];
redGreenGeo.features.forEach(f => {
  const coords = f.geometry.coordinates;
  const anyRed = coords.some(c => c[1] < koteshwarLat - EPS);
  const anyGreen = coords.some(c => c[1] > koteshwarLat + EPS);
  if (anyRed && !anyGreen) redFeatures.push(f);
  else if (anyGreen && !anyRed) greenFeatures.push(f);
  else { redFeatures.push(f); greenFeatures.push(f); }
});

buildLineCache('red', LINE_STATIONS.red, redFeatures);
buildLineCache('green', LINE_STATIONS.green, greenFeatures);
buildLineCache('purple', LINE_STATIONS.purple, yellowGeo.features);

console.log('Total precomputed segments:', Object.keys(routeSegments).length);
const jsonStr = JSON.stringify(routeSegments);
console.log('Size uncompressed:', (jsonStr.length / 1024).toFixed(2), 'KB');
const outputPath = path.join(rootDir, 'src', 'data', 'routeSegments.generated.json');
fs.writeFileSync(outputPath, jsonStr);
console.log(`Saved to ${outputPath}`);
