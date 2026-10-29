import { create } from 'zustand';
import api from '../services/api.js';

export const useRouteStore = create((set) => ({
  routes: [],
  selectedRoute: null,
  routeStops: [],
  searchResults: { directRoutes: [], transferRoutes: [] },
  loading: false,
  searchLoading: false,
  error: null,

  fetchRoutes: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/routes');
      set({ routes: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchRouteById: async (id) => {
    set({ loading: true });
    try {
      const res = await api.get(`/routes/${id}`);
      set({ selectedRoute: res.data.data.route, loading: false });
      return res.data.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  fetchRouteStopsWithETA: async (routeId) => {
    try {
      const res = await api.get(`/routes/${routeId}/stops`);
      set({ routeStops: res.data.data.stops });
      return res.data.data.stops;
    } catch (err) {
      console.warn('Failed to fetch stops ETA:', err.message);
      return [];
    }
  },

  searchRoutes: async (params) => {
    set({ searchLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.from) queryParams.set('from', params.from);
      if (params.to) queryParams.set('to', params.to);
      if (params.fromLat && params.fromLng) {
        queryParams.set('fromLat', params.fromLat);
        queryParams.set('fromLng', params.fromLng);
      }
      if (params.toLat && params.toLng) {
        queryParams.set('toLat', params.toLat);
        queryParams.set('toLng', params.toLng);
      }

      const res = await api.get(`/routes/search?${queryParams.toString()}`);
      set({ searchResults: res.data.data, searchLoading: false });
      return res.data.data;
    } catch (err) {
      set({ error: err.message, searchLoading: false });
      return { directRoutes: [], transferRoutes: [] };
    }
  },

  clearSearch: () => set({ searchResults: { directRoutes: [], transferRoutes: [] } }),
}));
