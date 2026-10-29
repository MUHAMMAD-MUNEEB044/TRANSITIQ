# TransitIQ — Smart Public Transport & Bus Tracking Platform 🚌🇵🇰

> *"Know where your bus is. Before it leaves."*

TransitIQ is a full-stack, real-time public transit tracking and fleet intelligence platform built with a high-performance **Transit Control Room** design system. Tailored for **Pakistan** (centralized across Karachi, Lahore, and Islamabad transit networks including the People's Bus Service, Green Line BRT, and university corridors), TransitIQ provides sub-second GPS tracking, smooth marker interpolation, live countdown ETAs, and dedicated cockpits for passengers, drivers, and transit operators.

---

## 🏗 Monorepo Architecture

```
transitiq/
├── frontend/                     # React 18, Vite, Tailwind CSS, Leaflet, Zustand, Recharts
│   ├── src/
│   │   ├── components/           # LiveMap, RouteSearchBar, RouteResultCard, ETACard, StatusBadge
│   │   ├── pages/                # Passenger, Driver Mobile, Operator, and Admin dashboards
│   │   ├── layouts/              # PassengerLayout, DriverLayout, AdminLayout
│   │   ├── store/                # Zustand state stores (auth, bus, route, alert)
│   │   ├── hooks/                # useSocket (failover), useETA, useGPS
│   │   ├── services/             # Axios API instance and Socket client
│   │   ├── utils/                # haversine.js, gpsSimulator.js
│   │   ├── constants/            # socketEvents.js, roles.js, routeColors.js
│   │   └── assets/
│   └── index.html
├── backend/                      # Node.js (ESM), Express, Socket.io, Mongoose
│   ├── src/
│   │   ├── models/               # User, Driver, Bus, Route, Stop, Trip, Alert, memoryStore
│   │   ├── routes/               # auth, buses, routes, stops, drivers, trips, alerts, analytics
│   │   ├── controllers/          # Business logic and query processors
│   │   ├── middleware/           # auth.js, roles.js (requireRole), validate.js, rateLimiter.js
│   │   ├── sockets/              # socketManager.js, gpsSimulator.js
│   │   ├── utils/                # haversine.js, etaCalculator.js
│   │   ├── config/               # db.js (5 retries + memory store fallback), env.js
│   │   └── scripts/              # seed.js, validateAll.js
│   └── server.js
├── .env.example                  # Environment configuration template
└── README.md
```

---

## 🎨 Design System — "Transit Control Room"

- **Primary Background**: `#0A0E1A` (Deep navy)
- **Surfaces**: `#111827` (Card base) & `#1A2236` (Hover / Input accent)
- **Accent Blue**: `#38BDF8` (Live telemetry pulse, primary CTA)
- **Accent Purple**: `#818CF8` (Simulation mode, admin elements)
- **Status Badges**:
  - `ON TIME`: Green `#34D399` with pulsing live dot
  - `DELAYED`: Yellow `#FBBF24` with warning indicator
  - `OFFLINE`: Red `#F87171`
  - `GPS LOST`: Red pulsing badge + "Location temporarily unavailable" overlay
  - `SIMULATION MODE`: Purple `#818CF8` badge
- **Typography**: `Syne` (Headings), `Inter` (Body), `JetBrains Mono` (Telemetry & ETAs)
- **Vector Tiles**: CartoDB Dark Matter (no API key required).

---

## ⚡ WebSocket Event Contract

| Event | Direction | Payload | Description |
|---|---|---|---|
| `driver:location_update` | Driver ➔ Server | `{ tripId, busId, lat, lng, speed, heading, timestamp }` | Real-time GPS ping |
| `driver:trip_start` | Driver ➔ Server | `{ tripId, busId, routeId, driverId }` | Driver initiates active run |
| `driver:trip_end` | Driver ➔ Server | `{ tripId, busId }` | Driver concludes active run |
| `driver:report_delay` | Driver ➔ Server | `{ tripId, delayMinutes, reason }` | Broadcasts delay alert to room |
| `driver:report_issue` | Driver ➔ Server | `{ tripId, issueType, description }` | Broadcasts vehicle alert |
| `passenger:bus_moved` | Server ➔ Passenger | `{ busId, lat, lng, speed, heading, eta, nextStop }` | Sub-second position update |
| `passenger:eta_updated` | Server ➔ Passenger | `{ busId, stopId, etaMinutes, status }` | Live ETA countdown recalculation |
| `passenger:gps_lost` | Server ➔ Passenger | `{ busId, lastSeenAt }` | Dispatched if no ping for > 15s |
| `alert:service_broadcast`| Server ➔ All | `{ routeId, type, message, severity, timestamp }`| Instant operator bulletin |

---

## 🚀 Quickstart & Installation

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Create `backend/.env` (or copy `.env.example`):
```bash
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/transitiq
JWT_SECRET=transitiq_super_secret_jwt_access_key_2026_pk
JWT_REFRESH_SECRET=transitiq_super_secret_jwt_refresh_key_2026_pk_7d
SIMULATION_INTERVAL_MS=3000
```
> **Zero-Configuration Mode**: If MongoDB is not installed locally, TransitIQ automatically and seamlessly enables an in-memory data store seeded with Karachi transit routes, allowing immediate testing out of the box!

### 3. Run Development Servers
**Terminal 1 (Backend - Port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend - Port 5173):**
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Accounts & Walkthrough

| Role | Email | Password | Primary Portal |
|---|---|---|---|
| **Passenger** | `passenger@transitiq.pk` | `passenger123` | `/` (Home & Tracking) |
| **Driver** | `driver@transitiq.pk` | `driver123` | `/driver/trip` (Mobile Cockpit) |
| **Operator** | `operator@transitiq.pk` | `operator123` | `/operator/dashboard` (Control Room) |
| **Administrator** | `admin@transitiq.pk` | `admin123` | `/admin/analytics` (Telemetry) |

### 🧭 Interactive Walkthrough Guide

1. **Passenger Real-Time Tracking**:
   - Open `http://localhost:5173`.
   - In the search bar, search from `"City Center"` to `"University Gate"`.
   - Click **"Track This Bus Live"** to open `/track/:routeId`.
   - Watch the animated SVG bus marker smoothly glide between waypoints along M.A. Jinnah & University Road with bearing rotation and live ETA countdown.
   - Click **"START LIVE SIMULATOR"** on the top right to start continuous waypoint streaming.

2. **Driver Mobile Cockpit**:
   - Navigate to `http://localhost:5173/driver/trip` (or `/login` with `driver@transitiq.pk`).
   - Tap **`[▶ START TRIP]`** (large 56px height tap target).
   - If geolocation is enabled, your actual mobile GPS coordinates are streamed; if unavailable, **Simulation Mode** activates automatically.
   - Tap **`[⚠ Report Delay]`** to select delay duration and Karachi traffic reasons.
   - Tap **`[⏹ END TRIP]`** to finish the shift.

3. **Operator & Admin Control Room**:
   - Navigate to `http://localhost:5173/operator/dashboard` (or login as `operator@transitiq.pk`).
   - View the 8-metric Stats Matrix (`Active Now`, `Delayed`, `Offline`, `Avg Delay`, etc.).
   - Navigate to `/operator/alerts` to compose and broadcast announcements directly to passengers.
   - Navigate to `/admin/analytics` to view Recharts line charts (30-day delay trends), area charts (Karachi rush hours), and completion rate gauges.

---

## 🧪 Self-Validation Suite
Run the comprehensive 44-point verification loop:
```bash
cd backend
node src/scripts/validateAll.js
```
Expected output:
```
===============================================================
TOTAL CHECKS: 44
PASSED:       44
FAILED:       0
SUCCESS RATE: 100%
===============================================================
```
