import React, { useEffect, useState } from 'react';
import { Bell, Send, Trash2, AlertTriangle, AlertCircle, Info, Radio, Clock } from 'lucide-react';
import api from '../../services/api.js';
import getSocket from '../../services/socket.js';
import { toast } from '../../store/toastStore.js';

export const OperatorAlertsPage = () => {
  const socket = getSocket();

  const [alerts, setAlerts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for Composer
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedStopId, setSelectedStopId] = useState('');
  const [severity, setSeverity] = useState('warning'); // 'info' | 'warning' | 'critical'
  const [alertType, setAlertType] = useState('delay');
  const [message, setMessage] = useState('');
  const [expiryHours, setExpiryHours] = useState(6);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes, routesRes, stopsRes] = await Promise.all([
        api.get('/alerts'),
        api.get('/routes'),
        api.get('/stops'),
      ]);
      setAlerts(alertsRes.data.data || []);
      setRoutes(routesRes.data.data || []);
      setStops(stopsRes.data.data || []);
    } catch (e) {
      console.warn('Error loading alerts:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBroadcastAlert = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

      const res = await api.post('/alerts', {
        routeId: selectedRouteId || null,
        stopId: selectedStopId || null,
        type: alertType,
        message,
        severity,
        expiresAt,
      });

      const newAlert = res.data.data;
      setAlerts((prev) => [newAlert, ...prev]);

      // Emit to socket for instant passenger update
      socket.emit('alert:service_broadcast', {
        ...newAlert,
        timestamp: new Date().toISOString(),
      });

      setMessage('');
      toast.success('Service bulletin broadcast to the passenger network.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed.');
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      toast.success('Alert deactivated.');
    } catch (err) {
      toast.error('Deactivation failed.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
          Service Alert Broadcast Composer
        </h1>
        <p className="text-xs font-mono text-text-muted mt-1">
          Publish network bulletins, passenger advisories, and delay notices across Pakistan corridors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COMPOSER FORM */}
        <div className="lg:col-span-5 bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 text-status-yellow mb-4">
            <Bell className="w-5 h-5" />
            <h2 className="font-syne font-bold text-lg text-white">Compose Bulletin</h2>
          </div>

          <form onSubmit={handleBroadcastAlert} className="space-y-4 font-mono text-xs">
            {/* Route Selector */}
            <div>
              <label className="block text-text-muted uppercase mb-1">Target Route (Optional)</label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
              >
                <option value="">-- All Pakistan Routes (Network-Wide) --</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.routeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Stop Selector */}
            <div>
              <label className="block text-text-muted uppercase mb-1">Specific Stop (Optional)</label>
              <select
                value={selectedStopId}
                onChange={(e) => setSelectedStopId(e.target.value)}
                className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
              >
                <option value="">-- No Specific Stop --</option>
                {stops.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.stopName}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Selector (Color-Coded) */}
            <div>
              <label className="block text-text-muted uppercase mb-1">Severity Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 'info', label: 'Info', color: 'border-accent-blue text-accent-blue bg-accent-blue/15' },
                  { level: 'warning', label: 'Warning', color: 'border-status-yellow text-status-yellow bg-status-yellow/15' },
                  { level: 'critical', label: 'Critical', color: 'border-status-red text-status-red bg-status-red/15' },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setSeverity(item.level)}
                    className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                      severity === item.level
                        ? `${item.color} shadow-md`
                        : 'border-border-subtle text-text-muted bg-surface-alt hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div>
              <label className="block text-text-muted uppercase mb-1">Alert Message</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. M.A. Jinnah road water main repair in progress. Expect 15-20 min delays..."
                className="w-full bg-surface-alt text-white p-3 rounded-xl border border-border-subtle focus:border-accent-blue focus:outline-none placeholder:text-text-muted text-xs leading-relaxed"
              />
            </div>

            {/* Expiry Hours */}
            <div>
              <label className="block text-text-muted uppercase mb-1">Auto-Expiry Window</label>
              <div className="flex items-center gap-2">
                {[2, 6, 12, 24].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setExpiryHours(hrs)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs ${
                      expiryHours === hrs
                        ? 'bg-accent-blue text-background font-bold border-accent-blue'
                        : 'bg-surface-alt text-text-muted border-border-subtle'
                    }`}
                  >
                    {hrs}h
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast Action Button */}
            <button
              type="submit"
              id="btn-broadcast-alert"
              className="w-full py-3 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20 transition-all mt-2"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Alert to Network</span>
            </button>
          </form>
        </div>

        {/* ACTIVE BULLETINS TABLE */}
        <div className="lg:col-span-7 bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-syne font-bold text-lg text-white mb-4">
              Active Broadcast Stream ({alerts.length})
            </h2>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="py-16 text-center text-text-muted font-mono text-xs">
                  No active broadcast alerts currently live on passenger channels.
                </div>
              ) : (
                alerts.map((a) => {
                  let badge = 'bg-accent-blue/15 text-accent-blue border-accent-blue/30';
                  if (a.severity === 'critical') badge = 'bg-status-red/15 text-status-red border-status-red/30';
                  if (a.severity === 'warning') badge = 'bg-status-yellow/15 text-status-yellow border-status-yellow/30';

                  return (
                    <div
                      key={a._id}
                      className="bg-surface-alt/60 p-4 rounded-xl border border-border-subtle flex items-start justify-between gap-3 text-xs font-mono"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge}`}>
                            {a.severity}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {(() => {
                              const ms = new Date(a.expiresAt) - Date.now();
                              if (Number.isNaN(ms) || ms <= 0) return 'Expired';
                              return `Expires in ${Math.max(1, Math.round(ms / 3600000))}h`;
                            })()}
                          </span>
                        </div>
                        <p className="text-white text-xs font-sans font-medium">{a.message}</p>
                        {a.routeId && (
                          <div className="text-[11px] text-accent-blue">
                            Route: {a.routeId.routeName || 'Assigned Route'}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteAlert(a._id)}
                        className="p-1.5 text-text-muted hover:text-status-red transition-colors shrink-0"
                        title="Deactivate alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorAlertsPage;
