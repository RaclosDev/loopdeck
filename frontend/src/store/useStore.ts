/**
 * LoopDeck - Global Store (Zustand)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface Settings {
  showTimer: boolean;
  animationsEnabled: boolean;
  studyOrder: string;
  theme: 'dark' | 'light';
}

export interface StoreState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;

  currentDeckId: string | null;
  setCurrentDeckId: (id: string | null) => void;

  activeModal: string | null;
  modalData: unknown;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;

  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;

  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),

      toasts: [],
      addToast: () => {},

      currentDeckId: null,
      setCurrentDeckId: (id: string | null) => set({ currentDeckId: id }),

      activeModal: null,
      modalData: null,
      openModal: (name: string, data: unknown = null) => set({ activeModal: name, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      deferredPrompt: null,
      setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => set({ deferredPrompt: prompt }),

      settings: {
        showTimer: false,
        animationsEnabled: true,
        studyOrder: 'new_first',
        theme: 'dark',
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
