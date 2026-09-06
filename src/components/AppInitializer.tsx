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
      const localVehicles = window.localStorage.getItem('northlink:vehicles');
      if (localVehicles) {
        const parsed = JSON.parse(localVehicles);
        if (parsed && Array.isArray(parsed.vehicles)) {
          // Backward compatibility for old storage format
          const routesByShipment = parsed.routesByShipment || (Array.isArray(parsed.activeRoutes) ? { 'MED-204': parsed.activeRoutes } : {});
          useAppStore.getState().hydrateVehicles(parsed.vehicles, routesByShipment, parsed.routeRecommendations);
        }
      }
    } catch {
      // Continue with mock data when local prototype storage is unavailable.
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
      })
      .finally(() => {
        // Simulation must be manually resumed after a reload if needed, 
        // per Phase 7 requirements (no auto-start on app load).
      });

    return () => {
      simulationService.pause();
    };
  }, []);

  return null;
}
