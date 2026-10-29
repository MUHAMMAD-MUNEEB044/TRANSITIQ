import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import ServiceAlertBanner from '../components/ServiceAlertBanner.jsx';
import { Bus, MapPin, Radio, Shield, Heart } from 'lucide-react';

export const PassengerLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0E1A] text-[#E2E8F0]">
      {/* Top Real-time Service Alert Banner */}
      <ServiceAlertBanner />

      {/* Main Navigation */}
      <Navbar />

      {/* Dynamic Content Area with Grid Accent Pattern */}
      <main className="flex-1 bg-grid-pattern relative">
        <Outlet />
      </main>

      {/* Dark Control Room Footer */}
      <footer className="bg-surface border-t border-border-subtle py-8 px-4 sm:px-6 lg:px-8 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            <span className="text-text-primary font-semibold">TransitIQ Pakistan</span>
            <span>•</span>
            <span>Karachi Public Transit Control Room</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/routes" className="hover:text-accent-blue transition-colors">
              Routes
            </Link>
            <Link to="/alerts" className="hover:text-accent-blue transition-colors">
              Alerts
            </Link>
            <Link to="/driver/trip" className="hover:text-accent-purple transition-colors">
              Driver Cockpit
            </Link>
            <Link to="/operator/dashboard" className="hover:text-status-green transition-colors">
              Operator
            </Link>
          </div>

          <div className="text-center md:text-right">
            <span>Sub-Second Telemetry • Live Map Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PassengerLayout;
