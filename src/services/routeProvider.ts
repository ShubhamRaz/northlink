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
   * Same as getRoute but requests alternatives
   */
  async getAlternatives(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteGeometry[]> {
    try {
      const url = `${OSRM_BASE_URL}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&alternatives=true`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'force-cache'
      });
      
      if (!response.ok) throw new Error('OSRM API Error');
      
      const data = await response.json() as OsrmResponse;
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      return data.routes.map(route => ({
        coordinates: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
        distance: route.distance,
        duration: route.duration,
        source: 'OSRM' as const
      }));
    } catch (error) {
      console.warn('OSRM routing failed, using fallback alternatives', error);
      // Generate a couple of alternate looking paths
      const alt1 = generateFallbackGeometry(origin, destination);
      
      // Perturb the midpoint for alt2
      const midPoint: [number, number] = [
        (origin[0] + destination[0]) / 2 + 0.3,
        (origin[1] + destination[1]) / 2 - 0.2
      ];
      
      const leg1 = generateFallbackGeometry(origin, midPoint);
      const leg2 = generateFallbackGeometry(midPoint, destination);
      const alt2 = {
        coordinates: [...leg1.coordinates, ...leg2.coordinates],
        distance: leg1.distance + leg2.distance,
        duration: leg1.duration + leg2.duration
      };

      return [
        { ...alt1, source: 'PROTOTYPE FALLBACK' as const },
        { ...alt2, source: 'PROTOTYPE FALLBACK' as const }
      ];
    }
  }
};
