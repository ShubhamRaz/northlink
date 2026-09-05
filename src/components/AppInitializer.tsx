'use client';

import { useEffect } from 'react';
import { simulationService } from '@/services/simulationService';
import { useAppStore } from '@/store/useAppStore';

export function AppInitializer() {
  useEffect(() => {
    try {
      const localShipments = window.localStorage.getItem('northlink:shipments');
      if (localShipments) {
        const parsed = JSON.parse(localShipments);
        if (Array.isArray(parsed)) useAppStore.getState().hydrateShipments(parsed);
      }
    } catch {
      // Continue with mock/server data when local prototype storage is unavailable.
    }

    try {
      const localQueue = window.localStorage.getItem('northlink:offline-queue');
      if (localQueue) {
        const parsed = JSON.parse(localQueue);
        if (Array.isArray(parsed)) useAppStore.getState().setOfflineQueue(parsed);
      }
    } catch {
      // Continue with an empty queue when local prototype storage is unavailable.
    }

    fetch('/api/shipments')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Shipment load failed')))
      .then(shipments => {
        if (Array.isArray(shipments)) {
          useAppStore.getState().hydrateShipments(shipments);
        }
      })
      .catch(() => {
        useAppStore.setState({
          shipmentsHydrated: true,
          shipmentPersistenceError: 'Shipment persistence is unavailable; using local prototype data.'
        });
      });

    // Simulation should only start when a shipment is explicitly Dispatched.
    // simulationService.start() is now handled by the dispatchCargo action.

    return () => {
      simulationService.pause();
    };
  }, []);

  return null;
}
