'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function IncidentsView() {
  const { incidents, verifyIncident, resolveIncident, assessIncidentImpact, selectIncident } = useAppStore();

  const handleCenterOnMap = (id: string) => {
    selectIncident(id);
    useAppStore.getState().setView('map');
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" /> Incident Management
        </h1>
        <div className="flex gap-2 text-sm text-slate-400">
          Active Incidents: {incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected').length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {incidents.map(incident => (
          <Card key={incident.id} className={`flex flex-col md:flex-row ${incident.status === 'Resolved' ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3 md:pb-6 border-b md:border-b-0 md:border-r border-slate-800/50 w-full md:w-64 shrink-0 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-base">{incident.type}</CardTitle>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                  incident.severity === 'Critical' || incident.severity === 'High' ? 'bg-red-500/10 text-red-400' :
                  incident.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {incident.severity}
                </span>
              </div>
              <span className="text-sm font-mono text-slate-400">{incident.id}</span>

              <div className="mt-4 inline-flex px-2 py-1 bg-slate-900 rounded text-xs font-bold border border-slate-800 self-start">
                {incident.status === 'Verified' && <CheckCircle className="w-3 h-3 text-blue-400 inline mr-1" />}
                {incident.status}
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 flex-1 flex flex-col justify-between gap-4">
              <div>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">{incident.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-400">
                  <div>
                    <span className="block text-[10px] uppercase mb-1">Location</span>
                    <span className="text-slate-200">{incident.location}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase mb-1">Reported</span>
                    <span className="text-slate-200 flex items-center gap-1"><Clock className="w-3 h-3" />{incident.timestamp}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase mb-1">Source</span>
                    <span className="text-slate-200">{incident.source}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase mb-1">Confidence</span>
                    <span className="text-slate-200">{(incident.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-800/30">
                {(incident.status === 'Reported' || incident.status === 'Under Review') && (
                  <button
                    onClick={() => verifyIncident(incident.id)}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium rounded transition-colors"
                  >
                    Mark Verified
                  </button>
                )}
                {incident.verificationStatus === 'VERIFIED' && incident.resolutionStatus === 'UNRESOLVED' && (
                  <button
                    onClick={() => assessIncidentImpact(incident.id)}
                    className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm font-medium rounded transition-colors"
                  >
                    Assess Route Impact
                  </button>
                )}
                {incident.verificationStatus === 'VERIFIED' && incident.resolutionStatus !== 'RESOLVED' && (
                  <button
                    onClick={() => resolveIncident(incident.id)}
                    className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-medium rounded transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
                <button
                  onClick={() => handleCenterOnMap(incident.id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors ml-auto"
                >
                  View on Map
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
