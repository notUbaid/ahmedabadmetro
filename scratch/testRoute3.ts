import { planRouteWithDeparture } from '../src/lib/routePlanner';
import { trainSchedules } from '../src/data/timetable';

const dayType = 'weekday';
const originId = 'thaltej';
const destinationId = 'gnlu';
const departureMinutes = 600; // 10:00 AM

// Find a schedule starting at thaltej around 600
const startingTrains = [];
for (const schedule of trainSchedules) {
    if (schedule.dayType && schedule.dayType !== dayType) continue;
    const stationIdx = schedule.stations.indexOf(originId);
    if (stationIdx === -1 || stationIdx === schedule.stations.length - 1) continue;
    
    // Hardcode for debug
    startingTrains.push(schedule);
}

console.log(`Found ${startingTrains.length} blue trains from thaltej`);

const costMap = new Map<string, number>();
costMap.set('thaltej', 600);
console.log("Running route Planner with debug...");

const res = planRouteWithDeparture('thaltej', 'gnlu', 600, 'weekday');
if (res) console.log("FOUND!");
else console.log("NOT FOUND");
