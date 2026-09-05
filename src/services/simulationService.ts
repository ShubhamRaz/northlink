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

      const routeDuration = state.journeyAnalysis?.shipmentId === shipment.id
        ? Math.max(state.journeyAnalysis.outlook.currentTravelMinutes, 1)
        : 240;
      const currentProgressMinutes = vehicle.progressMinutes ?? (vehicle.progress ?? 0) * routeDuration;
      const newProgress = Math.min(currentProgressMinutes + simulatedMinutesElapsed, routeDuration);
      let newCoords = vehicle.coordinates;
      let currentSpeed = vehicle.speed;

      // Check if we have journey analysis for this specific shipment
      const isSelectedAnalysis = state.journeyAnalysis?.shipmentId === shipment.id;

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
      } else if (vehicle.currentRouteId && ROUTE_COORDS[vehicle.currentRouteId]) {
        // Simple interpolation using ROUTE_COORDS fallback
        const geom = ROUTE_COORDS[vehicle.currentRouteId];
        // Assuming a standard route takes 240 simulation minutes (4 hours) for this fallback
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

    // Refresh journey analysis every 5 minutes for the currently selected shipment
    const selectedActive = activeShipments.find(s => s.id === state.selectedShipmentId);
    if (selectedActive) {
      const v = state.vehicles.find(v => v.id === selectedActive.assignedVehicleId);
      if (v && Math.floor(v.progressMinutes || 0) % 5 === 0) {
        state.refreshJourneyAnalysis();
      }
    }
  }

  triggerRandomEvent() {}
}

export const simulationService = new SimulationEngine();
