'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { Truck, MapPin, Navigation, Clock } from 'lucide-react';

export function VehiclesView() {
  const { vehicles, selectVehicle } = useAppStore();

  const handleCenterOnMap = (id: string) => {
    selectVehicle(id);
    useAppStore.getState().setView('map');
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-400" /> Fleet Management
        </h1>
        {/* Filters placeholder */}
        <div className="flex gap-2 text-sm text-slate-400">
          Total Vehicles: {vehicles.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(vehicle => (
          <Card key={vehicle.id} className="flex flex-col hover:border-slate-700 transition-colors">
            <CardHeader className="pb-3 border-b border-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-blue-100">{vehicle.id}</CardTitle>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                vehicle.status === 'In Transit' ? 'bg-emerald-500/10 text-emerald-400' :
                vehicle.status === 'Delayed' ? 'bg-red-500/10 text-red-400' :
                'bg-slate-500/10 text-slate-400'
              }`}>
                {vehicle.status}
              </span>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col gap-3">

              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Truck className="w-4 h-4 text-slate-500" />
                <span className="font-medium">Cargo:</span> {vehicle.cargoType}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Navigation className="w-4 h-4 text-slate-500" />
                <span className="font-medium">Route:</span> {vehicle.currentRouteId || 'None'}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="font-medium">ETA:</span> {vehicle.eta}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-slate-900/50 rounded border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Speed</span>
                  <p className="text-sm font-mono text-slate-200">{vehicle.speed} km/h</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Heading</span>
                  <p className="text-sm font-mono text-slate-200">{vehicle.heading}°</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-auto pt-4">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Origin</span>
                  <span>Destination</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${(vehicle.progress || 0) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleCenterOnMap(vehicle.id)}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 text-slate-300"
              >
                <MapPin className="w-4 h-4" /> Center on Map
              </button>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
