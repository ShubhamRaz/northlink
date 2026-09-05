'use client';

import { useAppStore } from '@/store/useAppStore';
import { AppShell } from '@/components/layout/AppShell';
import { CommandCenterView } from '@/views/CommandCenterView';
import { MapView } from '@/views/MapView';
import { OptimizerView } from '@/views/OptimizerView';
import { InsightsView } from '@/views/InsightsView';
import { AnalyticsView } from '@/views/AnalyticsView';
import { VehiclesView } from '@/views/VehiclesView';
import { ShipmentsView } from '@/views/ShipmentsView';
import { IncidentsView } from '@/views/IncidentsView';
import { SettingsView } from '@/views/SettingsView';
import { FieldView } from '@/views/FieldView';
import { DriverView } from '@/views/DriverView';
import { LoginView } from '@/views/LoginView';

const STANDALONE_VIEWS = ['login', 'field', 'driver'];

export default function Home() {
  const currentView = useAppStore(s => s.currentView);

  const renderView = () => {
    switch (currentView) {
      case 'command-center': return <CommandCenterView />;
      case 'map': return <MapView />;
      case 'optimizer': return <OptimizerView />;
      case 'insights': return <InsightsView />;
      case 'analytics': return <AnalyticsView />;
      case 'vehicles': return <VehiclesView />;
      case 'shipments': return <ShipmentsView />;
      case 'incidents': return <IncidentsView />;
      case 'settings': return <SettingsView />;
      case 'field': return <FieldView />;
      case 'driver': return <DriverView />;
      case 'login': return <LoginView />;
      default: return <CommandCenterView />;
    }
  };

  if (STANDALONE_VIEWS.includes(currentView)) {
    return <>{renderView()}</>;
  }

  return <AppShell>{renderView()}</AppShell>;
}
