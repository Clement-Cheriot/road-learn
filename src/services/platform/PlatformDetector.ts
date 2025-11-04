/**
 * Détection de plateforme (web vs natif iOS/Android)
 * Permet de switcher automatiquement entre services web et natifs
 */

// 🚧 TODO: Décommenter après installation Capacitor
// import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  // 🚧 TODO: Décommenter après installation Capacitor
  // return Capacitor.isNativePlatform();
  
  // Temporaire : toujours web en développement
  return false;
};

export const isIOS = (): boolean => {
  // 🚧 TODO: Décommenter après installation Capacitor
  // return Capacitor.getPlatform() === 'ios';
  
  // Temporaire : détection basique navigateur
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  // 🚧 TODO: Décommenter après installation Capacitor
  // return Capacitor.getPlatform() === 'android';
  
  // Temporaire : détection basique navigateur
  return /Android/i.test(navigator.userAgent);
};

export const isWeb = (): boolean => {
  // 🚧 TODO: Décommenter après installation Capacitor
  // return Capacitor.getPlatform() === 'web';
  
  // Temporaire : toujours web en développement
  return true;
};

export type Platform = 'ios' | 'android' | 'web';

export const getPlatform = (): Platform => {
  // 🚧 TODO: Décommenter après installation Capacitor
  // return Capacitor.getPlatform() as Platform;
  
  // Temporaire : détection basique
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
};
