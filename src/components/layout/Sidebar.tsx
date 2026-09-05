'use client';

import React from 'react';
import {
  LayoutDashboard, Box, Route, Truck, AlertTriangle,
  BrainCircuit, Users, Package, PieChart, Map as MapIcon, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, AppView } from '@/store/useAppStore';

const mainNavigation = [
  { name: 'Command Center', view: 'command-center' as AppView, href: '/', icon: LayoutDashboard },
  { name: 'Live Map', view: 'map' as AppView, href: '/map', icon: MapIcon },
  { name: 'Route Optimizer', view: 'optimizer' as AppView, href: '/optimizer', icon: Route },
  { name: 'AI Insights', view: 'insights' as AppView, href: '/insights', icon: BrainCircuit },
  { name: 'Analytics', view: 'analytics' as AppView, href: '/analytics', icon: PieChart },
];

const operationsNavigation = [
  { name: 'Fleet', view: 'vehicles' as AppView, href: '/vehicles', icon: Truck },
  { name: 'Shipments', view: 'shipments' as AppView, href: '/shipments', icon: Box },
  { name: 'Incidents', view: 'incidents' as AppView, href: '/incidents', icon: AlertTriangle },
];

const sidebarItems = [
  ...mainNavigation,
  ...operationsNavigation,
  { name: 'Field Officer', view: 'field' as AppView, href: '/field', icon: Users },
  { name: 'Driver Mode', view: 'driver' as AppView, href: '/driver', icon: Package },
  { name: 'Settings', view: 'settings' as AppView, href: '/settings', icon: Settings },
];

export function Sidebar() {
  const currentView = useAppStore(s => s.currentView);
  const setView = useAppStore(s => s.setView);

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img src="/northlink.png" alt="Northlink AI Logo" className="w-8 h-8 rounded" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-100 tracking-wide uppercase">Northlink AI</h1>
            <span className="text-[10px] text-slate-400">Logistics Intelligence</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <li key={item.name}>
                <button
                  onClick={() => setView(item.view)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-left",
                    isActive
                      ? "bg-blue-500/10 text-blue-400 font-medium"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-500")} />
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs text-slate-400">System Connected</span>
        </div>
      </div>
    </aside>
  );
}
