import { useAppStore } from '@/store/useAppStore';
import { ROUTE_COORDS } from '@/data/routeGeometry';
import { incidentRelevanceService } from '@/services/incidentRelevanceService';

class SimulationEngine {
  private tickInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private playbackSpeed = 1;
  private TICK_MS = 2000; // 2 seconds per tick
  private tickCount = 0; // Counter to throttle expensive checks
  
  start() {
    if (this.isRunning) return;
    const canMove = useAppStore.getState().shipments.some(shipment =>
      shipment.status === 'In Transit' && shipment.assignedVehicleId &&
      useAppStore.getState().vehicles.some(vehicle => vehicle.id === shipment.assignedVehicleId && vehicle.status === 'In Transit')
    );
    if (!canMove) return;
    this.isRunning = true;
    useAppStore.getState().setSimulationActive(true);
    
    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.TICK_MS);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    useAppStore.getState().setSimulationActive(false);
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  setSpeed(speed: number) {
    this.playbackSpeed = speed;
    if (this.isRunning) {
      this.pause();
      this.start();
    }
  }

  private tick() {
    const state = useAppStore.getState();
    if (!state.networkOnline) return;

    this.tickCount++;
    const simulatedMinutesElapsed = 1 * this.playbackSpeed;

    // Move all active shipments
    const activeShipments = state.shipments.filter(s => s.status === 'In Transit' && s.assignedVehicleId);

    if (activeShipments.length === 0) {
      this.pause();
      return;
    }

    activeShipments.forEach(shipment => {
      const vehicle = state.vehicles.find(v => v.id === shipment.assignedVehicleId);
      if (!vehicle || vehicle.status !== 'In Transit') return;

      // ── SAFETY: pause vehicle if there is an ACTIVE route recommendation
      // waiting for the dispatcher's decision on this shipment ──
      const hasActiveRec = state.routeRecommendations.some(
        r => r.shipmentId === shipment.id && r.status === 'ACTIVE'
      );
      if (hasActiveRec) {
        // Vehicle holds position until dispatcher decides to reroute or keep route
        state.updateVehicle(vehicle.id, {
          speed: 0,
          location: `Holding — awaiting dispatcher decision`,
        });
        return;
      }

      // ── AUTO-DETECT: check if any verified, unresolved incident is close
      // ahead on the current route and auto-trigger impact assessment.
      // THROTTLED: only check every 3 ticks (6 seconds) to avoid freezing
      // the browser with expensive distance calculations on 10,000+ point routes.
      // Only trigger if there's NO ACTIVE recommendation for this shipment.
      if (this.tickCount % 3 === 0) {
        const hasPendingRec = state.routeRecommendations.some(
          r => r.shipmentId === shipment.id && r.status === 'ACTIVE'
        );
        if (!hasPendingRec && vehicle.currentRouteGeometry?.length && shipment.routeId) {
        // Find incidents that are ahead on the CURRENT route (not already-handled ones)
        const nearestIncident = state.incidents.find(inc => {
          if (inc.verificationStatus !== 'VERIFIED' || inc.resolutionStatus !== 'UNRESOLVED') return false;
          // Skip incidents that already have a recommendation for this shipment
          const alreadyHandled = state.routeRecommendations.some(
            r => r.incidentId === inc.id && r.shipmentId === shipment.id
          );
          if (alreadyHandled) return false;
          
          const relevance = incidentRelevanceService.assessIncidentRelevance(inc, vehicle, shipment);
          return relevance.requiresSafetyPause;
        });

        if (nearestIncident && vehicle.status === 'In Transit') {
          // Auto-pause and let the dispatcher handle it
          useAppStore.setState(s => ({
            shipments: s.shipments.map(sh => sh.id === shipment.id && sh.status === 'In Transit' ? { ...sh, status: 'Route Change Pending' } : sh),
            vehicles: s.vehicles.map(v => v.id === vehicle.id && v.status === 'In Transit' ? { ...v, status: 'Paused for Safety', speed: 0 } : v),
          }));
          useAppStore.getState().addEvent({
            message: `Vehicle ${vehicle.id} auto-paused — verified incident detected ahead on route.`,
            type: 'critical'
          });
          useAppStore.getState().addAlert({
            type: 'CRITICAL', title: 'Vehicle Auto-Paused',
            message: `${vehicle.id} stopped near ${nearestIncident.location}. Verify & assess the incident to generate a reroute.`,
            severity: 'High', recipientRole: 'Dispatcher', actionRequired: true, actionTaken: false
          });
          // Trigger impact assessment automatically
          void useAppStore.getState().assessIncidentImpact(nearestIncident.id);
          return;
        }
        }
      }

      // Check if we have journey analysis for this specific shipment AND route.
      // After a reroute, the journeyAnalysis may be stale (old routeId), so we
      // must verify the routeId matches before using its segments.
      const isSelectedAnalysis = state.journeyAnalysis?.shipmentId === shipment.id
        && state.journeyAnalysis?.routeId === shipment.routeId;

      // Ensure we have a valid route duration from active route
      let routeDuration = 240; // Default fallback only if absolutely necessary
      let currentRouteDistance = vehicle.remainingDistance || 0;
      const routeAlt = (state.routesByShipment[shipment.id] || []).find(a => a.id === shipment.routeId);
      if (routeAlt) {
        routeDuration = routeAlt.currentEta;
        currentRouteDistance = routeAlt.distance;
      }
      
      // Use journey analysis duration if it's more precise and matches the current route
      if (isSelectedAnalysis && state.journeyAnalysis) {
        routeDuration = Math.max(state.journeyAnalysis.outlook.currentTravelMinutes, 1);
      }
      
      // Prevent division by zero
      if (routeDuration <= 0) routeDuration = 1;

      const currentProgressMinutes = vehicle.progressMinutes ?? 0;
      const newProgress = Math.min(currentProgressMinutes + simulatedMinutesElapsed, routeDuration);
      const fraction = Math.max(0, Math.min(1, newProgress / routeDuration));
      
      let newCoords = vehicle.coordinates;
      let currentSpeed = vehicle.speed;

      if (vehicle.currentRouteGeometry?.length) {
        const geom = vehicle.currentRouteGeometry;
        const exactIndex = fraction * (geom.length - 1);
        const lower = Math.floor(exactIndex);
        const upper = Math.ceil(exactIndex);
        
        if (lower === upper) {
          newCoords = geom[lower];
        } else {
          const remainder = exactIndex - lower;
          const [lat1, lon1] = geom[lower];
          const [lat2, lon2] = geom[upper];
          newCoords = [lat1 + (lat2 - lat1) * remainder, lon1 + (lon2 - lon1) * remainder];
        }
        
        // Speed calculation based on journey segment if available
        if (isSelectedAnalysis && state.journeyAnalysis) {
          const segments = state.journeyAnalysis.segments;
          const activeSegment = segments.find(s => !s.isCompleted && s.isActive) || segments.find(s => !s.isCompleted);
          if (activeSegment) {
            const baseSpeed = activeSegment.accessibility === 'OPEN' ? 60 : 
                              activeSegment.accessibility === 'CAUTION' ? 40 : 20;
            currentSpeed = baseSpeed;
          } else {
            currentSpeed = 50;
          }
        } else {
          currentSpeed = 50;
        }
      }

      const activeCompletedDistance = fraction * currentRouteDistance;
      const overallCompletedDistance = (vehicle.historicalCompletedDistance || 0) + activeCompletedDistance;
      const currentRemainingDistance = currentRouteDistance - activeCompletedDistance;

      state.updateVehicle(vehicle.id, {
        progressMinutes: newProgress,
        progress: fraction,
        coordinates: newCoords,
        completedDistance: overallCompletedDistance,
        remainingDistance: currentRemainingDistance,
        eta: newProgress >= routeDuration ? '--' : `${Math.floor((routeDuration - newProgress) / 60)}h ${Math.round((routeDuration - newProgress) % 60)}m`,
        location: `Route progress ${Math.round(fraction * 100)}%`,
        speed: Math.round(currentSpeed)
      });

      useAppStore.setState(current => ({
        shipments: current.shipments.map(item => item.id === shipment.id ? {
          ...item,
          eta: newProgress >= routeDuration ? 'Delivered' : `${Math.floor((routeDuration - newProgress) / 60)}h ${Math.round((routeDuration - newProgress) % 60)}m`
        } : item)
      }));

      if (newProgress >= routeDuration) {
        state.updateVehicle(vehicle.id, { status: 'Delivered', speed: 0, progress: 1 });
        useAppStore.setState(current => ({
          shipments: current.shipments.map(item => item.id === shipment.id ? { ...item, status: 'Delivered' } : item)
        }));
        state.addEvent({ message: `${shipment.id} delivered.`, type: 'success' });
      }
    });

    // Refresh journey analysis every 5 simulation-minutes for the currently selected shipment
    // (only when progress > 0 to avoid calling it on the very first tick after selection)
    const selectedActive = activeShipments.find(s => s.id === state.selectedShipmentId);
    if (selectedActive) {
      const v = state.vehicles.find(v => v.id === selectedActive.assignedVehicleId);
      const pm = Math.floor(v?.progressMinutes || 0);
      if (v && pm > 0 && pm % 5 === 0) {
        state.refreshJourneyAnalysis();
      }
    }
    // Note: Auto-detection of incidents ahead is handled in the per-shipment loop above
    // (lines 71-104), which properly skips shipments that already have a recommendation.
  }

  triggerRandomEvent() {}

  /**
   * Computes the minimum haversine distance (km) from a point to any vertex
   * on the given route geometry. Uses downsampling for performance: with 10,000+
   * route points, checking every point on every tick would freeze the browser.
   * We sample every Nth point (where N keeps total checks under 200).
   */
  private pointToRouteDistance(point: [number, number], geometry: [number, number][]): number {
    if (geometry.length === 0) return Number.POSITIVE_INFINITY;
    // Downsample: check at most 200 points
    const step = Math.max(1, Math.floor(geometry.length / 200));
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < geometry.length; i += step) {
      const d = this.haversineKm(point, geometry[i]);
      if (d < min) min = d;
      // Early exit if we find a very close point
      if (min < 5) return min;
    }
    return min;
  }

  private haversineKm(a: [number, number], b: [number, number]): number {
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLon = (b[1] - a[1]) * Math.PI / 180;
    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;
    const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  private nearestRouteIndex(point: [number, number], geometry: [number, number][]): number {
    return geometry.reduce((nearestIndex, coordinate, index) =>
      this.haversineKm(point, coordinate) < this.haversineKm(point, geometry[nearestIndex]) ? index : nearestIndex, 0);
  }
}

export const simulationService = new SimulationEngine();
