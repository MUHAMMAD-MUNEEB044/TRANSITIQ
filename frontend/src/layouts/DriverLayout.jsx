import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Bus, Radio, Shield, LogOut, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import useSocket from '../hooks/useSocket.js';

export const DriverLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { connected } = useSocket();

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-[#E2E8F0] flex flex-col font-sans select-none">
      {/* Mobile Driver Top Header */}
      <header className="h-14 bg-surface border-b border-border-subtle px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/15 border border-accent-blue/40 flex items-center justify-center text-accent-blue">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="font-syne font-bold text-sm text-white flex items-center gap-1.5">
              <span>Driver Cockpit</span>
              <span className="text-[10px] font-mono px-1 rounded bg-accent-blue/20 text-accent-blue">
                PK
              </span>
            </div>
            <div className="text-[10px] font-mono text-text-muted">
              {user?.name || 'Driver'}
            </div>
          </div>
        </div>

        {/* Status Indicators & Exit */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-alt border border-border-subtle text-[10px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-status-green animate-pulse' : 'bg-status-red'
              }`}
            />
            <span className={connected ? 'text-status-green' : 'text-status-red'}>
              {connected ? 'ONLINE' : 'LINK DOWN'}
            </span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg bg-surface-alt hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            title="Exit to passenger portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Driver Screen Content (Centered for mobile viewport: 380px - 500px) */}
      <main className="flex-1 flex flex-col max-w-md w-full mx-auto p-4 relative">
        <Outlet />
      </main>
    </div>
  );
};

export default DriverLayout;
