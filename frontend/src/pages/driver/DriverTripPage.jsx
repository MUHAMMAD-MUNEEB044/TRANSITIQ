import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  AlertTriangle,
  Wrench,
  Radio,
  Clock,
  MapPin,
  Compass,
  CheckCircle2,
  X,
  Send,
  Navigation,
} from 'lucide-react';
import api from '../../services/api.js';
import getSocket from '../../services/socket.js';
import { useAuthStore } from '../../store/authStore.js';
import { startSimulation, DEFAULT_KARACHI_COORDS } from '../../utils/gpsSimulator.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { toast } from '../../store/toastStore.js';

export const DriverTripPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = getSocket();
  const [confirmEndTrip, setConfirmEndTrip] = useState(false);

  // Selected vehicle & route
  const [bus, setBus] = useState(null);
  const [route, setRoute] = useState(null);

  // Trip execution state
  const [isOnTrip, setIsOnTrip] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripSeconds, setTripSeconds] = useState(0);

  // Telemetry & GPS State
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [currentCoords, setCurrentCoords] = useState({ lat: 24.8607, lng: 67.0011 });
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(65);
  const [currentStopName, setCurrentStopName] = useState('City Center (Tower)');
  const [nextStopName, setNextStopName] = useState('Main Market (Saddar)');

  // Modals & Bottom Sheets
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [delayReason, setDelayReason] = useState('Traffic Congestion');

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('Mechanical Issue');
  const [issueDescription, setIssueDescription] = useState('');

  // Refs for background loops
  const simRunnerRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const locationEmitIntervalRef = useRef(null);

  // Load selected Bus & Route from localStorage or API
  useEffect(() => {
    const initData = async () => {
      try {
        const storedBusId = localStorage.getItem('driver_selected_bus_id');
        const storedRouteId = localStorage.getItem('driver_selected_route_id');

        const [busesRes, routesRes] = await Promise.all([
          api.get('/buses'),
          api.get('/routes'),
        ]);

        const busList = busesRes.data.data || [];
        const routeList = routesRes.data.data || [];

        const assignedBus = busList.find((b) => b._id === storedBusId) || busList[0];
        const assignedRoute = routeList.find((r) => r._id === storedRouteId) || routeList[0];

        setBus(assignedBus);
        setRoute(assignedRoute);

        if (assignedRoute?.stops?.length > 0) {
          setCurrentStopName(assignedRoute.startLocation);
          const nextStop = assignedRoute.stops[1]?.stopId?.stopName || assignedRoute.stops[0]?.stopId?.stopName;
          if (nextStop) setNextStopName(nextStop);
        }
      } catch (e) {
        console.warn('Driver trip init error:', e.message);
      }
    };
    initData();
  }, []);

  // Trip duration timer counter
  useEffect(() => {
    let timer = null;
    if (isOnTrip) {
      timer = setInterval(() => {
        setTripSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setTripSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isOnTrip]);

  // Format seconds to HH:MM:SS
  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // START TRIP ACTION
  const handleStartTrip = async () => {
    if (!bus || !route) return;

    try {
      // 1. Call POST /api/trips
      const res = await api.post('/trips', {
        busId: bus._id,
        routeId: route._id,
        startLat: currentCoords.lat,
        startLng: currentCoords.lng,
      });

      const trip = res.data.data;
      setActiveTrip(trip);
      setIsOnTrip(true);

      // 2. Emit driver:trip_start via Socket.io
      socket.emit('driver:trip_start', {
        tripId: trip._id,
        busId: bus._id,
        routeId: route._id,
        driverId: user?.id || user?._id || null,
      });

      // 3. Request Browser Geolocation Permission
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Geolocation permitted
            setIsGpsActive(true);
            const { latitude, longitude, speed: geoSpeed, heading: geoHeading } = position.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            setSpeed(geoSpeed ? Math.round(geoSpeed * 3.6) : 0);
            setHeading(geoHeading || 0);

            // Stream live device GPS via watchPosition
            startRealGpsTracking(trip._id);
          },
          (err) => {
            console.warn('[Driver GPS] Geolocation denied or unavailable:', err.message);
            setIsGpsActive(false);
            // Auto-enable Simulation Mode as required by prompt
            enableSimulationMode(trip._id);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        enableSimulationMode(trip._id);
      }
    } catch (err) {
      toast.error('Could not start trip. Please retry.');
    }
  };

  // Stream real device GPS via watchPosition (continuous, battery-friendly)
  const startRealGpsTracking = (tripId) => {
    if (!('geolocation' in navigator)) return;

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const currentSpeed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        const currentHead = pos.coords.heading ?? 0;

        setCurrentCoords({ lat, lng });
        setSpeed(currentSpeed);
        setHeading(currentHead);

        socket.emit('driver:location_update', {
          tripId,
          busId: bus._id,
          routeId: route._id,
          lat,
          lng,
          speed: currentSpeed,
          heading: currentHead,
          timestamp: new Date().toISOString(),
        });
      },
      () => {
        setIsGpsActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );
  };

  // Enable Simulation Mode for continuous waypoint progression
  const enableSimulationMode = (tripId) => {
    setIsSimulated(true);
    setIsGpsActive(true);

    const waypoints = route?.waypoints?.length > 1 ? route.waypoints : DEFAULT_KARACHI_COORDS;

    simRunnerRef.current = startSimulation(
      waypoints,
      (lat, lng, simSpeed, simHead, meta) => {
        setCurrentCoords({ lat, lng });
        setSpeed(simSpeed);
        setHeading(simHead);
        if (meta.stopName) setCurrentStopName(meta.stopName);
        if (meta.nextStop) setNextStopName(meta.nextStop);

        socket.emit('driver:location_update', {
          tripId: tripId || activeTrip?._id,
          busId: bus._id,
          routeId: route._id,
          lat,
          lng,
          speed: simSpeed,
          heading: simHead,
          nextStop: meta.nextStop,
          isSimulated: true,
          timestamp: new Date().toISOString(),
        });
      },
      3000
    );
  };

  // Toggle Simulation Mode manually
  const handleToggleSimulation = () => {
    if (isSimulated) {
      if (simRunnerRef.current) simRunnerRef.current.stop();
      setIsSimulated(false);
      // Resume real GPS streaming if the device supports it
      if ('geolocation' in navigator) {
        setIsGpsActive(true);
        startRealGpsTracking(activeTrip?._id);
      } else {
        setIsGpsActive(false);
      }
    } else {
      enableSimulationMode(activeTrip?._id);
    }
  };

  // END TRIP ACTION
  const handleEndTrip = async () => {
    try {
      if (activeTrip?._id) {
        await api.put(`/trips/${activeTrip._id}/end`);
        socket.emit('driver:trip_end', {
          tripId: activeTrip._id,
          busId: bus?._id,
        });
      }

      // Cleanup timers & simulations
      if (simRunnerRef.current) simRunnerRef.current.stop();
      if (locationEmitIntervalRef.current) clearInterval(locationEmitIntervalRef.current);
      if (geoWatchIdRef.current != null) navigator.geolocation.clearWatch(geoWatchIdRef.current);

      setIsOnTrip(false);
      setActiveTrip(null);
      setIsSimulated(false);
      setIsGpsActive(false);
      setConfirmEndTrip(false);

      toast.success('Trip completed successfully.');
      navigate('/driver/select');
    } catch (err) {
      toast.error('Failed to end trip. Please retry.');
    }
  };

  // Submit Delay Report
  const handleSubmitDelay = async (e) => {
    e.preventDefault();
    if (!activeTrip?._id) return;

    try {
      await api.put(`/trips/${activeTrip._id}/delay`, {
        delayMinutes,
        reason: delayReason,
      });

      socket.emit('driver:report_delay', {
        tripId: activeTrip._id,
        delayMinutes,
        reason: delayReason,
      });

      setShowDelayModal(false);
      toast.success(`Delay of ${delayMinutes} minutes broadcast to passengers.`);
    } catch (err) {
      toast.error('Error reporting delay.');
    }
  };

  // Submit Vehicle Issue Report
  const handleSubmitIssue = (e) => {
    e.preventDefault();
    if (!activeTrip?._id) return;

    socket.emit('driver:report_issue', {
      tripId: activeTrip._id,
      issueType,
      description: issueDescription || 'General vehicle service requirement',
    });

    setShowIssueModal(false);
    setIssueDescription('');
    toast.success('Vehicle issue reported to operations control.');
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1">
      {/* End Trip Confirmation */}
      <ConfirmModal
        open={confirmEndTrip}
        title="End current trip?"
        message="Passengers tracking this vehicle will be notified that the run has concluded."
        confirmLabel="End Trip"
        danger
        onConfirm={handleEndTrip}
        onCancel={() => setConfirmEndTrip(false)}
      />

      {/* Top Status Card: Bus Number, Route Name, GPS Status */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-accent-blue" />
              <span className="font-mono font-bold text-lg text-white">
                {bus?.busNumber || 'PK-BUS-101'}
              </span>
            </div>
            <span className="text-xs font-mono text-text-muted">
              Vehicle: {bus?.vehicleNumber || 'KHI-7892'}
            </span>
          </div>

          {/* GPS Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-alt border border-border-subtle text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isGpsActive ? 'bg-status-green animate-pulse' : 'bg-status-red'
              }`}
            />
            <span className={isGpsActive ? 'text-status-green' : 'text-status-red'}>
              {isGpsActive ? 'GPS Active' : 'GPS Off'}
            </span>
          </div>
        </div>

        {/* Route Details */}
        <div className="bg-surface-alt/70 rounded-xl p-3 border border-border-subtle text-xs font-mono">
          <div className="text-text-muted mb-1 flex items-center justify-between">
            <span className="text-[10px] uppercase">ACTIVE CORRIDOR</span>
            <span className="text-accent-blue font-semibold">{route?.totalDistance || 15} km</span>
          </div>
          <div className="font-syne font-bold text-sm text-white truncate">
            {route?.routeName || 'Karachi City Express'}
          </div>
        </div>
      </div>

      {/* Main Cockpit Body */}
      {!isOnTrip ? (
        /* PRE-TRIP SCREEN */
        <div className="my-auto py-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-accent-blue/15 border-2 border-accent-blue flex items-center justify-center text-accent-blue mb-4 shadow-xl shadow-accent-blue/10 animate-pulse">
            <Navigation className="w-10 h-10" />
          </div>
          <h2 className="font-syne font-bold text-xl text-white mb-1">Ready for Departure</h2>
          <p className="text-xs font-mono text-text-muted max-w-xs mb-8">
            Starting the trip initiates real-time telemetry streaming to Karachi passengers and transit operators.
          </p>

          {/* Large 56px Start Trip Button */}
          <button
            onClick={handleStartTrip}
            id="btn-start-trip"
            className="w-full h-14 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-accent-blue/30 transition-all active:scale-[0.98]"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START TRIP</span>
          </button>
        </div>
      ) : (
        /* ACTIVE ON-TRIP COCKPIT */
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          {/* Simulation Mode Badge */}
          {isSimulated && (
            <div className="w-full py-1.5 px-3 rounded-xl bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-xs font-mono font-bold flex items-center justify-center gap-2 animate-pulse">
              <Radio className="w-4 h-4" />
              <span>SIMULATION MODE (PAKISTAN TELEMETRY)</span>
            </div>
          )}

          {/* Live Telemetry Display */}
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-surface p-3.5 rounded-xl border border-border-subtle">
              <span className="text-[10px] text-text-muted uppercase block">TRIP DURATION</span>
              <div className="font-bold text-lg text-accent-blue flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-accent-blue" />
                <span>{formatDuration(tripSeconds)}</span>
              </div>
            </div>

            <div className="bg-surface p-3.5 rounded-xl border border-border-subtle">
              <span className="text-[10px] text-text-muted uppercase block">SPEED</span>
              <div className="font-bold text-lg text-status-green flex items-center gap-1.5 mt-0.5">
                <Compass className="w-4 h-4 text-status-green" />
                <span>{speed} km/h</span>
              </div>
            </div>

            <div className="bg-surface p-3.5 rounded-xl border border-border-subtle col-span-2">
              <span className="text-[10px] text-text-muted uppercase block">CURRENT ➔ NEXT STOP</span>
              <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-white truncate">{currentStopName}</span>
                <span className="text-accent-blue mx-2">➔</span>
                <span className="text-status-yellow truncate">{nextStopName}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Simulation, Delay, Issue) */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Simulation Mode Toggle Button */}
            <button
              onClick={handleToggleSimulation}
              className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all font-semibold ${
                isSimulated
                  ? 'bg-accent-purple text-background border-accent-purple'
                  : 'bg-surface hover:bg-surface-alt text-accent-purple border-accent-purple/40'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{isSimulated ? 'Sim Mode ON' : 'Sim Mode OFF'}</span>
            </button>

            {/* Report Delay */}
            <button
              onClick={() => setShowDelayModal(true)}
              id="btn-report-delay"
              className="py-3 px-3 rounded-xl bg-surface hover:bg-surface-alt text-status-yellow border border-status-yellow/40 flex items-center justify-center gap-1.5 transition-all font-semibold"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Delay</span>
            </button>

            {/* Report Issue */}
            <button
              onClick={() => setShowIssueModal(true)}
              id="btn-report-issue"
              className="col-span-2 py-3 px-3 rounded-xl bg-surface hover:bg-surface-alt text-text-muted hover:text-white border border-border-subtle flex items-center justify-center gap-1.5 transition-all font-semibold"
            >
              <Wrench className="w-4 h-4" />
              <span>Report Vehicle / Route Issue</span>
            </button>
          </div>

          {/* Large 56px End Trip Button */}
          <button
            onClick={() => setConfirmEndTrip(true)}
            id="btn-end-trip"
            className="w-full h-14 bg-status-red hover:bg-status-red/90 text-white font-syne font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-status-red/20 transition-all active:scale-[0.98] mt-2"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>END TRIP</span>
          </button>
        </div>
      )}

      {/* REPORT DELAY BOTTOM SHEET */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-surface border-t sm:border border-border-subtle rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-status-yellow">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-syne font-bold text-lg text-white">Report Route Delay</h3>
              </div>
              <button
                onClick={() => setShowDelayModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelay} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                  Delay Duration (Minutes)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDelayMinutes(mins)}
                      className={`py-2 rounded-lg font-mono text-sm font-bold border transition-all ${
                        delayMinutes === mins
                          ? 'bg-status-yellow text-background border-status-yellow'
                          : 'bg-surface-alt text-text-muted border-border-subtle hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                  Primary Cause
                </label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle text-sm font-mono focus:outline-none"
                >
                  <option value="Traffic Congestion">Traffic Congestion (Karachi Peak)</option>
                  <option value="Road Construction">Road Works / Diversion</option>
                  <option value="Passenger Boarding Crowd">Heavy Passenger Influx</option>
                  <option value="Weather / Rain Conditions">Rain / Low Visibility</option>
                  <option value="Minor Mechanical Check">Inspection Halt</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-status-yellow hover:bg-status-yellow/90 text-background font-syne font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Delay Alert</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPORT ISSUE BOTTOM SHEET */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-surface border-t sm:border border-border-subtle rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-status-red">
                <Wrench className="w-5 h-5" />
                <h3 className="font-syne font-bold text-lg text-white">Report Vehicle Issue</h3>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                  Issue Classification
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle text-sm font-mono focus:outline-none"
                >
                  <option value="Mechanical Issue">Engine / Transmission Issue</option>
                  <option value="Tire / Puncture">Tire Pressure / Puncture</option>
                  <option value="Route Blockade">Road Accident / Blockade</option>
                  <option value="Medical Assistance Required">Medical Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe location and severity for dispatch control..."
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle text-sm focus:outline-none placeholder:text-text-muted"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-status-red hover:bg-status-red/90 text-white font-syne font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Notify Operations Room</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTripPage;
