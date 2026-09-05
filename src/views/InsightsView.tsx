'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { BrainCircuit, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { predictCorridorRisk } from '@/services/riskService';

export function InsightsView() {
  const { corridors, incidents, simulationMode } = useAppStore();

  // Re-run predictions to display them
  const predictions = corridors.map(c => ({
    corridor: c,
    prediction: predictCorridorRisk(c, incidents, simulationMode)
  })).sort((a, b) => b.prediction.probability - a.prediction.probability);

  const highRiskCount = predictions.filter(p => p.prediction.probability > 0.5).length;
  const totalDelay = predictions.reduce((sum, p) => sum + p.prediction.expectedDelay, 0);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-purple-400" /> AI Risk Insights
        </h1>
        <div className="flex gap-2 text-sm text-slate-400">
          Model: NL-Risk-v0.9.4-prototype
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-slate-900 to-purple-900/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">High-Risk Segments</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">{highRiskCount}</div>
            <div className="text-xs text-slate-500 mt-2">Corridors with &gt;50% disruption probability</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-red-900/10 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Network Delay Exposure</span>
              <Activity className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">{Math.floor(totalDelay / 60)}h {totalDelay % 60}m</div>
            <div className="text-xs text-slate-500 mt-2">Predicted aggregate delay across network</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-emerald-900/10 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Data Freshness</span>
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">Live</div>
            <div className="text-xs text-slate-500 mt-2">Continuously updating from simulation engine</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-2">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          Corridor Predictions
        </h2>

        {predictions.map(({corridor, prediction}) => (
          <Card key={corridor.id} className="flex flex-col lg:flex-row">
            <CardHeader className="pb-4 border-b lg:border-b-0 lg:border-r border-slate-800/50 w-full lg:w-72 shrink-0">
              <CardTitle className="text-base text-slate-200 mb-1">{corridor.name}</CardTitle>
              <div className="text-xs text-slate-400 mb-4">{corridor.id}</div>

              <div className="space-y-4 mt-auto">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 uppercase tracking-wider">Disruption Prob</span>
                    <span className={`font-bold ${prediction.probability > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {Math.round(prediction.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${prediction.probability > 0.5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${prediction.probability * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 uppercase tracking-wider">Confidence</span>
                    <span className="font-bold text-blue-400">
                      {Math.round(prediction.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${prediction.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Severity</span>
                  <span className={`text-sm uppercase font-bold px-2 py-1 rounded ${
                    prediction.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    prediction.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                    prediction.severity === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {prediction.severity}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block mb-1">Expected Delay</span>
                  <span className="text-lg font-mono font-bold text-slate-200">
                    {prediction.expectedDelay > 0 ? `+${prediction.expectedDelay}m` : 'None'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Top Contributing Factors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prediction.contributingFactors.map((factor, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-slate-200">{factor.factor}</span>
                        <span className="text-xs font-bold text-red-400">+{Math.round(factor.contribution * 100)}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{factor.description}</p>
                    </div>
                  ))}
                  {prediction.contributingFactors.length === 0 && (
                    <div className="text-xs text-slate-500 italic">No significant risk factors detected.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
