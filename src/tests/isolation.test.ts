import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { journeyService } from '@/services/journeyService';

describe('Shipment State Isolation (Phase 6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(journeyService, 'evaluateRouteTimeAware').mockReturnValue({
      baseTravelMinutes: 120,
      totalExpectedDelay: 0,
      maxRiskProb: 0.1,
      hasDirectBlockage: false,
    });
  });

  it('Shipment A route recommendations do not leak into Shipment B', async () => {
    const store = useAppStore.getState();
    const shipmentA = 'iso-shipment-a';
    const shipmentB = 'iso-shipment-b';

    store.createShipment({ id: shipmentA, origin: 'Guwahati Logistics Hub', destination: 'Shillong Supply Hub', cargoType: 'Food' });
    store.createShipment({ id: shipmentB, origin: 'Tezpur Base', destination: 'Imphal Medical Depot', cargoType: 'Fuel' });

    store.markCargoReady(shipmentA);
    
    // Wait for internal fire-and-forget
    await new Promise(resolve => setTimeout(resolve, 50));
    // Explicit wait to ensure completion for A
    await store.analyzeRoutesForReadyShipment(shipmentA);
    
    const stateAfterA = useAppStore.getState();
    const recsA = stateAfterA.routesByShipment[shipmentA] || [];
    const recsB = stateAfterA.routesByShipment[shipmentB] || [];

    expect(recsA.length).toBeGreaterThan(0);
    expect(recsB.length).toBe(0); // B should have no recommendations yet

    // Now make B ready
    store.markCargoReady(shipmentB);
    await new Promise(resolve => setTimeout(resolve, 50));
    await store.analyzeRoutesForReadyShipment(shipmentB);

    const stateAfterB = useAppStore.getState();
    const recsBafter = stateAfterB.routesByShipment[shipmentB] || [];
    const recsAafter = stateAfterB.routesByShipment[shipmentA] || [];

    expect(recsBafter.length).toBeGreaterThan(0);
    // Ensure A is unchanged
    expect(recsAafter.length).toBe(recsA.length);
  });

  it('Approving a route for Shipment A does not affect Shipment B', () => {
    const state = useAppStore.getState();
    const shipmentA = 'iso-shipment-a';
    const shipmentB = 'iso-shipment-b';

    const recsA = state.routesByShipment[shipmentA] || [];
    if (recsA.length === 0) return;

    state.approveInitialRoute(shipmentA, recsA[0].id);

    const updatedState = useAppStore.getState();
    const sA = updatedState.shipments.find(s => s.id === shipmentA);
    const sB = updatedState.shipments.find(s => s.id === shipmentB);

    expect(sA?.status).toBe('Ready');
    expect(sB?.status).toBe('Ready'); // Unchanged
  });

});
