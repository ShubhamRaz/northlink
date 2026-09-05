/**
 * Journey Service
 * Segments a route into temporal waypoints and calculates:
 *  - ETA at each waypoint given a start time
 *  - Weather forecast at each waypoint at arrival time
 *  - Segment-level disruption probability
 *  - Journey outlook and advance warnings
 */

import {
  RouteSegment, JourneyAnalysis, JourneyOutlook, AdvanceWarning,
  OperationalStatus, SimulationMode, Incident
} from '@/types';
import { weatherForecastService } from './weatherForecastService';

type JourneyWaypoint = {
  id: string;
  location: string;
  slug: string;
  coords: [number, number];
  distFromOrigin: number;
  segDist: number;
  travelMin: number;
};

function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function buildGeometryWaypoints(geometry: [number, number][], totalMinutes: number, routeId: string): JourneyWaypoint[] {
  if (geometry.length < 2) return [];
  const distances = [0];
  for (let index = 1; index < geometry.length; index += 1) {
    distances.push(distances[index - 1] + haversineKm(geometry[index - 1], geometry[index]));
  }
  const totalDistance = distances[distances.length - 1] || 1;
  const count = Math.min(7, Math.max(3, Math.ceil(geometry.length / 40)));
  return Array.from({ length: count }, (_, index) => {
    const pointIndex = Math.min(geometry.length - 1, Math.round(index * (geometry.length - 1) / (count - 1)));
    const previousIndex = index === 0 ? 0 : Math.round((index - 1) * (geometry.length - 1) / (count - 1));
    const segmentDistance = Math.max(0, distances[pointIndex] - distances[previousIndex]);
    return {
      id: `SEG-${routeId}-${index + 1}`,
      location: index === 0 ? 'Route Origin' : index === count - 1 ? 'Route Destination' : `Route Segment ${index}`,
      slug: `route-segment-${index + 1}`,
      coords: geometry[pointIndex],
      distFromOrigin: Math.round(distances[pointIndex]),
      segDist: Math.round(segmentDistance),
      travelMin: index === 0 ? 0 : Math.max(1, Math.round(totalMinutes * segmentDistance / totalDistance))
    };
  });
}

// ── Canonical waypoint definitions for Guwahati → Imphal routes ────────────

const ROUTE_A_WAYPOINTS = [
  { id: 'SEG-A1', location: 'Guwahati', slug: 'guwahati', coords: [26.1445, 91.7362] as [number, number], distFromOrigin: 0,  segDist: 0,   travelMin: 0 },
  { id: 'SEG-A2', location: 'Nagaon',   slug: 'nagaon',   coords: [26.3480, 92.6840] as [number, number], distFromOrigin: 95, segDist: 95,  travelMin: 105 },
  { id: 'SEG-A3', location: 'Dimapur',  slug: 'dimapur',  coords: [25.9064, 93.7228] as [number, number], distFromOrigin: 200, segDist: 105, travelMin: 120 },
  { id: 'SEG-A4', location: 'Kohima Corridor', slug: 'kohima', coords: [25.6751, 94.1086] as [number, number], distFromOrigin: 265, segDist: 65, travelMin: 90 },
  { id: 'SEG-A5', location: 'Mao Gate', slug: 'mao', coords: [25.3000, 94.0000] as [number, number], distFromOrigin: 330, segDist: 65, travelMin: 80 },
  { id: 'SEG-A6', location: 'Imphal',   slug: 'imphal',   coords: [24.817, 93.9368] as [number, number], distFromOrigin: 395, segDist: 65, travelMin: 90 },
];

const ROUTE_B_WAYPOINTS = [
  { id: 'SEG-B1', location: 'Guwahati', slug: 'guwahati', coords: [26.1445, 91.7362] as [number, number], distFromOrigin: 0,   segDist: 0,   travelMin: 0 },
  { id: 'SEG-B2', location: 'Nagaon',   slug: 'nagaon',   coords: [26.3480, 92.6840] as [number, number], distFromOrigin: 95,  segDist: 95,  travelMin: 105 },
  { id: 'SEG-B3', location: 'Silchar',  slug: 'silchar',  coords: [24.8333, 92.7789] as [number, number], distFromOrigin: 200, segDist: 105, travelMin: 130 },
  { id: 'SEG-B4', location: 'Jiribam', slug: 'jiribam',   coords: [24.7938, 93.1193] as [number, number], distFromOrigin: 285, segDist: 85,  travelMin: 105 },
  { id: 'SEG-B5', location: 'Imphal',   slug: 'imphal',   coords: [24.817, 93.9368] as [number, number], distFromOrigin: 360, segDist: 75,  travelMin: 95 },
];

function parseStartTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { h: h || 10, m: m || 0 };
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const { h, m } = parseStartTime(hhmm);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function computeDisruptionProbability(
  weather: { severity: string; rainfall: number },
  terrainRisk: number,
  incidentRisk: number,
  trafficRisk: number
): number {
  let prob = 0.05; // base

  // Weather contribution
  if (weather.severity === 'EXTREME') prob += 0.55;
  else if (weather.severity === 'HIGH') prob += 0.35;
  else if (weather.severity === 'WATCH') prob += 0.15;

  // Terrain amplifier
  prob += terrainRisk * 0.25;

  // Incidents
  prob += incidentRisk;

  // Traffic
  prob += trafficRisk * 0.10;

  return Math.min(prob, 0.99);
}

function computeExpectedDelay(prob: number, terrainRisk: number): number {
  if (prob < 0.20) return 0;
  if (prob < 0.40) return 15;
  if (prob < 0.60) return 30;
  if (prob < 0.75) return 45;
  if (prob < 0.90) return 90;
  return 180; // near-blocking
}

function computeAccessibility(prob: number): OperationalStatus {
  if (prob >= 0.85) return 'BLOCKED';
  if (prob >= 0.60) return 'RESTRICTED';
  if (prob >= 0.35) return 'CAUTION';
  return 'OPEN';
}

function buildSegments(
  waypoints: JourneyWaypoint[],
  routeId: string,
  startTime: string,
  simulationMode: SimulationMode,
  incidents: Incident[],
  vehicleProgressMinutes: number = 0 // minutes already traveled
): RouteSegment[] {
  let cumulativeMinutes = 0;
  const segments: RouteSegment[] = [];

  for (const wp of waypoints) {
    // Apply traffic surge time penalty
    let travelMinutes = wp.travelMin;
    if (simulationMode === 'TRAFFIC SURGE') {
      travelMinutes += Math.round(wp.travelMin * 0.25); // 25% slower
    }

    const segmentStartMinutes = cumulativeMinutes;
    cumulativeMinutes += travelMinutes;

    const arrivalTime = addMinutesToTime(startTime, cumulativeMinutes);
    const arrivalHour = parseInt(arrivalTime.split(':')[0], 10);

    const weather = weatherForecastService.getForecastForSegment(wp.slug, arrivalHour, simulationMode);
    const terrainRisk = weatherForecastService.getTerrainRisk(wp.slug);

    // Incident risk: check if any active incident is on corridors touching this segment
    const segmentIncidents = incidents.filter(inc => {
      if (!inc.coordinates) return false;
      const [ilat, ilng] = inc.coordinates;
      const [slat, slng] = wp.coords;
      return Math.abs(ilat - slat) < 1.5 && Math.abs(ilng - slng) < 1.5;
    });
    const incidentRisk = Math.min(segmentIncidents.reduce((sum, inc) => {
      if (inc.severity === 'Critical') return sum + 0.5;
      if (inc.severity === 'High') return sum + 0.3;
      return sum + 0.1;
    }, 0), 0.7);

    // Extra penalty: if landslide mode and Kohima
    let finalIncidentRisk = incidentRisk;
    if (simulationMode === 'LANDSLIDE' && (wp.slug === 'kohima' || wp.slug === 'dimapur')) {
      finalIncidentRisk = Math.min(incidentRisk + 0.5, 0.9);
    }

    const trafficRisk = simulationMode === 'TRAFFIC SURGE' ? 0.5 : 0;
    const prob = computeDisruptionProbability(weather, terrainRisk, finalIncidentRisk, trafficRisk);
    const delay = computeExpectedDelay(prob, terrainRisk);
    const accessibility = computeAccessibility(prob);

    const elapsed = segmentStartMinutes; // minutes traveled before reaching this segment
    const isCompleted = vehicleProgressMinutes > cumulativeMinutes;
    const isActive = !isCompleted && vehicleProgressMinutes >= elapsed;

    segments.push({
      id: wp.id,
      routeId,
      sequence: waypoints.indexOf(wp) + 1,
      location: wp.location,
      coordinates: wp.coords,
      distanceFromOrigin: wp.distFromOrigin,
      segmentDistance: wp.segDist,
      estimatedTravelMinutes: travelMinutes,
      estimatedArrivalTime: arrivalTime,
      weather,
      terrainRisk,
      incidentRisk: finalIncidentRisk,
      trafficRisk,
      disruptionProbability: prob,
      expectedDelay: delay,
      accessibility,
      confidence: Math.min(0.96, 0.82 + (1 - terrainRisk) * 0.08),
      isCompleted,
      isActive
    });
  }

  return segments;
}

function buildOutlook(segments: RouteSegment[]): JourneyOutlook {
  const totalDistanceKm = segments[segments.length - 1]?.distanceFromOrigin ?? 0;
  const baseTravelMinutes = segments.reduce((sum, s) => sum + s.estimatedTravelMinutes, 0);
  const predictedDelayMinutes = segments.reduce((sum, s) => sum + s.expectedDelay, 0);
  const currentTravelMinutes = baseTravelMinutes + predictedDelayMinutes;

  const highRiskSegments = segments.filter(s => s.disruptionProbability >= 0.5);
  const highRiskSegmentCount = highRiskSegments.length;

  const maxRiskSeg = segments.reduce<RouteSegment | null>((prev, curr) =>
    !prev || curr.disruptionProbability > prev.disruptionProbability ? curr : prev
  , null);

  // Classify overall forecast risk
  const maxProb = maxRiskSeg?.disruptionProbability ?? 0;
  let forecastRisk: JourneyOutlook['forecastRisk'] = 'LOW';
  if (maxProb >= 0.75) forecastRisk = 'CRITICAL';
  else if (maxProb >= 0.50) forecastRisk = 'HIGH';
  else if (maxProb >= 0.30) forecastRisk = 'MEDIUM';

  // Build advance warnings for future segments with high risk
  const advanceWarnings: AdvanceWarning[] = segments
    .filter(s => !s.isCompleted && s.disruptionProbability >= 0.45)
    .map((s, i): AdvanceWarning => {
      const cause = s.weather.severity === 'EXTREME'
        ? `${s.weather.condition} + high terrain sensitivity`
        : s.incidentRisk > 0.3
          ? `Active field incidents + ${s.weather.condition.toLowerCase()}`
          : `${s.weather.condition} forecast`;

      // Minutes ahead: difference from first active segment
      const firstActive = segments.find(seg => !seg.isCompleted);
      const minutesAhead = firstActive
        ? (parseInt(s.estimatedArrivalTime.split(':')[0]) * 60 + parseInt(s.estimatedArrivalTime.split(':')[1]))
          - (parseInt(firstActive.estimatedArrivalTime.split(':')[0]) * 60 + parseInt(firstActive.estimatedArrivalTime.split(':')[1]))
        : 0;

      return {
        segmentId: s.id,
        location: s.location,
        expectedArrivalTime: s.estimatedArrivalTime,
        minutesAhead: Math.max(0, minutesAhead),
        disruptionProbability: s.disruptionProbability,
        expectedDelay: s.expectedDelay,
        cause,
        severity: s.weather.severity
      };
    });

  return {
    totalDistanceKm,
    baseTravelMinutes,
    currentTravelMinutes,
    predictedDelayMinutes,
    forecastRisk,
    highestRiskSegmentId: maxRiskSeg?.id ?? null,
    highRiskSegmentCount,
    advanceWarnings
  };
}

export const journeyService = {
  async analyzeJourney(
    shipmentId: string,
    routeId: string,
    origin: string,
    destination: string,
    startTime: string,
    simulationMode: SimulationMode,
    incidents: Incident[],
    vehicleProgressMinutes: number = 0,
    routeCoordinates?: [number, number][],
    routeDurationMinutes?: number
  ): Promise<JourneyAnalysis> {
    const waypoints = routeCoordinates?.length
      ? buildGeometryWaypoints(routeCoordinates, routeDurationMinutes ?? 240, routeId)
      : routeId === 'RT-ALT-1' ? ROUTE_B_WAYPOINTS : ROUTE_A_WAYPOINTS;

    // 1. Build temporal segments (without geometry yet)
    const segments = buildSegments(
      waypoints, routeId, startTime, simulationMode, incidents, vehicleProgressMinutes
    );

    // 2. Bind route geometry to segments
    try {
      // If we already have route coordinates (from OSRM dispatch), use them directly.
      // Only call OSRM if no coordinates were provided.
      const realRoute = routeCoordinates?.length
        ? { coordinates: routeCoordinates }
        : await (await import('./routeProvider')).routeProvider.getRoute(waypoints[0].coords, waypoints[waypoints.length - 1].coords);
      const totalPoints = realRoute.coordinates.length;

      // 3. Slice geometry into segments based on distance proportions
      let currentPointIndex = 0;
      const totalAssumedDistance = waypoints[waypoints.length - 1].distFromOrigin || 1;

      for (const seg of segments) {
        if (seg.sequence === segments.length) {
          // Last segment gets the rest
          seg.geometry = realRoute.coordinates.slice(currentPointIndex);
        } else {
          // Proportion of total distance this segment covers
          const proportion = seg.segmentDistance / totalAssumedDistance;
          const pointsInSegment = Math.max(2, Math.floor(totalPoints * proportion));
          const endIndex = Math.min(totalPoints, currentPointIndex + pointsInSegment);

          seg.geometry = realRoute.coordinates.slice(currentPointIndex, endIndex);
          currentPointIndex = endIndex - 1; // overlap by 1 point to connect lines
        }
      }
    } catch (error) {
      console.warn('Failed to fetch/bind real geometry to segments', error);
      // Fallback: just use a 2-point line from the previous waypoint to this one
      let lastCoord = waypoints[0].coords;
      for (const seg of segments) {
        seg.geometry = [lastCoord, seg.coordinates];
        lastCoord = seg.coordinates;
      }
    }

    const outlook = buildOutlook(segments);

    return {
      id: `JA-${shipmentId}-${routeId}`,
      shipmentId,
      routeId,
      origin,
      destination,
      startTime,
      segments,
      outlook,
      lastAnalyzed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  },

  // Compare future weather exposure across candidate routes
  computeFutureExposure(segments: RouteSegment[]): {
    highRiskCount: number;
    maxProbability: number;
    totalExpectedDelay: number;
    worstLocation: string;
  } {
    const highRisk = segments.filter(s => s.disruptionProbability >= 0.5);
    const maxSeg = segments.reduce<RouteSegment | null>((p, c) =>
      !p || c.disruptionProbability > p.disruptionProbability ? c : p
    , null);
    return {
      highRiskCount: highRisk.length,
      maxProbability: maxSeg?.disruptionProbability ?? 0,
      totalExpectedDelay: segments.reduce((s, seg) => s + seg.expectedDelay, 0),
      worstLocation: maxSeg?.location ?? 'N/A'
    };
  }
};

