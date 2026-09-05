import { Incident, Vehicle, Shipment, OperationalStatus } from '@/types';
import { nearestDistanceKm } from '@/services/routeService';

export interface IncidentRelevance {
  relevant: boolean;
  ahead: boolean;
  affectsRemainingRoute: boolean;
  passability: OperationalStatus | 'UNKNOWN';
  requiresSafetyPause: boolean;
  reason: string;
}

// Simple haversine implementation for distance
function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

// Find closest index on a geometry array to a given point
function nearestRouteIndex(coord: [number, number], geometry: [number, number][]): number {
  if (!geometry || geometry.length === 0) return 0;
  let minIndex = 0;
  let minDist = Infinity;
  for (let i = 0; i < geometry.length; i++) {
    const d = haversineKm(coord, geometry[i]);
    if (d < minDist) {
      minDist = d;
      minIndex = i;
    }
  }
  return minIndex;
}

export const incidentRelevanceService = {
  assessIncidentRelevance(
    incident: Incident,
    vehicle: Vehicle,
    shipment: Shipment
  ): IncidentRelevance {
    // 1. Is it verified and unresolved?
    if (incident.verificationStatus !== 'VERIFIED') {
      return { relevant: false, ahead: false, affectsRemainingRoute: false, passability: 'UNKNOWN', requiresSafetyPause: false, reason: 'Incident is not verified' };
    }
    if (incident.resolutionStatus === 'RESOLVED') {
      return { relevant: false, ahead: false, affectsRemainingRoute: false, passability: 'OPEN', requiresSafetyPause: false, reason: 'Incident is already resolved' };
    }

    const routeGeometry = vehicle.currentRouteGeometry;
    if (!routeGeometry || routeGeometry.length === 0) {
      return { relevant: false, ahead: false, affectsRemainingRoute: false, passability: 'UNKNOWN', requiresSafetyPause: false, reason: 'No active vehicle geometry available' };
    }

    // 2. Is it on/near the route? (Using 20km as a wide net, 10km for direct blockage below)
    const incidentDistanceToRoute = nearestDistanceKm(incident.coordinates, routeGeometry);
    if (incidentDistanceToRoute > 20) {
      return { relevant: false, ahead: false, affectsRemainingRoute: false, passability: 'OPEN', requiresSafetyPause: false, reason: 'Incident is too far from the current route' };
    }

    // 3. Is it ahead of the vehicle?
    const vehicleIdx = nearestRouteIndex(vehicle.coordinates, routeGeometry);
    const incidentIdx = nearestRouteIndex(incident.coordinates, routeGeometry);
    
    // We consider it "behind" if it's strictly before the vehicle's current index and more than a few km away.
    // If it's very close (index diff small), it might still be technically "at" the vehicle.
    if (incidentIdx < vehicleIdx && haversineKm(vehicle.coordinates, incident.coordinates) > 2) {
       return { relevant: false, ahead: false, affectsRemainingRoute: false, passability: 'OPEN', requiresSafetyPause: false, reason: 'Incident is behind the vehicle' };
    }

    // 4. Determine passability based on incident type and severity, and how close it is to the route.
    let passability: OperationalStatus = 'OPEN';
    let isHardBlockage = false;

    if (incident.type === 'Landslide' || incident.type === 'Road Blockage' || incident.type === 'Bridge Damage') {
      if (incident.severity === 'Critical') {
        passability = 'BLOCKED';
        isHardBlockage = true;
      } else {
        passability = 'RESTRICTED';
      }
    } else if (incident.severity === 'Critical' || incident.severity === 'High') {
      passability = 'RESTRICTED';
    }

    // A vehicle is only paused for safety if the road is CONFIRMED BLOCKED AHEAD exactly on the route (within 10km)
    const requiresSafetyPause = isHardBlockage && incidentDistanceToRoute <= 10;

    return {
      relevant: true,
      ahead: true,
      affectsRemainingRoute: true,
      passability,
      requiresSafetyPause,
      reason: requiresSafetyPause 
        ? 'Verified critical blockage exactly on remaining route' 
        : `Verified incident ahead. Passability: ${passability}`
    };
  }
};
