'use client';

import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Send, AlertTriangle, CloudOff, Cloud, CheckCircle, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Incident } from '@/types';

export function FieldView() {
  const { currentUserRole, networkOnline, setNetworkOnline, queueIncident, offlineQueue } = useAppStore();

  const [form, setForm] = useState({
    type: 'Landslide',
    severity: 'High',
    description: '',
  });

  const [simulatedLocation, setSimulatedLocation] = useState('NH-102 (Imphal Approach)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (currentUserRole !== 'Field Officer') {
      useAppStore.getState().setView('login');
    }
  }, [currentUserRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate slight delay for GPS/Camera processing
    setTimeout(() => {
      // Determine corridor ID based on simulated location (for prototype)
      const corridorId = simulatedLocation.includes('NH-102') ? 'C02' : 'C01';

      const incidentData: Partial<Incident> = {
        type: form.type as any,
        severity: form.severity as any,
        description: form.description,
        location: simulatedLocation,
        source: 'Field Officer',
        affectedCorridorId: corridorId,
        confidence: 0.95,
        coordinates: simulatedLocation.includes('NH-102') ? [25.0, 93.9] :
          simulatedLocation.includes('NH-27') ? [26.1, 91.8] : [24.8, 92.8]
      };

      queueIncident(incidentData);
      if (networkOnline) {
        import('@/services/syncService').then(({ syncService }) => syncService.processQueue());
      }

      setIsSubmitting(false);
      setSuccessMsg(networkOnline ? 'Report submitted. Synchronizing...' : 'Saved offline. Will sync when reconnected.');

      // Reset form
      setForm({ ...form, description: '' });

      setTimeout(() => setSuccessMsg(''), 3000);
    }, 600);
  };

  if (currentUserRole !== 'Field Officer') return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans">
      {/* Mobile Header */}
      <header className={`px-4 py-3 sticky top-0 z-50 flex justify-between items-center ${networkOnline ? 'bg-slate-900 border-b border-slate-800' : 'bg-amber-950 border-b border-amber-900/50'}`}>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-100 leading-tight">Field Mode</h1>
          <span className="text-[10px] text-slate-400">ID: FO-8842</span>
        </div>

        <div className="flex items-center gap-3">
          {offlineQueue.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-full text-[10px] font-bold text-slate-300">
              <CloudOff className="w-3 h-3 text-amber-500" />
              <span>{offlineQueue.length} Pending</span>
            </div>
          )}

          <button
            onClick={() => setNetworkOnline(!networkOnline)}
            className={`p-2 rounded-full transition-colors ${networkOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
          >
            {networkOnline ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 p-4 flex flex-col gap-6">

        {successMsg && (
          <div className="bg-emerald-950/50 border border-emerald-900/50 p-3 rounded-xl flex items-center gap-3 text-emerald-400 text-sm font-medium animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-5 h-5" />
            {successMsg}
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Report New Incident
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Type & Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Type</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  value={form.type}
                  onChange={e => setForm({...form, type: e.target.value})}
                >
                  <option>Landslide</option>
                  <option>Flood</option>
                  <option>Road Blockage</option>
                  <option>Bridge Damage</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Severity</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  value={form.severity}
                  onChange={e => setForm({...form, severity: e.target.value})}
                >
                  <option className="text-slate-200">Low</option>
                  <option className="text-amber-400">Medium</option>
                  <option className="text-orange-400">High</option>
                  <option className="text-red-500">Critical</option>
                </select>
              </div>
            </div>

            {/* GPS Location (Simulated) */}
            <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs text-slate-400 block mb-1">Current GPS Location</span>
                <select
                  className="w-full bg-transparent border-none text-sm font-medium text-slate-200 p-0 focus:ring-0"
                  value={simulatedLocation}
                  onChange={e => setSimulatedLocation(e.target.value)}
                >
                  <option>NH-102 (Imphal Approach)</option>
                  <option>NH-27 (Guwahati East)</option>
                  <option>Silchar Bypass</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Description (Optional)</label>
              <textarea
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 h-24 resize-none"
                placeholder="Add visual details..."
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>

            {/* Photo Evidence */}
            <button type="button" className="w-full py-3 border border-dashed border-slate-700 rounded-lg flex items-center justify-center gap-2 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-colors">
              <Camera className="w-5 h-5" /> Attach Photo Evidence
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-lg font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isSubmitting ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-900/50'
              }`}
            >
              {isSubmitting ? <span className="animate-pulse">Processing...</span> : (
                <>
                  <Send className="w-4 h-4" />
                  {networkOnline ? 'Submit Report' : 'Save Offline'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Offline Queue Preview */}
        {!networkOnline && offlineQueue.length > 0 && (
          <div className="mt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Offline Queue</h3>
            <div className="space-y-2">
              {offlineQueue.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-slate-200">{item.incidentData.type}</span>
                    <span className="text-xs text-slate-500 block">{item.incidentData.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
