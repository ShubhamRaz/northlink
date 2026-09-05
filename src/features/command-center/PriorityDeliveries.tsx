import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function PriorityDeliveries() {
  const shipments = useAppStore(state => state.shipments);
  
  // Get top priority active deliveries
  const deliveries = shipments
    .filter(s => s.status === 'In Transit' || s.status === 'Planned' || s.status === 'Ready')
    .sort((a, b) => {
      const priorityWeight = { 'Critical': 3, 'High': 2, 'Normal': 1, 'Low': 0 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-slate-800/50">
        <CardTitle className="text-sm">Priority Deliveries</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-800/50">
          {deliveries.map((delivery) => (
            <li key={delivery.id} className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-slate-200">{delivery.id}</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  delivery.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  delivery.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {delivery.priority}
                </span>
              </div>
              <div className="text-xs text-slate-400 mb-2 truncate">
                {delivery.origin} → {delivery.destination}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Clock className="w-3 h-3 text-slate-500" />
                ETA {delivery.eta}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
