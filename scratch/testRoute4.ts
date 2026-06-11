import { getAvailableDepartures } from '../src/lib/routePlanner';

const res = getAvailableDepartures('thaltej', 'gnlu', 'Mon-Fri');
console.log("Result:", res.length);
