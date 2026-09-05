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
  { name: 'Churachandpur', coords: [24.3270, 93.6820] },
  { name: 'Senapati', coords: [25.4600, 94.1500] },
];

function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function isValidCoordinate(coord: [number, number]): boolean {
  const [lat, lng] = coord;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// In-memory cache of OSRM routes to avoid redundant API calls.
// Key: "lat1,lng1;lat2,lng2[;lat3,lng3...]"
const routeCache = new Map<string, RouteGeometry | null>();

// Helper: fetch an OSRM route between points with a 10-second timeout.
async function fetchOsrm(points: [number, number][]): Promise<RouteGeometry | null> {
  if (!points.every(isValidCoordinate)) {
    console.error('Invalid coordinates passed to fetchOsrm:', points);
    return null;
  }

  // OSRM expects lng,lat
  const coordStr = points.map(p => `${p[1]},${p[0]}`).join(';');

  // Check cache first
  if (routeCache.has(coordStr)) {
    return routeCache.get(coordStr) ?? null;
  }

  try {
    const url = `${OSRM_BASE_URL}/${coordStr}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      routeCache.set(coordStr, null);
      return null;
    }
    
    const data = await response.json() as OsrmResponse;
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      routeCache.set(coordStr, null);
      return null;
    }
    
    const route = data.routes[0];
    if (!route.geometry || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) {
      routeCache.set(coordStr, null);
      return null;
    }

    if (typeof route.distance !== 'number' || typeof route.duration !== 'number') {
      routeCache.set(coordStr, null);
      return null;
    }

    const result: RouteGeometry = {
      // OSRM returns [lng, lat], we map back to [lat, lng]
      coordinates: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
      distance: route.distance,
      duration: route.duration,
      source: 'OSRM'
    };
    
    routeCache.set(coordStr, result);
    return result;
  } catch (error) {
    routeCache.set(coordStr, null);
    return null;
  }
}

// Straight-line fallback (only used if OSRM is completely unreachable).
// Generates multiple intermediate points along the straight line so the map
// at least shows a visible path rather than a single 2-point line.
function straightLineGeometry(origin: [number, number], destination: [number, number]): RouteGeometry {
  const distance = haversineKm(origin, destination);
  const steps = Math.max(20, Math.floor(distance / 10));
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    coords.push([
      origin[0] + (destination[0] - origin[0]) * fraction,
      origin[1] + (destination[1] - origin[1]) * fraction
    ]);
  }
  return {
    coordinates: coords,
    distance: distance * 1000,
    duration: (distance / 40) * 3600,
    source: 'PROTOTYPE FALLBACK'
  };
}

function isDuplicateRoute(r1: RouteGeometry, r2: RouteGeometry): boolean {
  // If the total distance varies by more than 5%, they are likely different routes
  if (Math.abs(r1.distance - r2.distance) > r1.distance * 0.05) {
    return false;
  }

  // Compare midpoint distance as a heuristic for route geometry
  const mid1 = r1.coordinates[Math.floor(r1.coordinates.length / 2)];
  const mid2 = r2.coordinates[Math.floor(r2.coordinates.length / 2)];
  const midDist = haversineKm(mid1, mid2);
  
  return midDist < 5; // within 5km at the midpoint and similar length -> duplicate
}

export const routeProvider = {
  /**
   * Fetches the route from OSRM, or throws an error if coordinates are invalid.
   */
  async getRoute(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry> {
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      throw new Error('Invalid routing coordinates provided');
    }
    const route = await fetchOsrm([origin, destination]);
    if (route) return route;
    console.warn('OSRM routing failed, using straight-line fallback');
    return straightLineGeometry(origin, destination);
  },

  /**
   * Returns alternative routes, ALL following real roads via OSRM.
   * Strategy:
   *   1. Direct OSRM route
   *   2. OSRM route via a northern town
   *   3. OSRM route via a southern town
   * If OSRM is unreachable, falls back to ONE straight line prototype.
   */
  async getAlternatives(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry[]> {
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      return [];
    }

    const routes: RouteGeometry[] = [];

    const addRoute = (r: RouteGeometry) => {
      if (!routes.some(existing => isDuplicateRoute(existing, r))) {
        routes.push(r);
      }
    };

    // ── 1. Direct OSRM route ──
    const directRoute = await fetchOsrm([origin, destination]);
    if (directRoute) addRoute(directRoute);

    // ── 2 & 3. OSRM routes via different intermediate towns ──
    const directDist = haversineKm(origin, destination);
    const candidateTowns = ROAD_WAYPOINTS
      .filter(wp => {
        const distFromOrigin = haversineKm(origin, wp.coords);
        const distFromDest = haversineKm(wp.coords, destination);
        const detour = (distFromOrigin + distFromDest) - directDist;
        return detour < directDist * 0.8 && distFromOrigin > 30 && distFromDest > 30;
      })
      .sort((a, b) => a.coords[0] - b.coords[0]);

    const selectedTowns: { name: string; coords: [number, number] }[] = [];
    if (candidateTowns.length >= 2) {
      selectedTowns.push(candidateTowns[0]);
      selectedTowns.push(candidateTowns[candidateTowns.length - 1]);
    } else {
      selectedTowns.push(...candidateTowns);
    }

    // Fetch via-waypoint routes IN PARALLEL
    const viaPromises = selectedTowns.map(town => fetchOsrm([origin, town.coords, destination]));
    const viaResults = await Promise.all(viaPromises);
    for (const viaRoute of viaResults) {
      if (routes.length >= 4) break; // target up to 4 candidates
      if (viaRoute) addRoute(viaRoute);
    }

    // ── Fallback: if OSRM returned NO routes, add exactly ONE straight line fallback ──
    if (routes.length === 0) {
      addRoute({ ...straightLineGeometry(origin, destination), source: 'PROTOTYPE FALLBACK' as const });
    }

    return routes.slice(0, 4);
  }
};
