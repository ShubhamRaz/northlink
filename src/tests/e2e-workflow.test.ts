import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { journeyService } from '@/services/journeyService';

describe('Full End-to-End Deterministic Workflow', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(journeyService, 'evaluateRouteTimeAware').mockReturnValue({
      baseTravelMinutes: 120,
      totalExpectedDelay: 0,
      maxRiskProb: 0.1,
      hasDirectBlockage: false,
    });
  });

  it('Executes the full shipment lifecycle deterministically', async () => {
    // 1. CREATE SHIPMENT
    const store = useAppStore.getState();
    const shipmentId = 'e2e-shipment-final';
    const vehicleId = 'e2e-vehicle';
    
    // Create a vehicle for this test
    store.addVehicle({
      id: vehicleId,
      driver: 'Test Driver',
      cargoType: 'Medical Supplies',
      location: 'Guwahati Logistics Hub',
      speed: 0,
      heading: 0,
      status: 'Available',
      eta: '--',
      lastUpdated: new Date().toISOString(),
      coordinates: [26.1445, 91.7362]
    });

    store.createShipment({
      id: shipmentId,
      origin: 'Guwahati Logistics Hub',
      destination: 'Shillong Supply Hub',
      cargoType: 'Medical Supplies',
      priority: 'High',
      assignedVehicleId: vehicleId
    });

    let state = useAppStore.getState();
    let shipment = state.shipments.find(s => s.id === shipmentId);
    
    // 2. PLANNED
    expect(shipment?.status).toBe('Planned');

    // 3. CARGO READY
    state.markCargoReady(shipmentId);
    state = useAppStore.getState();
    shipment = state.shipments.find(s => s.id === shipmentId);
    expect(shipment?.status).toBe('Ready');

    // 4. ROUTE ANALYSIS
    await state.analyzeRoutesForReadyShipment(shipmentId);
    state = useAppStore.getState();
    const candidateRoutes = state.routesByShipment[shipmentId];
    expect(candidateRoutes?.length).toBeGreaterThan(0);
    const recommendedRouteId = candidateRoutes[0].id;

    // 5. DISPATCHER APPROVES ROUTE
    state.approveInitialRoute(shipmentId, recommendedRouteId);
    state = useAppStore.getState();
    shipment = state.shipments.find(s => s.id === shipmentId);
    expect(shipment?.status).toBe('Ready');
    expect(shipment?.routeId).toBe(recommendedRouteId); 

    // 6. DISPATCH CARGO
    state.dispatchCargo(shipmentId);
    state = useAppStore.getState();
    shipment = state.shipments.find(s => s.id === shipmentId);
    expect(shipment?.status).toBe('In Transit');

    // 7. VEHICLE STARTS
    let vehicle = state.vehicles.find(v => v.id === vehicleId);
    expect(vehicle).toBeDefined();
    expect(vehicle?.status).toBe('In Transit');
    expect(vehicle?.currentRouteGeometry?.length).toBeGreaterThan(0);

    const vehiclePosBefore = vehicle?.coordinates;
    await state.analyzeRoutesForReadyShipment(shipmentId); // Acts as reassess
    
    state = useAppStore.getState();
    vehicle = state.vehicles.find(v => v.id === vehicleId);
    expect(vehicle?.coordinates).toEqual(vehiclePosBefore);
  });

});
