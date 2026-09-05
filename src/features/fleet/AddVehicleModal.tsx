'use client';

import React, { useState } from 'react';
import { X, Truck, User, MapPin, Package } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Vehicle } from '@/types';
import { LOCATION_COORDINATES } from '@/services/routeService';

interface AddVehicleModalProps {
  onClose: () => void;
}

const CARGO_TYPES = [
  'Essential Medicines',
  'Food & Rations',
  'Agricultural Supplies',
  'Relief Cargo',
  'Construction Material',
  'Fuel & Energy',
  'Medical Equipment',
];

export function AddVehicleModal({ onClose }: AddVehicleModalProps) {
  const { addVehicle, vehicles } = useAppStore();
  const [form, setForm] = useState({
    id: `TRUCK-${String(Date.now()).slice(-2)}`,
    driver: '',
    cargoType: 'Essential Medicines',
    location: 'Guwahati Logistics Hub',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driver.trim()) {
      setError('Driver name is required');
      return;
    }
    if (vehicles.some(v => v.id === form.id)) {
      setError('Vehicle ID already exists. Use a different ID.');
      return;
    }

    const coords = LOCATION_COORDINATES[form.location] || [26.1445, 91.7362];

    const newVehicle: Vehicle = {
      id: form.id,
      driver: form.driver,
      cargoType: form.cargoType,
      location: form.location,
      speed: 0,
      heading: 0,
      status: 'Available',
      eta: '--',
      lastUpdated: new Date().toISOString(),
      coordinates: coords,
      progress: 0,
      progressMinutes: 0,
    };

    addVehicle(newVehicle);
    onClose();
  };

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/50 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">Add Vehicle</h2>
              <p className="text-xs text-slate-500">Register a new vehicle in the fleet</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Vehicle ID */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Vehicle ID</label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={form.id}
                onChange={e => upd('id', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          {/* Driver Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Driver Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={form.driver}
                onChange={e => upd('driver', e.target.value)}
                placeholder="Enter driver name..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Cargo Type */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Cargo Type</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={form.cargoType}
                onChange={e => upd('cargoType', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none appearance-none"
              >
                {CARGO_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Home Location */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Home Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={form.location}
                onChange={e => upd('location', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none appearance-none"
              >
                {Object.keys(LOCATION_COORDINATES).map(loc => <option key={loc}>{loc}</option>)}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Add Vehicle to Fleet
          </button>
        </form>
      </div>
    </div>
  );
}
