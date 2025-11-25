/**
 * Service audio natif via @capacitor-community/text-to-speech
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { IAudioService, TTSOptions } from './AudioService.interface';
import { AUDIO_CONFIG } from '@/config/audio.config';

export class NativeAudioService implements IAudioService {
  private isSpeaking: boolean = false;
  private currentlySpeakingText = ''; // ⬅️ Tracking de la voix actuelle
  private lastSpeechEndTime = 0; // ⬅️ Timestamp de fin pour cooldown
  private onSpeechStartCallback?: () => void; // ⬅️ NOUVEAU
  private onSpeechEndCallback?: () => void; // ⬅️ NOUVEAU

  async speak(text: string, options?: TTSOptions): Promise<void> {
    try {
      // Arrêter complètement l'audio précédent
      await this.stopSpeaking();

      // Attendre que l'arrêt soit effectif
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.isSpeaking = true;
      this.currentlySpeakingText = text.toLowerCase().trim(); // ⬅️ SAUVEGARDER

      // ⬅️ NOUVEAU : Notifier le début de la lecture
      if (this.onSpeechStartCallback) {
        this.onSpeechStartCallback();
      }

      const config = {
        ...AUDIO_CONFIG.carMode,
        ...options,
      };

      // ⬅️ UN SEUL appel à TextToSpeech.speak
      await TextToSpeech.speak({
        text,
        rate: config.rate || 0.75,
        pitch: config.pitch || 1.0,
        volume: config.volume || 1.0,
        category: 'playAndRecord', // ⬅️ Compatible avec micro actif
        voice: 1, // ⬅️ Essaye 0, 1, 2, 3, 4 pour trouver la bonne voix FR
        lang: 'fr-FR',
      });

      this.isSpeaking = false;
      this.currentlySpeakingText = ''; // ⬅️ RESET
      this.lastSpeechEndTime = Date.now(); // ⬅️ TIMESTAMP de fin

      // ⬅️ NOUVEAU : Notifier la fin de la lecture
      if (this.onSpeechEndCallback) {
        this.onSpeechEndCallback();
      }
    } catch (error) {
      this.isSpeaking = false;
      this.currentlySpeakingText = '';
      console.error('Erreur TTS natif:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await TextToSpeech.stop();
      this.isSpeaking = false;
      this.currentlySpeakingText = '';
      this.lastSpeechEndTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      this.isSpeaking = false;
      console.error('Erreur stop TTS:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  // ⬅️ NOUVELLES MÉTHODES pour détection d'écho

  /**
   * Retourne le texte actuellement en cours de lecture
   */
  getCurrentlySpeakingText(): string {
    return this.currentlySpeakingText;
  }

  /**
   * Vérifie si on est dans la période de cooldown (500ms après fin de lecture)
   */
  isInCooldownPeriod(): boolean {
    return Date.now() - this.lastSpeechEndTime < 500; // 500ms cooldown
  }

  /**
   * Retourne true si le service est en train de parler
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
