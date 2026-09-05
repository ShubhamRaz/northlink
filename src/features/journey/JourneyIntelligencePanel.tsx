'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RouteSegment } from '@/types';
import { weatherForecastService } from '@/services/weatherForecastService';
import {
  Clock, AlertTriangle, Cloud, CheckCircle2, ShieldAlert,
  TrendingUp, MapPin, Zap, ChevronRight, Play, RotateCcw, Info
} from 'lucide-react';

// ── Sub-components ───────────────────────────────────────────────────────────

function WeatherIcon({ condition }: { condition: string }) {
  const color = weatherForecastService.getConditionColor(condition as any);
  const map: Record<string, string> = {
    'Clear': '☀️', 'Cloudy': '⛅', 'Light Rain': '🌦',
    'Moderate Rain': '🌧', 'Heavy Rain': '⛈', 'Thunderstorm': '🌩'
  };
  return <span style={{ filter: `drop-shadow(0 0 3px ${color})` }}>{map[condition] ?? '🌫'}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    NORMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WATCH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    EXTREME: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors[severity] ?? colors.NORMAL}`}>
      {severity}
    </span>
  );
}

function SegmentCard({ seg, isSelected, onClick }: {
  seg: RouteSegment;
  isSelected: boolean;
  onClick: () => void;
}) {
  const riskColor = seg.disruptionProbability >= 0.75 ? 'border-red-500/50 bg-red-950/20'
    : seg.disruptionProbability >= 0.50 ? 'border-orange-500/40 bg-orange-950/10'
    : seg.disruptionProbability >= 0.30 ? 'border-yellow-500/30 bg-yellow-950/10'
    : 'border-slate-800 bg-slate-900/30';

  const trackColor = seg.disruptionProbability >= 0.75 ? '#ef4444'
    : seg.disruptionProbability >= 0.50 ? '#f97316'
    : seg.disruptionProbability >= 0.30 ? '#facc15'
    : '#22c55e';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-all cursor-pointer hover:brightness-110 ${riskColor} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {seg.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
          ) : seg.isActive ? (
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500/20 shrink-0 animate-pulse" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: trackColor, background: `${trackColor}20` }} />
          )}
          <span className="text-xs font-bold text-slate-200 truncate">{seg.location}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-mono text-slate-300">{seg.estimatedArrivalTime}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <WeatherIcon condition={seg.weather.condition} />
          <span className="text-[11px] text-slate-400">{seg.weather.condition}</span>
        </div>
        <SeverityBadge severity={seg.weather.severity} />
      </div>

      {seg.disruptionProbability >= 0.30 && !seg.isCompleted && (
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Disruption risk</span>
          <span className="font-bold" style={{ color: trackColor }}>
            {Math.round(seg.disruptionProbability * 100)}%
            {seg.expectedDelay > 0 && ` · +${seg.expectedDelay}m delay`}
          </span>
        </div>
      )}
    </button>
  );
}

function SegmentDetailPanel({ seg }: { seg: RouteSegment }) {
  const trackColor = seg.disruptionProbability >= 0.75 ? '#ef4444'
    : seg.disruptionProbability >= 0.50 ? '#f97316'
    : seg.disruptionProbability >= 0.30 ? '#facc15' : '#22c55e';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-100">{seg.location}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400 font-mono font-bold">ETA: {seg.estimatedArrivalTime}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 mb-1">Disruption Prob.</div>
          <div className="text-2xl font-bold" style={{ color: trackColor }}>
            {Math.round(seg.disruptionProbability * 100)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Forecast</div>
          <div className="flex items-center gap-2">
            <WeatherIcon condition={seg.weather.condition} />
            <span className="text-sm font-bold text-slate-200">{seg.weather.condition}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span>☔ {seg.weather.rainfall} mm/hr</span>
            <span>·</span>
            <span>💨 {seg.weather.windSpeed} km/h</span>
          </div>
        </div>

        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Expected Delay</div>
          <div className="text-xl font-bold text-slate-100">
            {seg.expectedDelay > 0 ? `+${seg.expectedDelay}m` : 'None'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{seg.accessibility}</div>
        </div>

        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Risk Factors</div>
          <div className="space-y-1.5">
            {[
              { label: 'Terrain', value: seg.terrainRisk },
              { label: 'Incidents', value: seg.incidentRisk },
              { label: 'Traffic', value: seg.trafficRisk },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-14">{r.label}</span>
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.value * 100}%`, backgroundColor: trackColor }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 w-6 text-right">{Math.round(r.value * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Confidence</div>
          <div className="text-lg font-bold text-blue-400">{Math.round(seg.confidence * 100)}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Prototype Forecast</div>
          <div className="text-[10px] text-slate-600 mt-1">
            {seg.distanceFromOrigin > 0 ? `${seg.distanceFromOrigin} km from origin` : 'Origin'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function JourneyIntelligencePanel() {
  const {
    selectedShipmentId, shipments, journeyAnalysis, journeyStartTime,
    analyzeJourney, setJourneyStartTime, simulationMode
  } = useAppStore();

  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);
  const [startTimeInput, setStartTimeInput] = useState(journeyStartTime);

  const shipment = selectedShipmentId ? shipments.find(s => s.id === selectedShipmentId) : null;

  const selectedSeg = journeyAnalysis?.segments.find(s => s.id === selectedSegId) ?? null;

  const outlook = journeyAnalysis?.outlook;
  const forecastRiskColor = {
    LOW: 'text-emerald-400', MEDIUM: 'text-yellow-400',
    HIGH: 'text-orange-400', CRITICAL: 'text-red-400'
  }[outlook?.forecastRisk ?? 'LOW'] ?? 'text-emerald-400';

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2 text-sm">
        <MapPin className="w-8 h-8 text-slate-700" />
        <p>Select a shipment to analyze journey intelligence.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Journey Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Shipment</div>
            <div className="text-sm font-bold text-slate-100">{shipment.id} — {shipment.cargoType}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {shipment.origin} → {shipment.destination}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                shipment.priority === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
              }`}>{shipment.priority}</span>
              {simulationMode !== 'NORMAL' && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase font-bold">
                  Mode: {simulationMode}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1 font-bold">Departure</label>
              <input
                type="time"
                value={startTimeInput}
                onChange={e => setStartTimeInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => {
                setJourneyStartTime(startTimeInput);
                analyzeJourney(shipment.id, startTimeInput);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              <Zap className="w-4 h-4" /> ANALYZE
            </button>
          </div>
        </div>
      </div>

      {/* Journey Outlook Summary */}
      {outlook && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Journey Outlook
            </h3>
            <span className={`text-xs font-bold uppercase ${forecastRiskColor}`}>
              {outlook.forecastRisk} RISK
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Base Time</div>
              <div className="text-sm font-bold text-slate-200">
                {Math.floor(outlook.baseTravelMinutes / 60)}h {outlook.baseTravelMinutes % 60}m
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Predicted Delay</div>
              <div className={`text-sm font-bold ${outlook.predictedDelayMinutes > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {outlook.predictedDelayMinutes > 0 ? `+${outlook.predictedDelayMinutes}m` : 'None'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Est. Total</div>
              <div className="text-sm font-bold text-slate-200">
                {Math.floor(outlook.currentTravelMinutes / 60)}h {outlook.currentTravelMinutes % 60}m
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">High-Risk Zones</div>
              <div className={`text-sm font-bold ${outlook.highRiskSegmentCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {outlook.highRiskSegmentCount}
              </div>
            </div>
          </div>

          {/* Advance Warnings */}
          {outlook.advanceWarnings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              {outlook.advanceWarnings.slice(0, 2).map(w => (
                <div key={w.segmentId} className="flex items-start gap-3 mt-2 bg-orange-950/20 border border-orange-500/20 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-orange-300">
                      {Math.round(w.disruptionProbability * 100)}% disruption risk — {w.location}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Expected arrival {w.expectedArrivalTime} · {w.cause} · +{w.expectedDelay}m delay
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Segments + Detail side by side */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Segment Timeline List */}
        <div className="flex flex-col gap-2 w-64 shrink-0 overflow-y-auto">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-1">
            Route Segments — Click for Details
          </div>
          {journeyAnalysis?.segments.map((seg, i) => (
            <React.Fragment key={seg.id}>
              <SegmentCard
                seg={seg}
                isSelected={selectedSegId === seg.id}
                onClick={() => setSelectedSegId(selectedSegId === seg.id ? null : seg.id)}
              />
              {i < (journeyAnalysis.segments.length - 1) && (
                <div className="flex items-center gap-1 px-2">
                  <ChevronRight className="w-3 h-3 text-slate-700" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selectedSeg ? (
            <SegmentDetailPanel seg={selectedSeg} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-6">
              <Info className="w-8 h-8 text-slate-700" />
              <p className="text-sm text-center">Click any route segment to see detailed forecast, risk, and timing information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
