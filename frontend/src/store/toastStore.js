import { create } from 'zustand';

let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [],

  push: (message, variant = 'info', duration = 4000) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => get().dismiss(id), duration);
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg, duration) => useToastStore.getState().push(msg, 'success', duration),
  error: (msg, duration) => useToastStore.getState().push(msg, 'error', duration || 5000),
  info: (msg, duration) => useToastStore.getState().push(msg, 'info', duration),
};
