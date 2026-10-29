import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { WifiOff } from 'lucide-react';
import useSocket from '../hooks/useSocket.js';
import { useBusStore } from '../store/busStore.js';
import ETACard from './ETACard.jsx';

// Component to dynamically fit route bounds
const MapBoundsController = ({ coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        // Fallback
      }
    }
  }, [coordinates, map]);

  return null;
};

// Create Custom Bus SVG DivIcon with Dynamic Heading Rotation.
// Inline styles only — Tailwind classes inside runtime HTML are never compiled.
const createBusIcon = (heading = 0, isSimulated = false, isDelayed = false) => {
  const accentColor = isDelayed ? '#FBBF24' : isSimulated ? '#818CF8' : '#38BDF8';

  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);transition:transform 0.8s cubic-bezier(0.25,1,0.5,1);">
      <div style="width:44px;height:44px;border-radius:9999px;background:#111827;border:2px solid ${accentColor};box-shadow:0 0 15px ${accentColor}80;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M15 6v6"/>
          <path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20 6.6 18.8 6 17.5 6H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h2"/>
          <circle cx="7" cy="18" r="2"/>
          <circle cx="15" cy="18" r="2"/>
        </svg>
      </div>
      <div style="position:absolute;top:-8px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${accentColor};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-bus-leaflet-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

// Stop Marker Icon (clickable — inline styles, number badge)
const createStopIcon = (color = '#38BDF8', order = 1) => {
  const html = `
    <div style="width:24px;height:24px;border-radius:9999px;background:#111827;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font:700 10px/1 'JetBrains Mono',monospace;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);">${order}</div>
  `;
  return L.divIcon({
    html,
    className: 'custom-stop-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export const LiveMap = ({
  route,
  bus,
  height = '550px',
  showETACard = true,
}) => {
  const navigate = useNavigate();
  const routeId = route?._id;
  useSocket(routeId);

  const liveLocations = useBusStore((s) => s.liveLocations);
  const gpsLostBuses = useBusStore((s) => s.gpsLostBuses);

  // Fallback coords: Karachi, Pakistan
  const defaultCenter = [24.8607, 67.0011];

  // Resolve current bus location — no fabricated defaults when data is missing
  const busId = bus?._id;
  const liveLoc = busId ? liveLocations[busId] : null;
  const busLocation = liveLoc || bus?.currentLocation || null;
  const isBusGpsLost = busId ? !!gpsLostBuses[busId] : false;

  // Smooth position interpolation for animated tracking
  const [animatedPos, setAnimatedPos] = useState(
    busLocation ? [busLocation.lat, busLocation.lng] : defaultCenter
  );
  const [animatedHeading, setAnimatedHeading] = useState(busLocation?.heading || 0);

  const prevPosRef = useRef(busLocation ? [busLocation.lat, busLocation.lng] : defaultCenter);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!busLocation) return;
    const targetLat = busLocation.lat;
    const targetLng = busLocation.lng;
    const startLat = prevPosRef.current[0];
    const startLng = prevPosRef.current[1];

    if (startLat === targetLat && startLng === targetLng) return;

    const startTime = performance.now();
    const duration = 2400; // Smooth 2.4s interpolation between pings

    const animateMarker = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const curLat = startLat + (targetLat - startLat) * ease;
      const curLng = startLng + (targetLng - startLng) * ease;

      setAnimatedPos([curLat, curLng]);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateMarker);
      } else {
        prevPosRef.current = [targetLat, targetLng];
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateMarker);
    setAnimatedHeading(busLocation.heading || 0);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [busLocation?.lat, busLocation?.lng, busLocation?.heading]);

  // Extract Route Polyline Waypoints (guard missing populated stops)
  const polylineCoords = route?.waypoints?.length > 0
    ? route.waypoints.map((w) => [w.lat, w.lng])
    : (route?.stops || [])
        .filter((s) => s?.stopId?.location?.coordinates)
        .map((s) => [s.stopId.location.coordinates[1], s.stopId.location.coordinates[0]]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border-subtle shadow-2xl bg-surface">
      {/* Floating ETA Card */}
      {showETACard && busLocation && (
        <ETACard
          busNumber={bus?.busNumber || 'PK-BUS-101'}
          routeName={route?.routeName || 'Transit Route'}
          nextStop={busLocation.nextStop || '—'}
          initialEtaMinutes={busLocation.eta ?? 0}
          status={bus?.status || 'ON ROUTE'}
          delayMinutes={bus?.status === 'delayed' ? bus?.delayMinutes || 6 : bus?.delayMinutes || 0}
          isSimulated={busLocation.isSimulated}
          isGpsLost={isBusGpsLost}
        />
      )}

      {/* GPS Lost Screen Overlay */}
      {isBusGpsLost && (
        <div className="absolute inset-0 z-[1001] bg-[#0A0E1A]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-status-red/15 border-2 border-status-red flex items-center justify-center text-status-red mb-4 animate-bounce">
            <WifiOff className="w-8 h-8" />
          </div>
          <h3 className="font-syne font-bold text-xl text-white mb-1">GPS Signal Lost</h3>
          <p className="text-text-muted text-sm max-w-sm font-mono mb-4">
            Location temporarily unavailable. Waiting for telemetry ping from vehicle onboard tracker...
          </p>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-status-red/20 text-status-red text-xs font-mono border border-status-red/30">
            <span className="w-2 h-2 rounded-full bg-status-red animate-ping" />
            Auto-reconnecting to live fleet stream...
          </span>
        </div>
      )}

      <MapContainer
        center={polylineCoords[0] || defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
      >
        {/* OSM raster tiles rendered dark via the tile-pane CSS invert filter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit Bounds Controller */}
        {polylineCoords.length > 0 && <MapBoundsController coordinates={polylineCoords} />}

        {/* Route Polyline with Glow */}
        {polylineCoords.length > 0 && (
          <>
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: route?.colorCode || '#38BDF8',
                weight: 8,
                opacity: 0.25,
              }}
            />
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: route?.colorCode || '#38BDF8',
                weight: 4,
                opacity: 0.9,
                dashArray: '6, 8',
              }}
            />
          </>
        )}

        {/* Route Stops Markers — click through to stop detail page */}
        {(route?.stops || []).map((stopItem, idx) => {
          const stopObj = stopItem?.stopId;
          if (!stopObj?.location?.coordinates) return null;
          const [lng, lat] = stopObj.location.coordinates;

          return (
            <Marker
              key={stopObj._id || idx}
              position={[lat, lng]}
              icon={createStopIcon(route?.colorCode || '#38BDF8', idx + 1)}
              eventHandlers={{
                click: () => stopObj._id && navigate(`/stops/${stopObj._id}`),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="font-mono text-xs">
                  <div className="font-bold text-text-primary">{stopObj.stopName}</div>
                  <div className="text-text-muted text-[10px]">Stop #{idx + 1} • click for live board</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Live Animated Bus Marker */}
        {!isBusGpsLost && busLocation && (
          <Marker
            position={animatedPos}
            icon={createBusIcon(animatedHeading, busLocation.isSimulated, bus?.status === 'delayed')}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={0.95} permanent={false}>
              <div className="font-mono text-xs text-text-primary">
                <div className="font-bold text-accent-blue flex items-center gap-1">
                  <span>{bus?.busNumber || 'Bus'}</span>
                  {busLocation.speed != null && <span>({Math.round(busLocation.speed)} km/h)</span>}
                </div>
                <div className="text-[10px] text-text-muted">Heading: {Math.round(animatedHeading)}°</div>
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
