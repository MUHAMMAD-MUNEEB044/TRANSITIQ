import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  AlertTriangle,
  Radio,
  MapPin,
  Bell,
  ArrowRight,
  WifiOff,
} from 'lucide-react';
import api from '../../services/api.js';
import useSocket from '../../hooks/useSocket.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const STAT_KEYS = [
  { key: 'totalBuses', label: 'Total Buses', sub: 'Registered in Fleet', color: 'text-white', border: 'border-border-subtle' },
  { key: 'activeNow', label: 'Active Now', sub: 'En Route on live lines', color: 'text-status-green', border: 'border-status-green/30', pulse: true },
  { key: 'delayed', label: 'Delayed', sub: '>5 min behind schedule', color: 'text-status-yellow', border: 'border-status-yellow/30', icon: AlertTriangle },
  { key: 'offline', label: 'Offline', sub: 'Depot / Maintenance', color: 'text-status-red', border: 'border-status-red/30', icon: WifiOff },
];

const PERFORM_KEYS = [
  { key: 'routesLive', label: 'Routes Live', sub: 'Active corridors', color: 'text-accent-blue' },
  { key: 'tripsToday', label: 'Trips Today', sub: 'Scheduled and completed', color: 'text-text-primary' },
  { key: 'avgDelay', label: 'Avg Delay', sub: 'Across all city sectors', color: 'text-status-yellow', suffix: ' min' },
  { key: 'etaAccuracy', label: 'ETA Accuracy', sub: 'Telemetric precision rating', color: 'text-status-green', suffix: '%' },
];

const StatCard = ({ config, value }) => {
  const Icon = config.icon;
  return (
    <div className={`bg-surface border rounded-2xl p-4 shadow-lg ${config.border}`}>
      <span className={`text-[11px] uppercase block font-semibold flex items-center gap-1.5 ${
        config.key === 'activeNow' ? 'text-status-green' :
        config.key === 'delayed' ? 'text-status-yellow' :
        config.key === 'offline' ? 'text-status-red' : 'text-text-muted'
      }`}>
        <span>{config.label}</span>
        {config.pulse && <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />}
        {Icon && <Icon className="w-3.5 h-3.5" />}
      </span>
      {value == null ? (
        <div className="skeleton h-9 w-16 mt-2" />
      ) : (
        <div className={`text-2xl sm:text-3xl font-bold mt-1 ${config.color}`}>
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
          {config.suffix && <span className="text-sm font-normal">{config.suffix}</span>}
        </div>
      )}
      <span className="text-[10px] text-text-muted mt-1 block">{config.sub}</span>
    </div>
  );
};

export const OperatorDashboardPage = () => {
  const navigate = useNavigate();
  useSocket(); // Subscribes to live socket broadcasts

  const [stats, setStats] = useState(null);
  const [recentBuses, setRecentBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stats & buses on mount and poll every 30 seconds
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [overviewRes, busesRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/buses'),
        ]);

        if (overviewRes.data?.data) {
          setStats(overviewRes.data.data);
        }
        if (busesRes.data?.data) {
          setRecentBuses(busesRes.data.data);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load fleet telemetry. Retrying in 30 seconds.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-mono mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>TRANSIT OPERATIONS ROOM</span>
          </div>
          <h1 className="font-syne font-bold text-3xl text-white">
            Fleet Operations Overview
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Real-time telemetry, scheduling performance, and vehicle dispatch status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/operator/alerts')}
            className="px-4 py-2 bg-status-yellow/20 hover:bg-status-yellow text-status-yellow hover:text-background font-mono font-semibold text-xs rounded-xl border border-status-yellow/40 transition-all flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Broadcast Alert</span>
          </button>
          <button
            onClick={() => navigate('/operator/trips')}
            className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-background font-mono font-semibold text-xs rounded-xl shadow-lg shadow-accent-blue/20 transition-all flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            <span>Live Fleet Map</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-status-red/10 border border-status-red/30 text-status-red text-xs font-mono px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* DASHBOARD STATS GRID */}
      <div className="space-y-3 font-mono">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAT_KEYS.map((config) => (
            <StatCard key={config.key} config={config} value={stats?.[config.key] ?? null} />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PERFORM_KEYS.map((config) => (
            <StatCard key={config.key} config={config} value={stats?.[config.key] ?? null} />
          ))}
        </div>
      </div>

      {/* Fleet Telemetry Live Status Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
          <div>
            <h2 className="font-syne font-bold text-xl text-white">Active Fleet Telemetry</h2>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              Live status streamed from onboard GPS transponders
            </p>
          </div>
          <button
            onClick={() => navigate('/operator/buses')}
            className="text-xs font-mono text-accent-blue hover:underline flex items-center gap-1"
          >
            <span>Manage All Buses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading && recentBuses.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : recentBuses.length === 0 ? (
          <div className="py-10 text-center text-text-muted text-xs font-mono">
            No vehicles registered in the fleet yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border-subtle/60 text-text-muted uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Bus Number</th>
                  <th className="pb-3 font-semibold">Plate Number</th>
                  <th className="pb-3 font-semibold">Assigned Route</th>
                  <th className="pb-3 font-semibold">Speed</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {recentBuses.map((bus) => (
                  <tr key={bus._id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="py-3 font-bold text-white">
                      <span className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-accent-blue" />
                        <span>{bus.busNumber}</span>
                      </span>
                    </td>
                    <td className="py-3 text-text-muted">{bus.vehicleNumber}</td>
                    <td className="py-3 text-text-primary">
                      {bus.currentRoute?.routeName || 'Unassigned Line'}
                    </td>
                    <td className="py-3 text-status-green">
                      {bus.currentLocation?.speed != null ? `${Math.round(bus.currentLocation.speed)} km/h` : '—'}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={bus.status} isSimulated={bus.isSimulated} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          const rid = bus.currentRoute?._id || bus.currentRoute;
                          if (rid) navigate(`/track/${rid}`);
                        }}
                        className="px-2.5 py-1 bg-surface-alt hover:bg-accent-blue hover:text-background text-accent-blue rounded-lg border border-border-subtle transition-all disabled:opacity-40"
                        disabled={!bus.currentRoute}
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorDashboardPage;
