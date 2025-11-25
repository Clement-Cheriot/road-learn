/**
 * Service audio natif avec callback onSpeechEnd pour mode talkie-walkie
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { IAudioService, TTSOptions } from './AudioService.interface';
import { AUDIO_CONFIG } from '@/config/audio.config';
import { voiceManager } from './VoiceManager';

export class NativeAudioService implements IAudioService {
  private isSpeaking: boolean = false;
  private isInitialized = false;

  /**
   * Initialise le service (à appeler au démarrage de l'app)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await voiceManager.initialize();
    this.isInitialized = true;
    
    const voiceInfo = voiceManager.getSelectedVoiceInfo();
    console.log('🎤 NativeAudioService initialisé avec:', voiceInfo?.name);
  }
  
  /**
   * Reset complet du TTS pour forcer le changement de voix
   */
  async resetTTS(): Promise<void> {
    console.log('🔄 Reset complet du TTS...');
    
    try {
      await TextToSpeech.stop();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const selectedVoice = voiceManager.getSelectedVoiceInfo();
      console.log('🎤 Attempting to use voice:', selectedVoice?.name, selectedVoice?.voiceURI);
      
      const isCompactVoice = selectedVoice?.voiceURI?.includes('.compact.');
      console.log('📦 Is compact voice (preinstalled):', isCompactVoice);
      
      if (!isCompactVoice) {
        console.warn('⚠️ Cette voix nécessite un téléchargement dans les réglages iOS');
        console.warn('   Réglages → Accessibilité → Contenu énoncé → Voix');
      }
      
      await TextToSpeech.speak({
        text: ' ',
        rate: 1.0,
        pitch: 1.0,
        volume: 0.01,
        category: 'playAndRecord',
        voice: selectedVoice?.voiceURI || selectedVoice?.name,
        lang: selectedVoice?.lang || 'fr-FR',
      });
      
      await TextToSpeech.stop();
      
      console.log('✅ TTS reset avec voix:', selectedVoice?.name);
    } catch (error) {
      console.error('❌ Erreur reset TTS:', error);
    }
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      await this.stopSpeaking();
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.isSpeaking = true;

      const config = {
        ...AUDIO_CONFIG.carMode,
        ...options,
      };

      // Récupérer la voix sélectionnée
      const selectedVoice = voiceManager.getSelectedVoiceInfo();
      console.log('🎤 Selected voice:', selectedVoice?.name, selectedVoice?.lang);
      
      const voiceIdentifier = selectedVoice?.voiceURI || selectedVoice?.name || 'Thomas';
      const voiceLang = selectedVoice?.lang || 'fr-FR';
      console.log('🔴 Using voice:', voiceIdentifier, 'lang:', voiceLang);

      await TextToSpeech.speak({
        text,
        rate: options?.rate || 1.2,
        pitch: options?.pitch || 1.0,
        volume: options?.volume || 1.0,
        category: 'playAndRecord',
        voice: voiceIdentifier,
        lang: voiceLang,
      });

      this.isSpeaking = false;
      console.log('✅ Speech completed with', voiceIdentifier);
      
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
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      this.isSpeaking = false;
      console.error('Erreur stop TTS:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
