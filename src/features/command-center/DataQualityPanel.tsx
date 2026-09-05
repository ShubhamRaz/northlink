import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { ShieldCheck, Cloud, Map as MapIcon, Database, Bot, BrainCircuit } from 'lucide-react';

export function DataQualityPanel() {
  const sources = [
    { name: 'Weather', val: 'Operational', icon: Cloud, color: 'text-blue-400' },
    { name: 'Incidents', val: 'Live Sync', icon: Database, color: 'text-emerald-400' },
    { name: 'GPS', val: 'Simulation', icon: MapIcon, color: 'text-amber-400' },
    { name: 'AI Models', val: 'Prototype', icon: BrainCircuit, color: 'text-purple-400' },
    { name: 'LLM Engine', val: 'Gemini-1.5', icon: Bot, color: 'text-indigo-400' }
  ];

  return (
    <Card className="bg-slate-900 border-slate-800 h-full flex flex-col">
      <div className="p-3 border-b border-slate-800/50 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> System Integrity
        </h3>
        <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
          HEALTHY
        </span>
      </div>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        <ul className="divide-y divide-slate-800/50">
          {sources.map((src, i) => {
            const Icon = src.icon;
            return (
              <li key={i} className="flex justify-between items-center p-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${src.color}`} />
                  <span className="text-xs text-slate-400 font-medium">{src.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {src.val}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
