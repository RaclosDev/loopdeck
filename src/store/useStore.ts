/**
 * LoopDeck — Global Store (Zustand)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface Settings {
  showTimer: boolean;
  animationsEnabled: boolean;
  studyOrder: string;
}

export interface StoreState {
  // ── UI State ────────────────────────────────────────────────
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // ── Toasts ──────────────────────────────────────────────────
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;

  // ── Study Session State ─────────────────────────────────────
  currentDeckId: string | null;
  setCurrentDeckId: (id: string | null) => void;

  // ── Modal State ─────────────────────────────────────────────
  activeModal: string | null;
  modalData: any;
  openModal: (name: string, data?: any) => void;
  closeModal: () => void;

  // ── PWA Install State ───────────────────────────────────────
  deferredPrompt: any | null;
  setDeferredPrompt: (prompt: any) => void;

  // ── Settings ────────────────────────────────────────────────
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // ── UI State ────────────────────────────────────────────────
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),

      // ── Toasts ──────────────────────────────────────────────────
      toasts: [],
      addToast: (message: string, type: ToastMessage['type'] = 'info', duration: number = 3000) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, duration);
      },

      // ── Study Session State ─────────────────────────────────────
      currentDeckId: null,
      setCurrentDeckId: (id: string | null) => set({ currentDeckId: id }),

      // ── Modal State ─────────────────────────────────────────────
      activeModal: null,
      modalData: null,
      openModal: (name: string, data: any = null) => set({ activeModal: name, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // ── PWA Install State ───────────────────────────────────────
      deferredPrompt: null,
      setDeferredPrompt: (prompt: any) => set({ deferredPrompt: prompt }),

      // ── Settings ────────────────────────────────────────────────
      settings: {
        showTimer: false,
        animationsEnabled: true,
        studyOrder: 'new_first',
      },
      updateSettings: (newSettings: Partial<Settings>) => set((s) => ({ settings: { ...s.settings, ...newSettings } })),
    }),
    {
      name: 'loopdeck-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

export default useStore;
