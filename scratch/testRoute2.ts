import { planRouteWithDeparture } from '../src/lib/routePlanner';

const res = planRouteWithDeparture('thaltej', 'gnlu', 600, 'weekday');
console.log("Result:", res ? "FOUND" : "NOT FOUND");
if (res) {
    console.log(res.steps);
}
