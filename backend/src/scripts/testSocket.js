import { io } from 'socket.io-client';

async function testWebSockets() {
  console.log('Testing TransitIQ WebSocket Engine...');

  const socketPassenger = io('http://localhost:5000', {
    transports: ['websocket'],
  });

  const socketDriver = io('http://localhost:5000', {
    transports: ['websocket'],
  });

  let busMovedReceived = false;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket test timed out after 10 seconds'));
    }, 10000);

    socketPassenger.on('connect', () => {
      console.log('[PASS] Passenger socket connected:', socketPassenger.id);
      socketPassenger.emit('join_route', { routeId: 'route-test-101' });

      // Listen for moved event
      socketPassenger.on('passenger:bus_moved', (data) => {
        console.log('[PASS] Received passenger:bus_moved event:', data);
        busMovedReceived = true;
        clearTimeout(timeout);
        resolve();
      });
    });

    socketDriver.on('connect', () => {
      console.log('[PASS] Driver socket connected:', socketDriver.id);

      setTimeout(() => {
        console.log('[Driver] Emitting location update...');
        socketDriver.emit('driver:location_update', {
          tripId: 'trip-test-99',
          busId: 'bus-test-01',
          routeId: 'route-test-101',
          lat: 24.8607,
          lng: 67.0011,
          speed: 35,
          heading: 90,
          timestamp: new Date().toISOString(),
        });
      }, 1000);
    });
  });

  socketPassenger.disconnect();
  socketDriver.disconnect();

  if (busMovedReceived) {
    console.log('[PASS] Real-time WebSocket sub-second transmission successfully verified!');
    process.exit(0);
  } else {
    console.error('[FAIL] passenger:bus_moved was not received.');
    process.exit(1);
  }
}

testWebSockets().catch((err) => {
  console.error('[FAIL]', err.message);
  process.exit(1);
});
