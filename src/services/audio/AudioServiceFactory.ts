import { Capacitor } from '@capacitor/core';
import { NativeAudioService } from './NativeAudioService';
import { WebAudioService } from './WebAudioService';
import { SherpaTTSService } from './SherpaTTSService';
import type { IAudioService } from './AudioService.interface';

/**
 * Options pour la création du service audio
 */
export interface AudioServiceOptions {
  /** Utiliser Sherpa TTS (Piper offline) au lieu du TTS natif/web (défaut: true) */
  useSherpa?: boolean;
  /** @deprecated Utiliser useSherpa à la place */
  usePiper?: boolean;
}

/**
 * Factory pour créer le service audio approprié
 * 
 * @param options - Options de configuration
 * @returns Instance du service audio
 */
export function createAudioService(options?: AudioServiceOptions): IAudioService {
  const platform = Capacitor.getPlatform();
  
  // Support de l'ancien paramètre usePiper
  const useSherpa = options?.useSherpa ?? options?.usePiper ?? true;

  // Mode Sherpa TTS (offline, haute qualité via Piper)
  if (useSherpa && (platform === 'ios' || platform === 'android')) {
    console.log('🔊 Using Sherpa TTS Service (Piper Offline Voice)');
    return new SherpaTTSService();
  }

  // Mode natif (iOS/Android TTS natif) - fallback
  if (platform === 'ios' || platform === 'android') {
    console.log(`🔊 Using Native Audio Service (${platform})`);
    return new NativeAudioService();
  }

  // Mode web (Web Speech API)
  console.log('🔊 Using Web Audio Service (Browser)');
  return new WebAudioService();
}
