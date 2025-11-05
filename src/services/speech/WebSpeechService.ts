/**
 * Implémentation Web Speech API pour reconnaissance vocale
 * Utilisé en développement web (navigateur)
 */

import type { ISpeechService, SpeechRecognitionOptions, SpeechRecognitionResult } from './SpeechService.interface';

// Types pour Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class WebSpeechService implements ISpeechService {
  private recognition: any = null;
  private listening: boolean = false;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: Error) => void;
  private shouldAutoRestart: boolean = false;
  private lastOptions: SpeechRecognitionOptions | undefined;

  constructor() {
    const windowWithSpeech = window as IWindow;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.listening = true;
      console.log('🎤 Écoute vocale démarrée');
    };

    this.recognition.onend = () => {
      console.log('🎤 Écoute vocale arrêtée');
      const shouldRestart = this.shouldAutoRestart;
      this.listening = false;
      if (shouldRestart) {
        try {
          this.recognition.start();
          this.listening = true;
        } catch (e) {
          setTimeout(() => {
            try {
              if (this.shouldAutoRestart && !this.listening) {
                this.recognition.start();
                this.listening = true;
              }
            } catch (err) {
              console.warn('Redémarrage reconnaissance échoué:', err);
            }
          }, 400);
        }
      }
    };

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      
      if (this.resultCallback) {
        this.resultCallback({
          transcript: result[0].transcript.toLowerCase().trim(),
          confidence: result[0].confidence,
          isFinal: result.isFinal,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Erreur reconnaissance vocale:', event.error);
      // Ne pas propager les erreurs "aborted" (arrêts volontaires)
      if (event.error === 'aborted') {
        this.listening = false;
        return;
      }
      this.listening = false;
      
      if (this.errorCallback) {
        this.errorCallback(new Error(`Speech recognition error: ${event.error}`));
      }
    };
  }

  async startListening(options?: SpeechRecognitionOptions): Promise<void> {
    if (!this.recognition) {
      throw new Error('Web Speech Recognition not available');
    }

    if (this.listening) {
      // Déjà en écoute: ne pas redémarrer
      this.shouldAutoRestart = true;
      return;
    }

    this.lastOptions = options;
    this.recognition.lang = options?.language || 'fr-FR';
    this.recognition.continuous = options?.continuous ?? true;
    this.recognition.interimResults = options?.interimResults ?? false;
    this.shouldAutoRestart = true;

    try {
      this.recognition.start();
    } catch (error: any) {
      // Ignorer l'erreur si déjà démarré
      if (error?.message?.includes('already started')) {
        console.log('Reconnaissance vocale déjà active');
        return;
      }
      console.error('Erreur démarrage reconnaissance:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (this.recognition) {
      this.shouldAutoRestart = false;
    }
    if (this.recognition && this.listening) {
      this.recognition.stop();
      this.listening = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.recognition !== null;
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
