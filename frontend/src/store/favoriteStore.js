import { create } from 'zustand';
import api from '../services/api.js';
import { useAuthStore } from './authStore.js';

const LS_KEY = 'transitiq_favorites';

const loadLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const useFavoriteStore = create((set, get) => ({
  favorites: [],
  loaded: false,

  fetchFavorites: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      try {
        const res = await api.get('/auth/favorites');
        const favorites = res.data?.data?.favorites || [];
        localStorage.setItem(LS_KEY, JSON.stringify(favorites)); // offline mirror
        set({ favorites, loaded: true });
        return;
      } catch {
        // fall through to local
      }
    }
    set({ favorites: loadLocal(), loaded: true });
  },

  isFavorite: (routeId) => get().favorites.includes(routeId),

  toggleFavorite: async (routeId) => {
    const isFav = get().favorites.includes(routeId);
    const next = isFav
      ? get().favorites.filter((id) => id !== routeId)
      : [...get().favorites, routeId];
    set({ favorites: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return isFav ? 'removed' : 'added';
    try {
      if (isFav) {
        await api.delete(`/auth/favorites/${routeId}`);
        return 'removed';
      }
      await api.post('/auth/favorites', { routeId });
      return 'added';
    } catch {
      // revert on server failure
      set({ favorites: get().favorites.filter((id) => id !== routeId || isFav) });
      return 'error';
    }
  },
}));
