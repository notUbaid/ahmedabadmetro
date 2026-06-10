import { trainSchedules } from '../src/data/timetable';

const getSchedulesDepartingExactlyAt = (stationId: string, departureMinutes: number) => {
  const matches: any[] = [];
  for (const schedule of trainSchedules) {
    const stationIdx = schedule.stations.indexOf(stationId);
    if (stationIdx === -1 || stationIdx === schedule.stations.length - 1) continue;

    const startMinutes = parseInt(schedule.startTime.split(':')[0]) * 60 + parseInt(schedule.startTime.split(':')[1]);
    const depMin = startMinutes + schedule.stationTimes[stationIdx];

    if (depMin === departureMinutes) {
      matches.push({ id: schedule.id, depMin });
    }
  }
  return matches;
};

console.log(getSchedulesDepartingExactlyAt('kalupur', 22 * 60));
