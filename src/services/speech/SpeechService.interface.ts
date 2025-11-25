/**
 * Interface pour les services de reconnaissance vocale
 */

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface SpeechRecognitionError {
  message: string;
  code?: string;
}

export interface ISpeechService {
  startListening(options?: { language?: string }): Promise<void>;
  stopListening(): Promise<void>;
  onResult(callback: (result: SpeechRecognitionResult) => void): void;
  onError(callback: (error: SpeechRecognitionError) => void): void;
  isAvailable(): Promise<boolean>;
}
