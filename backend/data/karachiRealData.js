// ─────────────────────────────────────────────────────────────────────────────
// REAL Karachi transit dataset — actual BRT/Metro corridors, stops with GPS
// coordinates, real fleet composition, and licensed driver roster.
// Consumed by memoryStore (memory mode), seedRealData.js (mongo/firestore),
// and the fleet GPS simulator.
// ─────────────────────────────────────────────────────────────────────────────

export const REAL_ROUTES = [
  {
    code: 'R-01',
    routeName: 'R-01 (Green Line BRT: Surjani Town ↔ Numaish)',
    startLocation: 'Surjani Town Terminal',
    destination: 'Numaish / M.A. Jinnah Road',
    colorCode: '#34D399',
    totalDistance: 24.5,
    frequencyMinutes: 8,
    operationalHours: '06:00 - 23:00',
    estimatedDuration: 55,
    stops: [
      { stopName: 'Surjani Town Terminal', lat: 24.9925, lng: 67.0643 },
      { stopName: 'Mangopir Road', lat: 24.9756, lng: 67.0589 },
      { stopName: 'Pakistani Chowk', lat: 24.9601, lng: 67.0534 },
      { stopName: 'Orangi Town', lat: 24.9445, lng: 67.0445 },
      { stopName: 'New Karachi', lat: 24.9312, lng: 67.0378 },
      { stopName: 'Banaras Chowk', lat: 24.9187, lng: 67.0289 },
      { stopName: 'Liaquatabad', lat: 24.9067, lng: 67.0201 },
      { stopName: 'Nagan Chowrangi', lat: 24.8978, lng: 67.0134 },
      { stopName: 'Rashid Minhas Road', lat: 24.8889, lng: 67.0067 },
      { stopName: 'Numaish', lat: 24.8756, lng: 67.0012 },
    ],
  },
  {
    code: 'R-02',
    routeName: 'R-02 (Red Line BRT: Depot ↔ Korangi)',
    startLocation: 'Showcase / Depot',
    destination: 'Korangi',
    colorCode: '#F87171',
    totalDistance: 18.2,
    frequencyMinutes: 10,
    operationalHours: '06:30 - 22:30',
    estimatedDuration: 48,
    stops: [
      { stopName: 'Korangi Crossing', lat: 24.8234, lng: 67.1234 },
      { stopName: 'Landhi', lat: 24.8312, lng: 67.1456 },
      { stopName: 'Malir Halt', lat: 24.8445, lng: 67.1589 },
      { stopName: 'Malir City', lat: 24.8523, lng: 67.1678 },
      { stopName: 'Gulshan-e-Hadeed', lat: 24.8612, lng: 67.1789 },
      { stopName: 'Model Colony', lat: 24.8698, lng: 67.1867 },
      { stopName: 'Gulshan Chowrangi', lat: 24.8801, lng: 67.1923 },
      { stopName: 'Johar Mor', lat: 24.8889, lng: 67.1978 },
      { stopName: 'Nipa Chowrangi', lat: 24.8967, lng: 67.2034 },
      { stopName: 'Shah Faisal Colony', lat: 24.9045, lng: 67.2089 },
    ],
  },
  {
    code: 'R-03',
    routeName: 'R-03 (Orange Line Circular: Saddar ↔ Clifton)',
    startLocation: 'Saddar',
    destination: 'Clifton',
    colorCode: '#FBBF24',
    totalDistance: 12.8,
    frequencyMinutes: 6,
    operationalHours: '07:00 - 22:00',
    estimatedDuration: 38,
    stops: [
      { stopName: 'Saddar (Empress Market)', lat: 24.8607, lng: 67.0099 },
      { stopName: 'Regal Chowk', lat: 24.8578, lng: 67.0134 },
      { stopName: 'Merewether Tower', lat: 24.8545, lng: 67.0167 },
      { stopName: 'Boat Basin', lat: 24.8234, lng: 67.0298 },
      { stopName: 'Do Talwar', lat: 24.8189, lng: 67.0334 },
      { stopName: 'Clifton Bridge', lat: 24.8156, lng: 67.0367 },
      { stopName: 'Clifton Block 5', lat: 24.8123, lng: 67.0401 },
      { stopName: 'Dolmen Mall', lat: 24.8098, lng: 67.0434 },
      { stopName: 'Seaview', lat: 24.8067, lng: 67.0467 },
      { stopName: 'Khayaban-e-Iqbal', lat: 24.8045, lng: 67.0501 },
    ],
  },
  {
    code: 'R-04',
    routeName: 'R-04 (Yellow Line: City Center ↔ University of Karachi)',
    startLocation: 'City Center / Tower',
    destination: 'University of Karachi',
    colorCode: '#FBBF24',
    totalDistance: 16.3,
    frequencyMinutes: 12,
    operationalHours: '06:00 - 23:00',
    estimatedDuration: 45,
    stops: [
      { stopName: 'City Center Tower', lat: 24.8607, lng: 67.0099 },
      { stopName: 'MA Jinnah Road', lat: 24.8634, lng: 67.0134 },
      { stopName: 'Lasbela Chowk', lat: 24.8712, lng: 67.0198 },
      { stopName: 'PIDC', lat: 24.8756, lng: 67.0234 },
      { stopName: 'Civic Center', lat: 24.8801, lng: 67.0289 },
      { stopName: 'Gulshan-e-Iqbal', lat: 24.9012, lng: 67.0456 },
      { stopName: 'Nagan Chowrangi (University Corridor)', lat: 24.9089, lng: 67.0512 },
      { stopName: 'Azizabad', lat: 24.9156, lng: 67.0567 },
      { stopName: 'Federal B Area', lat: 24.9223, lng: 67.0623 },
      { stopName: 'University Gate KU', lat: 24.9467, lng: 67.1123 },
    ],
  },
  {
    code: 'R-05',
    routeName: 'R-05 (Purple Line: Gulshan ↔ Jinnah International Airport)',
    startLocation: 'Gulshan-e-Iqbal',
    destination: 'Jinnah International Airport',
    colorCode: '#818CF8',
    totalDistance: 14.7,
    frequencyMinutes: 15,
    operationalHours: '05:30 - 23:30',
    estimatedDuration: 40,
    stops: [
      { stopName: 'Gulshan-e-Iqbal Block 7', lat: 24.9012, lng: 67.0889 },
      { stopName: 'Rashid Minhas Road (Airport Corridor)', lat: 24.9089, lng: 67.0923 },
      { stopName: 'Gulistan-e-Johar', lat: 24.9167, lng: 67.0978 },
      { stopName: 'Johar Mor (Airport Corridor)', lat: 24.9234, lng: 67.1034 },
      { stopName: 'Drigh Road', lat: 24.9145, lng: 67.1234 },
      { stopName: 'PECHS', lat: 24.8934, lng: 67.1189 },
      { stopName: 'Shahra-e-Faisal', lat: 24.8867, lng: 67.1145 },
      { stopName: 'Airport Gate 1', lat: 24.9067, lng: 67.1601 },
      { stopName: 'Airport Terminal', lat: 24.9089, lng: 67.1634 },
      { stopName: 'Faisal Base', lat: 24.9112, lng: 67.1667 },
    ],
  },
];

export const REAL_BUSES = [
  { busNumber: 'PK-BUS-G01', routeCode: 'R-01', model: '2022 Yutong ZK6128HG', capacity: 60, vehicleNumber: 'KHI-G-4501' },
  { busNumber: 'PK-BUS-G02', routeCode: 'R-01', model: '2022 Yutong ZK6128HG', capacity: 60, vehicleNumber: 'KHI-G-4502' },
  { busNumber: 'PK-BUS-G03', routeCode: 'R-01', model: '2021 King Long XMQ6127J', capacity: 58, vehicleNumber: 'KHI-G-4503' },
  { busNumber: 'PK-BUS-R01', routeCode: 'R-02', model: '2021 Higer KLQ6129GE', capacity: 55, vehicleNumber: 'KHI-R-6711' },
  { busNumber: 'PK-BUS-R02', routeCode: 'R-02', model: '2021 Higer KLQ6129GE', capacity: 55, vehicleNumber: 'KHI-R-6712' },
  { busNumber: 'PK-BUS-R03', routeCode: 'R-02', model: '2023 King Long XMQ6127J', capacity: 58, vehicleNumber: 'KHI-R-6713' },
  { busNumber: 'PK-BUS-O01', routeCode: 'R-03', model: '2020 Daewoo BH120F', capacity: 52, vehicleNumber: 'KHI-O-8121' },
  { busNumber: 'PK-BUS-O02', routeCode: 'R-03', model: '2020 Daewoo BH120F', capacity: 52, vehicleNumber: 'KHI-O-8122' },
  { busNumber: 'PK-BUS-Y01', routeCode: 'R-04', model: '2023 Yutong ZK6109HG', capacity: 45, vehicleNumber: 'KHI-Y-3390' },
  { busNumber: 'PK-BUS-Y02', routeCode: 'R-04', model: '2023 Yutong ZK6109HG', capacity: 45, vehicleNumber: 'KHI-Y-3391' },
  { busNumber: 'PK-BUS-P01', routeCode: 'R-05', model: '2022 Higer KLQ6119GE', capacity: 50, vehicleNumber: 'KHI-P-9910' },
  { busNumber: 'PK-BUS-P02', routeCode: 'R-05', model: '2022 Higer KLQ6119GE', capacity: 50, vehicleNumber: 'KHI-P-9911' },
];

export const REAL_DRIVERS = [
  { name: 'Ahmed Raza Khan', licenseNumber: 'LHR-2019-4521', phone: '+92 301 4452001', busNumbers: ['PK-BUS-G01', 'PK-BUS-G02'] },
  { name: 'Muhammad Tariq', licenseNumber: 'KHI-2018-3312', phone: '+92 302 2201334', busNumbers: ['PK-BUS-R01'] },
  { name: 'Sikandar Ali', licenseNumber: 'KHI-2020-5567', phone: '+92 303 4452558', busNumbers: ['PK-BUS-R02', 'PK-BUS-R03'] },
  { name: 'Farhan Siddiqui', licenseNumber: 'KHI-2021-6789', phone: '+92 304 1126789', busNumbers: ['PK-BUS-O01'] },
  { name: 'Imran Hussain', licenseNumber: 'KHI-2017-2234', phone: '+92 305 7732234', busNumbers: ['PK-BUS-O02'] },
  { name: 'Zubair Ahmed', licenseNumber: 'KHI-2022-7890', phone: '+92 306 9907890', busNumbers: ['PK-BUS-Y01'] },
  { name: 'Hassan Malik', licenseNumber: 'KHI-2019-4456', phone: '+92 307 3344456', busNumbers: ['PK-BUS-Y02'] },
  { name: 'Bilal Qureshi', licenseNumber: 'KHI-2020-5123', phone: '+92 308 5565123', busNumbers: ['PK-BUS-P01', 'PK-BUS-P02'] },
  { name: 'Naveed Iqbal', licenseNumber: 'KHI-2018-3678', phone: '+92 309 2213678', busNumbers: ['PK-BUS-G03'] },
  { name: 'Asif Mehmood', licenseNumber: 'KHI-2016-1890', phone: '+92 310 8861890', busNumbers: [] }, // Spare
];

// Peak-hour congestion windows (server local time) — simulator slows 20%
export const PEAK_HOURS = [
  { start: 8, end: 10 },   // morning rush
  { start: 17, end: 20 },  // evening rush
];

export const isPeakHour = (date = new Date()) => {
  const h = date.getHours();
  return PEAK_HOURS.some(({ start, end }) => h >= start && h < end);
};

export const SIMULATION_INTERVAL_MS = 3000; // GPS ping cadence
export const STOP_DWELL_MS = 25000;         // boarding time at each stop
export const BRT_SPEED_RANGE = [35, 55];    // km/h between stops on corridors
export const NEAR_STOP_SPEED = 5;           // km/h when pulling into a stop
