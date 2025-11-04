/**
 * Factory pattern pour créer le bon service audio selon la plateforme
 * Switche automatiquement entre Web et Native
 */

import type { IAudioService } from './AudioService.interface';
import { WebAudioService } from './WebAudioService';
import { NativeAudioService } from './NativeAudioService';
import { isNativeApp } from '../platform/PlatformDetector';

let audioServiceInstance: IAudioService | null = null;

/**
 * Crée ou retourne l'instance singleton du service audio approprié
 */
export const createAudioService = (): IAudioService => {
  if (audioServiceInstance) {
    return audioServiceInstance;
  }

  if (isNativeApp()) {
    console.log('🚀 Using Native Audio Service (Capacitor)');
    audioServiceInstance = new NativeAudioService();
  } else {
    console.log('🌐 Using Web Audio Service (Browser)');
    audioServiceInstance = new WebAudioService();
  }

  return audioServiceInstance;
};

/**
 * Reset de l'instance (utile pour tests)
 */
export const resetAudioService = (): void => {
  audioServiceInstance = null;
};
