/**
 * LoopDeck — Global Store (Zustand)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
  // ── UI State ────────────────────────────────────────────────
  sidebarOpen: false,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  // ── Toasts ──────────────────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => {
    const id = crypto.randomUUID();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, duration);
  },

  // ── Study Session State ─────────────────────────────────────
  currentDeckId: null,
  setCurrentDeckId: (id) => set({ currentDeckId: id }),

  // ── Modal State ─────────────────────────────────────────────
  activeModal: null,
  modalData: null,
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // ── PWA Install State ───────────────────────────────────────
  deferredPrompt: null,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),

  // ── Settings ────────────────────────────────────────────────
  settings: {
    showTimer: false,
    animationsEnabled: true,
    studyOrder: 'new_first',
  },
  updateSettings: (newSettings) => set((s) => ({ settings: { ...s.settings, ...newSettings } })),
    }),
    {
      name: 'loopdeck-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

export default useStore;
