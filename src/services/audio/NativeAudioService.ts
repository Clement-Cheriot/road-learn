/**
 * Service audio natif - VERSION SIMPLIFIÉE
 * 
 * CHANGEMENTS :
 * - Voix "Thomas" hardcodée (pas de sélection)
 * - Plus de VoiceManager ni de page de test
 * - Configuration minimale pour la production
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { IAudioService, TTSOptions } from './AudioService.interface';

export class NativeAudioService implements IAudioService {
  private isSpeaking: boolean = false;
  private isInitialized = false;

  // ⬇️ VOIX HARDCODÉE - Thomas Enhanced (meilleure qualité)
  // Fallback auto sur Compact si Enhanced pas téléchargée
  private readonly VOICE_URI = 'com.apple.voice.enhanced.fr-FR.Thomas';
  private readonly VOICE_LANG = 'fr-FR';

  /**
   * Initialise le service (à appeler au démarrage de l'app)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ NativeAudioService already initialized');
      return;
    }
    
    // Test rapide de la voix
    try {
      await TextToSpeech.speak({
        text: ' ',
        rate: 1.0,
        pitch: 1.0,
        volume: 0.01,
        category: 'playAndRecord',
        voice: this.VOICE_URI,
        lang: this.VOICE_LANG,
      });
      await TextToSpeech.stop();
      
      this.isInitialized = true;
      console.log('✅ NativeAudioService initialized with Thomas voice');
    } catch (error) {
      console.error('❌ NativeAudioService init error:', error);
      this.isInitialized = true; // Continue quand même
    }
  }

  /**
   * Parler avec la voix Thomas
   */
  async speak(text: string, options?: TTSOptions): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Arrêter toute lecture en cours
      await this.stopSpeaking();
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.isSpeaking = true;
      console.log('🔊 Speaking:', text.substring(0, 50) + '...');

      await TextToSpeech.speak({
        text,
        rate: options?.rate || 1.0,
        pitch: options?.pitch || 1.0,
        volume: options?.volume || 1.0,
        category: 'playAndRecord',
        voice: this.VOICE_URI,
        lang: this.VOICE_LANG,
      });

      this.isSpeaking = false;
      console.log('✅ Speech completed');
      
    } catch (error) {
      this.isSpeaking = false;
      console.error('❌ TTS error:', error);
      throw error;
    }
  }

  /**
   * Arrêter la lecture en cours
   */
  async stopSpeaking(): Promise<void> {
    try {
      await TextToSpeech.stop();
      this.isSpeaking = false;
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      this.isSpeaking = false;
      console.error('❌ Stop TTS error:', error);
    }
  }

  /**
   * Vérifier si le TTS est disponible
   */
  async isAvailable(): Promise<boolean> {
    return true; // Toujours disponible sur iOS natif
  }

  /**
   * Obtenir l'état de lecture
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
