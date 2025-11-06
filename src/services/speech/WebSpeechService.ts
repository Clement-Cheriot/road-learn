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
  private hadAnyResultSinceStart: boolean = false;
  private restartBackoffMs: number = 800;

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
      this.hadAnyResultSinceStart = false;
      this.restartBackoffMs = 800;
      console.log('🎤 Écoute vocale démarrée');
    };

    this.recognition.onend = () => {
      console.log('🎤 Écoute vocale arrêtée');
      this.listening = false;
      if (!this.shouldAutoRestart) return;
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
      }

      // Backoff progressif si on boucle sans résultat
      if (!this.hadAnyResultSinceStart) {
        this.restartBackoffMs = Math.min(this.restartBackoffMs * 1.6, 8000);
      } else {
        this.restartBackoffMs = 800;
      }

      this.restartTimer = window.setTimeout(() => {
        try {
          if (this.shouldAutoRestart && !this.listening && document.visibilityState !== 'hidden') {
            console.log(`🔁 Redémarrage reconnaissance (backoff ${this.restartBackoffMs}ms)`);
            this.recognition.start();
          }
        } catch (err) {
          console.warn('Redémarrage reconnaissance échoué:', err);
        }
      }, this.restartBackoffMs);
    };

    this.recognition.onresult = (event: any) => {
      if (!this.resultCallback) return;
      // Parcourir tous les résultats à partir de resultIndex pour ne rien manquer
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = (res[0]?.transcript || '').toLowerCase().trim();
        if (!transcript) continue;
        this.hadAnyResultSinceStart = true;
        this.resultCallback({
          transcript,
          confidence: res[0]?.confidence ?? 0,
          isFinal: res.isFinal,
        });
        // Réduire le backoff si on reçoit des résultats finaux
        if (res.isFinal) this.restartBackoffMs = 800;
      }
    };

    this.recognition.onerror = (event: any) => {
      // Ne pas propager les erreurs "aborted" ou "no-speech" (arrêts volontaires ou silences)
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      console.error('Erreur reconnaissance vocale:', event.error);
      this.listening = false;

      // Désactiver l'auto-restart sur erreurs fatales
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        this.shouldAutoRestart = false;
        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
          this.restartTimer = undefined;
        }
      }
      
      if (this.errorCallback) {
        this.errorCallback(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    // Relance automatique quand l'onglet redevient visible
    document.addEventListener('visibilitychange', () => {
      if (this.shouldAutoRestart && !this.listening && document.visibilityState !== 'hidden') {
        try { this.recognition.start(); } catch {}
      }
    });
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
