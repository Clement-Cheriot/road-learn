import { IAudioService, TTSOptions } from './AudioService.interface';

export class WebAudioService implements IAudioService {
  private synth = window.speechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  async speak(text: string, options?: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Arrêter toute lecture en cours
      this.synth.cancel();

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = options?.language || 'fr-FR';
      this.currentUtterance.rate = options?.rate || 1.0;
      this.currentUtterance.pitch = options?.pitch || 1.0;
      this.currentUtterance.volume = options?.volume || 1.0;

      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      
      this.currentUtterance.onerror = (event) => {
        console.error('Erreur Web Speech:', event);
        this.currentUtterance = null;
        reject(event);
      };

      this.synth.speak(this.currentUtterance);
    });
  }

  async stopSpeaking(): Promise<void> {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  async isAvailable(): Promise<boolean> {
    return 'speechSynthesis' in window;
  }
}