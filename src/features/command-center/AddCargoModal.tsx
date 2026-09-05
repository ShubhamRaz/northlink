'use client';

import React, { useState } from 'react';
import { X, Package, MapPin, Navigation, Clock, ShieldAlert, RefreshCw, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Shipment, ShipmentScheduleType } from '@/types';
import { useRouter } from 'next/navigation';

interface AddCargoModalProps {
  onClose: () => void;
}

const ORIGINS = [
  'Guwahati Logistics Hub',
  'Silchar Hub',
  'Tezpur Base',
  'Shillong Supply Hub',
  'Imphal Medical Depot',
];

const DESTINATIONS = [
  'Imphal Medical Depot',
  'Aizawl Distribution Center',
  'Kohima Station',
  'Shillong Supply Hub',
  'Silchar Hub',
  'Tezpur Base',
  'Dimapur Central',
];

const CARGO_TYPES = [
  'Essential Medicines',
  'Food & Rations',
  'Agricultural Supplies',
  'Relief Cargo',
  'Construction Material',
  'Fuel & Energy',
  'Medical Equipment',
];

const SCHEDULE_OPTIONS = [
  'Every Monday',
  'Every Wednesday',
  'Every Friday',
  'Monday & Thursday',
  'Weekly (Friday)',
  'Bi-Weekly',
  'Monthly',
];

const VEHICLES = [
  { id: 'TRUCK-07', label: 'TRUCK-07 — Rajesh Kumar' },
  { id: 'TRUCK-12', label: 'TRUCK-12 — Amit Singh' },
  { id: 'TRUCK-21', label: 'TRUCK-21 — Priya Devi' },
  { id: 'TRUCK-33', label: 'TRUCK-33 — Sanjoy Bora' },
];

export function AddCargoModal({ onClose }: AddCargoModalProps) {
  const { createShipment } = useAppStore();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [scheduleType, setScheduleType] = useState<ShipmentScheduleType>('one-time');
  const [form, setForm] = useState({
    id: `SHIP-${Date.now().toString().slice(-4)}`,
    cargoType: 'Essential Medicines',
    origin: 'Guwahati Logistics Hub',
    destination: 'Imphal Medical Depot',
    priority: 'High' as 'Critical' | 'High' | 'Normal' | 'Low',
    scheduledDate: '',
    scheduledTime: '08:00',
    assignedVehicleId: 'TRUCK-07',
    schedule: 'Every Monday',
    notes: '',
  });

  const handleCreate = () => {
    createShipment({
      ...form,
      scheduleType,
      schedule: scheduleType === 'scheduled' ? form.schedule : undefined,
      scheduledDate: form.scheduledDate || undefined,
      scheduledTime: form.scheduledTime || undefined,
    });
    onClose();
    router.push('/optimizer');
  };

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/50 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">Add Cargo</h2>
              <p className="text-xs text-slate-500">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="h-0.5 bg-slate-800">
          <div className={`h-full bg-blue-500 transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              {/* Schedule Type Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Dispatch Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['one-time', 'scheduled'] as ShipmentScheduleType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setScheduleType(type)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                        scheduleType === type
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {type === 'one-time' ? <RefreshCw className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      {type === 'one-time' ? 'One-Time' : 'Scheduled (Recurring)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cargo Type */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Cargo Type</label>
                <select value={form.cargoType} onChange={e => upd('cargoType', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  {CARGO_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Origin */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" /> Origin
                </label>
                <select value={form.origin} onChange={e => upd('origin', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  {ORIGINS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Destination */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-red-400" /> Destination
                </label>
                <select value={form.destination} onChange={e => upd('destination', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Critical', 'High', 'Normal', 'Low'].map(p => (
                    <button key={p} onClick={() => upd('priority', p)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        form.priority === p
                          ? p === 'Critical' ? 'bg-red-600 border-red-500 text-white'
                          : p === 'High' ? 'bg-orange-600 border-orange-500 text-white'
                          : p === 'Normal' ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-600 border-slate-500 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Start Time
                  </label>
                  <input type="time" value={form.scheduledTime} onChange={e => upd('scheduledTime', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Scheduled Date (Optional)</label>
                  <input type="date" value={form.scheduledDate} onChange={e => upd('scheduledDate', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Shipment ID</label>
                  <input type="text" value={form.id} onChange={e => upd('id', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none font-mono" />
                </div>
              </div>

              {/* Schedule (only for recurring) */}
              {scheduleType === 'scheduled' && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-400" /> Recurring Schedule
                  </label>
                  <select value={form.schedule} onChange={e => upd('schedule', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                    {SCHEDULE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Vehicle Assignment */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Assign Vehicle</label>
                <select value={form.assignedVehicleId} onChange={e => upd('assignedVehicleId', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2}
                  placeholder="Any special instructions or cargo details..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
              Back
            </button>
          )}
          {step === 1 ? (
            <button onClick={() => setStep(2)}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors">
              Next: Schedule & Priority →
            </button>
          ) : (
            <button onClick={handleCreate}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Package className="w-4 h-4" />
              Cargo Ready — Forecast Routes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
