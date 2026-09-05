import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Package, AlertTriangle, Route, Activity, Truck, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function KPICards() {
  const { shipments, corridors, incidents, vehicles, districts } = useAppStore();

  const activeDeliveries = shipments.filter(s => s.status === 'In Transit').length;
  const criticalShipments = shipments.filter(s => s.priority === 'Critical').length;
  const highRiskCorridors = corridors.filter(c => c.risk > 50 || c.accessibility === 'BLOCKED' || c.accessibility === 'RESTRICTED').length;
  const activeIncidents = incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected').length;
  const vehiclesEnRoute = vehicles.filter(v => v.status === 'In Transit').length;
  const districtsAlert = districts.filter(d => d.connectivity !== 'OPEN').length;

  const kpis = [
    { label: 'Active Deliveries', value: activeDeliveries.toString(), icon: Package, trend: 'Live Tracking', status: 'normal' },
    { label: 'Critical Shipments', value: criticalShipments.toString(), icon: Activity, trend: 'Requires attention', status: criticalShipments > 0 ? 'critical' : 'normal' },
    { label: 'High-Risk Corridors', value: highRiskCorridors.toString(), icon: AlertTriangle, trend: 'Weather impact', status: highRiskCorridors > 0 ? 'warning' : 'normal' },
    { label: 'Active Incidents', value: activeIncidents.toString(), icon: Route, trend: 'Live Feed', status: activeIncidents > 0 ? 'warning' : 'normal' },
    { label: 'Vehicles En Route', value: vehiclesEnRoute.toString(), icon: Truck, trend: 'Updating', status: 'normal' },
    { label: 'Districts Under Alert', value: districtsAlert.toString(), icon: MapPin, trend: 'Connectivity issues', status: districtsAlert > 0 ? 'warning' : 'normal' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="hover:bg-slate-800/80 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${
                  kpi.status === 'critical' ? 'text-red-400' :
                  kpi.status === 'warning' ? 'text-amber-400' : 'text-blue-400'
                } group-hover:scale-110 transition-transform`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100 mb-1">{kpi.value}</div>
                <div className="text-[10px] text-slate-500 truncate">{kpi.trend}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
