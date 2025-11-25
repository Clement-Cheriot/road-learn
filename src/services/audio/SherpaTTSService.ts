/**
 * SherpaTTSService - Service TTS utilisant Sherpa-ONNX avec voix Piper
 * 
 * Implémente IAudioService pour être compatible avec l'architecture existante
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { IAudioService, TTSOptions } from './AudioService.interface';

// Interface du plugin Sherpa natif
interface SherpaTTSPlugin {
  initialize(): Promise<{ success: boolean; sampleRate: number }>;
  speak(options: { text: string; speed?: number; speakerId?: number }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
  isInitialized(): Promise<{ initialized: boolean }>;
}

// Enregistrer le plugin
const SherpaTTS = registerPlugin<SherpaTTSPlugin>('SherpaTTS');

export class SherpaTTSService implements IAudioService {
  private isNativePluginReady = false;
  private isSpeaking = false;
  private sampleRate = 22050;

  /**
   * Initialise le plugin natif Sherpa TTS
   */
  private async initializeNativePlugin(): Promise<boolean> {
    if (this.isNativePluginReady) {
      return true;
    }

    try {
      console.log('🎯 [SherpaTTS] Initializing native plugin...');
      console.log('🔍 DEBUG: Available plugins:', Object.keys(Capacitor.Plugins));
      console.log('🔍 DEBUG: SherpaTTS in plugins?', 'SherpaTTS' in Capacitor.Plugins);
      
      const result = await SherpaTTS.initialize();
      
      if (result.success) {
        this.isNativePluginReady = true;
        this.sampleRate = result.sampleRate;
        console.log('✅ [SherpaTTS] Plugin initialized! Sample rate:', this.sampleRate);
        return true;
      }
      
      console.error('❌ [SherpaTTS] Initialize returned false');
      return false;
    } catch (error) {
      console.error('❌ [SherpaTTS] Init error:', error);
      return false;
    }
  }

  /**
   * Parle le texte donné
   */
  async speak(text: string, options?: TTSOptions): Promise<void> {
    // S'assurer que le plugin est initialisé
    if (!this.isNativePluginReady) {
      const success = await this.initializeNativePlugin();
      if (!success) {
        throw new Error('SherpaTTS plugin not available');
      }
    }

    try {
      console.log('🔊 [SherpaTTS] Speaking:', text.substring(0, 50) + '...');
      this.isSpeaking = true;
      
      await SherpaTTS.speak({
        text,
        speed: options?.rate ?? 1.0,
        speakerId: 0
      });
      
      this.isSpeaking = false;
      console.log('✅ [SherpaTTS] Speech completed');
    } catch (error) {
      this.isSpeaking = false;
      console.error('❌ [SherpaTTS] Speak error:', error);
      throw error;
    }
  }

  /**
   * Arrête la lecture en cours
   */
  async stopSpeaking(): Promise<void> {
    try {
      await SherpaTTS.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('❌ [SherpaTTS] Stop error:', error);
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  async isAvailable(): Promise<boolean> {
    // Seulement sur plateforme native
    if (Capacitor.getPlatform() === 'web') {
      console.log('⚠️ [SherpaTTS] Not available on web');
      return false;
    }

    try {
      // Essayer d'initialiser
      return await this.initializeNativePlugin();
    } catch (error) {
      console.error('❌ [SherpaTTS] Not available:', error);
      return false;
    }
  }

  /**
   * Retourne l'état de lecture
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
