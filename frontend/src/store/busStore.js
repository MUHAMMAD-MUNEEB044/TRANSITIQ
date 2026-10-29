import { create } from 'zustand';
import api from '../services/api.js';

export const useBusStore = create((set, get) => ({
  buses: [],
  selectedBus: null,
  liveLocations: {}, // busId -> { lat, lng, speed, heading, eta, nextStop, isSimulated, updatedAt }
  gpsLostBuses: {}, // busId -> boolean
  loading: false,
  error: null,

  fetchBuses: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/buses');
      const buses = res.data.data;
      const initialLocations = {};
      buses.forEach((b) => {
        if (b.currentLocation) {
          initialLocations[b._id] = {
            ...b.currentLocation,
            isSimulated: b.isSimulated || false,
            busNumber: b.busNumber,
          };
        }
      });
      set({ buses, liveLocations: { ...get().liveLocations, ...initialLocations }, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  updateBusLocation: (update) => {
    const { busId, lat, lng, speed, heading, eta, nextStop, isSimulated } = update;
    set((state) => ({
      liveLocations: {
        ...state.liveLocations,
        [busId]: {
          lat,
          lng,
          speed: speed ?? 30,
          heading: heading ?? 0,
          eta: eta ?? 4,
          nextStop: nextStop || 'Next Stop',
          isSimulated: !!isSimulated,
          updatedAt: new Date().toISOString(),
        },
      },
      // Clear GPS lost state for this bus if it was previously lost
      gpsLostBuses: {
        ...state.gpsLostBuses,
        [busId]: false,
      },
    }));
  },

  setGpsLost: (busId, lost = true) => {
    set((state) => ({
      gpsLostBuses: {
        ...state.gpsLostBuses,
        [busId]: lost,
      },
    }));
  },

  setSelectedBus: (bus) => set({ selectedBus: bus }),
}));
