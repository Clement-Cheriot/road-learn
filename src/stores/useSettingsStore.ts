import { create } from 'zustand';

interface SettingsState {
  audioMode: boolean; // Mode commande vocale global
  showMicIndicator: boolean; // Afficher l'indicateur niveau micro
  setAudioMode: (enabled: boolean) => void;
  toggleAudioMode: () => void;
  setShowMicIndicator: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  audioMode: true, // Actif dès le départ comme demandé
  showMicIndicator: true,
  setAudioMode: (enabled) => set({ audioMode: enabled }),
  toggleAudioMode: () => set((s) => ({ audioMode: !s.audioMode })),
  setShowMicIndicator: (show) => set({ showMicIndicator: show }),
}));
