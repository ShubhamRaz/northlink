import { RouteAlternative, Corridor, Shipment, Incident, SimulationMode } from '@/types';
import { predictCorridorRisk } from './riskService';
import { determineAccessibility } from './accessibilityService';
import { calculateResilience } from './resilienceService';
import { routeProvider, RouteGeometry } from './routeProvider';
import { journeyService } from './journeyService';

export const LOCATION_COORDINATES: Record<string, [number, number]> = {
  'Guwahati Logistics Hub': [26.1445, 91.7362],
  'Silchar Hub': [24.8333, 92.7789],
  'Silchar': [24.8333, 92.7789],
  'Tezpur Base': [26.6338, 92.7930],
  'Shillong Supply Hub': [25.5788, 91.8933],
  'Imphal Medical Depot': [24.8170, 93.9368],
  'Aizawl Distribution Center': [23.7271, 92.7176],
  'Aizawl Center': [23.7271, 92.7176],
  'Kohima Station': [25.6751, 94.1086],
  'Dimapur Central': [25.5788, 93.7789]
};

export function resolveLocationCoordinates(location: string): [number, number] | null {
  return LOCATION_COORDINATES[location] ?? null;
}


function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function nearestDistanceKm(point: [number, number], geometry: [number, number][]): number {
  return geometry.reduce((nearest, coordinate) => Math.min(nearest, haversineKm(point, coordinate)), Number.POSITIVE_INFINITY);
}

function buildGeometryRoute(
  shipment: Shipment,
  geometry: RouteGeometry,
  index: number,
  incidents: Incident[],
  simulationMode: SimulationMode,
  sourceLabel: 'OSRM' | 'PROTOTYPE FALLBACK',
  startTime: string
): RouteAlternative {
  const distance = geometry.distance / 1000;
  const baseEta = Math.max(1, Math.round(geometry.duration / 60));

  // TIME-AWARE EVALUATION
  // Slices the route into segments, evaluates each at its exact future arrival time,
  // and propagates traffic delays forward.
  const evaluation = journeyService.evaluateRouteTimeAware(
    geometry.coordinates,
    baseEta,
    startTime,
    simulationMode,
    incidents
  );

  const probability = evaluation.maxRiskProb;
  const expectedDelay = evaluation.totalExpectedDelay;
  const accessibility = evaluation.hasDirectBlockage ? 'BLOCKED' : probability >= 0.5 ? 'RESTRICTED' : 'OPEN';

  const corridor: Corridor = {
    id: `OSRM-${shipment.id}-${index + 1}`,
    name: `${sourceLabel} route ${index + 1}`,
    status: accessibility,
    accessibility,
    risk: Math.round(probability * 100),
    lastUpdated: new Date().toISOString(),
    source: sourceLabel,
    coordinates: geometry.coordinates,
    baseTravelTime: baseEta
  };
  
  const riskScores: Record<string, number> = { [corridor.id]: probability };
  const feasible = accessibility !== 'BLOCKED';
  const resilience = calculateResilience([corridor], riskScores);
  
  const reasons = [
    `${sourceLabel} road geometry: ${Math.round(distance)} km`,
    expectedDelay > 0 ? `Time-aware forecast predicts ${expectedDelay} minutes of delay.` : 'Time-aware forecast indicates clear conditions.',
    evaluation.hasDirectBlockage ? 'Route is blocked by an active critical incident.' : 'No hard blocks detected on this route.'
  ];

  // DETERMINISTIC ROUTE SCORE
  // Formula: (Total Journey Hours) + (Max Risk * 3) - (Resilience / 100)
  // A resilient route (high resilience score) lowers the penalty.
  // A risky route (high maxRiskProb) adds a heavy penalty.
  const totalJourneyMinutes = baseEta + expectedDelay;
  const priorityScore = feasible ? (totalJourneyMinutes / 60) + (probability * 3) - (resilience / 100) : 999999;

  return {
    id: `RT-OSRM-${index + 1}`,
    name: `${sourceLabel === 'OSRM' ? 'Road alternative' : 'Prototype fallback'} ${index + 1}`,
    corridorIds: [corridor.id],
    distance: Math.round(distance),
    baseEta,
    currentEta: totalJourneyMinutes,
    uncertaintyRange: Math.round(expectedDelay * 0.3),
    cost: Math.round(distance * 4.2 + distance * 0.8 + expectedDelay * 6),
    risk: Math.round(probability * 100),
    resilience,
    status: feasible ? (probability >= 0.5 ? 'RESTRICTED' : 'FEASIBLE') : 'BLOCKED',
    isFeasible: feasible,
    priorityScore,
    reasons,
    coordinates: geometry.coordinates
  };
}

export async function generateRoutesAsync(
  shipment: Shipment,
  incidents: Incident[],
  simulationMode: SimulationMode,
  originOverride?: [number, number],
  destinationOverride?: [number, number],
  startTime: string = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
): Promise<RouteAlternative[]> {
  const origin = originOverride ?? resolveLocationCoordinates(shipment.origin);
  const destination = destinationOverride ?? resolveLocationCoordinates(shipment.destination);
  if (!origin || !destination) {
    throw new Error(`Routing Error: Invalid origin or destination coordinates for shipment ${shipment.id}`);
  }
  const alternatives = await routeProvider.getAlternatives(origin, destination);
  if (!alternatives || alternatives.length === 0) {
    throw new Error(`Routing Error: No valid routes or fallbacks could be generated for ${shipment.id}`);
  }
  return alternatives.slice(0, 4)
    .map((geometry, index) => buildGeometryRoute(shipment, geometry, index, incidents, simulationMode, geometry.source ?? 'PROTOTYPE FALLBACK', startTime))
    .sort((a, b) => a.priorityScore - b.priorityScore);
}

/**
 * Generates fresh route alternatives from the vehicle's CURRENT GPS position to the destination.
 * This guarantees we do NOT simply slice the old route.
 */
export async function reassessRemainingJourney(
  shipment: Shipment,
  currentVehiclePosition: [number, number],
  incidents: Incident[],
  simulationMode: SimulationMode,
  currentTime: string = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
): Promise<RouteAlternative[]> {
  const destination = resolveLocationCoordinates(shipment.destination);
  if (!destination) {
    throw new Error(`Routing Error: Invalid destination for shipment ${shipment.id}`);
  }

  // If vehicle is extremely close to the destination (< 2km), 
  // we do not need to poll for 4 complex route alternatives.
  // We'll let OSRM figure out a quick path directly from the core generator.
  // The route generation is identical but forces origin to currentVehiclePosition.
  return await generateRoutesAsync(
    shipment,
    incidents,
    simulationMode,
    currentVehiclePosition, // True current GPS
    destination,
    currentTime
  );
}
