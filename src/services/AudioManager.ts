/**
 * AudioManager - Gestion centralisée de l'audio (TTS + STT)
 * 
 * PRINCIPE :
 * - Une seule instance globale
 * - Gère automatiquement pause STT pendant TTS
 * - API simple pour les pages : speak(), listen(), stop()
 * 
 * CORRECTIONS BUILD 3 :
 * - Ignorer les résultats STT quand isListening = false
 * - Protection contre double stop
 * - Délai avant restart pour éviter "Ongoing speech recognition"
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

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
      // Demander permissions
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== 'granted') {
        throw new Error('Permission microphone refusée');
      }

      // Configurer listener STT
      await SpeechRecognition.removeAllListeners();
      await SpeechRecognition.addListener('partialResults', (data: any) => {
        // ⬇️ CORRECTION : Ignorer si STT désactivé
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
          console.log('⏸️ Pausing STT...');
          await this.pauseListening();
        }
      }

      // 2. PARLER
      this.isSpeaking = true;
      await TextToSpeech.speak({
        text,
        lang: 'fr-FR',
        rate: options?.rate || 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'playAndRecord',
        voice: 'com.apple.voice.compact.fr-FR.Thomas',
      });
      this.isSpeaking = false;
      console.log('✅ Speech completed');

      // 3. RÉACTIVER STT (seulement si skipPauseResume = false ET était actif avant)
      if (!options?.skipPauseResume && this.wasListeningBeforeTTS) {
        console.log('▶️ Resuming STT...');
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
    await TextToSpeech.stop();
    this.isSpeaking = false;
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
      // ⬇️ CORRECTION : Délai pour éviter "Ongoing speech recognition"
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
      console.log('⏸️ STT paused');
      
      // ⬇️ CORRECTION : Délai pour laisser le temps au stop de se propager
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error('❌ STT pause error:', error);
    }
  }

  /**
   * Resume STT (interne - après TTS)
   */
  private async resumeListening(): Promise<void> {
    try {
      // ⬇️ CORRECTION : Délai pour éviter conflit
      await new Promise(r => setTimeout(r, 200));
      
      await SpeechRecognition.start({
        language: 'fr-FR',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      this.isListening = true;
      console.log('▶️ STT resumed');
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
