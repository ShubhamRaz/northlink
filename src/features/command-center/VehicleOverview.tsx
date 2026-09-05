import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Truck, Navigation } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function VehicleOverview() {
  const { vehicles, selectVehicle } = useAppStore();

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Active Vehicles Overview</CardTitle>
          <button
            onClick={() => useAppStore.getState().setView('vehicles')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All →
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-slate-900/50 border-b border-slate-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle ID</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => selectVehicle(vehicle.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-200">{vehicle.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{vehicle.cargoType}</td>
                  <td className="px-4 py-3 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3 h-3" />
                      {vehicle.currentRouteId || 'No Route'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      vehicle.status === 'In Transit' ? 'bg-emerald-500/10 text-emerald-400' :
                      vehicle.status === 'Route Change Pending' ? 'bg-orange-500/10 text-orange-400' :
                      vehicle.status === 'Paused for Safety' ? 'bg-red-500/10 text-red-400' :
                      vehicle.status === 'Delivered' ? 'bg-blue-500/10 text-blue-400' :
                      vehicle.status === 'Delayed' ? 'bg-red-500/10 text-red-400' :
                      vehicle.status === 'Ready' ? 'bg-cyan-500/10 text-cyan-400' :
                      vehicle.status === 'Loading' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{vehicle.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
