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
  private restartTimer?: number;

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
      this.listening = false;
      if (!this.shouldAutoRestart) return;
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
      }
      // Attendre un court délai pour éviter les boucles de redémarrage rapides
      this.restartTimer = window.setTimeout(() => {
        try {
          if (this.shouldAutoRestart && !this.listening && document.visibilityState !== 'hidden') {
            this.recognition.start();
          }
        } catch (err) {
          console.warn('Redémarrage reconnaissance échoué:', err);
        }
      }, 600);
    };

    this.recognition.onresult = (event: any) => {
      if (!this.resultCallback) return;
      // Parcourir tous les résultats à partir de resultIndex pour ne rien manquer
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = (res[0]?.transcript || '').toLowerCase().trim();
        if (!transcript) continue;
        this.resultCallback({
          transcript,
          confidence: res[0]?.confidence ?? 0,
          isFinal: res.isFinal,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      // Ne pas propager les erreurs "aborted" ou "no-speech" (arrêts volontaires ou silences)
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
      
      console.error('Erreur reconnaissance vocale:', event.error);
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
    (this.recognition as any).maxAlternatives = 3;
    this.shouldAutoRestart = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = undefined;
    }

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
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = undefined;
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
