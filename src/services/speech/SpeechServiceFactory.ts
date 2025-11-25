import { Capacitor } from '@capacitor/core';
import { NativeSpeechService } from './NativeSpeechService';
import type { ISpeechService } from './SpeechService.interface';

export function createSpeechService(): ISpeechService {
  const platform = Capacitor.getPlatform();

  // Pour l'instant, toujours utiliser le service natif
  // (WebSpeechService sera ajouté plus tard si besoin)
  console.log(`🎧 Using Native Speech Service (${platform})`);
  return new NativeSpeechService();
}
