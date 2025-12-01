/**
 * AudioManager - Gestion centralisée TTS + STT
 * Pipeline pré-génération avec 2 slots parallèles
 * 
 * LOGS SWIFT (filtrer avec grep):
 * ⏳ GEN_START <key>
 * ✅ GEN_END <key> dur=Xs gen=Xs  
 * ▶️ PLAY_START <key>
 * ⏸️ PLAY_END <key>
 * ⚠️ CACHE_MISS <key>
 * 🔄 SPEAK_DIRECT "text..."
 */

import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { registerPlugin } from '@capacitor/core';

interface SherpaTTSPlugin {
  initialize(): Promise<{ success: boolean; sampleRate: number }>;
  speak(options: { text: string; speed?: number }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
  isInitialized(): Promise<{ initialized: boolean }>;
  pregenerate(options: { text: string; cacheKey: string; speed?: number }): Promise<{
    success: boolean;
    cacheKey?: string;
    duration?: number;
    genTime?: number;
  }>;
  speakCached(options: { cacheKey: string }): Promise<{ success: boolean; reason?: string }>;
  clearCache(): Promise<{ success: boolean; cleared?: number }>;
  isCached(options: { cacheKey: string }): Promise<{ cached: boolean }>;
  resetTimer(): Promise<{ success: boolean }>;
  logEvent(options: { event: string }): Promise<{ success: boolean }>;
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

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await SherpaTTS.initialize();
      
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== 'granted') {
        throw new Error('Permission micro refusée');
      }

      await SpeechRecognition.removeAllListeners();
      await SpeechRecognition.addListener('partialResults', (data: any) => {
        if (!this.isListening) return;
        if (this.speechCallback && data.matches?.length > 0) {
          this.speechCallback(data.matches[0]);
        }
      });

      this.isInitialized = true;
    } catch (error) {
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error.message : 'Init error');
      }
    }
  }

  /** Pré-générer audio (non-bloquant, max 2 parallèles côté natif) */
  async pregenerate(text: string, cacheKey: string, speed = 0.9): Promise<boolean> {
    try {
      const result = await SherpaTTS.pregenerate({ text, cacheKey, speed });
      return result.success;
    } catch {
      return false;
    }
  }

  /** Vérifier si un audio est en cache */
  async isCached(cacheKey: string): Promise<boolean> {
    try {
      const result = await SherpaTTS.isCached({ cacheKey });
      return result.cached;
    } catch {
      return false;
    }
  }

  /** Jouer audio depuis cache. Retourne false si miss */
  async speakCached(cacheKey: string): Promise<boolean> {
    try {
      this.wasListeningBeforeTTS = this.isListening;
      if (this.isListening) await this.pauseListening();

      this.isSpeaking = true;
      const result = await SherpaTTS.speakCached({ cacheKey });
      this.isSpeaking = false;

      if (this.wasListeningBeforeTTS) {
        await this.resumeListening();
        this.wasListeningBeforeTTS = false;
      }

      return result.success;
    } catch {
      this.isSpeaking = false;
      return false;
    }
  }

  /** Vider le cache */
  async clearCache(): Promise<void> {
    try {
      await SherpaTTS.clearCache();
    } catch {}
  }

  /** Reset timer pour logs (appeler au démarrage du quiz) */
  async resetTimer(): Promise<void> {
    try {
      await SherpaTTS.resetTimer();
    } catch {}
  }

  /** Log un événement avec timestamp */
  async logEvent(event: string): Promise<void> {
    try {
      await SherpaTTS.logEvent({ event });
    } catch {}
  }

  /** Parler directement (génère + joue) */
  async speak(text: string, options?: { rate?: number; skipPauseResume?: boolean }): Promise<void> {
    try {
      if (!options?.skipPauseResume) {
        this.wasListeningBeforeTTS = this.isListening;
        if (this.isListening) await this.pauseListening();
      }

      this.isSpeaking = true;
      await SherpaTTS.speak({ text, speed: options?.rate || 0.9 });
      this.isSpeaking = false;

      if (!options?.skipPauseResume && this.wasListeningBeforeTTS) {
        await this.resumeListening();
        this.wasListeningBeforeTTS = false;
      }
    } catch {
      this.isSpeaking = false;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await SherpaTTS.stop();
      this.isSpeaking = false;
    } catch {}
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;
    try {
      await new Promise(r => setTimeout(r, 200));
      await SpeechRecognition.start({
        language: 'fr-FR',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      this.isListening = true;
    } catch {
      // Ignorer erreurs STT (Retry, Corrupt, etc.)
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;
    try {
      await SpeechRecognition.stop();
      this.isListening = false;
    } catch {}
  }

  private async pauseListening(): Promise<void> {
    try {
      await SpeechRecognition.stop();
      this.isListening = false;
      await new Promise(r => setTimeout(r, 100));
    } catch {}
  }

  private async resumeListening(): Promise<void> {
    try {
      await new Promise(r => setTimeout(r, 200));
      await SpeechRecognition.start({
        language: 'fr-FR',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      this.isListening = true;
    } catch {}
  }

  onSpeech(callback: SpeechCallback): void {
    this.speechCallback = callback;
  }

  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  getState() {
    return {
      isSpeaking: this.isSpeaking,
      isListening: this.isListening,
      isInitialized: this.isInitialized,
    };
  }
}

export const audioManager = new AudioManager();
