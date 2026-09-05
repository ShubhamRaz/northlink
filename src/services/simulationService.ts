import { useAppStore } from '@/store/useAppStore';
import { ROUTE_COORDS } from '@/data/routeGeometry';

class SimulationEngine {
  private tickInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private playbackSpeed = 1;
  private TICK_MS = 1000;
  
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

    const simulatedMinutesElapsed = 1 * this.playbackSpeed;

    // Move all active shipments
    const activeShipments = state.shipments.filter(s => s.status === 'In Transit' && s.assignedVehicleId);

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
      // Only trigger if there's NO existing recommendation for this shipment
      // (i.e., the dispatcher hasn't already decided to reroute or keep route).
      const hasAnyRec = state.routeRecommendations.some(
        r => r.shipmentId === shipment.id && (r.status === 'ACTIVE' || r.status === 'APPROVED' || r.status === 'REJECTED')
      );
      if (!hasAnyRec && vehicle.currentRouteGeometry?.length && shipment.routeId) {
        const nearestIncident = state.incidents.find(inc => {
          if (inc.verificationStatus !== 'VERIFIED' || inc.resolutionStatus !== 'UNRESOLVED') return false;
          // Check if incident is near the vehicle's route ahead
          const dist = this.pointToRouteDistance(inc.coordinates, vehicle.currentRouteGeometry!);
          return dist <= 50;
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

      // Check if we have journey analysis for this specific shipment AND route.
      // After a reroute, the journeyAnalysis may be stale (old routeId), so we
      // must verify the routeId matches before using its segments.
      const isSelectedAnalysis = state.journeyAnalysis?.shipmentId === shipment.id
        && state.journeyAnalysis?.routeId === shipment.routeId;

      // Use the journey analysis duration only if it matches the current route
      const routeDuration = isSelectedAnalysis
        ? Math.max(state.journeyAnalysis!.outlook.currentTravelMinutes, 1)
        : 240;
      const currentProgressMinutes = vehicle.progressMinutes ?? (vehicle.progress ?? 0) * routeDuration;
      const newProgress = Math.min(currentProgressMinutes + simulatedMinutesElapsed, routeDuration);
      let newCoords = vehicle.coordinates;
      let currentSpeed = vehicle.speed;

      if (isSelectedAnalysis && state.journeyAnalysis) {
        // Precise interpolation using journey analysis segments
        const segments = state.journeyAnalysis.segments;
        const activeSegment = segments.find(s => !s.isCompleted && s.isActive) || segments.find(s => !s.isCompleted);

        if (activeSegment && activeSegment.geometry && activeSegment.geometry.length > 0) {
          const segmentStartMin = activeSegment.sequence === 1 ? 0 : 
            segments.slice(0, activeSegment.sequence - 1).reduce((acc, s) => acc + s.estimatedTravelMinutes, 0);
          
          const minIntoSegment = newProgress - segmentStartMin;
          const fraction = Math.max(0, Math.min(1, minIntoSegment / activeSegment.estimatedTravelMinutes));

          const geom = activeSegment.geometry;
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

          const baseSpeed = activeSegment.accessibility === 'OPEN' ? 60 : 
                            activeSegment.accessibility === 'CAUTION' ? 40 : 20;
          currentSpeed = baseSpeed + (Math.random() * 10 - 5);
        }
      } else if (vehicle.currentRouteGeometry?.length) {
        const geom = vehicle.currentRouteGeometry;
        const fraction = Math.max(0, Math.min(1, newProgress / routeDuration));
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
        currentSpeed = 50 + (Math.random() * 10 - 5);
      } else if (vehicle.currentRouteGeometry?.length) {
        // Fallback: use the vehicle's stored OSRM route geometry
        const geom = vehicle.currentRouteGeometry;
        const fraction = Math.max(0, Math.min(1, newProgress / routeDuration));

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
        currentSpeed = 50 + (Math.random() * 10 - 5);
      } else if (vehicle.currentRouteId && ROUTE_COORDS[vehicle.currentRouteId]) {
        // Last-resort fallback using static ROUTE_COORDS
        const geom = ROUTE_COORDS[vehicle.currentRouteId];
        const fraction = Math.max(0, Math.min(1, newProgress / 240));

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

        currentSpeed = 50 + (Math.random() * 10 - 5);
      }

      state.updateVehicle(vehicle.id, {
        progressMinutes: newProgress,
        progress: newProgress / routeDuration,
        coordinates: newCoords,
        eta: newProgress >= routeDuration ? '--' : `${Math.floor((routeDuration - newProgress) / 60)}h ${Math.round((routeDuration - newProgress) % 60)}m`,
        location: `Route progress ${Math.round((newProgress / routeDuration) * 100)}%`,
        speed: Math.round(currentSpeed)
      });

      useAppStore.setState(current => ({
        shipments: current.shipments.map(item => item.id === shipment.id ? {
          ...item,
          eta: newProgress >= routeDuration ? 'Delivered' : `${Math.floor((routeDuration - newProgress) / 60)}h ${Math.round((routeDuration - newProgress) % 60)}m`
        } : item)
      }));

      if (newProgress >= routeDuration) {
        state.updateVehicle(vehicle.id, { status: 'Delivered', speed: 0 });
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
   * on the given route geometry. Used to detect whether an incident is close
   * enough to a vehicle's active route to warrant a safety pause.
   */
  private pointToRouteDistance(point: [number, number], geometry: [number, number][]): number {
    let min = Number.POSITIVE_INFINITY;
    for (const c of geometry) {
      const d = this.haversineKm(point, c);
      if (d < min) min = d;
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
