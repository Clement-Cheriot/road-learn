/**
 * Interface commune pour reconnaissance vocale (Speech Recognition)
 */

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface ISpeechService {
  /**
   * Démarre l'écoute vocale
   */
  startListening(options?: SpeechRecognitionOptions): Promise<void>;
  
  /**
   * Arrête l'écoute vocale
   */
  stopListening(): Promise<void>;
  
  /**
   * Vérifie si le service est disponible
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Définit le callback pour les résultats
   */
  onResult(callback: (result: SpeechRecognitionResult) => void): void;
  
  /**
   * Définit le callback pour les erreurs
   */
  onError(callback: (error: Error) => void): void;
  
  /**
   * Vérifie si l'écoute est active
   */
  isListening(): boolean;
}
