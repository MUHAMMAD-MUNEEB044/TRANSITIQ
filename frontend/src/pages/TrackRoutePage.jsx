import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Navigation, Radio, Bell } from 'lucide-react';
import LiveMap from '../components/LiveMap.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CrowdBadge from '../components/CrowdBadge.jsx';
import { useRouteStore } from '../store/routeStore.js';
import { useBusStore } from '../store/busStore.js';
import { useAuthStore } from '../store/authStore.js';
import { addJourneyEntry } from '../services/journeyStore.js';
import getSocket from '../services/socket.js';
import { toast } from '../store/toastStore.js';

export const TrackRoutePage = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { fetchRouteById, selectedRoute, fetchRouteStopsWithETA, routeStops } = useRouteStore();
  const { buses, fetchBuses, liveLocations } = useBusStore();

  const [activeBuses, setActiveBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const notifiedRef = useRef({}); // `${busId}:${stop}` -> true (notify once per stay)

  const canSimulate = user && ['driver', 'operator', 'admin'].includes(user.role);

  // Load route details and active buses
  useEffect(() => {
    const loadRouteData = async () => {
      setLoading(true);
      const data = await fetchRouteById(routeId);
      await fetchBuses();
      await fetchRouteStopsWithETA(routeId);

      if (data?.activeBuses?.length > 0) {
        setActiveBuses(data.activeBuses);
        setSelectedBusId(data.activeBuses[0]._id);
      } else {
        setActiveBuses([]);
        setSelectedBusId(null);
      }
      setLoading(false);
    };

    loadRouteData();
  }, [routeId, fetchRouteById, fetchBuses, fetchRouteStopsWithETA]);

  // Selected Bus details — no fabricated fallback vehicle
  const selectedBus = buses.find((b) => b._id === selectedBusId) || activeBuses[0] || null;
  const liveLoc = (selectedBus?._id && liveLocations[selectedBus._id]) || selectedBus?.currentLocation || null;

  // Journey history: log an entry after 2+ minutes on the live tracking page
  const stopsListCountRef = useRef(0);
  useEffect(() => {
    if (!selectedRoute || !selectedBus) return;
    const startedAt = Date.now();
    return () => {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      if (durationSec >= 120) {
        addJourneyEntry({
          routeId: selectedRoute._id,
          routeName: selectedRoute.routeName,
          colorCode: selectedRoute.colorCode,
          busNumber: selectedBus.busNumber,
          durationSec,
          stopsSeen: stopsListCountRef.current,
        });
      }
    };
  }, [selectedRoute?._id, selectedBus?._id]);

  // Browser push notification when the followed bus is ~5 minutes away
  useEffect(() => {
    if (!notifyEnabled || !liveLoc || liveLoc.eta == null) return;
    const chosenStop = liveLoc.nextStop;
    if (!chosenStop || chosenStop === '—') return;
    const key = `${selectedBus?._id}:${chosenStop}`;
    if (liveLoc.eta <= 5 && liveLoc.eta >= 4 && !notifiedRef.current[key]) {
      notifiedRef.current[key] = true;
      try {
        new Notification('TransitIQ', {
          body: `🚌 Your bus arrives at ${chosenStop} in ~5 minutes`,
          icon: '/bus-icon.svg',
        });
      } catch {
        // Notification constructor unavailable — ignore
      }
    }
    // Reset the notified flag once the bus has passed (eta rises again)
    if (liveLoc.eta > 6) delete notifiedRef.current[key];
  }, [notifyEnabled, liveLoc?.eta, liveLoc?.nextStop, selectedBus?._id]);

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('This browser does not support notifications.');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifyEnabled(true);
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifyEnabled(perm === 'granted');
    if (perm === 'granted') toast.success('ETA alerts enabled for this route.');
    else toast.info('Notifications were not permitted.');
  };

  // Toggle GPS Simulation for interactive demonstration
  const handleToggleSimulation = () => {
    const socket = getSocket();
    if (!isSimulating) {
      socket.emit('sim:start', {
        routeId,
        intervalMs: 2500,
        busId: selectedBus?._id || null,
      });
      setIsSimulating(true);
      toast.info('GPS simulator started — telemetry streaming for this route.');
    } else {
      socket.emit('sim:stop', { routeId });
      setIsSimulating(false);
      toast.info('GPS simulator halted.');
    }
  };

  // Stop simulation when leaving the page
  useEffect(() => {
    return () => {
      if (isSimulating) {
        getSocket().emit('sim:stop', { routeId });
      }
    };
  }, [isSimulating, routeId]);

  if (loading && !selectedRoute) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-mono text-text-muted">Connecting to live transit stream...</p>
      </div>
    );
  }

  const stopsList = routeStops.length > 0 ? routeStops : selectedRoute?.stops || [];
  stopsListCountRef.current = stopsList.length;
  const busCrowd = selectedBus?._id ? liveLocations[selectedBus._id]?.crowdLevel : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back button & Route Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-surface border border-border-subtle hover:border-accent-blue text-text-muted hover:text-white transition-all"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedRoute?.colorCode || '#38BDF8' }}
              />
              <h1 className="font-syne font-bold text-xl sm:text-2xl text-white">
                {selectedRoute?.routeName || 'Tracking Route'}
              </h1>
            </div>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              Corridor: {selectedRoute?.startLocation} ➔ {selectedRoute?.destination}
            </p>
          </div>
        </div>

        {/* Live Simulation Trigger Button (staff only) */}
        {canSimulate && (
          <button
            onClick={handleToggleSimulation}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all border shadow-lg ${
              isSimulating
                ? 'bg-status-red/20 text-status-red border-status-red/40 hover:bg-status-red/30'
                : 'bg-accent-purple/20 text-accent-purple border-accent-purple/40 hover:bg-accent-purple/30'
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>HALT SIMULATOR</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START LIVE SIMULATOR</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Bus Switcher Chips — only when multiple buses are live */}
      {activeBuses.length > 1 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono text-text-muted uppercase shrink-0">Fleet on route:</span>
          {activeBuses.map((b) => (
            <button
              key={b._id}
              onClick={() => setSelectedBusId(b._id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all shrink-0 ${
                selectedBusId === b._id
                  ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/50'
                  : 'bg-surface text-text-muted border-border-subtle hover:border-accent-blue/40 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3 inline mr-1" />
              {b.busNumber}
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Interactive Map + Route Stops Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Map with Animated Bus Tracker */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <LiveMap
            route={selectedRoute}
            bus={selectedBus}
            height="580px"
            showETACard={true}
          />

          {/* Telemetry Bar below Map */}
          <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-text-muted uppercase block">VEHICLE SPEED</span>
              <span className="text-white font-bold text-sm mt-0.5 block">
                {liveLoc?.speed != null ? `${Math.round(liveLoc.speed)} km/h` : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted uppercase block">COMPASS BEARING</span>
              <span className="text-white font-bold text-sm mt-0.5 block flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-accent-blue" style={{ transform: `rotate(${liveLoc?.heading || 0}deg)` }} />
                <span>{liveLoc?.heading != null ? `${Math.round(liveLoc.heading)}°` : '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted uppercase block">STATUS</span>
              <div className="mt-1">
                {selectedBus ? (
                  <StatusBadge
                    status={selectedBus.status || 'ON_ROUTE'}
                    isSimulated={isSimulating || !!liveLoc?.isSimulated}
                    size="sm"
                  />
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-text-muted uppercase block">NEXT STOP</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block truncate">
                {liveLoc?.nextStop || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Route Stops Sequence Sidebar */}
        <div className="lg:col-span-4 glass-card p-5 flex flex-col max-h-[660px]">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
            <div>
              <h3 className="font-syne font-bold text-base text-white flex items-center gap-2">
                Stops & ETAs
                <CrowdBadge level={busCrowd} />
              </h3>
              <span className="text-[11px] font-mono text-text-muted">Live Arrival Forecast</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnableNotifications}
                disabled={notifyEnabled}
                className={`p-2 rounded-lg border transition-all ${
                  notifyEnabled
                    ? 'bg-status-green/15 border-status-green/40 text-status-green'
                    : 'bg-surface-alt border-border-subtle text-text-muted hover:text-accent-blue hover:border-accent-blue/40'
                }`}
                title={notifyEnabled ? 'ETA alerts are on' : 'Get notified when your bus is 5 minutes away'}
                aria-label="Enable ETA notifications"
              >
                <Bell className={`w-4 h-4 ${notifyEnabled ? 'fill-current' : ''}`} />
              </button>
              <span className="px-2 py-0.5 rounded bg-surface-alt text-xs font-mono text-accent-blue">
                {stopsList.length} Stops
              </span>
            </div>
          </div>

          {/* Empty state when nothing is running */}
          {stopsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Radio className="w-8 h-8 text-text-muted/50 mb-3" />
              <p className="text-sm text-white font-medium mb-1">No stop data available</p>
              <p className="text-xs text-text-muted font-mono">
                This route has no published stop sequence yet.
              </p>
            </div>
          ) : !selectedBus ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-surface-alt border border-border-subtle flex items-center justify-center text-2xl mb-3">
                🌙
              </div>
              <p className="text-sm text-white font-medium mb-1">No live buses on this route</p>
              <p className="text-xs text-text-muted font-mono leading-relaxed">
                The fleet is at rest. Stop ETAs will appear once a vehicle begins its run.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {stopsList.map((item, idx) => {
                const stopName = item.stop?.stopName || item.stopId?.stopName || `Stop #${idx + 1}`;
                // Only trust real forecast data — no fabricated ETAs
                const etaMins = item.eta;
                const isFirst = idx === 0;

                return (
                  <div key={idx} className="flex items-start gap-3 relative group">
                    {/* Vertical connector line */}
                    {idx < stopsList.length - 1 && (
                      <div className="absolute left-[13px] top-6 bottom-[-16px] w-[2px] bg-border-subtle group-hover:bg-accent-blue/40 transition-colors" />
                    )}

                    {/* Marker Node */}
                    <div
                      className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-bold border-2 z-10 transition-all ${
                        isFirst
                          ? 'bg-accent-blue border-white text-background shadow-lg shadow-accent-blue/30'
                          : 'bg-surface-alt border-border-subtle text-text-muted group-hover:border-accent-blue group-hover:text-white'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Stop Information Card */}
                    <button
                      onClick={() => item.stop?._id || item.stopId?._id
                        ? navigate(`/stops/${item.stop?._id || item.stopId?._id}`)
                        : null}
                      className="flex-1 text-left bg-surface-alt/40 group-hover:bg-surface-alt/80 p-2.5 rounded-xl border border-border-subtle/40 hover:border-accent-blue/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                          {stopName}
                        </span>
                        <span className={`text-xs font-mono font-bold flex items-center gap-1 ${etaMins != null ? 'text-status-green' : 'text-text-muted'}`}>
                          {etaMins != null ? (
                            <>{etaMins}m</>
                          ) : (
                            <>—</>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted mt-0.5 block">
                        Sequence #{idx + 1}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackRoutePage;
