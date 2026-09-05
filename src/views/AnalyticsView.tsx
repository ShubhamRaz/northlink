'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BarChart3, TrendingDown, AlertCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function AnalyticsView() {
  const { decisionHistory } = useAppStore();

  const aiRecommendations = decisionHistory.filter(d => d.trigger === 'System Optimization').length;
  const manualOverrides = decisionHistory.filter(d => d.isOverride).length;

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <header className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-100">
          <BarChart3 className="w-6 h-6 text-purple-400" /> Operational Analytics
        </h1>
        <div className="px-3 py-1 bg-purple-900/30 text-purple-400 text-xs font-bold uppercase tracking-wider rounded border border-purple-500/30 flex items-center gap-2">
          <Zap className="w-3 h-3" /> Prototype Simulation Data
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">AI Route Optimizations</span>
              <span className="text-3xl font-bold text-slate-100">{aiRecommendations}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/20">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">Manual Overrides</span>
              <span className="text-3xl font-bold text-slate-100">{manualOverrides}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">Avg. Delay Prevention</span>
              <span className="text-3xl font-bold text-emerald-400">42<span className="text-lg">m</span></span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center border border-emerald-500/20">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">Network Resilience</span>
              <span className="text-3xl font-bold text-purple-400">86<span className="text-lg">%</span></span>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/20">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="bg-slate-900/50 border-slate-800 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-800/50 shrink-0">
            <CardTitle className="text-sm text-slate-200">Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">

            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wide">On-Time Delivery Rate</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Baseline (Traditional)</span>
                      <span>68%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 w-[68%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-blue-400 mb-1 font-bold">
                      <span>NORTHLINK AI</span>
                      <span>92%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[92%] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wide">Incident Response Time</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Baseline (Traditional)</span>
                      <span>45 mins</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 w-[75%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-emerald-400 mb-1 font-bold">
                      <span>NORTHLINK AI</span>
                      <span>2 mins (Automated)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[5%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-800/50 shrink-0">
            <CardTitle className="text-sm text-slate-200">Recent Routing Decisions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {decisionHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No recent AI routing decisions logged.</div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {decisionHistory.map((decision) => (
                  <li key={decision.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          decision.isOverride ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {decision.isOverride ? 'MANUAL OVERRIDE' : 'AI OPTIMIZED'}
                        </span>
                        <span className="text-sm font-bold text-slate-200">{decision.shipmentId}</span>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {decision.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      <span className="text-slate-300">Selected Route: </span>
                      <span className="font-mono text-emerald-400">{decision.selectedRouteId}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 italic bg-slate-950 p-2 rounded border border-slate-800">
                      &quot;{decision.reason}&quot;
                    </p>
                    {decision.approvedBy && (
                      <p className="text-[10px] text-slate-500 mt-2 text-right">
                        Action by: <span className="font-bold text-slate-400">{decision.approvedBy}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
