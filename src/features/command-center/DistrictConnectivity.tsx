import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store/useAppStore';

export function DistrictConnectivity() {
  const districts = useAppStore(state => state.districts);

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3 border-b border-slate-800/50">
        <CardTitle className="text-sm">District Connectivity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-800/50">
          {districts.map((district) => (
            <li key={district.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium text-slate-300">{district.name}</span>
              <StatusBadge status={district.connectivity} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
