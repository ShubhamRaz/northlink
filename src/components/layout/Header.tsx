'use client';

import React, { useState, useEffect } from 'react';
import { Bell, User } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { NotificationCenter } from '@/components/ui/NotificationCenter';

export function Header() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const { currentUserRole, alerts } = useAppStore();
  const userAlerts = alerts.filter(a => !a.recipientRole || a.recipientRole === currentUserRole);
  const unreadCount = userAlerts.filter(a => !a.read).length;

  useEffect(() => {
    // Defer initial time set to a microtask to avoid synchronous setState in effect body
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setCurrentTime(new Date());
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-slate-100">COMMAND CENTER</h2>
          <span className="text-xs text-slate-400">Northeast logistics operational overview</span>
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <span className="text-slate-400">System Status:</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Operational
          </span>
        </div>

        <div className="hidden lg:flex items-center text-sm text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-md">
          {currentTime ? format(currentTime, 'MMM dd, yyyy HH:mm') : 'Loading...'}
        </div>

        <div className="flex items-center gap-4">
          <button
            className="text-slate-400 hover:text-slate-100 transition-colors relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-blue-600 text-white text-[9px] font-bold rounded-full border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationCenter onClose={() => setShowNotifications(false)} />
          )}

          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200">{currentUserRole}</span>
              <span className="text-xs text-slate-500">Logistics HQ</span>
            </div>
            <button
              onClick={() => useAppStore.getState().setView('login')}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
