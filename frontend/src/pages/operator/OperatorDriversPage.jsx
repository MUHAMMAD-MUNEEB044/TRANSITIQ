import React, { useEffect, useState } from 'react';
import { Users, Check, X, Award } from 'lucide-react';
import api from '../../services/api.js';
import { toast } from '../../store/toastStore.js';

export const OperatorDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assignment Modal
  const [editingDriver, setEditingDriver] = useState(null);
  const [selectedBus, setSelectedBus] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, busesRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/buses'),
      ]);
      setDrivers(driversRes.data.data || []);
      setBuses(busesRes.data.data || []);
      setError(null);
    } catch (e) {
      setError('Failed to load driver roster. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAssign = (driver) => {
    setEditingDriver(driver);
    setSelectedBus(driver.assignedBus?._id || driver.assignedBus || '');
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!editingDriver) return;

    try {
      await api.put(`/drivers/${editingDriver._id}`, {
        assignedBus: selectedBus || null,
      });

      toast.success('Driver assigned to vehicle successfully.');
      setEditingDriver(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
          Driver Operations & Vehicle Assignment
        </h1>
        <p className="text-xs font-mono text-text-muted mt-1">
          Allocate licensed commercial drivers to designated transit buses
        </p>
      </div>

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
        ) : drivers.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs font-mono">
            No drivers registered yet.
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border-subtle/60 text-text-muted uppercase text-[10px]">
                <th className="pb-3 font-semibold">Driver Name</th>
                <th className="pb-3 font-semibold">License #</th>
                <th className="pb-3 font-semibold">Phone Contact</th>
                <th className="pb-3 font-semibold">Assigned Vehicle</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Total Runs</th>
                <th className="pb-3 font-semibold text-right">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30">
              {drivers.map((d) => (
                <tr key={d._id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="py-3 font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent-blue" />
                    <span>{d.name}</span>
                  </td>
                  <td className="py-3 text-text-muted">{d.licenseNumber}</td>
                  <td className="py-3 text-text-muted">{d.phone}</td>
                  <td className="py-3 text-accent-blue font-semibold">
                    {d.assignedBus?.busNumber || 'None Allocated'}
                  </td>
                  <td className="py-3">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-surface-alt border border-border-subtle text-text-primary text-[11px]">
                      {d.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-status-green font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>{d.totalTrips || 0}</span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleOpenAssign(d)}
                      className="px-3 py-1 bg-accent-blue/15 hover:bg-accent-blue text-accent-blue hover:text-background font-semibold rounded-lg border border-accent-blue/30 transition-all text-xs"
                    >
                      Assign Bus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Assignment Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border-subtle rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-syne font-bold text-lg text-white">
                  Assign Vehicle to {editingDriver.name}
                </h3>
                <span className="text-xs font-mono text-text-muted">
                  License: {editingDriver.licenseNumber}
                </span>
              </div>
              <button onClick={() => setEditingDriver(null)} className="p-1 text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-text-muted uppercase mb-1">Select Bus from Active Fleet</label>
                <select
                  value={selectedBus}
                  onChange={(e) => setSelectedBus(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                >
                  <option value="">-- No Bus (Unassigned) --</option>
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.busNumber} — {b.vehicleNumber} ({b.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Vehicle Allocation</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDriversPage;
