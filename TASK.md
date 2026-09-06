# NORTHLINK AI — Master Task Tracker

## Phase 1 — Repository and Security
- [x] Remove tracked .env
  - Problem: environment file was committed
  - Fix: removed from Git tracking and created .env.example
  - Verify: `git ls-files .env` returns nothing
- [x] Identify local filesystem dependencies
  - Problem: SQLite db is used which is not suitable for Vercel
  - Fix: Documented as unresolved deployment issue for later migration. No local paths found in source code.
  - Verify: Searched for `/home/z/`, `/Users/`, `/tmp/`, `custom.db` in `src/` and found no active path issues.
- [x] Repository Artifact Cleanup
  - Problem: generated tool-results and upload images exist in repo
  - Fix: removed `tool-results/` and `upload/` via `git rm -r`
  - Verify: directories deleted
- [?] Review uncertain artifacts
  - Problem: `db/`, `mini-services/`, `examples/`, `download/` might be unused but are uncertain
  - Fix: Marked for review
  - Verify: N/A
- [x] Package / Script Audit & Verification
  - Problem: Pre-existing lint and build issues exist. Lint fails with `react-hooks/set-state-in-effect` across 3 files. Build fails with `@prisma/client did not initialize yet. Please run "prisma generate"`.
  - Fix: Documented here for resolution in a later phase. Did not attempt to silently claim success.
  - Verify: Ran `npm run lint` and `npm run build` and recorded the errors.
- [x] Security check
  - Problem: Hardcoded secrets could be present client-side
  - Fix: Checked for `token`, `password`, `apikey`, `secret`.
  - Verify: None found in `src/`.
- [~] IN PROGRESS
- [x] COMPLETED
- [!] BLOCKED
- [?] NEEDS REVIEW

## Phase 2 — OSRM Routing
- [x] Audit current routing implementation
  - Problem: Legacy and fallback logic competed with OSRM engine.
  - Fix: Removed `generateRoutes` and `getCandidatePaths`. `routeProvider.getAlternatives` is now authoritative.
  - Verify: Searched and verified all callers now exclusively rely on `generateRoutesAsync` and `routeProvider`.
- [x] Fix OSRM alternative handling
  - Problem: `while (routes.length < 3)` caused infinite loops if fallback repeatedly generated the same identical route.
  - Fix: Switched to deterministic uniqueness checks based on distance and midpoint instead of the first 5 coordinates. Bounded the fallback loop to exactly ONE prototype fallback when OSRM yields no paths.
  - Verify: Loop bounded; deduplication is geometry-aware.
- [x] Fallback routes & Coordinate validation
  - Problem: Fallback paths mimicked OSRM data; missing coordinate sanity checks.
  - Fix: Rejected coordinates outside valid bounds gracefully. Fallbacks are explicitly identified as `source: 'PROTOTYPE FALLBACK'`.
  - Verify: App logic updated to handle 0 returned candidates by throwing a clean error in `generateRoutesAsync` instead of crashing.
## Phase 3 — Current-Position Rerouting
- [x] Implement reusable remaining-journey service
  - Problem: Re-routing incorrectly relied on full origin-to-destination routes and sliced them.
  - Fix: Added `reassessRemainingJourney` to explicitly use the current vehicle coordinates as the origin.
  - Verify: Re-routing actively calls OSRM starting from true GPS.
- [x] Integrate true current position routing
  - Problem: The `assessIncidentImpact` function reused `state.activeRoutes`.
  - Fix: Updated `assessIncidentImpact` to asynchronously call `reassessRemainingJourney`.
  - Verify: Fresh routes are successfully queried and populated.
- [x] Do not slice old routes
  - Problem: `decideMidJourneyRoute` sliced the static coordinates upon approval.
  - Fix: Slicing deleted. The newly generated geometries from OSRM are assigned directly to the vehicle.
  - Verify: `vehicle.currentRouteGeometry` accepts the raw unadulterated route output, `progress` reset to 0.
## Phase 4 — Time-Aware Intelligence
- [x] Integrate time-aware route weather
  - Problem: Route logic evaluated the whole route using current-time static weather.
  - Fix: Sliced routes into segments, assigned expected arrival times to each segment, and fetched future weather specifically for that hour.
  - Verify: Weather forecast on `RouteSegment` dynamically changes based on arrival hour.
- [x] Forward traffic propagation
  - Problem: If Segment 1 delayed the vehicle by 45 mins, Segment 2's expected arrival time wasn't pushed back.
  - Fix: Added `delay` to `cumulativeMinutes` during segment building.
  - Verify: Downstream segment arrival times correctly reflect upstream delays.
- [x] Deterministic time-aware score
  - Problem: `priorityScore` was generated from naive `distance` and static `simulationMode` overrides.
  - Fix: Route scoring calls `evaluateRouteTimeAware` which calculates a time-aware `maxRiskProb` and `totalExpectedDelay`, yielding a deterministic score: `totalETA + (maxRisk * 3) - resilience/100`.
  - Verify: Slower but safer routes can now successfully out-score faster but extreme-weather routes.
## Phase 5 — Incident and Safety
- [x] Implement rigorous Incident Lifecycle
  - Problem: `status` overloaded, causing mixed concerns.
  - Fix: Standardized `verificationStatus` and `resolutionStatus`. Rejected incidents are ignored.
- [x] Establish Incident Relevance Service
  - Problem: Simple `50km` radius caused false positives for behind-vehicle or off-route incidents.
  - Fix: `incidentRelevanceService` projects incident onto remaining route geometry and ensures it's actually ahead.
- [x] Detach Severity from Passability
  - Problem: `Critical` severity forced automatic vehicle pause, even if passability was OPEN.
  - Fix: Introduced deterministic `passability` (OPEN, RESTRICTED, BLOCKED). Only a direct (<=10km) critical blockage triggers `PAUSED FOR SAFETY`.
- [x] Stale Reroute Resolution
  - Problem: Resolved incidents left vehicles paused indefinitely or left stale recommendations active.
  - Fix: `resolveIncident` cancels stale recommendations and gracefully resumes vehicles that were explicitly paused by the incident.
## Phase 6 — State Management
- [x] Fix global activeRoutes
  - Problem: `activeRoutes` was shared globally among all shipments.
  - Fix: Changed `activeRoutes` to a `routesByShipment` dictionary.
- [x] Route Recommendation Scoping
  - Problem: Route recommendations leaked across shipments.
  - Fix: Ensured `routeRecommendations` and UI selectors use `shipmentId`.
- [x] Dispatcher Decision Isolation
  - Problem: Mid-journey decisions and impact assessments applied globally.
  - Fix: Scoped `decideMidJourneyRoute` and `assessIncidentImpact` strictly to the relevant shipment's routes.
- [x] Legacy Cleanup
  - Problem: `addShipment` existed alongside `createShipment`.
  - Fix: Removed `addShipment` to enforce a single lifecycle through `createShipment`.
## Phase 7 — Simulation and ETA
- [x] Simulation Start/Stop Conditions
  - Problem: Simulation auto-started incorrectly and lacked cleanup on completion.
  - Fix: Restricted start strictly to explicitly dispatched active shipments. Added auto-pause on delivery.
- [x] Authentic Distance and Geometry
  - Problem: Progress didn't use real routing distances, just static fallbacks.
  - Fix: Synchronized movement and distance tracking directly from OSRM distance and route geometry.
- [x] Remaining vs Historical Progress
  - Problem: Rerouting from mid-journey reset historical progress.
  - Fix: Established `historicalCompletedDistance` explicitly to track offset across reroutes.
- [x] Single Simulation Timer
  - Problem: Possibility of duplicate loops causing race conditions and erratic speeds.
  - Fix: Forced one authoritative interval tracking all active shipments at once.
- [x] Legacy Dummy Fallbacks 
  - Problem: Static values like `240` minutes hijacked dynamic ETAs.
  - Fix: Deprioritized fallbacks to ensure dynamic `route.currentEta` determines travel duration.
## Phase 8 — Gemini
- [x] Integrate Official Gemini SDK
  - Problem: `z-ai-web-dev-sdk` was used as a dummy.
  - Fix: Replaced it with the official `@google/generative-ai` package and used the `gemini-1.5-flash` model.
- [x] Secure Configuration
  - Problem: Provider secret might leak.
  - Fix: Bound the key solely to the Next.js server-side API route. Updated `.env.example` with empty `GEMINI_API_KEY=`.
- [x] Authoritative Explainer Role
  - Problem: AI might act on requests and assume decision-making powers.
  - Fix: Wrote robust `SYSTEM_INSTRUCTION` directly commanding the model to only explain and never modify operational state.
- [x] Graceful Failover
  - Problem: App would crash or hang if LLM services went offline.
  - Fix: Enforced HTTP 503 response on missing config, triggering seamless transition into local offline/fallback mode.
## Phase 9 — Testing
## Phase 10 — Final Audit
