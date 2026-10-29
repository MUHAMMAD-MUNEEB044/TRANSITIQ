import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('transitiq_access_token');
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: token || null,
      },
    });

    socketInstance.on('connect', () => {
      console.log('[TransitIQ Socket] Connected with ID:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[TransitIQ Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[TransitIQ Socket] Connection error:', err.message);
    });
  }

  return socketInstance;
};

export const resetSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default getSocket;
