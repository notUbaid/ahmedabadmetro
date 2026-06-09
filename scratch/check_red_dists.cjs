const fs = require('fs');
const metroData = JSON.parse(fs.readFileSync('c:/Users/mekha/OneDrive/Desktop/Projects/ahmedabadmetro/public/metroRoutes.geojson', 'utf8'));

const stations = {
  apmc: [22.997843, 72.538562],
  jivraj_park: [23.006456, 72.540139],
  rajiv_nagar: [23.013589, 72.54146],
  shreyas: [23.019515, 72.542475],
  paldi: [23.027051, 72.561338],
  gandhigram: [23.030807, 72.565158],
  old_high_court: [23.0372892, 72.5672065],
  usmanpura: [23.045618, 72.568449],
  vijay_nagar: [23.056191, 72.562338],
  ranip: [23.067674, 72.574083],
  vadaj: [23.067667, 72.565758],
  aec: [23.075108, 72.593291],
  sabarmati: [23.085186, 72.593838],
  motera_stadium: [23.096773, 72.596694],
  koteshwar_road: [23.103111, 72.598584]
};

const red = [];
for (const f of metroData.features ?? []) {
  if (f.geometry.type !== 'LineString') continue;
  const name = String(f.properties.name ?? '').toLowerCase();
  if (name.includes('red line')) {
    red.push(...f.geometry.coordinates);
  }
}

for (const [id, coord] of Object.entries(stations)) {
  let minDist = Infinity;
  for (const c of red) {
    const dist = Math.sqrt(Math.pow(c[1] - coord[0], 2) + Math.pow(c[0] - coord[1], 2));
    if (dist < minDist) minDist = dist;
  }
  console.log(`${id}: ${minDist.toFixed(6)}`);
}
