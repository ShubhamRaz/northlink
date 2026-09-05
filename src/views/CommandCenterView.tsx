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
import { Package, Plus } from 'lucide-react';

export function CommandCenterView() {
  const [showAddCargo, setShowAddCargo] = useState(false);

  return (
    <div className="flex flex-col gap-6 h-full p-6 relative">

      {/* Page Header with Add Cargo Button */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Northeast India Logistics Intelligence</p>
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
