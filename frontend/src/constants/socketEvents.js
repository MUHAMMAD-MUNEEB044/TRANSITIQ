export const SOCKET_EVENTS = {
  // Driver → Server
  DRIVER_LOCATION_UPDATE: 'driver:location_update',
  DRIVER_TRIP_START: 'driver:trip_start',
  DRIVER_TRIP_END: 'driver:trip_end',
  DRIVER_REPORT_DELAY: 'driver:report_delay',
  DRIVER_REPORT_ISSUE: 'driver:report_issue',

  // Server → Passengers
  PASSENGER_BUS_MOVED: 'passenger:bus_moved',
  PASSENGER_ETA_UPDATED: 'passenger:eta_updated',
  PASSENGER_GPS_LOST: 'passenger:gps_lost',
  PASSENGER_TRIP_ENDED: 'passenger:trip_ended',

  // Broadcasts
  ALERT_SERVICE_BROADCAST: 'alert:service_broadcast',
  ALERT_STOP_CLOSED: 'alert:stop_closed',

  // Simulation
  SIM_START: 'sim:start',
  SIM_STOP: 'sim:stop',
  SIM_TICK: 'sim:tick',
};
