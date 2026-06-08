# TODO (Ahmedabad Metro Route Planner)

## Phase 1 — Correctness + Trust (approved)
- [ ] Add `routeConfidence`/`hasTimetableSource` to `PlannedRoute` and display badge in `RoutePlanner`.
- [ ] Fix interchange `waitTime` for routes produced by `planRouteWithDeparture` so it reflects reconstructed leg timings.
- [ ] Make Purple bus substitution in `buildBusRoute` more robust (swap modality at the correct GNLU boundary).
- [ ] Add microcopy: timetable-based planning + train visuals are approximate.
- [ ] Build and sanity test: route planning, departure/arrival dropdowns, interchange steps, Purple bus.


