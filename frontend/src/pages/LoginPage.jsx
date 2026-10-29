import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bus, Lock, Mail, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loading, error, clearError } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const redirectPath = location.state?.from?.pathname || '/';

  const routeAfterAuth = (userRole) => {
    if (userRole === 'driver') {
      navigate('/driver/trip');
    } else if (userRole === 'operator' || userRole === 'admin') {
      navigate('/operator/dashboard');
    } else {
      navigate(redirectPath);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    let res;
    if (isRegister) {
      // Public registration always creates a passenger account
      res = await register(name, email, password);
    } else {
      res = await login(email, password);
    }

    if (res.success) {
      routeAfterAuth(res.user?.role);
    }
  };

  const handleQuickDemo = async (demoEmail, demoPass) => {
    clearError();
    const res = await login(demoEmail, demoPass);
    if (res.success) {
      routeAfterAuth(res.user?.role);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-surface-alt border border-accent-blue/30 flex items-center justify-center text-accent-blue mx-auto mb-3 shadow-lg">
            <Bus className="w-6 h-6" />
          </div>
          <h1 className="font-syne font-bold text-2xl text-white">
            {isRegister ? 'Create TransitIQ Account' : 'Sign in to TransitIQ'}
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Pakistan Public Transport Network
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-status-red/10 border border-status-red/30 rounded-xl text-status-red text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1 uppercase">Full Name</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg border border-border-subtle focus-within:border-accent-blue">
                <UserCheck className="w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Mahmood"
                  className="bg-transparent text-sm w-full text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1 uppercase">Email Address</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg border border-border-subtle focus-within:border-accent-blue">
              <Mail className="w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@transitiq.pk"
                className="bg-transparent text-sm w-full text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1 uppercase">Password</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg border border-border-subtle focus-within:border-accent-blue">
              <Lock className="w-4 h-4 text-text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-sm w-full text-white focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <p className="text-[11px] font-mono text-text-muted bg-surface-alt/60 border border-border-subtle rounded-lg px-3 py-2">
              New accounts join as passengers. Staff roles are provisioned by a system administrator.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-background font-semibold text-sm rounded-lg shadow-lg shadow-accent-blue/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isRegister ? 'Register Account' : 'Authenticate & Enter'}</span>
            )}
          </button>
        </form>

        {/* Demo Quick Sign-in Shortcuts */}
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <span className="text-[10px] font-mono text-text-muted uppercase block text-center mb-2">
            QUICK ACCESS DEMO ACCOUNTS
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleQuickDemo('driver@transitiq.pk', 'driver123')}
              disabled={loading}
              className="p-1.5 bg-surface-alt hover:bg-white/10 rounded border border-border-subtle text-accent-blue text-center disabled:opacity-50"
            >
              Driver Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('operator@transitiq.pk', 'operator123')}
              disabled={loading}
              className="p-1.5 bg-surface-alt hover:bg-white/10 rounded border border-border-subtle text-status-green text-center disabled:opacity-50"
            >
              Operator Demo
            </button>
          </div>
        </div>

        {/* Switch Mode Toggle */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              clearError();
            }}
            className="text-xs font-mono text-text-muted hover:text-accent-blue transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
