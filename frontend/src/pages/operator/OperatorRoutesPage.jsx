import React, { useEffect, useState } from 'react';
import { Route as RouteIcon, Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { toast } from '../../store/toastStore.js';

export const OperatorRoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Create Route Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [totalDistance, setTotalDistance] = useState(12);
  const [estimatedDuration, setEstimatedDuration] = useState(35);
  const [colorCode, setColorCode] = useState('#38BDF8');

  // Selected Route for Stops Editing
  const [editingRoute, setEditingRoute] = useState(null);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes');
      setRoutes(res.data.data || []);
      setError(null);
    } catch (e) {
      setError('Failed to load route corridors. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/routes', {
        routeName,
        startLocation,
        destination,
        totalDistance: Number(totalDistance),
        estimatedDuration: Number(estimatedDuration),
        colorCode,
      });

      setRoutes((prev) => [...prev, res.data.data]);
      setShowAddModal(false);
      setRouteName('');
      setStartLocation('');
      setDestination('');
      toast.success('Transit corridor created.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create route.');
    }
  };

  const handleDeleteRoute = async (id) => {
    try {
      await api.delete(`/routes/${id}`);
      setRoutes((prev) => prev.filter((r) => r._id !== id));
      if (editingRoute?._id === id) setEditingRoute(null);
      setDeleteTarget(null);
      toast.success('Transit corridor deleted.');
    } catch (err) {
      toast.error('Error deleting route.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
            Transit Corridors & Stops
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Configure municipal lines, scheduled stop orders, and expected transit durations
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-background font-mono font-semibold text-xs rounded-xl shadow-lg shadow-accent-blue/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Route Corridor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Routes List Table */}
        <div className="lg:col-span-8 glass-card p-6">
          {error && (
            <div className="mb-4 bg-status-red/10 border border-status-red/30 text-status-red text-xs font-mono px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs font-mono">
              No corridors yet — create your first transit line to get started.
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border-subtle/60 text-text-muted uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Route Name</th>
                  <th className="pb-3 font-semibold">Terminals</th>
                  <th className="pb-3 font-semibold">Distance</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Stops</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {routes.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => setEditingRoute(r)}
                    className={`cursor-pointer hover:bg-surface-alt/60 transition-colors ${
                      editingRoute?._id === r._id ? 'bg-surface-alt/80 border-l-2 border-accent-blue' : ''
                    }`}
                  >
                    <td className="py-3 font-bold text-white flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: r.colorCode || '#38BDF8' }}
                      />
                      <span>{r.routeName}</span>
                    </td>
                    <td className="py-3 text-text-muted">
                      <span className="text-white truncate block">{r.startLocation}</span>
                      <span className="text-[10px] text-text-muted truncate block">➔ {r.destination}</span>
                    </td>
                    <td className="py-3 text-accent-blue">{r.totalDistance} km</td>
                    <td className="py-3 text-text-primary">~{r.estimatedDuration}m</td>
                    <td className="py-3 text-status-green font-bold">
                      {r.stops?.length || 0}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(r);
                        }}
                        className="p-1 text-text-muted hover:text-status-red"
                        title="Delete route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Stop Order Editor Panel */}
        <div className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-5 shadow-xl">
          <h3 className="font-syne font-bold text-base text-white mb-1">
            Stop Order Sequence
          </h3>
          <p className="text-[11px] font-mono text-text-muted mb-4">
            {editingRoute ? editingRoute.routeName : 'Click a route to view its stop sequence'}
          </p>

          {editingRoute ? (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 font-mono text-xs">
              {(editingRoute.stops || []).map((s, idx) => (
                <div
                  key={idx}
                  className="bg-surface-alt/70 p-3 rounded-xl border border-border-subtle flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[160px]">
                      {s.stopId?.stopName || `Stop #${idx + 1}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    +{s.expectedDuration || 5} min
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-text-muted font-mono text-xs">
              Select a transit line from the table to inspect sequence ordering.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete transit corridor"
        message={`This will permanently remove ${deleteTarget?.routeName || 'this route'}. Vehicles and stops referencing it will be unlinked.`}
        confirmLabel="Delete Route"
        danger
        onConfirm={() => handleDeleteRoute(deleteTarget?._id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border-subtle rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-accent-blue">
                <RouteIcon className="w-5 h-5" />
                <h3 className="font-syne font-bold text-lg text-white">Create Transit Line</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-text-muted uppercase mb-1">Route Identifier & Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. R-03 (Clifton ↔ Gulshan Express)"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-text-muted uppercase mb-1">Start Terminal</label>
                  <input
                    type="text"
                    required
                    placeholder="Clifton 3 Talwar"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-text-muted uppercase mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    placeholder="NIPA Chowrangi"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-text-muted uppercase mb-1">Distance (km)</label>
                  <input
                    type="number"
                    required
                    value={totalDistance}
                    onChange={(e) => setTotalDistance(e.target.value)}
                    className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-text-muted uppercase mb-1">Est. Duration (min)</label>
                  <input
                    type="number"
                    required
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-muted uppercase mb-1">Polyline Map Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="w-10 h-10 rounded border border-border-subtle bg-transparent cursor-pointer"
                  />
                  <span className="text-white font-mono">{colorCode}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Save Route Corridor</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorRoutesPage;
