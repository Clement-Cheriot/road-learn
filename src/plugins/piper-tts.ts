import { registerPlugin } from '@capacitor/core';

/**
 * Interface du plugin Piper TTS natif
 */
export interface PiperTTSPlugin {
  /**
   * Synthétise et joue le texte
   * @param options - Texte et paramètres audio
   */
  speak(options: {
    text: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }): Promise<{ success: boolean; message?: string }>;
  
  /**
   * Arrête la lecture en cours
   */
  stop(): Promise<void>;
  
  /**
   * Récupère les voix disponibles
   */
  getVoices(): Promise<{ voices: Array<{ voiceURI: string; name: string; lang: string }> }>;
}

// ✅ Nom corrigé pour matcher le Swift
const PiperTTS = registerPlugin<PiperTTSPlugin>('PiperTTSPlugin', {
  web: async () => {
    throw new Error('PiperTTS plugin is only available on native platforms');
  }
});

export { PiperTTS };
