'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Bell, CheckCircle2, AlertTriangle, Route as RouteIcon, Info, X } from 'lucide-react';
import { Alert } from '@/types';

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { alerts, markAlertRead, acknowledgeAlert, acknowledgeRouteChange, currentUserRole } = useAppStore();

  // Filter alerts for the current user role (or system-wide)
  const userAlerts = alerts.filter(a => !a.recipientRole || a.recipientRole === currentUserRole);
  const unreadCount = userAlerts.filter(a => !a.read).length;

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'ROUTE UPDATE': return <RouteIcon className="w-4 h-4 text-blue-500" />;
      case 'INCIDENT': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'SYSTEM': return <Info className="w-4 h-4 text-slate-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBgClass = (type: Alert['type'], read: boolean) => {
    if (read) return 'bg-slate-900/50 opacity-70';
    switch (type) {
      case 'CRITICAL': return 'bg-red-950/30 border border-red-900/50';
      case 'ROUTE UPDATE': return 'bg-blue-950/30 border border-blue-900/50';
      case 'INCIDENT': return 'bg-orange-950/30 border border-orange-900/50';
      default: return 'bg-slate-800/50 border border-slate-700/50';
    }
  };

  return (
    <div className="absolute top-16 right-4 w-80 max-h-[500px] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-300" />
          <h3 className="font-bold text-sm text-slate-200">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {userAlerts.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">No notifications.</div>
        ) : (
          userAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-lg flex gap-3 transition-colors ${getBgClass(alert.type, alert.read)}`}
            >
              <div className="mt-0.5 shrink-0">
                {getIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-xs font-bold truncate ${!alert.read ? 'text-slate-200' : 'text-slate-400'}`}>
                    {alert.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2">{alert.timestamp}</span>
                </div>
                <p className={`text-[11px] leading-relaxed mb-2 ${!alert.read ? 'text-slate-300' : 'text-slate-500'}`}>
                  {alert.message}
                </p>
                
                <div className="flex gap-2">
                  {alert.actionRequired && !alert.actionTaken && (
                    <button 
                      onClick={() => alert.type === 'ROUTE UPDATE' && currentUserRole === 'Driver'
                        ? acknowledgeRouteChange(alert.id)
                        : acknowledgeAlert(alert.id)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded font-bold transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {!alert.read && (!alert.actionRequired || alert.actionTaken) && (
                    <button 
                      onClick={() => markAlertRead(alert.id)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark Read
                    </button>
                  )}
                </div>
              </div>
              {!alert.read && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
      
      {unreadCount > 0 && (
        <div className="p-2 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={() => userAlerts.forEach(a => markAlertRead(a.id))}
            className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}
