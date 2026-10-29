import React, { useEffect, useState } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, Clock, MapPin, Bus } from 'lucide-react';
import { useAlertStore } from '../store/alertStore.js';

export const AlertsPage = () => {
  const { alerts, fetchAlerts, loading } = useAlertStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-yellow/15 text-status-yellow text-xs font-mono mb-2">
            <Bell className="w-3 h-3 animate-pulse" />
            <span>REAL-TIME BULLETIN</span>
          </div>
          <h1 className="font-syne font-bold text-3xl text-white">
            Transit Service Alerts
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Real-time notifications regarding delays, route diversions, and schedule announcements
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-border-subtle text-xs font-mono">
          {['all', 'critical', 'warning', 'info'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                filter === lvl
                  ? 'bg-surface-alt text-accent-blue font-bold border border-accent-blue/30 shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-mono text-text-muted">Fetching service bulletins...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-surface p-12 rounded-2xl border border-border-subtle text-center text-text-muted">
          <Bell className="w-10 h-10 mx-auto text-text-muted/40 mb-3" />
          <p className="font-medium text-white mb-1">No active service alerts</p>
          <span className="text-xs font-mono">All transit lines in Pakistan are operating on normal schedule.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            let Icon = Info;
            let badgeBg = 'bg-accent-blue/15 text-accent-blue border-accent-blue/30';
            if (alert.severity === 'critical') {
              Icon = AlertCircle;
              badgeBg = 'bg-status-red/15 text-status-red border-status-red/30';
            } else if (alert.severity === 'warning') {
              Icon = AlertTriangle;
              badgeBg = 'bg-status-yellow/15 text-status-yellow border-status-yellow/30';
            }

            return (
              <div
                key={alert._id}
                className="bg-surface hover:bg-surface-alt/70 border border-border-subtle rounded-2xl p-5 shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono uppercase font-bold border flex items-center gap-1.5 ${badgeBg}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{alert.severity}</span>
                    </span>
                    <span className="text-xs font-mono text-text-muted capitalize">
                      Type: {alert.type}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(alert.createdAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-text-primary text-sm font-medium mb-3">
                  {alert.message}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted border-t border-border-subtle/50 pt-2.5">
                  {alert.routeId && (
                    <div className="flex items-center gap-1 text-accent-blue">
                      <Bus className="w-3.5 h-3.5" />
                      <span>Route: {alert.routeId.routeName || 'Assigned Route'}</span>
                    </div>
                  )}
                  {alert.stopId && (
                    <div className="flex items-center gap-1 text-status-yellow">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Stop: {alert.stopId.stopName || 'Transit Hub'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
