import React, { useEffect, useState } from 'react';
import { Bus, Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { toast } from '../../store/toastStore.js';

export const OperatorBusesPage = () => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [busNumber, setBusNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState(45);
  const [selectedRoute, setSelectedRoute] = useState('');

  const fetchFleet = async () => {
    setLoading(true);
    try {
      const [busesRes, routesRes] = await Promise.all([
        api.get('/buses'),
        api.get('/routes'),
      ]);
      setBuses(busesRes.data.data || []);
      setRoutes(routesRes.data.data || []);
      setError(null);
    } catch (e) {
      setError('Failed to load fleet data. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleStatusChange = async (busId, newStatus) => {
    try {
      await api.put(`/buses/${busId}`, { status: newStatus });
      setBuses((prev) =>
        prev.map((b) => (b._id === busId ? { ...b, status: newStatus } : b))
      );
      toast.success('Vehicle status updated.');
    } catch (e) {
      toast.error('Could not update vehicle status. Please retry.');
    }
  };

  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/buses', {
        busNumber,
        vehicleNumber,
        capacity: Number(capacity),
        currentRoute: selectedRoute || null,
        status: 'available',
      });

      setBuses((prev) => [...prev, res.data.data]);
      setShowAddModal(false);
      setBusNumber('');
      setVehicleNumber('');
      toast.success(`${res.data.data?.busNumber || 'Vehicle'} added to the fleet.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add bus.');
    }
  };

  const handleDeleteBus = async (busId) => {
    const target = buses.find((b) => b._id === busId);
    try {
      await api.delete(`/buses/${busId}`);
      setBuses((prev) => prev.filter((b) => b._id !== busId));
      setDeleteTarget(null);
      toast.success(`${target?.busNumber || 'Vehicle'} removed from the fleet.`);
    } catch (e) {
      toast.error('Failed to delete bus.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
            Bus Fleet Management
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Maintain vehicle registry, capacity ratings, and active operational states
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-background font-mono font-semibold text-xs rounded-xl shadow-lg shadow-accent-blue/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Buses Table */}
      <div className="glass-card p-6">
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
        ) : buses.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs font-mono">
            No vehicles in the fleet yet — add your first bus to get started.
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border-subtle/60 text-text-muted uppercase text-[10px]">
                <th className="pb-3 font-semibold">Bus ID</th>
                <th className="pb-3 font-semibold">Plate Number</th>
                <th className="pb-3 font-semibold">Capacity</th>
                <th className="pb-3 font-semibold">Assigned Route</th>
                <th className="pb-3 font-semibold">Telemetry Status</th>
                <th className="pb-3 font-semibold">Change State</th>
                <th className="pb-3 font-semibold text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30">
              {buses.map((bus) => (
                <tr key={bus._id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="py-3 font-bold text-white flex items-center gap-2">
                    <Bus className="w-4 h-4 text-accent-blue" />
                    <span>{bus.busNumber}</span>
                  </td>
                  <td className="py-3 text-text-muted">{bus.vehicleNumber}</td>
                  <td className="py-3 text-text-primary">{bus.capacity} seats</td>
                  <td className="py-3 text-text-primary">
                    {bus.currentRoute?.routeName || 'Unassigned'}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={bus.status} isSimulated={bus.isSimulated} size="sm" />
                  </td>
                  <td className="py-3">
                    {/* Status Toggle Dropdown */}
                    <select
                      value={bus.status}
                      onChange={(e) => handleStatusChange(bus._id, e.target.value)}
                      className="bg-surface-alt text-white px-2 py-1 rounded border border-border-subtle text-[11px] focus:outline-none"
                    >
                      <option value="available">Available</option>
                      <option value="on_route">On Route</option>
                      <option value="delayed">Delayed</option>
                      <option value="break">Driver Break</option>
                      <option value="offline">Offline / Depot</option>
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(bus)}
                      className="p-1 text-text-muted hover:text-status-red transition-colors"
                      title="Delete bus"
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

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete fleet vehicle"
        message={`This will permanently remove ${deleteTarget?.busNumber || 'this vehicle'} from the registry. This action cannot be undone.`}
        confirmLabel="Delete Vehicle"
        danger
        onConfirm={() => handleDeleteBus(deleteTarget?._id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add Bus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border-subtle rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-accent-blue">
                <Bus className="w-5 h-5" />
                <h3 className="font-syne font-bold text-lg text-white">Register Fleet Vehicle</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBus} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-text-muted uppercase mb-1">Fleet Bus ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PK-BUS-402"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted uppercase mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KHI-6621"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted uppercase mb-1">Passenger Capacity</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={150}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted uppercase mb-1">Assigned Route (Optional)</label>
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:outline-none"
                >
                  <option value="">-- No Route Assigned --</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.routeName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Add Vehicle to Fleet</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorBusesPage;
