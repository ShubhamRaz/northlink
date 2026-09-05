// OSRM Public API
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteGeometry {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  source?: 'OSRM' | 'PROTOTYPE FALLBACK';
}

interface OsrmRoute {
  geometry: { coordinates: number[][] };
  distance: number;
  duration: number;
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

// Intermediate waypoints representing major Northeast India towns/cities.
// Fallback routes will pass through these towns so they follow real road
// corridors instead of cutting through forests in a straight line.
const ROAD_WAYPOINTS: { name: string; coords: [number, number] }[] = [
  { name: 'Guwahati', coords: [26.1445, 91.7362] },
  { name: 'Nagaon', coords: [26.3480, 92.6840] },
  { name: 'Tezpur', coords: [26.6338, 92.7930] },
  { name: 'Dimapur', coords: [25.9064, 93.7228] },
  { name: 'Kohima', coords: [25.6751, 94.1086] },
  { name: 'Imphal', coords: [24.8170, 93.9368] },
  { name: 'Silchar', coords: [24.8333, 92.7789] },
  { name: 'Shillong', coords: [25.5788, 91.8933] },
  { name: 'Aizawl', coords: [23.7271, 92.7176] },
  { name: 'Jorhat', coords: [26.7509, 94.2037] },
  { name: 'Dibrugarh', coords: [27.4728, 94.9120] },
  { name: 'Itanagar', coords: [27.0844, 93.6053] },
  { name: 'Mokokchung', coords: [26.3216, 94.5150] },
  { name: 'Wokha', coords: [26.0939, 94.2600] },
  { name: 'Tuensang', coords: [26.2700, 94.8300] },
  { name: 'Mon', coords: [26.7180, 95.1000] },
  { name: 'Churachandpur', coords: [24.3270, 93.6820] },
  { name: 'Ukhrul', coords: [25.0900, 94.3600] },
  { name: 'Senapati', coords: [25.4600, 94.1500] },
  { name: 'Tamenglong', coords: [25.1500, 93.5000] },
];

function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

// Given origin and destination, find intermediate waypoints that lie roughly
// along the path. This makes fallback routes follow real road corridors.
function findIntermediateWaypoints(origin: [number, number], destination: [number, number]): [number, number][] {
  const result: [number, number][] = [];
  const totalDist = haversineKm(origin, destination);
  if (totalDist < 50) return result; // short routes don't need intermediates

  // For each known town, check if it lies roughly between origin and destination
  // (within 30% of the direct distance from the straight line)
  for (const wp of ROAD_WAYPOINTS) {
    const distFromOrigin = haversineKm(origin, wp.coords);
    const distFromDest = haversineKm(wp.coords, destination);
    const directDist = haversineKm(origin, destination);
    // Waypoint is "on the way" if the detour is less than 40% of direct distance
    const detour = (distFromOrigin + distFromDest) - directDist;
    if (detour < directDist * 0.4 && distFromOrigin > 20 && distFromDest > 20) {
      result.push(wp.coords);
    }
  }

  // Sort intermediates by distance from origin (so the path goes origin → town1 → town2 → dest)
  result.sort((a, b) => haversineKm(origin, a) - haversineKm(origin, b));
  return result;
}

// Generate a smooth path between two points following a slight curve (for visual realism)
function interpolatePoints(from: [number, number], to: [number, number], steps: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lat = from[0] + (to[0] - from[0]) * fraction;
    const lon = from[1] + (to[1] - from[1]) * fraction;
    points.push([lat, lon]);
  }
  return points;
}

// Fallback logic to generate a road-following path between origin and destination.
// Uses intermediate waypoints (major towns) so the path follows real road corridors
// instead of cutting through forests in a straight line.
function generateFallbackGeometry(origin: [number, number], destination: [number, number]): RouteGeometry {
  // Find intermediate waypoints along the route
  const intermediates = findIntermediateWaypoints(origin, destination);

  // Build the full path: origin → intermediates[0] → ... → destination
  const allPoints: [number, number][] = [origin, ...intermediates, destination];
  const coords: [number, number][] = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const from = allPoints[i];
    const to = allPoints[i + 1];
    const segDist = haversineKm(from, to);
    const steps = Math.max(8, Math.floor(segDist / 8)); // a point every ~8km
    // For the first segment, include the start point; for subsequent segments, skip it (already included)
    const segCoords = interpolatePoints(from, to, steps);
    coords.push(...(i === 0 ? segCoords : segCoords.slice(1)));
  }

  const distance = haversineKm(origin, destination);

  return {
    coordinates: coords,
    distance: distance * 1000, // meters
    duration: (distance / 40) * 3600 // seconds (assuming 40km/h avg)
  };
}

export const routeProvider = {
  /**
   * Fetches the route from OSRM, or falls back to local interpolation.
   * Note: OSRM expects [lng, lat] but Leaflet uses [lat, lng]. We flip them.
   */
  async getRoute(
    origin: [number, number], // [lat, lng]
    destination: [number, number] // [lat, lng]
  ): Promise<RouteGeometry> {
    try {
      const url = `${OSRM_BASE_URL}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('OSRM API Error');

      const data = await response.json() as OsrmResponse;

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      // Convert [lng, lat] to [lat, lng] for Leaflet
      const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);

      return {
        coordinates: coords,
        distance: route.distance,
        duration: route.duration,
        source: 'OSRM'
      };
    } catch (error) {
      console.warn('OSRM routing failed, using fallback geometry', error);
      return { ...generateFallbackGeometry(origin, destination), source: 'PROTOTYPE FALLBACK' };
    }
  },

  /**
   * Fetches a route from OSRM via a specific intermediate waypoint.
   * Returns null if OSRM fails or times out.
   */
  async getRouteViaWaypoint(
    origin: [number, number],
    waypoint: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry | null> {
    try {
      // OSRM expects [lng,lat];lng,lat;lng,lat
      const url = `${OSRM_BASE_URL}/${origin[1]},${origin[0]};${waypoint[1]},${waypoint[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
      // Use AbortController with a 5-second timeout to avoid hanging the UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('OSRM API Error');

      const data = await response.json() as OsrmResponse;

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        return null;
      }

      const route = data.routes[0];
      const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);

      return {
        coordinates: coords,
        distance: route.distance,
        duration: route.duration,
        source: 'OSRM'
      };
    } catch (error) {
      console.warn('OSRM via-waypoint routing failed', error);
      return null;
    }
  },

  /**
   * Returns 3-4 alternative routes, ALL following real roads via OSRM.
   * Strategy:
   *   1. Direct OSRM route (with alternatives=true)
   *   2. OSRM route via a northern town (e.g. Dimapur/Kohima)
   *   3. OSRM route via a southern town (e.g. Silchar)
   *   4. OSRM route via another nearby town
   * Falls back to town-waypoint interpolation only if OSRM is unreachable.
   */
  async getAlternatives(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry[]> {
    const routes: RouteGeometry[] = [];
    const seen = new Set<string>();

    const addRoute = (r: RouteGeometry) => {
      // Deduplicate by checking the first 5 coordinates
      const key = r.coordinates.slice(0, 5).map(c => c.join(',')).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        routes.push(r);
      }
    };

    // ── 1. Direct OSRM route (with alternatives=true) ──
    try {
      const url = `${OSRM_BASE_URL}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&alternatives=true`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json() as OsrmResponse;
        if (data.code === 'Ok' && data.routes) {
          data.routes.forEach(route => {
            addRoute({
              coordinates: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
              distance: route.distance,
              duration: route.duration,
              source: 'OSRM' as const
            });
          });
        }
      }
    } catch (error) {
      console.warn('OSRM direct routing failed', error);
    }

    // ── 2 & 3. OSRM routes via different intermediate towns ──
    // Find towns that are roughly between origin and destination, then pick
    // the northernmost and southernmost to create genuinely different corridors.
    const directDist = haversineKm(origin, destination);
    const candidateTowns = ROAD_WAYPOINTS
      .filter(wp => {
        const distFromOrigin = haversineKm(origin, wp.coords);
        const distFromDest = haversineKm(wp.coords, destination);
        const detour = (distFromOrigin + distFromDest) - directDist;
        // Town is a candidate if the detour is less than 80% of direct distance
        // and it's at least 30km from both origin and destination
        return detour < directDist * 0.8 && distFromOrigin > 30 && distFromDest > 30;
      })
      .sort((a, b) => a.coords[0] - b.coords[0]); // sort by latitude (north first)

    // Pick up to 2 distinct towns (not 3) to keep total routes at 3 and avoid too many API calls.
    const selectedTowns: { name: string; coords: [number, number] }[] = [];
    if (candidateTowns.length >= 2) {
      selectedTowns.push(candidateTowns[0]); // northernmost
      selectedTowns.push(candidateTowns[candidateTowns.length - 1]); // southernmost
    } else {
      selectedTowns.push(...candidateTowns);
    }

    // Fetch all via-waypoint routes IN PARALLEL (not sequentially) for performance
    const viaPromises = selectedTowns.map(town => this.getRouteViaWaypoint(origin, town.coords, destination));
    const viaResults = await Promise.all(viaPromises);
    for (const viaRoute of viaResults) {
      if (routes.length >= 3) break; // limit to 3 routes total
      if (viaRoute) {
        addRoute(viaRoute);
      }
    }

    // ── Fallback: if OSRM returned fewer than 3 routes, fill with town-waypoint interpolation ──
    while (routes.length < 3) {
      const fb = generateFallbackGeometry(origin, destination);
      addRoute({ ...fb, source: 'PROTOTYPE FALLBACK' as const });
    }

    return routes.slice(0, 3);
  }
};
