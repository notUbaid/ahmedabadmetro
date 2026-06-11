import { planRoute } from '../src/lib/routePlanner';

const r = planRoute('thaltej', 'gnlu');
if (r) console.log("FOUND!");
else console.log("planRoute returned null");
