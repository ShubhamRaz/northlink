'use client';

import React, { useState } from 'react';
import { KPICards } from '@/features/command-center/KPICards';
import { MainMap } from '@/features/command-center/MainMap';
import { OperationalStatus } from '@/features/command-center/OperationalStatus';
import { PriorityDeliveries } from '@/features/command-center/PriorityDeliveries';
import { IncidentFeed } from '@/features/command-center/IncidentFeed';
import { VehicleOverview } from '@/features/command-center/VehicleOverview';
import { EventFeed } from '@/components/ui/EventFeed';
import { DataQualityPanel } from '@/features/command-center/DataQualityPanel';
import { SupplyIntelligence } from '@/features/command-center/SupplyIntelligence';
import { FutureRiskCard } from '@/features/journey/FutureRiskCard';
import { AddCargoModal } from '@/features/command-center/AddCargoModal';
import { Package, Plus, Gauge, Play, Pause } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { simulationService } from '@/services/simulationService';

export function CommandCenterView() {
  const [showAddCargo, setShowAddCargo] = useState(false);
  const { simulationActive, playbackSpeed, setPlaybackSpeed } = useAppStore();

  const toggleSimulation = () => {
    if (simulationActive) {
      simulationService.pause();
    } else {
      simulationService.start();
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-6 relative">

      {/* Page Header with Add Cargo Button + Speed Control */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Northeast India Logistics Intelligence</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Simulation Speed Control */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <button
              onClick={toggleSimulation}
              className={`p-1.5 rounded-lg transition-colors ${
                simulationActive
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
              title={simulationActive ? 'Pause simulation' : 'Start simulation'}
            >
              {simulationActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <Gauge className="w-4 h-4 text-slate-500" />
            <div className="flex gap-1">
              {[1, 2, 5, 10, 20].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition-colors border ${
                    playbackSpeed === speed
                      ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAddCargo(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <Package className="w-4 h-4" />
            Add Cargo
          </button>
        </div>
      </div>

      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main GIS View */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[500px]">
          <MainMap />
        </div>

        {/* Operations Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 h-full">
          <OperationalStatus />
          <PriorityDeliveries />
        </div>
      </div>

      {/* Lower Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <div className="h-64"><VehicleOverview /></div>
        <div className="h-64"><IncidentFeed /></div>
        <div className="h-64"><FutureRiskCard /></div>
        <div className="h-64"><SupplyIntelligence /></div>
        <div className="h-64"><DataQualityPanel /></div>
      </div>

      {/* Footer / Global Logs */}
      <div className="h-48 mt-2">
        <EventFeed />
      </div>

      {/* Add Cargo Modal (Drawer) */}
      {showAddCargo && <AddCargoModal onClose={() => setShowAddCargo(false)} />}
    </div>
  );
}
