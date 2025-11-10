/**
 * Détection de plateforme (web vs natif iOS/Android)
 * Permet de switcher automatiquement entre services web et natifs
 */

import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

export type Platform = 'ios' | 'android' | 'web';

export const getPlatform = (): Platform => {
  return Capacitor.getPlatform() as Platform;
};