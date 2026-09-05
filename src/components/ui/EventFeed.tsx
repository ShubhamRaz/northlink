import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { Info, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export function EventFeed() {
  const { eventFeed } = useAppStore();

  const getIcon = (type: string) => {
    switch(type) {
      case 'info': return <Info className="w-3.5 h-3.5 text-blue-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'critical': return <ShieldAlert className="w-3.5 h-3.5 text-red-400" />;
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-slate-800/50 shrink-0">
        <CardTitle className="text-sm flex items-center justify-between">
          Activity Feed
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Live</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto min-h-[200px]">
        {eventFeed.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 italic">No recent activity</div>
        ) : (
          <ul className="divide-y divide-slate-800/50">
            {eventFeed.map((event) => (
              <li key={event.id} className="p-3 hover:bg-slate-800/30 transition-colors flex gap-3 items-start">
                <div className="mt-0.5 shrink-0">
                  {getIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 break-words leading-tight mb-1">{event.message}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{event.timestamp}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
