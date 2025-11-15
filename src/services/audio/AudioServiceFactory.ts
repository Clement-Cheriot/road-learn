import { Capacitor } from '@capacitor/core';
import { NativeAudioService } from './NativeAudioService';
import { WebAudioService } from './WebAudioService';
import type { IAudioService } from './AudioService.interface';

export function createAudioService(): IAudioService {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios' || platform === 'android') {
    console.log(`🔊 Using Native Audio Service (${platform})`);
    return new NativeAudioService();
  }

  console.log('🔊 Using Web Audio Service (Browser)');
  return new WebAudioService();
}
