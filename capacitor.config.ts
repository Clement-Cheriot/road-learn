import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roadlearn.app',
  appName: 'Road Learn',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0EA5E9",
      showSpinner: false,
    },
    // ⬇️ AJOUTER : Config audio
    Audio: {
      echoCancellation: true,        // Annulation d'écho
      noiseSuppression: true,        // Suppression bruit
      autoGainControl: true,         // Contrôle gain auto
    },
  },
};

export default config;