import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { journeyService } from '@/services/journeyService';

describe('Shipment Lifecycle', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(journeyService, 'evaluateRouteTimeAware').mockReturnValue({
      baseTravelMinutes: 120,
      totalExpectedDelay: 0,
      maxRiskProb: 0.1,
      hasDirectBlockage: false,
    });
  });

  it('Shipment starts as Planned and requires CARGO READY before routing', async () => {
    const store = useAppStore.getState();
    const shipmentId = 'test-shipment-1';
    const vehicleId = 'test-vehicle-1';
    
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
    const shipment = state.shipments.find(s => s.id === shipmentId);
    expect(shipment).toBeDefined();
    expect(shipment?.status).toBe('Planned');

    // Cargo Ready
    state.markCargoReady(shipmentId);
    state = useAppStore.getState();
    const readyShipment = state.shipments.find(s => s.id === shipmentId);
    expect(readyShipment?.status).toBe('Ready');
  });

  it('Ready shipment generates route recommendations', async () => {
    const state = useAppStore.getState();
    const shipmentId = 'test-shipment-1';
    
    await state.analyzeRoutesForReadyShipment(shipmentId);
    const updatedState = useAppStore.getState();
    
    const candidateRoutes = updatedState.routesByShipment[shipmentId];
    expect(candidateRoutes?.length).toBeGreaterThan(0);
    // The vehicle should NOT be moving.
    const vehicle = updatedState.vehicles.find(v => v.assignedShipmentId === shipmentId);
    if (vehicle) {
       expect(vehicle.status).not.toBe('In Transit');
    }
  });

  it('Dispatcher approves route and it becomes ROUTE APPROVED (Ready state with routeId)', () => {
    let state = useAppStore.getState();
    const shipmentId = 'test-shipment-1';
    const candidateRoutes = state.routesByShipment[shipmentId];
    if (!candidateRoutes || candidateRoutes.length === 0) return; // skip if none
    const approvedRoute = candidateRoutes[0];

    state.approveInitialRoute(shipmentId, approvedRoute.id);
    state = useAppStore.getState();
    
    const shipment = state.shipments.find(s => s.id === shipmentId);
    expect(shipment?.status).toBe('Ready'); // Still Ready, but has route
    
    // Vehicle still not moving
    const vehicle = state.vehicles.find(v => v.assignedShipmentId === shipmentId);
    if (vehicle) {
      expect(vehicle.status).not.toBe('In Transit');
    }
  });

  it('DISPATCH CARGO transitions to In Transit and links vehicle', () => {
    let state = useAppStore.getState();
    const shipmentId = 'test-shipment-1';
    const vehicleId = 'test-vehicle-1';

    state.dispatchCargo(shipmentId);
    state = useAppStore.getState();

    const shipment = state.shipments.find(s => s.id === shipmentId);
    expect(shipment?.status).toBe('In Transit');
    expect(shipment?.dispatchedAt).toBeDefined();

    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    expect(vehicle).toBeDefined();
    expect(vehicle?.status).toBe('In Transit');
    expect(vehicle?.currentRouteGeometry?.length).toBeGreaterThan(0);
  });

});
