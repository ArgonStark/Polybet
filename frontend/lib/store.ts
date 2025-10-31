import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Session data
  sessionId: string | null;
  safeAddress: string | null;
  fid: number | null;
  
  // Actions
  setSessionId: (id: string | null) => void;
  setSafeAddress: (address: string | null) => void;
  setFid: (fid: number | null) => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sessionId: null,
      safeAddress: null,
      fid: null,
      
      // Actions
      setSessionId: (id) => set({ sessionId: id }),
      setSafeAddress: (address) => set({ safeAddress: address }),
      setFid: (fid) => set({ fid }),
      clearSession: () => set({ 
        sessionId: null, 
        safeAddress: null 
      }),
    }),
    {
      name: 'polymarket-mini-storage',
    }
  )
);