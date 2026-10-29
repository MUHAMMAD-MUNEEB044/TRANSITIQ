import { create } from 'zustand';
import api from '../services/api.js';

export const useAlertStore = create((set) => ({
  alerts: [],
  dismissedAlertIds: new Set(),
  loading: false,

  fetchAlerts: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/alerts');
      set({ alerts: res.data.data, loading: false });
    } catch (err) {
      console.warn('Failed to load alerts:', err.message);
      set({ loading: false });
    }
  },

  addAlert: (alert) => {
    set((state) => {
      // Prevent duplicates — key on _id when present, else message+timestamp
      const isDup = state.alerts.some((a) =>
        alert._id != null
          ? a._id === alert._id
          : a.message === alert.message && a.timestamp === alert.timestamp
      );
      if (isDup) return state;
      return { alerts: [alert, ...state.alerts] };
    });
  },

  dismissAlert: (id) => {
    set((state) => {
      const updatedDismissed = new Set(state.dismissedAlertIds);
      updatedDismissed.add(id);
      return { dismissedAlertIds: updatedDismissed };
    });
  },
}));
