'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { Package, MapPin, Navigation, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ManualDispatchForm() {
  const router = useRouter();
  const { createShipment } = useAppStore();
  const [formData, setFormData] = useState({
    id: 'MED-505',
    cargoType: 'Essential Medicines',
    origin: 'Guwahati Logistics Hub',
    destination: 'Imphal Medical Depot',
    priority: 'Critical',
    startTime: '08:00'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShipment({ ...formData, priority: formData.priority as any, status: 'Planned' });
    // Creation ends at Planned; Cargo Ready is an explicit next step.
    router.push('/optimizer');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-blue-500/30">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            New Logistics Dispatch
          </CardTitle>
          <p className="text-sm text-slate-400 mt-1">
            Enter cargo details to initialize intelligence routing.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shipment ID</label>
                <input 
                  type="text" 
                  value={formData.id}
                  onChange={e => setFormData({...formData, id: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cargo Type</label>
                <select 
                  value={formData.cargoType}
                  onChange={e => setFormData({...formData, cargoType: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                >
                  <option>Essential Medicines</option>
                  <option>Food Supplies</option>
                  <option>Construction Material</option>
                  <option>Relief Cargo</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Origin
              </label>
              <select 
                value={formData.origin}
                onChange={e => setFormData({...formData, origin: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option>Guwahati Logistics Hub</option>
                <option>Silchar Hub</option>
                <option>Tezpur Base</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Destination
              </label>
              <select 
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option>Imphal Medical Depot</option>
                <option>Aizawl Center</option>
                <option>Kohima Station</option>
                <option>Shillong Supply</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Priority
                </label>
                <select 
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Standard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Start Timing
                </label>
                <input 
                  type="time" 
                  value={formData.startTime}
                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                CARGO READY - FORECAST ROUTES
              </button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
