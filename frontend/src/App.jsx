import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastHost } from './components/Toast.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

// Layouts
import PassengerLayout from './layouts/PassengerLayout.jsx';
import DriverLayout from './layouts/DriverLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

// Passenger Pages
import HomePage from './pages/HomePage.jsx';
import TrackRoutePage from './pages/TrackRoutePage.jsx';
import RoutesListPage from './pages/RoutesListPage.jsx';
import StopDetailPage from './pages/StopDetailPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MyJourneysPage from './pages/MyJourneysPage.jsx';

// Driver Mobile Cockpit Pages
import DriverSelectPage from './pages/driver/DriverSelectPage.jsx';
import DriverTripPage from './pages/driver/DriverTripPage.jsx';

// Operator Views
import OperatorDashboardPage from './pages/operator/OperatorDashboardPage.jsx';
import OperatorBusesPage from './pages/operator/OperatorBusesPage.jsx';
import OperatorRoutesPage from './pages/operator/OperatorRoutesPage.jsx';
import OperatorDriversPage from './pages/operator/OperatorDriversPage.jsx';
import OperatorAlertsPage from './pages/operator/OperatorAlertsPage.jsx';
import OperatorTripsMapPage from './pages/operator/OperatorTripsMapPage.jsx';

// Admin Views
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';

const STAFF = ['driver', 'operator', 'admin'];
const CONTROL_ROOM = ['operator', 'admin'];

export function App() {
  return (
    <>
      <Routes>
        {/* Passenger Core Interface */}
        <Route element={<PassengerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/track/:routeId" element={<TrackRoutePage />} />
          <Route path="/routes" element={<RoutesListPage />} />
          <Route path="/stops/:stopId" element={<StopDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/my-journeys" element={<MyJourneysPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Driver Mobile Single-Hand Cockpit */}
        <Route element={<DriverLayout />}>
          <Route
            path="/driver/select"
            element={
              <ProtectedRoute roles={STAFF}>
                <DriverSelectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/trip"
            element={
              <ProtectedRoute roles={STAFF}>
                <DriverTripPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Operator & Admin Control Room */}
        <Route element={<AdminLayout />}>
          {/* Operator Views */}
          <Route path="/operator/dashboard" element={<ProtectedRoute roles={CONTROL_ROOM}><OperatorDashboardPage /></ProtectedRoute>} />
          <Route path="/operator/buses" element={<ProtectedRoute roles={CONTROL_ROOM}><OperatorBusesPage /></ProtectedRoute>} />
          <Route path="/operator/routes" element={<ProtectedRoute roles={CONTROL_ROOM}><OperatorRoutesPage /></ProtectedRoute>} />
          <Route path="/operator/drivers" element={<ProtectedRoute roles={CONTROL_ROOM}><OperatorDriversPage /></ProtectedRoute>} />
          <Route path="/operator/alerts" element={<ProtectedRoute roles={CONTROL_ROOM}><OperatorAlertsPage /></ProtectedRoute>} />
          <Route path="/operator/trips" element={<ProtectedRoute roles={CONTROL_ROOM}><OperatorTripsMapPage /></ProtectedRoute>} />

          {/* Admin Views */}
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminAnalyticsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </>
  );
}

export default App;
