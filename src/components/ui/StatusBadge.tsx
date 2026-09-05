import React from 'react';
import { cn } from '@/lib/utils';
import { OperationalStatus } from '@/types';
import { AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: OperationalStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let bgColor = '';
  let textColor = '';
  let Icon = CheckCircle2;

  switch (status) {
    case 'OPEN':
      bgColor = 'bg-emerald-500/10';
      textColor = 'text-emerald-500';
      Icon = CheckCircle2;
      break;
    case 'CAUTION':
      bgColor = 'bg-amber-500/10';
      textColor = 'text-amber-500';
      Icon = AlertTriangle;
      break;
    case 'RESTRICTED':
      bgColor = 'bg-orange-500/10';
      textColor = 'text-orange-500';
      Icon = AlertCircle;
      break;
    case 'BLOCKED':
      bgColor = 'bg-red-500/10';
      textColor = 'text-red-500';
      Icon = XCircle;
      break;
  }

  return (
    <div className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent', bgColor, textColor, className)}>
      <Icon className="w-3 h-3 mr-1.5" />
      {status}
    </div>
  );
}
