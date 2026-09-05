'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { Package, Truck, Clock, MapPin } from 'lucide-react';

export function ShipmentsView() {
  const shipments = useAppStore(state => state.shipments);

  const statuses = ['Planned', 'Ready', 'In Transit', 'Route Change Pending', 'Paused for Safety', 'Delayed', 'Delivered'];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-400" /> Shipment Tracking
        </h1>
        <div className="flex gap-2 text-sm text-slate-400">
          Total Shipments: {shipments.length}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[500px]">
        {statuses.map(status => (
          <div key={status} className="flex-1 min-w-[280px] flex flex-col gap-3">
            <div className="bg-slate-900/80 px-3 py-2 rounded border border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-300">{status}</h3>
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">
                {shipments.filter(s => s.status === status).length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {shipments.filter(s => s.status === status).map(shipment => (
                <Card key={shipment.id} className="cursor-pointer hover:border-slate-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-200">{shipment.id}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        shipment.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                        shipment.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {shipment.priority}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mb-3 font-medium">
                      {shipment.cargoType}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full border border-slate-500" />
                        <span className="truncate">{shipment.origin}</span>
                      </div>
                      <div className="pl-1 border-l border-slate-700 h-2 ml-1" />
                      <div className="flex items-center gap-2">
                        <MapPin className="w-2.5 h-2.5 text-blue-400" />
                        <span className="truncate text-slate-300">{shipment.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/50 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        {shipment.assignedVehicleId || 'Unassigned'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {shipment.eta}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
