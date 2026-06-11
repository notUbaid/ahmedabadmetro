import { trainSchedules } from '../src/data/timetable';

const koteshwarTrains = trainSchedules.filter(s => s.stations.includes('koteshwar_road'));
console.log(`Found ${koteshwarTrains.length} trains passing through koteshwar_road`);

const redTrains = koteshwarTrains.filter(s => s.line === 'red');
const greenTrains = koteshwarTrains.filter(s => s.line === 'green');

console.log(`Red trains: ${redTrains.length}, Green trains: ${greenTrains.length}`);
if (redTrains.length > 0) {
    console.log("Sample Red train stations:", redTrains[0].stations);
}
if (greenTrains.length > 0) {
    console.log("Sample Green train stations:", greenTrains[0].stations);
}
