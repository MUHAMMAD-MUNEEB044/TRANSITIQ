import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Shuffle, Bus, MapPin } from 'lucide-react';

export const TransferRouteDisplay = ({ transfers = [] }) => {
  const navigate = useNavigate();

  if (!transfers || transfers.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-syne font-bold text-accent-purple">
        <Shuffle className="w-4 h-4" />
        <span>TRANSFER ROUTE OPTIONS (Connecting Service)</span>
      </div>

      {transfers.map((plan, idx) => (
        <div
          key={idx}
          className="bg-surface/90 border border-accent-purple/20 rounded-xl p-4 sm:p-5 shadow-xl relative overflow-hidden"
        >
          {/* Top connection banner */}
          <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-4 border-b border-border-subtle pb-2.5">
            <span className="text-accent-purple font-semibold">1-Stop Transfer Connection</span>
            <div className="flex items-center gap-1.5 text-text-primary">
              <Clock className="w-3.5 h-3.5 text-accent-blue" />
              <span>Est. Total Time: ~{Math.round(plan.totalDurationMinutes || 35)} min</span>
            </div>
          </div>

          {/* Stepper Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mb-4">
            {/* Leg 1 */}
            <div className="bg-background/60 p-3 rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue">
                  LEG 1
                </span>
                <span className="text-xs font-mono text-status-green">In {plan.leg1.etaMinutes || 5}m</span>
              </div>
              <h4 className="font-syne font-bold text-xs text-text-primary truncate">
                {plan.leg1.route.routeName}
              </h4>
              <p className="text-[11px] text-text-muted truncate mt-0.5">
                Board at: <span className="text-text-primary">{plan.leg1.fromStop?.stopName || 'Start Stop'}</span>
              </p>
            </div>

            {/* Transfer Point */}
            <div className="bg-accent-purple/10 p-3 rounded-lg border border-accent-purple/30 text-center">
              <span className="text-[10px] font-mono font-bold text-accent-purple uppercase block mb-1">
                INTERCHANGE STOP
              </span>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-text-primary">
                <MapPin className="w-3.5 h-3.5 text-accent-purple" />
                <span className="truncate">{plan.transferStop?.stopName || 'Interchange Junction'}</span>
              </div>
              <span className="text-[10px] text-text-muted mt-0.5 block">
                Wait time: ~{plan.connectionWaitMinutes || 4} mins
              </span>
            </div>

            {/* Leg 2 */}
            <div className="bg-background/60 p-3 rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-status-green/15 text-status-green">
                  LEG 2
                </span>
                <span className="text-xs font-mono text-text-muted">Connecting</span>
              </div>
              <h4 className="font-syne font-bold text-xs text-text-primary truncate">
                {plan.leg2.route.routeName}
              </h4>
              <p className="text-[11px] text-text-muted truncate mt-0.5">
                Alight at: <span className="text-text-primary">{plan.leg2.toStop?.stopName || 'End Stop'}</span>
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center justify-end gap-2 text-xs">
            <button
              onClick={() => navigate(`/track/${plan.leg1.route._id}`)}
              className="px-3 py-1.5 rounded-lg bg-surface-alt hover:bg-accent-blue/20 text-accent-blue border border-border-subtle transition-all font-mono"
            >
              Track Leg 1
            </button>
            <button
              onClick={() => navigate(`/track/${plan.leg2.route._id}`)}
              className="px-3 py-1.5 rounded-lg bg-surface-alt hover:bg-status-green/20 text-status-green border border-border-subtle transition-all font-mono"
            >
              Track Leg 2
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransferRouteDisplay;
