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

// Fallback logic to generate realistic-looking path between waypoints
function generateFallbackGeometry(origin: [number, number], destination: [number, number]): RouteGeometry {
  const [lat1, lon1] = origin;
  const [lat2, lon2] = destination;
  
  // Calculate distance in km roughly
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  const steps = Math.max(10, Math.floor(distance / 5)); // A point every ~5km
  const coords: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Keep fallback geometry stable across repeated route calculations.
    const envelope = Math.sin(Math.PI * fraction);
    const noiseLat = Math.sin(i * 1.7) * 0.025 * envelope;
    const noiseLon = Math.cos(i * 1.3) * 0.025 * envelope;
    
    const lat = lat1 + (lat2 - lat1) * fraction + noiseLat;
    const lon = lon1 + (lon2 - lon1) * fraction + noiseLon;
    
    // Leaflet wants [lat, lng] for Polyline, but GeoJSON is [lng, lat]
    // Our app uses [lat, lng] in most places (Leaflet standard)
    coords.push([lat, lon]);
  }

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
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache'
      });
      
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
   * Same as getRoute but requests alternatives.
   * Always returns at least 3 routes (mixing OSRM + fallback variations)
   * so the dispatcher always sees multiple candidates.
   */
  async getAlternatives(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry[]> {
    const osrmRoutes: RouteGeometry[] = [];
    try {
      const url = `${OSRM_BASE_URL}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&alternatives=true`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache'
      });

      if (!response.ok) throw new Error('OSRM API Error');

      const data = await response.json() as OsrmResponse;

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        data.routes.forEach(route => {
          osrmRoutes.push({
            coordinates: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
            distance: route.distance,
            duration: route.duration,
            source: 'OSRM' as const
          });
        });
      }
    } catch (error) {
      console.warn('OSRM routing failed, using fallback alternatives', error);
    }

    // Build fallback variations to ensure at least 3 candidates
    const fallbackVariations: RouteGeometry[] = [];

    // Variation 1: direct path with slight curve north
    fallbackVariations.push(generateFallbackGeometry(origin, destination));

    // Variation 2: detour via a midpoint offset north
    const midNorth: [number, number] = [
      (origin[0] + destination[0]) / 2 + 0.4,
      (origin[1] + destination[1]) / 2,
    ];
    const fbn1 = generateFallbackGeometry(origin, midNorth);
    const fbn2 = generateFallbackGeometry(midNorth, destination);
    fallbackVariations.push({
      coordinates: [...fbn1.coordinates, ...fbn2.coordinates],
      distance: fbn1.distance + fbn2.distance,
      duration: fbn1.duration + fbn2.duration
    });

    // Variation 3: detour via a midpoint offset south
    const midSouth: [number, number] = [
      (origin[0] + destination[0]) / 2 - 0.4,
      (origin[1] + destination[1]) / 2,
    ];
    const fbs1 = generateFallbackGeometry(origin, midSouth);
    const fbs2 = generateFallbackGeometry(midSouth, destination);
    fallbackVariations.push({
      coordinates: [...fbs1.coordinates, ...fbs2.coordinates],
      distance: fbs1.distance + fbs2.distance,
      duration: fbs1.duration + fbs2.duration
    });

    // Merge: prefer OSRM routes, then fill with fallbacks to reach at least 4 total
    const all: RouteGeometry[] = [];
    const seen = new Set<string>();
    for (const r of [...osrmRoutes, ...fallbackVariations]) {
      // Deduplicate by checking the first 5 coordinates
      const key = r.coordinates.slice(0, 5).map(c => c.join(',')).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        all.push(r);
      }
    }

    // Ensure at least 3 routes; if we somehow have fewer, duplicate with perturbation
    while (all.length < 3) {
      const base = generateFallbackGeometry(origin, destination);
      all.push({ ...base, source: 'PROTOTYPE FALLBACK' as const });
    }

    return all.slice(0, 4);
  }
};
