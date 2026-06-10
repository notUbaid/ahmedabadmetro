import { trainSchedules } from '../src/data/timetable';

const findNextTrain = (
  stationId: string,
  afterMinutes: number,
  destStationId: string
) => {
  const candidates: any[] = [];
  
  for (const schedule of trainSchedules) {
    const stationIdx = schedule.stations.indexOf(stationId);
    const destIdx = schedule.stations.indexOf(destStationId);
    
    if (stationIdx !== -1 && destIdx !== -1 && stationIdx < destIdx) {
      const startMinutes = parseInt(schedule.startTime.split(':')[0]) * 60 + parseInt(schedule.startTime.split(':')[1]);
      const departureMinutes = startMinutes + schedule.stationTimes[stationIdx];
      const arrivalMinutes = startMinutes + schedule.stationTimes[destIdx];
      
      if (departureMinutes > afterMinutes) {
        candidates.push({ scheduleId: schedule.id, departureMinutes, arrivalMinutes });
      }
    }
  }
  
  candidates.sort((a, b) => a.departureMinutes - b.departureMinutes);
  return candidates;
};

console.log(findNextTrain('kalupur', 22 * 60, 'thaltej_gam'));
