/**
 * Interface commune pour les services audio (TTS)
 * Implémentations : WebAudioService (dev web) / NativeAudioService (prod Capacitor)
 */

export interface TTSOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface Voice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface IAudioService {
  /**
   * Lit un texte en synthèse vocale
   */
  speak(text: string, options?: TTSOptions): Promise<void>;

  /**
   * Arrête la lecture en cours
   */
  stopSpeaking(): Promise<void>;

  /**
   * Vérifie si le service TTS est disponible
   */
  isAvailable(): Promise<boolean>;

  /**
   * Récupère les voix disponibles
   */
  getVoices(): Promise<Voice[]>;

  /**
   * Vérifie si une lecture est en cours
   */
  isSpeaking(): boolean;
}
