import { findShortestPath } from '../src/lib/routePlanner';
const path = findShortestPath('kalupur', 'thaltej_gam');
console.log(JSON.stringify(path, null, 2));
