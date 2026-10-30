import { useState } from 'react';
import { getFirebaseAuth, googleProvider, signInWithPopup, firebaseEnabled } from '../config/firebase.js';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { resetSocket } from '../services/socket.js';

/**
 * Google Sign-In via Firebase Auth popup.
 * Flow: popup → Firebase ID token → POST /api/auth/google → app JWT session.
 * Returns { googleEnabled, signInWithGoogle, loading, error }.
 */
export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const setAuthSession = useAuthStore((s) => s.setSession);

  const googleEnabled = firebaseEnabled;

  const signInWithGoogle = async () => {
    if (!googleEnabled) return { success: false, cancelled: false, error: 'Google Sign-In is not configured.' };
    setLoading(true);
    setError(null);

    let idToken = null;
    let userGeo = null;
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, googleProvider);
      idToken = await result.user.getIdToken();
      userGeo = {
        name: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      };
    } catch (err) {
      setLoading(false);
      // Popup closed by the user — silent reset, no error surfaced
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, cancelled: true, error: null };
      }
      const msg = err?.code === 'auth/popup-blocked'
        ? 'Popup blocked by the browser — allow popups and retry.'
        : 'Google Sign-In failed. Please try again.';
      setError(msg);
      return { success: false, cancelled: false, error: msg };
    }

    try {
      const res = await api.post('/auth/google', { idToken });
      const { user, accessToken } = res.data.data;
      localStorage.setItem('transitiq_access_token', accessToken);
      localStorage.setItem('transitiq_user', JSON.stringify(user));
      resetSocket();
      setAuthSession(user, accessToken);
      return { success: true, user, cancelled: false, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || 'Google Sign-In failed on the server.';
      setError(msg);
      return { success: false, cancelled: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return { googleEnabled, signInWithGoogle, loading, error, clearError: () => setError(null) };
};

export default useGoogleAuth;
