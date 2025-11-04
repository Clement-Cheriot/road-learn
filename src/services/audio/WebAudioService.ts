/**
 * Implémentation Web Speech API pour développement
 * Utilisé en phase POC (navigateur)
 * ⚠️ NE FONCTIONNE PAS OFFLINE - migration native requise pour production
 */

import type { IAudioService, TTSOptions, Voice } from './AudioService.interface';

export class WebAudioService implements IAudioService {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speaking: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      // Arrêter toute lecture en cours
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.language || 'fr-FR';
      utterance.rate = options?.rate || 0.85; // Légèrement plus lent pour compréhension
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 1.0;

      utterance.onstart = () => {
        this.speaking = true;
      };

      utterance.onend = () => {
        this.speaking = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.speaking = false;
        this.currentUtterance = null;
        // Ignorer l'erreur "canceled" car c'est voulu (stopSpeaking)
        if (event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  async stopSpeaking(): Promise<void> {
    if (this.synth) {
      this.synth.cancel();
      this.speaking = false;
      this.currentUtterance = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    return 'speechSynthesis' in window;
  }

  async getVoices(): Promise<Voice[]> {
    return new Promise((resolve) => {
      let voices = this.synth.getVoices();

      if (voices.length > 0) {
        resolve(voices as Voice[]);
        return;
      }

      // Certains navigateurs chargent les voix de manière asynchrone
      this.synth.onvoiceschanged = () => {
        voices = this.synth.getVoices();
        resolve(voices as Voice[]);
      };

      // Timeout de sécurité
      setTimeout(() => {
        resolve(voices as Voice[]);
      }, 1000);
    });
  }

  isSpeaking(): boolean {
    return this.speaking || this.synth.speaking;
  }
}
