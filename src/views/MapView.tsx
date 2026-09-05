'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { RefreshCw, Map as MapIcon, X } from 'lucide-react';
import { EventFeed } from '@/components/ui/EventFeed';

const Map = dynamic(
  () => import('@/features/command-center/MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-sm">Initializing Live Map...</span>
        </div>
      </div>
    )
  }
);

export function MapView() {
  const {
    selectedVehicleId, selectedIncidentId, selectedCorridorId,
    vehicles, incidents, corridors, clearSelections
  } = useAppStore();

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);
  const selectedCorridor = corridors.find(c => c.id === selectedCorridorId);

  const hasSelection = selectedVehicle || selectedIncident || selectedCorridor;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      {/* Top Controls / Filters Placeholder */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-blue-400" /> Live Map
        </h1>
        <div className="flex gap-2">
          {/* We reuse the layer toggles from the MainMap or keep it simple here */}
          <span className="text-sm text-slate-500">Map layers can be toggled inside the main Command Center or via global store.</span>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Map Area */}
        <Card className="flex-1 overflow-hidden relative">
          <Map />
        </Card>

        {/* Right Side Panel for Selections */}
        {hasSelection && (
          <Card className="w-80 shrink-0 flex flex-col h-full overflow-hidden border-blue-900/50">
            <CardHeader className="pb-3 border-b border-slate-800/50 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm text-blue-100">Selection Details</CardTitle>
              <button onClick={clearSelections} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">

              {selectedVehicle && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{selectedVehicle.id}</h3>
                    <p className="text-xs text-slate-400">Driver: {selectedVehicle.driver}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-400">Cargo:</span> {selectedVehicle.cargoType}</p>
                    <p><span className="text-slate-400">Status:</span> {selectedVehicle.status}</p>
                    <p><span className="text-slate-400">Speed:</span> {selectedVehicle.speed} km/h</p>
                    <p><span className="text-slate-400">ETA:</span> {selectedVehicle.eta}</p>
                    <p><span className="text-slate-400">Route:</span> {selectedVehicle.currentRouteId || 'N/A'}</p>
                  </div>
                </div>
              )}

              {selectedIncident && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-red-400">{selectedIncident.type}</h3>
                    <p className="text-xs text-slate-400">{selectedIncident.id}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-400">Severity:</span> <span className="text-red-400 font-bold">{selectedIncident.severity}</span></p>
                    <p><span className="text-slate-400">Status:</span> {selectedIncident.status}</p>
                    <p><span className="text-slate-400">Location:</span> {selectedIncident.location}</p>
                    <p><span className="text-slate-400">Reported:</span> {selectedIncident.timestamp}</p>
                    <p className="text-slate-300 bg-slate-800/50 p-2 rounded mt-2 text-xs">{selectedIncident.description}</p>
                    <p><span className="text-slate-400">Source:</span> {selectedIncident.source}</p>
                    <p><span className="text-slate-400">Confidence:</span> {(selectedIncident.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>
              )}

              {selectedCorridor && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{selectedCorridor.name}</h3>
                    <p className="text-xs text-slate-400">{selectedCorridor.id}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-400">Status:</span> {selectedCorridor.status}</p>
                    <p><span className="text-slate-400">Accessibility:</span> {selectedCorridor.accessibility}</p>
                    <p><span className="text-slate-400">Risk Level:</span> {selectedCorridor.risk}%</p>
                    <p><span className="text-slate-400">Source:</span> {selectedCorridor.source}</p>
                    <p><span className="text-slate-400">Last Updated:</span> {selectedCorridor.lastUpdated}</p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Event Feed */}
      <div className="h-48 shrink-0">
        <EventFeed />
      </div>
    </div>
  );
}
