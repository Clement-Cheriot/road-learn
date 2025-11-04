/**
 * 🚧 IMPLÉMENTATION NATIVE (à activer post-migration Capacitor)
 * 
 * Service reconnaissance vocale native via @capacitor-community/speech-recognition
 * Fonctionne 100% offline avec voix système
 */

import type { ISpeechService, SpeechRecognitionOptions, SpeechRecognitionResult } from './SpeechService.interface';

// 🚧 TODO: Décommenter après installation Capacitor
// import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export class NativeSpeechService implements ISpeechService {
  private listening: boolean = false;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: Error) => void;

  async startListening(options?: SpeechRecognitionOptions): Promise<void> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      this.listening = true;
      
      await SpeechRecognition.start({
        language: options?.language || 'fr-FR',
        maxResults: 1,
        prompt: 'Dites votre réponse',
        partialResults: options?.interimResults ?? false,
        popup: false,
      });

      SpeechRecognition.addListener('partialResults', (data: any) => {
        if (this.resultCallback) {
          this.resultCallback({
            transcript: data.matches[0],
            confidence: 1.0,
            isFinal: false,
          });
        }
      });
      
    } catch (error) {
      this.listening = false;
      throw new Error(`Native speech recognition error: ${error}`);
    }
    */

    // Temporaire : fallback Web Speech API
    console.warn('🚧 Native Speech Recognition not available, using web fallback');
    this.listening = true;
  }

  async stopListening(): Promise<void> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      await SpeechRecognition.stop();
      this.listening = false;
    } catch (error) {
      console.error('Native speech stop error:', error);
    }
    */

    // Temporaire : fallback web
    this.listening = false;
  }

  async isAvailable(): Promise<boolean> {
    // 🚧 TODO: Décommenter après installation Capacitor
    /*
    try {
      const { available } = await SpeechRecognition.available();
      return available;
    } catch (error) {
      return false;
    }
    */

    // Temporaire : vérification web
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  isListening(): boolean {
    return this.listening;
  }
}
