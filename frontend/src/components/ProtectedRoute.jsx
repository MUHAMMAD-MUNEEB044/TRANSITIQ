import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

/**
 * Role-gated route wrapper. Renders children only when the user is
 * authenticated and holds one of the allowed roles; otherwise redirects
 * to /login (or shows an access-denied screen when logged in but unauthorized).
 */
export const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-status-red/15 text-status-red flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="font-syne font-bold text-xl text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            This area requires the{' '}
            <span className="text-accent-blue font-mono">{roles.join(' / ')}</span> role. You are
            signed in as <span className="text-white font-semibold capitalize">{user.role}</span>.
          </p>
          <a
            href="/"
            className="inline-flex px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-background font-semibold text-sm rounded-xl transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
