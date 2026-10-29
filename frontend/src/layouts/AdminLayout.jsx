import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Route,
  Users,
  Bell,
  BarChart3,
  MapPin,
  Settings,
  Shield,
  Radio,
  LogOut,
  ArrowLeft,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import useSocket from '../hooks/useSocket.js';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { connected } = useSocket();

  const operatorLinks = [
    { label: 'Overview', path: '/operator/dashboard', icon: LayoutDashboard },
    { label: 'Active Trips Map', path: '/operator/trips', icon: MapPin },
    { label: 'Fleet Management', path: '/operator/buses', icon: Bus },
    { label: 'Transit Corridors', path: '/operator/routes', icon: Route },
    { label: 'Driver Allocation', path: '/operator/drivers', icon: Users },
    { label: 'Service Alerts', path: '/operator/alerts', icon: Bell },
  ];

  const adminLinks = [
    { label: 'Platform Users', path: '/admin/users', icon: Shield },
    { label: 'Network Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-[#E2E8F0] flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-surface border-r border-border-subtle flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent-blue/15 border border-accent-blue/40 flex items-center justify-center text-accent-blue shadow-md">
                <Shield className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <span className="font-syne font-bold text-base text-white">TransitIQ</span>
                <span className="block text-[10px] font-mono text-accent-purple">
                  OPS CONTROL ROOM
                </span>
              </div>
            </Link>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-alt border border-border-subtle text-status-green">
              🇵🇰 PK
            </span>
          </div>

          {/* Links Section: Operator */}
          <div className="p-3">
            <span className="text-[10px] font-mono text-text-muted uppercase px-3 mb-2 block tracking-wider font-semibold">
              DISPATCH & OPERATIONS
            </span>
            <nav className="space-y-1">
              {operatorLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                      isActive
                        ? 'bg-accent-blue/15 text-accent-blue font-bold border border-accent-blue/30'
                        : 'text-text-muted hover:text-white hover:bg-surface-alt'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Links Section: Admin */}
          <div className="p-3 border-t border-border-subtle/50">
            <span className="text-[10px] font-mono text-text-muted uppercase px-3 mb-2 block tracking-wider font-semibold">
              ADMINISTRATION
            </span>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                      isActive
                        ? 'bg-accent-purple/15 text-accent-purple font-bold border border-accent-purple/30'
                        : 'text-text-muted hover:text-white hover:bg-surface-alt'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Info & Switch to Passenger Mode */}
        <div className="p-4 border-t border-border-subtle bg-surface-alt/40">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-status-green animate-pulse' : 'bg-status-red'
                }`}
              />
              <span className="text-[11px] text-text-muted">
                {connected ? 'Socket Connected' : 'Offline'}
              </span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-[11px] text-accent-blue hover:underline flex items-center gap-1"
            >
              <span>Public UI</span>
              <ArrowLeft className="w-3 h-3 rotate-180" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'Operations Controller'}
              </div>
              <div className="text-[10px] font-mono text-accent-purple capitalize">
                {user?.role || 'Operator'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-white/5 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Control Room Canvas */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-grid-pattern">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
