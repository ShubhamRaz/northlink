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

// Helper: fetch an OSRM route between two points with a timeout.
async function fetchOsrm(points: [number, number][]): Promise<RouteGeometry | null> {
  try {
    const coordStr = points.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `${OSRM_BASE_URL}/${coordStr}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'force-cache',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json() as OsrmResponse;
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
      distance: route.distance,
      duration: route.duration,
      source: 'OSRM'
    };
  } catch {
    return null;
  }
}

// Straight-line fallback (only used if OSRM is completely unreachable).
function straightLineGeometry(origin: [number, number], destination: [number, number]): RouteGeometry {
  const distance = haversineKm(origin, destination);
  return {
    coordinates: [origin, destination],
    distance: distance * 1000,
    duration: (distance / 40) * 3600,
    source: 'PROTOTYPE FALLBACK'
  };
}

export const routeProvider = {
  /**
   * Fetches the route from OSRM, or falls back to a straight line.
   */
  async getRoute(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry> {
    const route = await fetchOsrm([origin, destination]);
    if (route) return route;
    console.warn('OSRM routing failed, using straight-line fallback');
    return straightLineGeometry(origin, destination);
  },

  /**
   * Returns 3 alternative routes, ALL following real roads via OSRM.
   * Strategy:
   *   1. Direct OSRM route (with alternatives=true)
   *   2. OSRM route via a northern town
   *   3. OSRM route via a southern town
   * If OSRM is unreachable, falls back to straight lines.
   */
  async getAlternatives(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry[]> {
    const routes: RouteGeometry[] = [];
    const seen = new Set<string>();

    const addRoute = (r: RouteGeometry) => {
      const key = r.coordinates.slice(0, 5).map(c => c.join(',')).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        routes.push(r);
      }
    };

    // ── 1. Direct OSRM route (with alternatives=true) ──
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
      if (routes.length >= 3) break;
      if (viaRoute) addRoute(viaRoute);
    }

    // ── Fallback: if OSRM returned fewer than 3 routes, add straight lines ──
    while (routes.length < 3) {
      addRoute({ ...straightLineGeometry(origin, destination), source: 'PROTOTYPE FALLBACK' as const });
    }

    return routes.slice(0, 3);
  }
};
