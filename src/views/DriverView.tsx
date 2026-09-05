'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Truck, Navigation, AlertTriangle, CheckCircle2, Clock, MapPin, Package, Shield, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/features/command-center/MapComponent'), { ssr: false });

export function DriverView() {
  const { currentUserRole, currentDriverVehicleId, vehicles, shipments, alerts, acknowledgeRouteChange, setTrackedVehicleId, setView, setCurrentUserRole } = useAppStore();

  useEffect(() => {
    if (currentUserRole !== 'Driver') {
      useAppStore.getState().setView('login');
    }
  }, [currentUserRole]);

  // Driver only sees their assigned vehicle
  const myVehicle = currentDriverVehicleId
    ? vehicles.find(v => v.id === currentDriverVehicleId)
    : undefined;

  const myShipment = shipments.find(s => s.assignedVehicleId === myVehicle?.id);

  // Focus the map on this driver's vehicle
  useEffect(() => {
    if (myVehicle) {
      setTrackedVehicleId(myVehicle.id);
    }
    return () => {
      setTrackedVehicleId(null); // reset on unmount
    };
  }, [myVehicle, setTrackedVehicleId]);

  if (currentUserRole !== 'Driver' || !myVehicle) return null;

  const myAlerts = alerts.filter(a => a.recipientRole === 'Driver' && !a.read);
  const criticalUpdate = myAlerts.find(a => a.type === 'ROUTE UPDATE' && a.actionRequired && !a.actionTaken);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans">
      <header className="px-4 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <Truck className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-slate-100">{myVehicle.id}</h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{myVehicle.driver}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            myVehicle.status === 'In Transit' ? 'bg-blue-500/20 text-blue-400' :
            myVehicle.status === 'Delayed' ? 'bg-amber-500/20 text-amber-400' :
            myVehicle.status === 'Route Change Pending' ? 'bg-orange-500/20 text-orange-400' :
            myVehicle.status === 'Paused for Safety' ? 'bg-red-500/20 text-red-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {myVehicle.status}
          </div>
          <button
            onClick={() => { setCurrentUserRole('Dispatcher'); setView('login'); }}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">

        {/* Critical Acknowledgment Card */}
        {criticalUpdate && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-5 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
              <h2 className="text-lg font-bold text-red-400 uppercase tracking-wide">Critical Route Update</h2>
            </div>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">{criticalUpdate.message}</p>
            <button
              onClick={() => acknowledgeRouteChange(criticalUpdate.id)}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
            >
              <CheckCircle2 className="inline w-4 h-4 mr-2" /> Acknowledge & Proceed
            </button>
          </div>
        )}

        {/* My Shipment Card */}
        {myShipment && (
          <Card className="border-blue-800/40 bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-slate-100 text-sm">{myShipment.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    myShipment.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    myShipment.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{myShipment.priority}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  myShipment.status === 'In Transit' ? 'bg-emerald-500/20 text-emerald-400' :
                  myShipment.status === 'Delayed' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-700 text-slate-400'
                }`}>{myShipment.status}</span>
              </div>
              <p className="text-sm text-slate-300 font-medium mb-3">{myShipment.cargoType}</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-300">From:</span>
                  {myShipment.origin}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Navigation className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-semibold text-slate-300">To:</span>
                  {myShipment.destination}
                </div>
              </div>
              {myShipment.scheduleType === 'scheduled' && myShipment.schedule && (
                <div className="mt-3 pt-3 border-t border-blue-800/30 flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Recurring: <span className="text-purple-400 font-semibold">{myShipment.schedule}</span>
                </div>
              )}
              {myShipment.notes && (
                <div className="mt-2 text-xs text-slate-500 italic">{myShipment.notes}</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ETA & Speed Card */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">ETA</span>
              <span className="text-2xl font-bold text-slate-100">{myVehicle.eta}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <Truck className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Speed</span>
              <span className="text-2xl font-bold text-slate-100">{myVehicle.speed} <span className="text-sm font-normal text-slate-500">km/h</span></span>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span className="truncate max-w-[45%]">{myShipment?.origin}</span>
              <span className="text-slate-400 font-bold">{Math.round((myVehicle.progress ?? 0) * 100)}%</span>
              <span className="truncate max-w-[45%] text-right">{myShipment?.destination}</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${(myVehicle.progress ?? 0) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Live Map (showing only this driver's vehicle) */}
        <Card>
          <CardContent className="p-0" style={{ height: '280px' }}>
            <Map />
          </CardContent>
        </Card>

        {/* Alerts */}
        {myAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Alerts</h3>
            {myAlerts.map(alert => (
              <div key={alert.id} className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-3 flex gap-3 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">{alert.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
