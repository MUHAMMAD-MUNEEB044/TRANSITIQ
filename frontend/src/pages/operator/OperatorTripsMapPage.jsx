import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Bus, Radio, RefreshCw, Navigation } from 'lucide-react';
import api from '../../services/api.js';
import useSocket from '../../hooks/useSocket.js';
import { useBusStore } from '../../store/busStore.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const createFleetBusIcon = (busNumber, isDelayed = false) => {
  const color = isDelayed ? '#FBBF24' : '#38BDF8';
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="w-10 h-10 rounded-full bg-[#111827] border-2 border-[${color}] shadow-[0_0_12px_rgba(56,189,248,0.4)] flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M15 6v6"/>
          <path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20 6.6 18.8 6 17.5 6H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h2"/>
          <circle cx="7" cy="18" r="2"/>
          <circle cx="15" cy="18" r="2"/>
        </svg>
      </div>
      <div class="absolute -bottom-4 bg-[#111827] border border-border-subtle px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white whitespace-nowrap shadow">
        ${busNumber}
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'fleet-bus-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export const OperatorTripsMapPage = () => {
  useSocket(); // Subscribes to location updates

  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const liveLocations = useBusStore((s) => s.liveLocations);

  const fetchActiveTrips = async () => {
    try {
      const [routesRes, busesRes] = await Promise.all([
        api.get('/routes'),
        api.get('/buses'),
      ]);
      setRoutes(routesRes.data.data || []);
      setBuses(busesRes.data.data || []);
    } catch (e) {
      console.warn('Error fetching trips map data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
            Active Trips Fleet Map
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Global monitoring radar for all active transit operations across Pakistan
          </p>
        </div>

        <button
          onClick={fetchActiveTrips}
          className="px-3.5 py-2 bg-surface hover:bg-surface-alt rounded-xl border border-border-subtle text-xs font-mono flex items-center gap-2 text-text-muted hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Fleet Telemetry</span>
        </button>
      </div>

      {/* Map Container */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-border-subtle shadow-2xl bg-surface">
        <MapContainer
          center={[24.88, 67.03]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: '620px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draw all route corridors */}
          {routes.map((r) => {
            const waypoints = r.waypoints?.length > 0
              ? r.waypoints.map((w) => [w.lat, w.lng])
              : r.stops?.map((s) => [s.stopId.location.coordinates[1], s.stopId.location.coordinates[0]]) || [];

            return (
              <Polyline
                key={r._id}
                positions={waypoints}
                pathOptions={{
                  color: r.colorCode || '#38BDF8',
                  weight: 4,
                  opacity: 0.6,
                }}
              />
            );
          })}

          {/* Plot all fleet buses */}
          {buses.map((bus) => {
            const liveLoc = liveLocations[bus._id] || bus.currentLocation || { lat: 24.8607, lng: 67.0011 };
            return (
              <Marker
                key={bus._id}
                position={[liveLoc.lat, liveLoc.lng]}
                icon={createFleetBusIcon(bus.busNumber, bus.status === 'delayed')}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                  <div className="font-mono text-xs text-text-primary">
                    <div className="font-bold text-accent-blue">{bus.busNumber}</div>
                    <div>Route: {bus.currentRoute?.routeName || 'Active Line'}</div>
                    <div>Speed: {liveLoc.speed || 35} km/h</div>
                    <div className="text-text-muted mt-1 uppercase text-[10px]">
                      Status: {bus.status}
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default OperatorTripsMapPage;
