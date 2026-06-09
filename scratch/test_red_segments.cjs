const fs = require('fs');
const metroData = JSON.parse(fs.readFileSync('c:/Users/mekha/OneDrive/Desktop/Projects/ahmedabadmetro/public/metroRoutes.geojson', 'utf8'));

const redCandidates = [];
for (const f of metroData.features ?? []) {
  if (f.geometry.type !== 'LineString') continue;
  const name = String(f.properties.name ?? '').toLowerCase();
  if (name.includes('red line')) redCandidates.push(f);
}

// Just log the red line endpoints to see how many fragments there are
redCandidates.forEach((f, i) => {
  const coords = f.geometry.coordinates;
  console.log(`Fragment ${i}: ${coords.length} points, from [${coords[0][1]}, ${coords[0][0]}] to [${coords[coords.length-1][1]}, ${coords[coords.length-1][0]}]`);
});
