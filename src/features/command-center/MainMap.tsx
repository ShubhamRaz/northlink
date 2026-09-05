'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RefreshCw, Layers } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { MapLayer } from '@/types';

const Map = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-sm">Initializing Map Data...</span>
        </div>
      </div>
    )
  }
);

export function MainMap() {
  const { activeMapLayers, toggleMapLayer, simulationActive, updateVehicle, vehicles, corridors, addEvent } = useAppStore();

  const allLayers: MapLayer[] = ['Corridors', 'Vehicles', 'Incidents', 'Deliveries'];

  // Note: Simulation logic has been moved entirely to simulationService.ts

  return (
    <Card className="col-span-1 lg:col-span-3 flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-800/50 flex flex-row items-center justify-between shrink-0">
        <CardTitle className="text-sm">Northeast Operational Map</CardTitle>
        <div className="flex gap-4 items-center">
          <div className="hidden md:flex gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> OPEN
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> CAUTION
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-red-500" /> BLOCKED
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
              {allLayers.map(layer => (
                <button 
                  key={layer}
                  onClick={() => toggleMapLayer(layer)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    activeMapLayers.includes(layer) ? 'bg-blue-600/30 text-blue-300' : 'text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col" style={{ minHeight: '540px' }}>
        <Map />
      </CardContent>
    </Card>
  );
}
