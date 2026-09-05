'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle, Clock, MapPin, TrendingUp, Zap } from 'lucide-react';

export function FutureRiskCard() {
  const { journeyAnalysis, analyzeJourney, selectedShipmentId } = useAppStore();

  const outlook = journeyAnalysis?.outlook;
  const warnings = outlook?.advanceWarnings ?? [];
  const highRiskCount = outlook?.highRiskSegmentCount ?? 0;

  const riskColor = {
    LOW: 'text-emerald-400', MEDIUM: 'text-yellow-400',
    HIGH: 'text-orange-400', CRITICAL: 'text-red-400'
  }[outlook?.forecastRisk ?? 'LOW'] ?? 'text-emerald-400';

  const riskBg = {
    LOW: 'bg-emerald-500/5 border-emerald-500/20',
    MEDIUM: 'bg-yellow-500/5 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 border-orange-500/30',
    CRITICAL: 'bg-red-500/10 border-red-500/30'
  }[outlook?.forecastRisk ?? 'LOW'] ?? 'bg-slate-900/30 border-slate-800';

  return (
    <div className={`h-full flex flex-col rounded-xl border ${riskBg}`}>
      <div className="p-3 border-b border-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" /> Future Route Risks
        </h3>
        {outlook && (
          <span className={`text-[10px] font-bold ${riskColor}`}>
            {outlook.forecastRisk}
          </span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        {!journeyAnalysis ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <TrendingUp className="w-6 h-6 text-slate-700" />
            <p className="text-xs text-slate-500">No active journey analysis.</p>
            {selectedShipmentId && (
              <button
                onClick={() => analyzeJourney(selectedShipmentId)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
              >
                <Zap className="w-3 h-3" /> Analyze Journey
              </button>
            )}
          </div>
        ) : (
          <>
            {highRiskCount === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium py-2">
                <span>✓</span> No high-risk segments detected
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{highRiskCount} potential risk zone{highRiskCount !== 1 ? 's' : ''} ahead</span>
                </div>
                {warnings.slice(0, 2).map(w => (
                  <div key={w.segmentId} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-200 truncate">{w.location}</span>
                          <span className="text-[10px] font-mono text-orange-400 shrink-0">
                            {Math.round(w.disruptionProbability * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>ETA: {w.expectedArrivalTime}</span>
                          {w.expectedDelay > 0 && <span className="text-orange-500">+{w.expectedDelay}m</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shipment label */}
            <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-800/50">
              <MapPin className="w-3 h-3" />
              <span>{journeyAnalysis.origin} → {journeyAnalysis.destination}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
