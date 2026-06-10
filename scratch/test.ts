import { planRouteWithDeparture } from '../src/lib/routePlanner';

const route = planRouteWithDeparture('kalupur', 'thaltej_gam', 22 * 60);
console.log(JSON.stringify(route, null, 2));
