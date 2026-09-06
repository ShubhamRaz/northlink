'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Settings, User, Bot, Activity, Info } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { SimulationControl } from '@/components/ui/SimulationControl';

export function SettingsView() {
  const { currentUserRole, simulationActive, networkOnline, offlineQueue, shipmentPersistenceError } = useAppStore();
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/assistant')
      .then(response => response.json())
      .then(data => setGeminiConfigured(Boolean(data.configured)))
      .catch(() => setGeminiConfigured(false));
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <header className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-slate-400" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Settings</h1>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-800/50">
          <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Current Role</label>
            <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-bold text-blue-400">
              {currentUserRole}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Access Level</label>
            <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-400">
              {currentUserRole === 'Dispatcher' || currentUserRole === 'Admin' ? 'Full Command Center' : currentUserRole === 'Field Officer' ? 'Field Reporting' : 'Driver Navigation'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-800/50">
          <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /> System Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[
            { label: 'Simulation Engine', status: simulationActive ? 'Running' : 'Stopped', color: simulationActive ? 'emerald' : 'slate' },
            { label: 'GIS Layer', status: 'Active', color: 'emerald' },
            { label: 'Risk Model', status: 'Prototype v0.9.4', color: 'blue' },
            { label: 'LLM (Gemini)', status: geminiConfigured === null ? 'Checking' : geminiConfigured ? 'API Connected' : 'Fallback Mode', color: geminiConfigured ? 'purple' : 'slate' },
            { label: 'Offline Queue', status: networkOnline ? `${offlineQueue.length} Pending` : 'Offline', color: networkOnline ? 'amber' : 'red' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-sm text-slate-400">{item.label}</span>
              <span className={`text-xs font-mono bg-${item.color}-900/30 text-${item.color}-400 border border-${item.color}-500/20 px-2 py-0.5 rounded`}>
                {item.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {shipmentPersistenceError && (
        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardContent className="p-4 text-sm text-amber-300">{shipmentPersistenceError}</CardContent>
        </Card>
      )}

      {/* Developer Demo Controls */}
      {currentUserRole === 'Dispatcher' && (
        <Card className="border-amber-900/50 bg-amber-950/10">
          <CardHeader className="pb-3 border-b border-amber-900/30">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
              <Settings className="w-4 h-4" /> Developer / Judge Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-xs text-amber-200/60 mb-4">
              These controls are hidden from the normal operational flow but remain accessible here to test system resilience.
            </p>
            <div className="max-w-md">
              <SimulationControl />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Assistant */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-800/50">
          <CardTitle className="text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-purple-400" /> AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Model</span>
            <span className="text-sm font-mono text-purple-400">@google/generative-ai (Gemini 1.5 Flash)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Grounding</span>
            <span className="text-sm text-slate-300">Application State</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Fallback</span>
            <span className="text-sm text-slate-300">Rule-based (offline mode)</span>
          </div>
        </CardContent>
      </Card>

      {/* Prototype Note */}
      <Card className="bg-blue-950/20 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-400 mb-1">Prototype Notice</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                NORTHLINK AI is a prototype demonstrating disruption-aware logistics intelligence for Northeast India
                using simulated operational data and AI-assisted decision support. It is not connected to any live
                government system. All data is for demonstration purposes only.
              </p>
              <p className="text-xs text-slate-500 mt-2 font-mono">Version: 1.0.0-sih2026 · Simulation Mode · Vercel-Deployable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
