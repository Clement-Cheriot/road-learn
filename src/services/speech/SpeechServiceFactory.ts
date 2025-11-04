/**
 * Factory pattern pour créer le bon service de reconnaissance vocale
 */

import type { ISpeechService } from './SpeechService.interface';
import { WebSpeechService } from './WebSpeechService';
import { NativeSpeechService } from './NativeSpeechService';
import { isNativeApp } from '../platform/PlatformDetector';

let speechServiceInstance: ISpeechService | null = null;

/**
 * Crée ou retourne l'instance singleton du service de reconnaissance vocale
 */
export const createSpeechService = (): ISpeechService => {
  if (speechServiceInstance) {
    return speechServiceInstance;
  }

  if (isNativeApp()) {
    console.log('🚀 Using Native Speech Service (Capacitor)');
    speechServiceInstance = new NativeSpeechService();
  } else {
    console.log('🌐 Using Web Speech Service (Browser)');
    speechServiceInstance = new WebSpeechService();
  }

  return speechServiceInstance;
};

/**
 * Reset de l'instance (utile pour tests)
 */
export const resetSpeechService = (): void => {
  speechServiceInstance = null;
};
