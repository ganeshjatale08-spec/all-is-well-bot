import { create } from 'zustand';

type ToastVariant = 'default' | 'success' | 'error';

type ToastState = {
  message: string | null;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
};

/** Transient UI state (CLAUDE.md: "transient UI/wizard → Zustand"). */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: 'default',
  show: (message, variant = 'default') => set({ message, variant }),
  hide: () => set({ message: null }),
}));
