/**
 * Service centralisé pour gérer les permissions microphone
 * Évite les conflits entre MicLevelIndicator et WebSpeechService
 */

let permissionGranted = false;
let permissionDenied = false;
let permissionPromise: Promise<boolean> | null = null;

export const requestMicrophonePermission = async (): Promise<boolean> => {
  // Si déjà accordé ou refusé, retourner le résultat
  if (permissionGranted) return true;
  if (permissionDenied) return false;

  // Si une demande est déjà en cours, attendre son résultat
  if (permissionPromise) {
    return permissionPromise;
  }

  // Nouvelle demande
  permissionPromise = (async () => {
    try {
      console.log('🎤 Demande de permission microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Fermer immédiatement le stream, on voulait juste vérifier la permission
      stream.getTracks().forEach(track => track.stop());
      
      permissionGranted = true;
      permissionDenied = false;
      permissionPromise = null;
      console.log('✅ Permission microphone accordée');
      return true;
    } catch (error: any) {
      console.error('❌ Permission microphone refusée:', error);
      permissionGranted = false;
      permissionDenied = true;
      permissionPromise = null;
      return false;
    }
  })();

  return permissionPromise;
};

export const isMicrophoneGranted = (): boolean => {
  return permissionGranted;
};

export const isMicrophoneDenied = (): boolean => {
  return permissionDenied;
};

export const resetMicrophonePermission = (): void => {
  permissionGranted = false;
  permissionDenied = false;
  permissionPromise = null;
  console.log('🔄 État permission microphone réinitialisé');
};
