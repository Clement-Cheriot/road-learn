/**
 * Service audio natif via @capacitor-community/text-to-speech
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { IAudioService, TTSOptions } from './AudioService.interface';
import { AUDIO_CONFIG } from '@/config/audio.config';

export class NativeAudioService implements IAudioService {
  private isSpeaking: boolean = false;

  async speak(text: string, options?: TTSOptions): Promise<void> {
    try {
      // Arrêter complètement l'audio précédent
      await this.stopSpeaking();
      
      // Attendre que l'arrêt soit effectif
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.isSpeaking = true;
      
      const config = {
        ...AUDIO_CONFIG.carMode,
        ...options,
      };
      
await TextToSpeech.speak({
  text,

  rate: config.rate || 0.75,
  pitch: config.pitch || 1.0,
  volume: config.volume || 1.0,
  category: 'playAndRecord',
  // ⬇️ Utilise un INDEX numérique pour tester les voix
  // voice: 0,  // Voix par défaut
  // voice: 1,  // Première voix alternative
  voice: 1,  // Deuxième voix alternative ⬅️ ESSAYE 0, 1, 2, 3, 4
    lang: 'fr-FR',
});
      
      this.isSpeaking = false;
      
    } catch (error) {
      this.isSpeaking = false;
      console.error('Erreur TTS natif:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await TextToSpeech.stop();
      this.isSpeaking = false;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      this.isSpeaking = false;
      console.error('Erreur stop TTS:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}