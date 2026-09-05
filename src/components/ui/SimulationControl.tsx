import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { Play, Pause, Wifi, WifiOff, CloudRain, AlertTriangle, Activity, Car, RotateCcw } from 'lucide-react';
import { SimulationMode } from '@/types';
import { simulationService } from '@/services/simulationService';

export function SimulationControl() {
  const { 
    simulationActive, 
    simulationMode, 
    setSimulationMode,
    networkOnline,
    setNetworkOnline,
    playbackSpeed,
    setPlaybackSpeed
  } = useAppStore();

  const modes: { id: SimulationMode; label: string; icon: React.ReactNode }[] = [
    { id: 'NORMAL', label: 'Normal', icon: <Activity className="w-3 h-3" /> },
    { id: 'HEAVY RAIN', label: 'Heavy Rain', icon: <CloudRain className="w-3 h-3 text-cyan-400" /> },
    { id: 'LANDSLIDE', label: 'Landslide', icon: <AlertTriangle className="w-3 h-3 text-red-400" /> },
    { id: 'TRAFFIC SURGE', label: 'Traffic Surge', icon: <Car className="w-3 h-3 text-amber-400" /> },
  ];

  const toggleSimulation = () => {
    if (simulationActive) {
      simulationService.pause();
    } else {
      simulationService.start();
    }
  };

  return (
    <Card className="border-blue-900/50 bg-blue-950/20">
      <CardHeader className="pb-3 border-b border-blue-900/30 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-blue-100 flex items-center gap-2">
          Demo Simulation Control
          {simulationActive && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Network Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">Network State</span>
          <button 
            onClick={() => setNetworkOnline(!networkOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              networkOnline ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            {networkOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {networkOnline ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>

        {/* Play/Pause */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">Movement Engine</span>
          <button 
            onClick={toggleSimulation}
            disabled={!networkOnline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              !networkOnline ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' :
              simulationActive ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            {simulationActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {simulationActive ? 'PAUSE' : 'START'}
          </button>
        </div>

        {/* Playback Speed */}
        <div className="flex items-center justify-between pt-2 border-t border-blue-900/30">
          <span className="text-xs text-slate-300">Sim Speed</span>
          <div className="flex gap-1">
            {[0.5, 1, 2, 4].map(speed => (
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

        {/* Mode Selector */}
        <div className="space-y-2 pt-2 border-t border-blue-900/30">
          <span className="text-xs text-slate-300 block">Scenario Mode</span>
          <div className="grid grid-cols-1 gap-2">
            {modes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSimulationMode(mode.id)}
                disabled={!networkOnline}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs transition-colors border ${
                  simulationMode === mode.id 
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                } ${!networkOnline && 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-2">
                  {mode.icon}
                  <span>{mode.label}</span>
                </div>
                {simulationMode === mode.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSimulationMode('RESET SCENARIO')}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs transition-colors border bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET SCENARIO
          </button>
          
          <button
            onClick={() => setSimulationMode('LANDSLIDE')}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors border bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-800/40 hover:text-red-300"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            INJECT MID-JOURNEY DISASTER
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
