export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
  voice?: number;
}

export interface IAudioService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stopSpeaking(): Promise<void>;
  isAvailable(): Promise<boolean>;
  
  // Méthodes optionnelles
  getIsSpeaking?(): boolean;
}
