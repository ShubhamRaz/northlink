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

// In a real system, this would query a routing engine (e.g. pgRouting)
// For the prototype, we have 2 main candidates for Guwahati -> Imphal
const getCandidatePaths = (): { id: string; name: string; corridorIds: string[] }[] => [
  { id: 'RT-FASTEST', name: 'Fastest (via Kohima)', corridorIds: ['C01', 'C02'] },
  { id: 'RT-ALT-1', name: 'Alternative (via Silchar)', corridorIds: ['C01', 'C03'] }
];

function distanceKm(coords: [number, number][]): number {
  let total = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const [lat1, lon1] = coords[index - 1];
    const [lat2, lon2] = coords[index];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    total += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}

export const generateRoutes = (
  shipment: Shipment,
  corridors: Corridor[],
  incidents: Incident[],
  simulationMode: SimulationMode,
  completedCorridorIds: string[] = []
): RouteAlternative[] => {
  
  const candidates = getCandidatePaths();
  const alternatives: RouteAlternative[] = [];

  // Map to hold calculated risk for the resilience engine later
  const riskScores: Record<string, number> = {};

  for (const candidate of candidates) {
    const routeCorridors = candidate.corridorIds.map(id => corridors.find(c => c.id === id)).filter(Boolean) as Corridor[];
    
    if (routeCorridors.length === 0) continue;

    let baseEta = 0;
    let totalDelay = 0;
    let maxRiskProb = 0;
    let isFeasible = true;
    const reasons: string[] = [];

    // Evaluate each corridor in the route
    for (const corridor of routeCorridors) {
      baseEta += corridor.baseTravelTime;

      // If already completed, skip risk/delay additions for it
      if (completedCorridorIds.includes(corridor.id)) {
        continue;
      }

      // AI Prediction
      const prediction = predictCorridorRisk(corridor, incidents, simulationMode);
      riskScores[corridor.id] = prediction.probability;
      totalDelay += prediction.expectedDelay;

      if (prediction.probability > maxRiskProb) {
        maxRiskProb = prediction.probability;
      }

      // Accessibility Rules
      const accessibility = determineAccessibility(corridor, prediction, incidents);
      
      // Hard Constraints
      if (accessibility === 'BLOCKED') {
        isFeasible = false;
        reasons.push(`${corridor.name} is BLOCKED.`);
      } else if (accessibility === 'RESTRICTED') {
        reasons.push(`${corridor.name} is RESTRICTED (Expect severe delays).`);
      }
    }

    // Build Route Alternative
    const currentEta = baseEta + totalDelay;
    const riskPercent = Math.round(maxRiskProb * 100);
    const rri = calculateResilience(routeCorridors, riskScores);
    const coordinates = routeCorridors.flatMap(c => c.coordinates);
    const distance = distanceKm(coordinates);
    const fuelEstimate = Math.round(distance * 4.2);
    const tollEstimate = Math.round(distance * 0.8);
    const operationalEstimate = Math.round(totalDelay * 6);
    const cost = fuelEstimate + tollEstimate + operationalEstimate;

    let status: RouteAlternative['status'] = 'FEASIBLE';
    if (!isFeasible) status = 'BLOCKED';
    else if (maxRiskProb >= 0.5) status = 'RESTRICTED';

    alternatives.push({
      id: candidate.id,
      name: candidate.name,
      corridorIds: candidate.corridorIds,
      distance,
      baseEta,
      currentEta,
      uncertaintyRange: Math.round(totalDelay * 0.3),
      cost,
      risk: riskPercent,
      resilience: rri,
      status,
      isFeasible,
      priorityScore: 0, // Calculated below
      reasons,
      coordinates
    });
  }

  // Multi-Objective Scoring
  // Score = wETA*ETA + wRisk*Risk + wCost*Cost - wResilience*RRI
  // We want to MINIMIZE the score.
  
  // Weights based on priority
  let wETA = 1, wRisk = 1, wCost = 1, wResilience = 1;
  if (shipment.priority === 'Critical') {
    wETA = 2.0;
    wRisk = 3.0; // Avoid risk at all costs
    wCost = 0.1; // Cost doesn't matter
    wResilience = 2.0;
  } else if (shipment.priority === 'High') {
    wETA = 1.5;
    wRisk = 1.5;
    wCost = 0.5;
    wResilience = 1.2;
  }

  // Find max values for normalization
  const maxEta = Math.max(...alternatives.map(a => a.currentEta), 1);
  const maxCost = Math.max(...alternatives.map(a => a.cost), 1);

  alternatives.forEach(alt => {
    if (!alt.isFeasible) {
      alt.priorityScore = 999999; // Deprioritize completely
      return;
    }

    const normEta = alt.currentEta / maxEta;
    const normCost = alt.cost / maxCost;
    const normRisk = alt.risk / 100;
    const normRes = alt.resilience / 100;

    // Lower is better
    alt.priorityScore = (wETA * normEta) + (wRisk * normRisk) + (wCost * normCost) - (wResilience * normRes);
  });

  // Sort by best score (lowest)
  alternatives.sort((a, b) => a.priorityScore - b.priorityScore);

  // Assign explanations to the top route
  const bestRoute = alternatives.find(a => a.isFeasible);
  if (bestRoute) {
    if (bestRoute.risk > 40) {
      bestRoute.reasons.push('Selected despite moderate risk due to lack of feasible alternatives.');
    } else {
      bestRoute.reasons.push('Provides the best balance of speed, low risk, and high resilience.');
    }
  }

  return alternatives;
};

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
  const relevantIncidents = incidents.filter(incident =>
    incident.verificationStatus === 'VERIFIED' && incident.resolutionStatus === 'UNRESOLVED' &&
    nearestDistanceKm(incident.coordinates, geometry.coordinates) <= 35
  );
  const incidentRisk = Math.min(0.75, relevantIncidents.reduce((sum, incident) => {
    if (incident.type === 'Landslide' || incident.type === 'Road Blockage' || incident.type === 'Bridge Damage') return sum + 0.45;
    if (incident.type === 'Traffic' || incident.type === 'Heavy Rain') return sum + 0.2;
    return sum + 0.1;
  }, 0));
  const weatherRisk = simulationMode === 'HEAVY RAIN' ? 0.3 : simulationMode === 'LANDSLIDE' ? 0.25 : 0;
  const probability = Math.min(0.99, 0.08 + weatherRisk + incidentRisk + (distance > 300 ? 0.08 : 0));
  const expectedDelay = trafficDelay + (probability >= 0.75 ? 120 : probability >= 0.5 ? 45 : probability >= 0.3 ? 15 : 0);
  const corridor: Corridor = {
    id: `OSRM-${shipment.id}-${index + 1}`,
    name: `${sourceLabel} route ${index + 1}`,
    status: probability >= 0.8 ? 'BLOCKED' : probability >= 0.5 ? 'RESTRICTED' : 'OPEN',
    accessibility: probability >= 0.8 ? 'BLOCKED' : probability >= 0.5 ? 'RESTRICTED' : 'OPEN',
    risk: Math.round(probability * 100),
    lastUpdated: new Date().toISOString(),
    source: sourceLabel,
    coordinates: geometry.coordinates,
    baseTravelTime: baseEta
  };
  const riskScores: Record<string, number> = { [corridor.id]: probability };
  const feasible = corridor.accessibility !== 'BLOCKED';
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
  if (!origin || !destination) return [];
  const alternatives = await routeProvider.getAlternatives(origin, destination);
  return alternatives.slice(0, 4)
    .map((geometry, index) => buildGeometryRoute(shipment, geometry, index, incidents, simulationMode, geometry.source ?? 'PROTOTYPE FALLBACK'))
    .sort((a, b) => a.priorityScore - b.priorityScore);
}
