import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';

export const DriverSelectPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFleetData = async () => {
      setLoading(true);
      try {
        const [busesRes, routesRes] = await Promise.all([
          api.get('/buses'),
          api.get('/routes'),
        ]);

        const busList = busesRes.data.data || [];
        const routeList = routesRes.data.data || [];

        setBuses(busList);
        setRoutes(routeList);

        if (busList.length > 0) setSelectedBusId(busList[0]._id);
        if (routeList.length > 0) setSelectedRouteId(routeList[0]._id);
      } catch (e) {
        console.warn('Error loading fleet:', e.message);
      } finally {
        setLoading(false);
      }
    };

    loadFleetData();
  }, []);

  const handleProceed = () => {
    if (!selectedBusId || !selectedRouteId) return;

    // Save selection to localStorage for persistence
    localStorage.setItem('driver_selected_bus_id', selectedBusId);
    localStorage.setItem('driver_selected_route_id', selectedRouteId);

    navigate('/driver/trip');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono text-text-muted">Loading dispatch schedule...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-2">
      <div>
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-mono mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DISPATCH CONFIRMATION</span>
          </div>
          <h1 className="font-syne font-bold text-2xl text-white">
            Select Assigned Vehicle
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Choose your allocated bus and scheduled route before starting shift
          </p>
        </div>

        {/* Bus Selector */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">
              Assigned Bus Fleet
            </label>
            <div className="bg-surface border border-border-subtle rounded-xl p-3 focus-within:border-accent-blue transition-all">
              <div className="flex items-center gap-2 mb-2 text-xs font-mono text-accent-blue">
                <Bus className="w-4 h-4" />
                <span>Vehicle Fleet ID</span>
              </div>
              <select
                id="select-bus-dropdown"
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle text-sm font-mono focus:outline-none"
              >
                {buses.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.busNumber} — {b.vehicleNumber} ({b.capacity} seats)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Route Selector */}
          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">
              Target Transit Route
            </label>
            <div className="bg-surface border border-border-subtle rounded-xl p-3 focus-within:border-accent-blue transition-all">
              <div className="flex items-center gap-2 mb-2 text-xs font-mono text-status-green">
                <MapPin className="w-4 h-4" />
                <span>Transit Corridor</span>
              </div>
              <select
                id="select-route-dropdown"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle text-sm font-mono focus:outline-none"
              >
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.routeName} ({r.totalDistance} km)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 56px Minimum Tap Height Action Button */}
      <button
        onClick={handleProceed}
        id="btn-confirm-driver-selection"
        className="w-full h-14 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-accent-blue/20 transition-all active:scale-[0.98]"
      >
        <span>Enter Cockpit</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default DriverSelectPage;
