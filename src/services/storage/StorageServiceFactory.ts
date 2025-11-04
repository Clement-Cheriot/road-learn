/**
 * Factory pattern pour créer le bon service de stockage
 */

import type { IStorageService } from './StorageService.interface';
import { IndexedDBService } from './IndexedDBService';
import { isNativeApp } from '../platform/PlatformDetector';

let storageServiceInstance: IStorageService | null = null;

export const createStorageService = (): IStorageService => {
  if (storageServiceInstance) {
    return storageServiceInstance;
  }

  if (isNativeApp()) {
    // 🚧 TODO: Implémenter CapacitorStorageService
    console.log('🚀 Using Capacitor Storage Service (Native)');
    // storageServiceInstance = new CapacitorStorageService();
    
    // Temporaire : fallback IndexedDB
    console.warn('Capacitor Storage not yet implemented, using IndexedDB fallback');
    storageServiceInstance = new IndexedDBService();
  } else {
    console.log('🌐 Using IndexedDB Storage Service (Web)');
    storageServiceInstance = new IndexedDBService();
  }

  return storageServiceInstance;
};

export const resetStorageService = (): void => {
  storageServiceInstance = null;
};
