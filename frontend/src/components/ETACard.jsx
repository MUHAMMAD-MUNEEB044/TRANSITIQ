import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Bus, AlertTriangle, X, Radio } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

export const ETACard = ({
  busNumber = 'PK-BUS-101',
  routeName = 'Karachi City Express',
  nextStop = 'Next Stop',
  initialEtaMinutes = 4,
  status = 'ON TIME',
  delayMinutes = 0,
  isSimulated = false,
  isGpsLost = false,
  onDismiss = null,
}) => {
  const [eta, setEta] = useState(initialEtaMinutes);

  useEffect(() => {
    setEta(initialEtaMinutes);
  }, [initialEtaMinutes]);

  // Recalculate countdown every 30s, stopping at "arriving now"
  useEffect(() => {
    if (eta <= 0) return;
    const interval = setInterval(() => {
      setEta((prev) => Math.max(0, prev - 1));
    }, 30000);
    return () => clearInterval(interval);
  }, [eta]);

  return (
    <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-80 z-[1000] bg-surface/95 backdrop-blur-md border border-border-subtle hover:border-accent-blue/40 rounded-xl p-4 shadow-2xl transition-all duration-300 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-accent-blue font-bold">
            <Bus className="w-3.5 h-3.5" />
            <span>{busNumber}</span>
          </div>
          <h4 className="font-syne font-bold text-sm text-text-primary truncate">
            {routeName}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          <StatusBadge
            status={isGpsLost ? 'GPS LOST' : status}
            isSimulated={isSimulated}
            size="sm"
          />
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-text-muted hover:text-white rounded hover:bg-white/10"
              title="Close card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Countdown Display */}
      <div className="bg-background/80 rounded-lg p-3 border border-border-subtle/50 mb-2.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-text-muted uppercase block">
            NEXT STOP
          </span>
          <div className="flex items-center gap-1 text-xs font-semibold text-text-primary mt-0.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-status-yellow shrink-0" />
            <span className="truncate">{nextStop}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-text-muted uppercase block">
            EST. ARRIVAL
          </span>
          <div className={`font-mono text-lg font-bold flex items-center gap-1 justify-end ${eta <= 0 ? 'text-status-green' : 'text-accent-blue'}`}>
            <Clock className={`w-4 h-4 ${eta > 0 ? 'text-accent-blue animate-pulse' : 'text-status-green'}`} />
            <span>{eta <= 0 ? 'Arriving' : `${eta} min`}</span>
          </div>
        </div>
      </div>

      {/* Delay / Simulation Alerts */}
      {delayMinutes > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-status-yellow font-mono bg-status-yellow/10 py-1.5 px-2.5 rounded-lg border border-status-yellow/20 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Running {delayMinutes} min behind schedule</span>
        </div>
      )}

      {isSimulated && (
        <div className="flex items-center gap-1.5 text-[11px] text-accent-purple font-mono bg-accent-purple/10 py-1 px-2.5 rounded-lg border border-accent-purple/20">
          <Radio className="w-3 h-3 shrink-0 animate-pulse" />
          <span>Live Pakistan GPS Simulator Active</span>
        </div>
      )}

      {isGpsLost && (
        <div className="flex items-center gap-1.5 text-xs text-status-red font-mono bg-status-red/10 py-1.5 px-2.5 rounded-lg border border-status-red/20 mt-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Location temporarily unavailable</span>
        </div>
      )}
    </div>
  );
};

export default ETACard;
