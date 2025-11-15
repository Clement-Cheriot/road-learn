/**
 * Service de reconnaissance vocale natif via Capacitor
 * Mode talkie-walkie strict : ON/OFF contrôlé par Quiz.tsx
 */

import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import type { ISpeechService, SpeechRecognitionResult, SpeechRecognitionError } from './SpeechService.interface';

export class NativeSpeechService implements ISpeechService {
  private isListening = false;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: SpeechRecognitionError) => void;

  async startListening(options?: { language?: string }): Promise<void> {
    try {
      // Vérifier les permissions
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      
      if (speechRecognition !== 'granted') {
        throw new Error('Permission microphone refusée');
      }

      // Configurer les listeners
      await SpeechRecognition.removeAllListeners();
      
      await SpeechRecognition.addListener('partialResults', (data: any) => {
        if (this.resultCallback && data.matches && data.matches.length > 0) {
          this.resultCallback({
            transcript: data.matches[0],
            isFinal: false
          });
        }
      });

      // Démarrer la reconnaissance
      await SpeechRecognition.start({
        language: options?.language || 'fr-FR',
        maxResults: 5,
        partialResults: true,
        popup: false
      });

      this.isListening = true;
      console.log('✅ Speech recognition started');

    } catch (error: any) {
      console.error('❌ Error starting speech recognition:', error);
      if (this.errorCallback) {
        this.errorCallback({ message: error.message || 'Unknown error' });
      }
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      if (this.isListening) {
        await SpeechRecognition.stop();
        this.isListening = false;
        console.log('🛑 Speech recognition stopped');
      }
    } catch (error: any) {
      console.error('❌ Error stopping speech recognition:', error);
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: SpeechRecognitionError) => void): void {
    this.errorCallback = callback;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { available } = await SpeechRecognition.available();
      return available;
    } catch {
      return false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}
