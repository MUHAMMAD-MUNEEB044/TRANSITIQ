import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bus, Lock, Mail, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore.js';
import { useGoogleAuth } from '../hooks/useGoogleAuth.js';
import { toast } from '../store/toastStore.js';

const GoogleGIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, register, loading, error, clearError } = useAuthStore();
  const { googleEnabled, signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

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
    const res = isRegister
      ? await register(name, email, password)
      : await login(email, password);
    if (res.success) routeAfterAuth(res.user?.role);
  };

  const handleGoogle = async () => {
    clearError();
    const res = await signInWithGoogle();
    if (res.success) routeAfterAuth(res.user?.role);
    // popup closed by user → silent reset, nothing shown
  };

  const handleQuickDemo = async (demoEmail, demoPass) => {
    clearError();
    const res = await login(demoEmail, demoPass);
    if (res.success) routeAfterAuth(res.user?.role);
  };

  const demoAccounts = [
    { label: t('login.passengerDemo'), email: 'passenger@transitiq.pk', pass: 'passenger123', color: 'text-text-primary' },
    { label: t('login.driverDemo'), email: 'driver@transitiq.pk', pass: 'driver123', color: 'text-accent-blue' },
    { label: t('login.operatorDemo'), email: 'operator@transitiq.pk', pass: 'operator123', color: 'text-status-green' },
    { label: t('login.adminDemo'), email: 'admin@transitiq.pk', pass: 'admin123', color: 'text-accent-purple' },
  ];

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
            {isRegister ? t('login.registerTitle') : t('login.signInTitle')}
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">{t('login.subtitle')}</p>
        </div>

        {(error || googleError) && (
          <div className="mb-4 p-3 bg-status-red/10 border border-status-red/30 rounded-xl text-status-red text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || googleError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1 uppercase">{t('login.fullName')}</label>
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
            <label className="block text-xs font-mono text-text-muted mb-1 uppercase">{t('login.email')}</label>
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
            <label className="block text-xs font-mono text-text-muted mb-1 uppercase">{t('login.password')}</label>
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
              {t('login.registerNote')}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-background font-semibold text-sm rounded-lg shadow-lg shadow-accent-blue/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{isRegister ? t('login.registerBtn') : t('login.loginBtn')}</span>
            )}
          </button>
        </form>

        {/* Google OAuth */}
        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-[11px] font-mono text-text-muted uppercase">{t('login.or')}</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className="w-full py-2.5 bg-surface-alt hover:bg-white/10 text-white font-semibold text-sm rounded-lg border border-border-subtle hover:border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GoogleGIcon />
              )}
              <span>{t('login.continueGoogle')}</span>
            </button>
          </>
        )}

        {/* Demo Quick Sign-in — 2x2 grid of all four accounts */}
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <span className="text-[10px] font-mono text-text-muted uppercase block text-center mb-2">
            {t('login.demoAccounts')}
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading || googleLoading}
                onClick={() => handleQuickDemo(acc.email, acc.pass)}
                className={`p-1.5 bg-surface-alt hover:bg-white/10 rounded border border-border-subtle ${acc.color} text-center disabled:opacity-50 transition-colors`}
              >
                {acc.label}
              </button>
            ))}
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
            {isRegister ? t('login.switchToLogin') : t('login.switchToRegister')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
