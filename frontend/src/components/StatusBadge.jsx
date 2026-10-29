import React from 'react';
import { AlertTriangle, WifiOff, Radio, Navigation, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status = 'ON TIME', size = 'normal', isSimulated = false }) => {
  const normStatus = (status || '').toUpperCase().replace('_', ' ');

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-mono font-medium';

  if (isSimulated || normStatus === 'SIMULATED') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-accent-purple/15 text-accent-purple border border-accent-purple/30 ${sizeClasses}`}>
        <Radio className="w-3 h-3 animate-pulse" />
        <span>SIMULATION MODE</span>
      </span>
    );
  }

  switch (normStatus) {
    case 'ON TIME':
    case 'ACTIVE':
    case 'AVAILABLE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-status-green/15 text-status-green border border-status-green/30 ${sizeClasses}`}>
          <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
          <span>ON TIME</span>
        </span>
      );

    case 'DELAYED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-status-yellow/15 text-status-yellow border border-status-yellow/30 ${sizeClasses}`}>
          <AlertTriangle className="w-3 h-3" />
          <span>DELAYED</span>
        </span>
      );

    case 'ON ROUTE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/30 ${sizeClasses}`}>
          <Navigation className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
          <span>ON ROUTE</span>
        </span>
      );

    case 'GPS LOST':
    case 'LOCATION UNAVAILABLE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-status-red/20 text-status-red border border-status-red/50 animate-pulse ${sizeClasses}`}>
          <WifiOff className="w-3.5 h-3.5" />
          <span>GPS LOST</span>
        </span>
      );

    case 'OFFLINE':
    case 'BREAK':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-status-red/15 text-status-red border border-status-red/30 ${sizeClasses}`}>
          <span className="w-2 h-2 rounded-full bg-status-red" />
          <span>{normStatus || 'OFFLINE'}</span>
        </span>
      );
  }
};

export default StatusBadge;
