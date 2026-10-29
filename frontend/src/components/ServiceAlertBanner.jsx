import React, { useEffect } from 'react';
import { useAlertStore } from '../store/alertStore.js';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ServiceAlertBanner = () => {
  const alerts = useAlertStore((s) => s.alerts);
  const dismissedAlertIds = useAlertStore((s) => s.dismissedAlertIds);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const dismissAlert = useAlertStore((s) => s.dismissAlert);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const activeVisibleAlerts = alerts.filter(
    (a) => a.isActive && !dismissedAlertIds.has(a._id)
  );

  if (activeVisibleAlerts.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1.5 z-40 bg-surface border-b border-border-subtle">
      {activeVisibleAlerts.slice(0, 2).map((alert) => {
        let borderClass = 'border-l-4 border-l-accent-blue bg-accent-blue/10 text-accent-blue';
        let Icon = Info;

        if (alert.severity === 'critical') {
          borderClass = 'border-l-4 border-l-status-red bg-status-red/10 text-status-red';
          Icon = AlertCircle;
        } else if (alert.severity === 'warning') {
          borderClass = 'border-l-4 border-l-status-yellow bg-status-yellow/10 text-status-yellow';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={alert._id}
            className={`px-4 py-2.5 flex items-center justify-between text-sm transition-all duration-300 ${borderClass}`}
          >
            <div className="flex items-center gap-3 pr-4">
              <Icon className="w-4 h-4 shrink-0" />
              <div className="text-text-primary text-xs sm:text-sm font-medium">
                <span className="uppercase text-[11px] font-bold tracking-wider opacity-80 mr-2">
                  [{alert.severity || 'NOTICE'}]
                </span>
                {alert.message}
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert._id)}
              className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white transition-colors"
              title="Dismiss announcement"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ServiceAlertBanner;
