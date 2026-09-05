import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Network, CloudRain, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function OperationalStatus() {
  const { networkOnline, simulationMode, alerts, currentUserRole } = useAppStore();
  const activeAlerts = alerts.filter(alert =>
    !alert.read && (!alert.recipientRole || alert.recipientRole === currentUserRole)
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-slate-800/50">
        <CardTitle className="text-sm">Operational Status</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Network className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Network</span>
          </div>
          <span className={`text-xs font-semibold ${networkOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {networkOnline ? 'Stable' : 'Offline'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <CloudRain className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Environment</span>
          </div>
          <span className={`text-xs font-semibold ${simulationMode !== 'NORMAL' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {simulationMode === 'NORMAL' ? 'Clear' : simulationMode}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Critical Alerts</span>
          </div>
          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{activeAlerts}</span>
        </div>
      </CardContent>
    </Card>
  );
}
