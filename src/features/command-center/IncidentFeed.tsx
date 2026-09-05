import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function IncidentFeed() {
  const { incidents, verifyIncident, resolveIncident, selectIncident } = useAppStore();

  const activeIncidents = incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected');

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-slate-800/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Live Incidents</CardTitle>
        <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-800/50 max-h-[300px] overflow-y-auto">
          {activeIncidents.length === 0 ? (
             <li className="p-4 text-center text-xs text-slate-500 italic">No active incidents</li>
          ) : activeIncidents.map((incident) => (
            <li key={incident.id} className="p-4 hover:bg-slate-800/30 transition-colors group" onClick={() => selectIncident(incident.id)}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    incident.severity === 'High' || incident.severity === 'Critical' ? 'text-red-400' : 'text-amber-400'
                  }`} />
                  <span className="text-xs font-bold text-slate-200">{incident.type}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  incident.severity === 'High' || incident.severity === 'Critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {incident.severity}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 mt-2">
                <MapPin className="w-3 h-3" />
                {incident.location}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                {incident.timestamp}
              </div>
              <div className="flex gap-2 mt-3">
                {incident.verificationStatus !== 'VERIFIED' && incident.verificationStatus !== 'REJECTED' && (
                  <button onClick={(event) => { event.stopPropagation(); verifyIncident(incident.id); }} className="text-[10px] px-2 py-1 rounded bg-blue-600/20 text-blue-400">
                    Verify
                  </button>
                )}
                {incident.verificationStatus === 'VERIFIED' && incident.resolutionStatus === 'UNRESOLVED' && (
                  <button onClick={(event) => { event.stopPropagation(); resolveIncident(incident.id); }} className="text-[10px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-400">
                    Resolve
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
