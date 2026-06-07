# TODO - bugfix & coordination polish

- [x] Fix `findCommonTrainRoute` timestamp/leg reconstruction so coordinated routes carry correct departure/arrival times.
- [x] Fix `buildBusRoute` to replace the correct alight step at GNLU (safe insertion).
- [x] Improve `calculateJourneyProgress` travel-step boundary logic to reduce jumps.
- [x] Adjust coordination baseTime heuristic in `RoutePlanner` component (`friendDepMins - 60` removal/clamping).

- [ ] Run typecheck/lint/build if available.

