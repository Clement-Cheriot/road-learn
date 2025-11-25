/**
 * AudioManager - Gestion centralisée de l'audio (TTS + STT)
 * 
 * PRINCIPE :
 * - Une seule instance globale
 * - Gère automatiquement pause STT pendant TTS
 * - API simple pour les pages : speak(), listen(), stop()
 * 
 * UTILISE SHERPA TTS (Piper voice offline)
 */

import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { registerPlugin } from '@capacitor/core';

// Enregistrer le plugin SherpaTTS
interface SherpaTTSPlugin {
  initialize(): Promise<{ success: boolean; sampleRate: number }>;
  speak(options: { text: string; speed?: number; speakerId?: number }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
  isInitialized(): Promise<{ initialized: boolean }>;
}

const SherpaTTS = registerPlugin<SherpaTTSPlugin>('SherpaTTS');

type SpeechCallback = (transcript: string) => void;
type ErrorCallback = (error: string) => void;

class AudioManager {
  private isSpeaking = false;
  private isListening = false;
  private wasListeningBeforeTTS = false;
  private speechCallback?: SpeechCallback;
  private errorCallback?: ErrorCallback;
  private isInitialized = false;

  /**
   * Initialisation (à appeler au démarrage de l'app)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ AudioManager already initialized');
      return;
    }

    try {
      // Initialiser Sherpa TTS
      console.log('🎯 Initializing Sherpa TTS...');
      const result = await SherpaTTS.initialize();
      console.log('✅ Sherpa TTS initialized! Sample rate:', result.sampleRate);
      
      // Demander permissions
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== 'granted') {
        throw new Error('Permission microphone refusée');
      }

      // Configurer listener STT
      await SpeechRecognition.removeAllListeners();
      await SpeechRecognition.addListener('partialResults', (data: any) => {
        // Ignorer si STT désactivé
        if (!this.isListening) {
          console.log('⚠️ STT result ignored (not listening)');
          return;
        }
        
        if (this.speechCallback && data.matches && data.matches.length > 0) {
          const transcript = data.matches[0];
          console.log('🎤 STT:', transcript);
          this.speechCallback(transcript);
        }
      });

      this.isInitialized = true;
      console.log('✅ AudioManager initialized');
    } catch (error) {
      console.error('❌ AudioManager init error:', error);
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error.message : 'Init error');
      }
    }
  }

  /**
   * Parler avec pause STT automatique
   */
  async speak(text: string, options?: { rate?: number; skipPauseResume?: boolean }): Promise<void> {
    try {
      console.log('🔊 Speaking:', text.substring(0, 50) + '...');

      // 1. PAUSE STT (seulement si skipPauseResume = false)
      if (!options?.skipPauseResume) {
        this.wasListeningBeforeTTS = this.isListening;
        if (this.isListening) {
          await this.pauseListening();
        }
      }

      // 2. PARLER avec Sherpa TTS
      this.isSpeaking = true;
      await SherpaTTS.speak({
        text,
        speed: options?.rate || 1.0,
        speakerId: 0
      });
      this.isSpeaking = false;
      console.log('✅ Speech completed');

      // 3. RÉACTIVER STT (seulement si skipPauseResume = false ET était actif avant)
      if (!options?.skipPauseResume && this.wasListeningBeforeTTS) {
        await this.resumeListening();
        this.wasListeningBeforeTTS = false;
      }
    } catch (error) {
      this.isSpeaking = false;
      console.error('❌ Speak error:', error);
      throw error;
    }
  }

  /**
   * Stopper la lecture en cours
   */
  async stopSpeaking(): Promise<void> {
    try {
      await SherpaTTS.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('❌ Stop speaking error:', error);
    }
  }

  /**
   * Démarrer l'écoute
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ Already listening, skipping');
      return;
    }

    try {
      // Délai pour éviter "Ongoing speech recognition"
      await new Promise(r => setTimeout(r, 200));
      
      await SpeechRecognition.start({
        language: 'fr-FR',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      this.isListening = true;
      console.log('✅ STT started');
    } catch (error) {
      console.error('❌ STT start error:', error);
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error.message : 'STT error');
      }
    }
  }

  /**
   * Stopper l'écoute
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      console.log('⚠️ STT already stopped, skipping');
      return;
    }

    try {
      await SpeechRecognition.stop();
      this.isListening = false;
      console.log('🛑 STT stopped');
    } catch (error) {
      console.error('❌ STT stop error:', error);
    }
  }

  /**
   * Pause STT (interne - utilisé pendant TTS)
   */
  private async pauseListening(): Promise<void> {
    try {
      await SpeechRecognition.stop();
      this.isListening = false;
      
      // Délai pour laisser le temps au stop de se propager
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      // Ignorer erreurs "No speech detected"
      if (error && typeof error === 'object' && 'message' in error) {
        const msg = (error as any).message;
        if (msg !== 'No speech detected') {
          console.error('❌ STT pause error:', error);
        }
      }
    }
  }

  /**
   * Resume STT (interne - après TTS)
   */
  private async resumeListening(): Promise<void> {
    try {
      // Délai pour éviter conflit
      await new Promise(r => setTimeout(r, 200));
      
      await SpeechRecognition.start({
        language: 'fr-FR',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      this.isListening = true;
    } catch (error) {
      console.error('❌ STT resume error:', error);
    }
  }

  /**
   * Enregistrer callback pour les transcriptions
   */
  onSpeech(callback: SpeechCallback): void {
    this.speechCallback = callback;
  }

  /**
   * Enregistrer callback pour les erreurs
   */
  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * État actuel
   */
  getState() {
    return {
      isSpeaking: this.isSpeaking,
      isListening: this.isListening,
      isInitialized: this.isInitialized,
    };
  }
}

// Instance globale unique
export const audioManager = new AudioManager();
