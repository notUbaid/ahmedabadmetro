import { findShortestPath, buildTimeAwareRoute } from './src/lib/routePlanner';

const path = findShortestPath('paldi', 'apmc');
console.log("Path:", path);
const routeToInterchange = buildTimeAwareRoute(path!, 1039);
console.log("RouteToInterchange:", JSON.stringify(routeToInterchange, null, 2));
