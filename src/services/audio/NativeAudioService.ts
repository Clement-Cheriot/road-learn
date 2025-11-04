/**
 * 🚧 IMPLÉMENTATION NATIVE (à activer post-migration Capacitor)
 * 
 * Service TTS natif via @capacitor-community/text-to-speech
 * Avantages :
 * - Fonctionne 100% offline
 * - Voix système natives (Siri iOS, Google Android)
 * - Audio en arrière-plan (mode voiture)
 * - Performance optimale
 * 
 * Installation requise :
 * npm install @capacitor-community/text-to-speech
 */

import type { IAudioService, TTSOptions, Voice } from './AudioService.interface';

// 🚧 TODO: Décommenter après installation Capacitor
// import { TextToSpeech } from '@capacitor-community/text-to-speech';

export class NativeAudioService implements IAudioService {
  private speaking: boolean = false;

  async speak(text: string, options?: TTSOptions): Promise<void> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      this.speaking = true;
      
      await TextToSpeech.speak({
        text,
        lang: options?.language || 'fr-FR',
        rate: options?.rate || 0.85,
        pitch: options?.pitch || 1.0,
        volume: options?.volume || 1.0,
        category: 'playback', // Important : audio en arrière-plan
      });
      
      this.speaking = false;
    } catch (error) {
      this.speaking = false;
      throw new Error(`Native TTS error: ${error}`);
    }
    */

    // Temporaire : fallback Web Speech API pour développement
    console.warn('🚧 Native TTS not available, using web fallback');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.language || 'fr-FR';
    utterance.rate = options?.rate || 0.85;
    window.speechSynthesis.speak(utterance);
    
    return new Promise((resolve) => {
      utterance.onend = () => resolve();
    });
  }

  async stopSpeaking(): Promise<void> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      await TextToSpeech.stop();
      this.speaking = false;
    } catch (error) {
      console.error('Native TTS stop error:', error);
    }
    */

    // Temporaire : fallback web
    window.speechSynthesis.cancel();
    this.speaking = false;
  }

  async isAvailable(): Promise<boolean> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      const { value } = await TextToSpeech.isLanguageSupported({ 
        lang: 'fr-FR' 
      });
      return value;
    } catch (error) {
      return false;
    }
    */

    // Temporaire : vérification web
    return 'speechSynthesis' in window;
  }

  async getVoices(): Promise<Voice[]> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      return voices.map(v => ({
        voiceURI: v.voiceURI || '',
        name: v.name || '',
        lang: v.lang || 'fr-FR',
        localService: true,
        default: v.default || false,
      }));
    } catch (error) {
      return [];
    }
    */

    // Temporaire : voix web
    return window.speechSynthesis.getVoices() as Voice[];
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}
