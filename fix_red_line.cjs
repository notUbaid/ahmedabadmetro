const fs = require('fs');
const path = './src/data/timetableFromExcel.generated.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const RED_LINE_ORDER = [
  'apmc', 'jivraj_park', 'rajiv_nagar', 'shreyas', 'paldi', 'gandhigram',
  'old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec',
  'sabarmati', 'motera_stadium', 'koteshwar_road'
];

data.trainSchedules.forEach(s => {
  // Fix direction field based on ID
  if (s.id.includes('-SB-') || s.id.includes('-WB-')) {
    s.direction = 'backward';
  } else if (s.id.includes('-NB-') || s.id.includes('-EB-')) {
    s.direction = 'forward';
  }

  // Fix stations ordering for Red Line specifically,
  // since a previous script incorrectly forced them all to forward order
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

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Fixed JSON data');
