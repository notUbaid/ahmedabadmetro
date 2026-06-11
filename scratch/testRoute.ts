import { planRoute, getAvailableDepartures } from '../src/lib/routePlanner';

console.log("Testing Thaltej to GNLU...");
try {
  const deps = getAvailableDepartures('thaltej', 'gnlu', 'weekday');
  console.log(`Found ${deps.length} departures from Thaltej to GNLU.`);
  
  const route = planRoute('thaltej', 'gnlu');
  if (route) {
    console.log("Route found successfully!");
  } else {
    console.log("NO ROUTE FOUND using planRoute()");
  }
} catch (e) {
  console.error("Error:", e);
}
