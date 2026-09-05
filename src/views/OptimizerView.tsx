'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { Route, Zap, ShieldAlert, AlertTriangle, CheckCircle, Map as MapIcon, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AssistantPanel } from '@/features/assistant/AssistantPanel';
import { JourneyIntelligencePanel } from '@/features/journey/JourneyIntelligencePanel';

const Map = dynamic(() => import('@/features/command-center/MapComponent'), { ssr: false });

export function OptimizerView() {
  const { shipments, activeRoutes, analyzeRoutesForReadyShipment, markCargoReady, decisionHistory, approveInitialRoute, overrideInitialRoute, selectShipment, analyzeJourney, dispatchCargo, routeRecommendations, decideMidJourneyRoute, selectedShipmentId } = useAppStore();
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [activeTab, setActiveTab] = useState<'routes' | 'journey'>('journey');

  // Use the store's selected shipment id, falling back to the first available shipment.
  const selectedShipment = selectedShipmentId || shipments[0]?.id || 'MED-204';

  // Sync the store selection ONLY when the local value differs from the store.
  // Guarded to avoid infinite loops (we only set the store, never read it back into local state).
  useEffect(() => {
    if (selectedShipment && selectedShipment !== selectedShipmentId) {
      selectShipment(selectedShipment);
    }
  }, [selectedShipment, selectedShipmentId, selectShipment]);

  const bestRoute = activeRoutes.find(r => r.isFeasible);
  const activeShipment = shipments.find(s => s.id === selectedShipment);
  const isReady = activeShipment?.status === 'Ready';
  const hasApprovedRoute = !!activeShipment?.routeId;
  const isAwaitingDispatch = hasApprovedRoute && isReady;
  const canAnalyze = isReady;

  const formatEta = (minutes: number) => {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const activeRec = routeRecommendations.find(r => r.shipmentId === selectedShipment && r.status === 'ACTIVE');
  const recommendedMidJourneyRoute = activeRec ? activeRec.alternativeRoutes.find((r: any) => r.id === activeRec.recommendedRouteId) : null;

  return (
    <div className="flex flex-col gap-4 h-full p-6 overflow-y-auto">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Route className="w-6 h-6 text-blue-400" /> Route Optimizer
        </h1>

        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
          {[
            { id: 'journey', label: 'Journey Intelligence', icon: TrendingUp },
            { id: 'routes', label: 'Route Comparison', icon: Route }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Journey Intelligence Tab */}
      {activeTab === 'journey' && (
        <div className="flex-1">
          <JourneyIntelligencePanel />
        </div>
      )}

      {/* Route Comparison Tab */}
      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">

          {/* LEFT: Config + Timeline */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-800/50">
                <CardTitle className="text-sm">Shipment Configuration</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Select Shipment</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                    value={selectedShipment}
                    onChange={(e) => selectShipment(e.target.value)}
                  >
                    {shipments.map(s => (
                      <option key={s.id} value={s.id}>{s.id} - {s.cargoType}</option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const shipment = shipments.find(s => s.id === selectedShipment);
                  if (!shipment) return null;
                  return (
                    <div className="space-y-3 bg-slate-900/50 p-3 rounded border border-slate-800">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Origin:</span>
                        <span className="font-medium text-slate-300">{shipment.origin}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Destination:</span>
                        <span className="font-medium text-slate-300">{shipment.destination}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Priority:</span>
                        <span className={`font-bold ${shipment.priority === 'Critical' ? 'text-red-400' : 'text-blue-400'}`}>
                          {shipment.priority}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => canAnalyze && analyzeRoutesForReadyShipment(selectedShipment)}
                  disabled={!canAnalyze}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                >
                  <Zap className="w-4 h-4" /> {canAnalyze ? 'ANALYZE ROUTES' : activeShipment?.status === 'Planned' ? 'CARGO NOT READY' : 'ANALYSIS UNAVAILABLE'}
                </button>
                {activeShipment?.status === 'Planned' && (
                  <button
                    onClick={() => markCargoReady(selectedShipment)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> CARGO READY
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Decision History */}
            <Card className="flex-1">
              <CardHeader className="pb-3 border-b border-slate-800/50">
                <CardTitle className="text-sm">Decision Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[280px]">
                <ul className="divide-y divide-slate-800/50">
                  {decisionHistory.filter(d => d.shipmentId === selectedShipment).map(decision => (
                    <li key={decision.id} className="p-3">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-xs font-bold text-slate-300 leading-tight">{decision.trigger}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{decision.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-medium mb-1">Selected: {decision.selectedRouteId}</p>
                      <p className="text-[10px] text-slate-400">{decision.reason}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Route Comparison content */}
          <div className="flex flex-col gap-6 min-w-0">

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Workflow Status</span>
              <span className="font-semibold text-slate-200">
                {activeShipment?.status === 'Planned' ? 'Cargo not ready' :
                  activeShipment?.status === 'Ready' && !hasApprovedRoute ? 'Ready for route analysis' :
                  activeShipment?.status === 'Ready' ? 'Approved — Ready for Dispatch' :
                  activeShipment?.status === 'In Transit' ? 'Monitoring active route' :
                  activeShipment?.status === 'Route Change Pending' ? 'Pending Dispatcher Decision' :
                  activeShipment?.status === 'Paused for Safety' ? 'Route unsafe' : activeShipment?.status}
              </span>
            </div>

            {/* Mid-Journey Recommendation Banner */}
            {activeRec && recommendedMidJourneyRoute && (
              <div className="bg-gradient-to-r from-orange-900/40 to-slate-900 border border-orange-500/50 rounded-xl p-5 relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  MID-JOURNEY REROUTE REQUIRED
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Recommended Alternative: {recommendedMidJourneyRoute.name}</h2>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="text-orange-400 text-sm font-medium">Incident Impact Detected</span>
                    </div>
                    <p className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="font-bold text-orange-400 block mb-1 text-xs uppercase tracking-wider">Reason</span>
                      {activeRec.reason}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => decideMidJourneyRoute(selectedShipment, 'CHANGE', recommendedMidJourneyRoute.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" /> APPROVE REROUTE
                    </button>
                    <button
                      onClick={() => decideMidJourneyRoute(selectedShipment, 'KEEP')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      KEEP CURRENT ROUTE
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Banner */}
            {bestRoute && !activeRec ? (
              <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  NORTHLINK RECOMMENDATION
                </div>

                <div className="flex flex-col lg:flex-row gap-5">
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-xl font-bold text-white mb-1 truncate">{bestRoute.name}</h2>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 text-sm font-medium">Optimal Feasible Route</span>
                    </div>

                    <div className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded border border-slate-800 leading-relaxed">
                      <span className="font-bold text-blue-400 block mb-1 text-xs uppercase tracking-wider">Why this route?</span>
                      {bestRoute.reasons.map((r, i) => (
                        <span key={i} className="block text-xs">• {r}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 shrink-0 lg:w-56">
                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Dynamic ETA</span>
                      <span className="text-base font-bold text-slate-100">{formatEta(bestRoute.currentEta)}</span>
                      <span className="text-[10px] text-slate-400 ml-1">±{bestRoute.uncertaintyRange}m</span>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">AI Risk</span>
                      <span className={`text-base font-bold ${bestRoute.risk > 50 ? 'text-red-400' : 'text-emerald-400'}`}>{bestRoute.risk}%</span>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Resilience</span>
                      <span className="text-base font-bold text-blue-400">{bestRoute.resilience}<span className="text-xs text-slate-500"> / 100</span></span>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Prototype Cost</span>
                      <span className="text-base font-bold text-slate-100">₹{bestRoute.cost}</span>
                    </div>
                  </div>
                </div>

                {/* Approval Workflow */}
                {isReady && !hasApprovedRoute && (
                  <div className="mt-5 pt-4 border-t border-blue-500/20 flex gap-3">
                    <button
                      onClick={() => approveInitialRoute(selectedShipment, bestRoute.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" /> APPROVE ROUTE
                    </button>
                    <button
                      onClick={() => setShowOverride(!showOverride)}
                      className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors text-sm"
                    >
                      OVERRIDE
                    </button>
                  </div>
                )}

                {isAwaitingDispatch && (
                  <div className="mt-5 pt-4 border-t border-blue-500/20 flex gap-3">
                    <button
                      onClick={() => dispatchCargo(selectedShipment)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Zap className="w-5 h-5" /> DISPATCH CARGO
                    </button>
                  </div>
                )}

                {isReady && !hasApprovedRoute && showOverride && (
                  <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-300 mb-2">Override Recommendation</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Reason for override..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 min-w-0"
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                      />
                      <select id="override-route" className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 shrink-0">
                        {activeRoutes.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const sel = document.getElementById('override-route') as HTMLSelectElement;
                          if (sel && overrideReason) {
                            overrideInitialRoute(selectedShipment, sel.value, overrideReason);
                            setShowOverride(false);
                          }
                        }}
                        disabled={!overrideReason}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white px-4 rounded font-bold transition-colors shrink-0"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (!bestRoute && !activeRec && activeShipment?.status !== 'Planned' ? (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 flex items-center gap-4">
                <ShieldAlert className="w-8 h-8 text-red-500 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-red-400">No Feasible Routes Available</h2>
                  <p className="text-sm text-red-300">All evaluated routes contain BLOCKED corridors or violate safety constraints.</p>
                </div>
              </div>
            ) : null)}

            {/* Routes list + Map + Assistant side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">

              {/* Candidate Routes */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Routes</h3>
                {activeRoutes.map((route) => (
                  <Card key={route.id} className={`${route.id === bestRoute?.id ? 'border-blue-500/50 bg-blue-900/10' : ''} ${!route.isFeasible ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-bold text-slate-200 text-sm leading-tight">{route.name}</h4>
                        {route.id === bestRoute?.id && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">Best</span>}
                        {!route.isFeasible && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">Blocked</span>}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 mb-3 border-b border-slate-800/50 pb-2">
                        <div><span className="block text-slate-500">ETA</span><span className="font-mono text-slate-200 text-[11px]">{formatEta(route.currentEta)}</span></div>
                        <div><span className="block text-slate-500">Risk</span><span className={`font-mono text-[11px] ${route.risk > 50 ? 'text-red-400' : 'text-slate-200'}`}>{route.risk}%</span></div>
                        <div><span className="block text-slate-500">Prototype Cost</span><span className="font-mono text-slate-200 text-[11px]">₹{route.cost}</span></div>
                      </div>

                      {!route.isFeasible && (
                        <div className="text-[11px] text-red-400 bg-red-950/30 p-2 rounded flex gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{route.reasons[0]}</span>
                        </div>
                      )}
                      {route.isFeasible && route.id !== bestRoute?.id && (
                        <div className="text-[11px] text-slate-400">
                          Suboptimal: {route.cost > (bestRoute?.cost || 0) ? 'higher cost' : route.currentEta > (bestRoute?.currentEta || 0) ? 'longer ETA' : 'higher risk'}.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Map + Assistant */}
              <div className="flex flex-col gap-4 min-w-0">
                <Card>
                  <CardHeader className="pb-3 border-b border-slate-800/50 shrink-0">
                    <CardTitle className="text-sm flex items-center gap-2"><MapIcon className="w-4 h-4 text-blue-400"/>Operational View</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col" style={{ minHeight: '360px' }}>
                    <Map />
                  </CardContent>
                </Card>

                <div style={{ height: '320px' }}>
                  <AssistantPanel />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
