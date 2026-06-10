import { planRoute } from '../src/lib/routePlanner';
const route = planRoute('kalupur', 'thaltej_gam');
console.log(JSON.stringify(route, null, 2));
