const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/data/timetableFromExcel.generated.json', 'utf8'));

const RED_LINE_ORDER = [
  'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram',
  'old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec',
  'sabarmati', 'motera_stadium', 'koteshwar_road'
];

data.trainSchedules.forEach(s => {
  if (s.line === 'red') {
    const combined = s.stations.map((st, i) => ({ st, time: s.stationTimes[i] }));
    
    combined.sort((a, b) => {
      const idxA = RED_LINE_ORDER.indexOf(a.st);
      const idxB = RED_LINE_ORDER.indexOf(b.st);
      return s.direction === 'forward' ? idxA - idxB : idxB - idxA;
    });
    
    s.stations = combined.map(c => c.st);
    s.stationTimes.sort((a, b) => a - b);
  }
});

fs.writeFileSync('./src/data/timetableFromExcel.generated.json', JSON.stringify(data, null, 2));
