import { useEffect, useState, useRef } from 'react';
import getSocket from '../services/socket.js';
import { useBusStore } from '../store/busStore.js';
import { useAlertStore } from '../store/alertStore.js';
import { SOCKET_EVENTS } from '../constants/socketEvents.js';

export const useSocket = (routeId = null) => {
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [socketGpsLost, setSocketGpsLost] = useState(false);

  const disconnectTimerRef = useRef(null);
  const socketRef = useRef(null);

  const updateBusLocation = useBusStore((s) => s.updateBusLocation);
  const setGpsLost = useBusStore((s) => s.setGpsLost);
  const addAlert = useAlertStore((s) => s.addAlert);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      setLastError(null);
      setSocketGpsLost(false);
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      if (routeId) {
        socket.emit('join_route', { routeId });
      }
    };

    const onDisconnect = (reason) => {
      setConnected(false);
      console.warn('[useSocket] Disconnected from server:', reason);

      // On disconnect for > 5s → set gpsLost state
      if (!disconnectTimerRef.current) {
        disconnectTimerRef.current = setTimeout(() => {
          setSocketGpsLost(true);
        }, 5000);
      }
    };

    const onConnectError = (err) => {
      setLastError(err.message);
    };

    // Real-Time Bus Location Moved
    const onBusMoved = (data) => {
      // updateBusLocation also clears this bus's GPS-lost state
      updateBusLocation(data);
    };

    // Real-Time GPS Lost signal — tracked per bus, not globally
    const onGpsLost = (data) => {
      console.warn('[useSocket] Received GPS lost event:', data);
      if (data.busId) {
        setGpsLost(data.busId, true);
      }
    };

    // Real-time Service Alert Broadcast
    const onServiceAlert = (alert) => {
      addAlert(alert);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(SOCKET_EVENTS.PASSENGER_BUS_MOVED, onBusMoved);
    socket.on(SOCKET_EVENTS.PASSENGER_GPS_LOST, onGpsLost);
    socket.on(SOCKET_EVENTS.ALERT_SERVICE_BROADCAST, onServiceAlert);

    // If already connected and routeId supplied, join room immediately
    if (socket.connected && routeId) {
      socket.emit('join_route', { routeId });
    }

    return () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
      if (routeId) {
        socket.emit('leave_route', { routeId });
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(SOCKET_EVENTS.PASSENGER_BUS_MOVED, onBusMoved);
      socket.off(SOCKET_EVENTS.PASSENGER_GPS_LOST, onGpsLost);
      socket.off(SOCKET_EVENTS.ALERT_SERVICE_BROADCAST, onServiceAlert);
    };
  }, [routeId, updateBusLocation, setGpsLost, addAlert]);

  return {
    socket: socketRef.current,
    connected,
    lastError,
    socketGpsLost,
  };
};

export default useSocket;
