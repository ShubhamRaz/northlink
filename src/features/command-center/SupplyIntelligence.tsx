import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Warehouse, Package, Truck, AlertOctagon, ArrowDownRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function SupplyIntelligence() {
  const { shipments, vehicles } = useAppStore();

  // For the demo, focus on Imphal Medical Depot
  const incomingShipment = shipments.find(s => s.destination.includes('Imphal') && s.status !== 'Delivered');
  const incomingVehicle = incomingShipment?.assignedVehicleId ? vehicles.find(v => v.id === incomingShipment.assignedVehicleId) : null;

  return (
    <Card className="bg-slate-900 border-slate-800 h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none" />
      
      <div className="p-3 border-b border-slate-800/50 flex items-center justify-between z-10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-blue-400" /> Supply Intelligence
        </h3>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col justify-between z-10">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Imphal Medical Depot</h4>
              <span className="text-[10px] text-slate-500">Essential Medicines</span>
            </div>
            <div className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-500/30 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" /> CRITICAL
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Current Stock</span>
              <span className="text-red-400 font-bold">32%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 w-[32%]" />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
              <ArrowDownRight className="w-3 h-3 text-red-500" /> Expected to deplete in 4h
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-bold">Incoming Resupply</span>
          {incomingShipment ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-medium text-slate-200">{incomingShipment.id}</span>
                </div>
                <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-900">
                  {incomingVehicle?.status || incomingShipment.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-400">{incomingVehicle?.id || 'Unassigned'}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-200">
                  ETA: {incomingVehicle?.eta || incomingShipment.eta || 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-2">No incoming shipments</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
