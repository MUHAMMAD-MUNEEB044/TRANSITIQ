import { create } from 'zustand';
import api from '../services/api.js';
import { resetSocket } from '../services/socket.js';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('transitiq_user') || 'null'),
  token: localStorage.getItem('transitiq_access_token') || null,
  isAuthenticated: !!localStorage.getItem('transitiq_access_token'),
  loading: false,
  error: null,

  // Shared by email/password login and Google OAuth
  setSession: (user, accessToken) =>
    set({ user, token: accessToken, isAuthenticated: true, loading: false, error: null }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken } = res.data.data;
      localStorage.setItem('transitiq_access_token', accessToken);
      localStorage.setItem('transitiq_user', JSON.stringify(user));
      resetSocket(); // Re-bind socket with new auth credentials
      set({ user, token: accessToken, isAuthenticated: true, loading: false });
      return { success: true, user };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  register: async (name, email, password, role = 'passenger') => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      const { user, accessToken } = res.data.data;
      localStorage.setItem('transitiq_access_token', accessToken);
      localStorage.setItem('transitiq_user', JSON.stringify(user));
      resetSocket();
      set({ user, token: accessToken, isAuthenticated: true, loading: false });
      return { success: true, user };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed.';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('transitiq_access_token');
    localStorage.removeItem('transitiq_user');
    resetSocket();
    set({ user: null, token: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
