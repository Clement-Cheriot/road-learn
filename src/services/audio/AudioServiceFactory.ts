import { Capacitor } from '@capacitor/core';
import { IAudioService } from './AudioService.interface';
import { NativeAudioService } from './NativeAudioService';
import { WebAudioService } from './WebAudioService';

export function createAudioService(): IAudioService {
  // Détection automatique de la plateforme
  if (Capacitor.isNativePlatform()) {
    //  console.log('🎵 Using Native TTS (iOS/Android)');
    return new NativeAudioService();
  } else {
    // console.log('🎵 Using Web Speech API');
    return new WebAudioService();
  }
}
