'use client';

import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Send, AlertTriangle, CloudOff, Cloud, CheckCircle, Clock, LogOut, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Incident } from '@/types';
import { LOCATION_COORDINATES } from '@/services/routeService';

const FIELD_LOCATIONS = [
  { name: 'NH-102 (Imphal Approach)', coords: [25.0, 93.9] as [number, number], corridor: 'C02' },
  { name: 'NH-27 (Guwahati East)', coords: [26.1, 91.8] as [number, number], corridor: 'C01' },
  { name: 'NH-6 (Guwahati-Shillong)', coords: [25.57, 91.89] as [number, number], corridor: 'C01' },
  { name: 'NH-2 (Nagaon-Kohima)', coords: [26.35, 92.68] as [number, number], corridor: 'C02' },
  { name: 'Silchar Bypass', coords: [24.8, 92.8] as [number, number], corridor: 'C03' },
  { name: 'Jiribam-Imphal Section', coords: [24.8, 93.1] as [number, number], corridor: 'C03' },
  { name: 'Kohima Hill Section', coords: [25.67, 94.10] as [number, number], corridor: 'C02' },
  { name: 'Dimapur Approach', coords: [25.57, 93.78] as [number, number], corridor: 'C02' },
  ...Object.keys(LOCATION_COORDINATES).map(name => ({
    name: `Near ${name}`,
    coords: LOCATION_COORDINATES[name] as [number, number],
    corridor: 'C01'
  })),
];

export function FieldView() {
  const { currentUserRole, networkOnline, setNetworkOnline, queueIncident, offlineQueue, incidents, setView, setCurrentUserRole } = useAppStore();

  const [form, setForm] = useState({
    type: 'Landslide' as Incident['type'],
    severity: 'High' as Incident['severity'],
    description: '',
  });

  const [selectedLocation, setSelectedLocation] = useState(FIELD_LOCATIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  useEffect(() => {
    if (currentUserRole !== 'Field Officer') {
      useAppStore.getState().setView('login');
    }
  }, [currentUserRole]);

  const handleLogout = () => {
    setCurrentUserRole('Dispatcher');
    setView('login');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const incidentData: Partial<Incident> = {
        type: form.type,
        severity: form.severity,
        description: form.description || `${form.type} observed near ${selectedLocation.name}`,
        location: selectedLocation.name,
        source: 'Field Officer',
        affectedCorridorId: selectedLocation.corridor,
        confidence: 0.95,
        coordinates: selectedLocation.coords,
      };

      queueIncident(incidentData);
      if (networkOnline) {
        import('@/services/syncService').then(({ syncService }) => syncService.processQueue());
      }

      setIsSubmitting(false);
      setSuccessMsg(networkOnline ? 'Report submitted. Synchronizing...' : 'Saved offline. Will sync when reconnected.');

      setForm({ ...form, description: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 600);
  };

  // Show reports submitted by this field officer
  const myReports = incidents.filter(i => i.source === 'Field Officer').slice(0, 10);

  if (currentUserRole !== 'Field Officer') return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans">
      {/* Mobile Header */}
      <header className={`px-4 py-3 sticky top-0 z-50 flex justify-between items-center ${networkOnline ? 'bg-slate-900 border-b border-slate-800' : 'bg-amber-950 border-b border-amber-900/50'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-100 leading-tight">Field Mode</h1>
            <span className="text-[10px] text-slate-400">ID: FO-8842</span>
          </div>
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
            title={networkOnline ? 'Online — click to go offline' : 'Offline — click to reconnect'}
          >
            {networkOnline ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 p-4 flex flex-col gap-6 max-w-2xl mx-auto w-full">

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
                  onChange={e => setForm({...form, type: e.target.value as Incident['type']})}
                >
                  <option>Landslide</option>
                  <option>Flood</option>
                  <option>Road Blockage</option>
                  <option>Bridge Damage</option>
                  <option>Heavy Rain</option>
                  <option>Traffic</option>
                  <option>Accident</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Severity</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  value={form.severity}
                  onChange={e => setForm({...form, severity: e.target.value as Incident['severity']})}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>

            {/* GPS Location (Simulated) */}
            <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3">
              <div className="flex items-start gap-3 mb-2">
                <MapPin className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-slate-400 block mb-1">Current GPS Location</span>
                  <button
                    type="button"
                    onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    className="w-full flex items-center justify-between text-sm font-medium text-slate-200 hover:text-blue-400 transition-colors"
                  >
                    <span>{selectedLocation.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              {showLocationDropdown && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-lg">
                  {FIELD_LOCATIONS.map((loc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setShowLocationDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition-colors ${selectedLocation.name === loc.name ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'}`}
                    >
                      {loc.name}
                      <span className="text-slate-500 ml-2">({loc.coords[0].toFixed(2)}, {loc.coords[1].toFixed(2)})</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                GPS: {selectedLocation.coords[0].toFixed(4)}, {selectedLocation.coords[1].toFixed(4)}
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

        {/* My Submitted Reports */}
        {myReports.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              My Submitted Reports ({myReports.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {myReports.map(incident => (
                <div key={incident.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-slate-200">{incident.type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      incident.status === 'Verified' ? 'bg-blue-500/20 text-blue-400' :
                      incident.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                      incident.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{incident.location}</div>
                  <div className="text-[10px] text-slate-600 mt-1">{incident.id} · {incident.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Queue Preview */}
        {!networkOnline && offlineQueue.length > 0 && (
          <div>
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
