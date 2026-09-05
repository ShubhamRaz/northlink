import { RouteAlternative, Corridor, Shipment, Incident, SimulationMode } from '@/types';
import { predictCorridorRisk } from './riskService';
import { determineAccessibility } from './accessibilityService';
import { calculateResilience } from './resilienceService';
import { routeProvider, RouteGeometry } from './routeProvider';

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

function nearestDistanceKm(point: [number, number], geometry: [number, number][]): number {
  return geometry.reduce((nearest, coordinate) => Math.min(nearest, haversineKm(point, coordinate)), Number.POSITIVE_INFINITY);
}

function buildGeometryRoute(
  shipment: Shipment,
  geometry: RouteGeometry,
  index: number,
  incidents: Incident[],
  simulationMode: SimulationMode,
  sourceLabel: 'OSRM' | 'PROTOTYPE FALLBACK'
): RouteAlternative {
  const distance = geometry.distance / 1000;
  const baseEta = Math.max(1, Math.round(geometry.duration / 60));
  const trafficDelay = simulationMode === 'TRAFFIC SURGE' ? Math.round(baseEta * 0.25) : 0;

  // Distance-weighted incident risk: incidents directly ON the route (<=10km) have full impact,
  // incidents 10-50km away have reduced impact (scaled by distance).
  // Only routes with an incident directly ON them (<=10km) can be BLOCKED.
  const relevantIncidents = incidents.filter(incident =>
    incident.verificationStatus === 'VERIFIED' && incident.resolutionStatus === 'UNRESOLVED' &&
    nearestDistanceKm(incident.coordinates, geometry.coordinates) <= 50
  );
  const incidentRisk = Math.min(0.85, relevantIncidents.reduce((sum, incident) => {
    const distToRoute = nearestDistanceKm(incident.coordinates, geometry.coordinates);
    // Distance scaling: 1.0 at 0km, 0.5 at 10km, 0.1 at 50km
    const distanceFactor = Math.max(0.1, 1 - (distToRoute / 50));
    let baseContribution = 0;
    if (incident.type === 'Landslide' || incident.type === 'Road Blockage' || incident.type === 'Bridge Damage') baseContribution = 0.45;
    else if (incident.type === 'Traffic' || incident.type === 'Heavy Rain') baseContribution = 0.2;
    else baseContribution = 0.1;
    // Critical severity doubles the contribution
    if (incident.severity === 'Critical') baseContribution *= 1.3;
    return sum + (baseContribution * distanceFactor);
  }, 0));

  const weatherRisk = simulationMode === 'HEAVY RAIN' ? 0.3 : simulationMode === 'LANDSLIDE' ? 0.25 : 0;
  const probability = Math.min(0.99, 0.08 + weatherRisk + incidentRisk + (distance > 300 ? 0.08 : 0));
  const expectedDelay = trafficDelay + (probability >= 0.75 ? 120 : probability >= 0.5 ? 45 : probability >= 0.3 ? 15 : 0);

  // A route is only BLOCKED if a critical hard-blockage incident (landslide/road blockage/bridge damage)
  // is directly ON the route (within 10km). Otherwise it's RESTRICTED (passable but risky).
  const hasDirectBlockage = relevantIncidents.some(inc =>
    (inc.type === 'Landslide' || inc.type === 'Road Blockage' || inc.type === 'Bridge Damage') &&
    inc.severity === 'Critical' &&
    nearestDistanceKm(inc.coordinates, geometry.coordinates) <= 10
  );
  const accessibility = hasDirectBlockage ? 'BLOCKED' : probability >= 0.5 ? 'RESTRICTED' : 'OPEN';
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
  const reasons = [
    `${sourceLabel} road geometry: ${Math.round(distance)} km`,
    trafficDelay > 0 ? `Traffic surge adds ${trafficDelay} minutes.` : 'Traffic impact included in forecast.',
    relevantIncidents.length > 0 ? `${relevantIncidents.length} verified unresolved incident(s) near this route.` : 'No verified unresolved incidents near this route.'
  ];
  return {
    id: `RT-OSRM-${index + 1}`,
    name: `${sourceLabel === 'OSRM' ? 'Road alternative' : 'Prototype fallback'} ${index + 1}`,
    corridorIds: [corridor.id],
    distance: Math.round(distance),
    baseEta,
    currentEta: baseEta + expectedDelay,
    uncertaintyRange: Math.round(expectedDelay * 0.3),
    cost: Math.round(distance * 4.2 + distance * 0.8 + expectedDelay * 6),
    risk: Math.round(probability * 100),
    resilience: calculateResilience([corridor], riskScores),
    status: feasible ? (probability >= 0.5 ? 'RESTRICTED' : 'FEASIBLE') : 'BLOCKED',
    isFeasible: feasible,
    priorityScore: feasible ? (baseEta / 60) + probability * 3 - calculateResilience([corridor], riskScores) / 100 : 999999,
    reasons,
    coordinates: geometry.coordinates
  };
}

export async function generateRoutesAsync(
  shipment: Shipment,
  incidents: Incident[],
  simulationMode: SimulationMode,
  originOverride?: [number, number],
  destinationOverride?: [number, number]
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
    .map((geometry, index) => buildGeometryRoute(shipment, geometry, index, incidents, simulationMode, geometry.source ?? 'PROTOTYPE FALLBACK'))
    .sort((a, b) => a.priorityScore - b.priorityScore);
}
