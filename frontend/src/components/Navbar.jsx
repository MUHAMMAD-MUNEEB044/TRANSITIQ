import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bus, Radio, Bell, Map, Shield, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import useSocket from '../hooks/useSocket.js';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { connected } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allLinks = [
    { label: 'Explore Routes', path: '/routes', icon: Map },
    { label: 'Service Alerts', path: '/alerts', icon: Bell },
    { label: 'Driver Cockpit', path: '/driver/trip', icon: Radio, roles: ['driver', 'operator', 'admin'] },
    { label: 'Operator Room', path: '/operator/dashboard', icon: Shield, roles: ['operator', 'admin'] },
  ];

  const role = user?.role;
  const navLinks = allLinks.filter((l) => !l.roles || (role && l.roles.includes(role)));
  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const linkClass = (active) =>
    `px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all relative ${
      active
        ? 'bg-surface-alt text-accent-blue border border-accent-blue/30'
        : 'text-text-muted hover:text-white hover:bg-surface-alt/60 border border-transparent'
    }`;

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-accent-blue/40 flex items-center justify-center shadow-lg shadow-accent-blue/10 group-hover:shadow-accent-blue/30 group-hover:border-accent-blue transition-all">
            <Bus className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-syne font-extrabold text-lg tracking-tight text-white group-hover:text-accent-blue transition-colors">
                Transit<span className="gradient-text">IQ</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-alt border border-border-subtle text-accent-blue">
                PK
              </span>
            </div>
            <p className="text-[10px] text-text-muted font-mono leading-none">
              Transit Control System
            </p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path} className={linkClass(isActive(link.path))}>
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Live Network & Auth Controls */}
        <div className="flex items-center gap-3">
          {/* Socket Heartbeat */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border-subtle text-[11px] font-mono"
            title={connected ? 'Connected to live transit gateway' : 'Reconnecting to stream'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-status-green animate-pulse' : 'bg-status-red'
              }`}
            />
            <span className={connected ? 'text-status-green' : 'text-status-red'}>
              {connected ? 'LIVE' : 'RECONNECTING'}
            </span>
          </div>

          {/* User Auth Info / Login */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 bg-surface-alt/70 pl-1.5 pr-2 py-1.5 rounded-xl border border-border-subtle">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-[11px] font-bold text-background shadow-md">
                {initials}
              </div>
              <div className="hidden lg:block text-left text-xs font-mono">
                <div className="text-white font-semibold leading-none max-w-[120px] truncate">{user.name}</div>
                <div className="text-[10px] text-accent-purple capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 hover:text-status-red text-text-muted transition-colors rounded-md hover:bg-white/5"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-background font-semibold text-xs rounded-lg transition-all shadow-md shadow-accent-blue/20"
            >
              Sign In
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-white rounded-lg hover:bg-surface-alt transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border-subtle bg-[#0A0E1A]/95 backdrop-blur-xl animate-fade-in">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3.5 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                    isActive(link.path)
                      ? 'bg-surface-alt text-accent-blue'
                      : 'text-text-muted hover:text-white hover:bg-surface-alt/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
