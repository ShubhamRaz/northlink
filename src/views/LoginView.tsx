'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { UserRole } from '@/types';
import { mockDrivers } from '@/data/mockData';
import { Shield, Truck, Users, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export function LoginView() {
  const { setCurrentUserRole, setCurrentDriverVehicleId } = useAppStore();
  const [showDriverSelect, setShowDriverSelect] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(mockDrivers[0]);

  const handleLogin = (role: UserRole) => {
    if (role === 'Driver') {
      setShowDriverSelect(true);
      return;
    }
    setCurrentUserRole(role);
    if (role === 'Dispatcher' || role === 'Admin') {
      useAppStore.getState().setView('command-center');
    } else if (role === 'Field Officer') {
      useAppStore.getState().setView('field');
    }
  };

  const handleDriverLogin = () => {
    setCurrentUserRole('Driver');
    setCurrentDriverVehicleId(selectedDriver.vehicleId);
    useAppStore.getState().setView('driver');
  };

  const roles = [
    { role: 'Dispatcher' as UserRole, icon: <LayoutDashboard className="w-8 h-8 text-blue-400" />, desc: 'Command Center & Route Approval', color: 'blue' },
    { role: 'Field Officer' as UserRole, icon: <Users className="w-8 h-8 text-emerald-400" />, desc: 'Offline Incident Reporting', color: 'emerald' },
    { role: 'Driver' as UserRole, icon: <Truck className="w-8 h-8 text-amber-400" />, desc: 'My Cargo & Route Updates', color: 'amber' },
    { role: 'Admin' as UserRole, icon: <Shield className="w-8 h-8 text-purple-400" />, desc: 'Full System Access', color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-purple-600" />

      <div className="relative z-10 max-w-4xl w-full">
        <div className="text-center mb-12">
          <img src="/northlink.png" alt="Northlink AI Logo" className="inline-flex w-20 h-20 rounded-2xl mb-6 shadow-lg shadow-blue-900/50 object-cover" />
          <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">NORTHLINK AI</h1>
          <p className="text-slate-500 text-sm mb-2 uppercase tracking-widest font-semibold">
            AI-Powered Resilient Logistics & Accessibility Intelligence
          </p>
          <p className="text-base text-slate-400 max-w-lg mx-auto mt-4">
            Predict disruptions. Assess accessibility. Optimize critical logistics.
          </p>
        </div>

        {!showDriverSelect ? (
          <>
            <p className="text-center text-xs text-slate-500 mb-6 uppercase tracking-wider font-semibold">Select Role to Continue</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {roles.map((item) => (
                <Card
                  key={item.role}
                  className="bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-600 cursor-pointer transition-all hover:-translate-y-1 group"
                  onClick={() => handleLogin(item.role)}
                >
                  <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                    <div className="p-4 bg-slate-950 rounded-full shadow-inner border border-slate-800 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-200 mb-1">{item.role}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="text-xs text-slate-600 group-hover:text-blue-400 transition-colors font-medium mt-2">
                      ENTER →
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          /* Driver selection screen */
          <div className="max-w-sm mx-auto">
            <p className="text-center text-xs text-slate-500 mb-6 uppercase tracking-wider font-semibold">Select Your Vehicle</p>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-amber-400" />
                  <h3 className="font-bold text-slate-200">Driver Login</h3>
                </div>

                <div className="relative">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Assigned Vehicle</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-slate-200 focus:border-amber-500 focus:outline-none pr-8"
                      value={selectedDriver.driverId}
                      onChange={e => {
                        const d = mockDrivers.find(d => d.driverId === e.target.value);
                        if (d) setSelectedDriver(d);
                      }}
                    >
                      {mockDrivers.map(d => (
                        <option key={d.driverId} value={d.driverId}>
                          {d.vehicleLabel} — {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-500">Driver</span>
                    <span className="text-slate-200 font-semibold">{selectedDriver.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle</span>
                    <span className="text-amber-400 font-semibold">{selectedDriver.vehicleId}</span>
                  </div>
                </div>

                <button
                  onClick={handleDriverLogin}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" /> Enter Driver Mode
                </button>

                <button
                  onClick={() => setShowDriverSelect(false)}
                  className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  ← Back to Role Select
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-slate-600">
            NORTHLINK AI · SIH 2026 Prototype · Simulated Operational Data · v2.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
