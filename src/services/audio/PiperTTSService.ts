import { IAudioService, TTSOptions } from './AudioService.interface';
import { Capacitor } from '@capacitor/core';
import { PiperTTS } from '../../plugins/piper-tts';

/**
 * Service TTS basé sur Piper (ONNX Runtime)
 * Synthèse vocale offline de haute qualité
 */
export class PiperTTSService implements IAudioService {
  private isInitialized = false;
  private isSpeaking = false;

  /**
   * Initialise le service Piper TTS
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      throw new Error('Piper TTS only available on native platforms');
    }

    await this.initializeNativePlugin();
    this.isInitialized = true;
    console.log('✅ PiperTTSService initialisé');
  }

  /**
   * Initialisation plugin natif
   */
  private async initializeNativePlugin(): Promise<void> {
    console.log('🔍 DEBUG 1: Entering initializeNativePlugin');
    console.log('🔍 DEBUG 2: All Capacitor plugins:', Object.keys(Capacitor.Plugins));
    console.log('🔍 DEBUG 3: PiperTTSPlugin available?', 'PiperTTSPlugin' in Capacitor.Plugins);
    console.log('🔍 DEBUG 4: Capacitor.Plugins.PiperTTSPlugin:', Capacitor.Plugins.PiperTTSPlugin);
    
    try {
      console.log('🔍 DEBUG 5: Calling PiperTTS.initialize()...');
      
      // Appel direct du plugin importé
      const result = await PiperTTS.initialize({
        modelPath: 'fr_FR-siwis-medium.onnx',
        configPath: 'fr_FR-siwis-medium.onnx.json'
      });
      
      console.log('✅ Plugin PiperTTS natif initialisé:', result);
      
    } catch (error) {
      console.error('❌ Erreur initialisation plugin natif:', error);
      throw error;
    }
  }

  /**
   * Synthétise et joue le texte
   */
  async speak(text: string, options?: TTSOptions): Promise<void> {
    await this.initialize();

    try {
      console.log('🔊 PiperTTS speaking:', text);
      
      const result = await PiperTTS.speak({
        text,
        rate: options?.rate || 1.0,
        pitch: options?.pitch || 1.0,
        volume: options?.volume || 1.0
      });
      
      console.log('✅ Piper TTS result:', result);
      
    } catch (error) {
      console.error('❌ Piper TTS error:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isInitialized) return;
    await PiperTTS.stop();
    this.isSpeaking = false;
  }

  async getVoices(): Promise<string[]> {
    try {
      const result = await PiperTTS.getVoices();
      return result.voices.map(v => v.name);
    } catch {
      return ['Siwis (French)'];
    }
  }

  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * Vérifie si le service est disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log('🔍 isAvailable() called - Testing Piper plugin...');
      await this.initialize();
      return true;
    } catch (error) {
      console.error('❌ Piper TTS not available:', error);
      return false;
    }
  }
}
