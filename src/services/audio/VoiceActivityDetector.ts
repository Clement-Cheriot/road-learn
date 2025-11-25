/**
 * Voice Activity Detection (VAD) Service
 * Détecte quand l'utilisateur parle pour interrompre l'app
 */

import { Plugins } from '@capacitor/core';

export class VoiceActivityDetector {
  private isMonitoring = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  
  private onVoiceDetected?: () => void;
  private volumeThreshold = 40; // Seuil de volume (0-100)
  private consecutiveFrames = 0;
  private requiredFrames = 3; // 3 frames consécutives pour confirmer
  
  /**
   * Démarre la surveillance du micro
   */
  async startMonitoring(onVoiceDetected: () => void): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ VAD déjà actif');
      return;
    }
    
    this.onVoiceDetected = onVoiceDetected;
    
    try {
      // Obtenir l'accès au micro
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false, // ⬅️ Pas d'AEC navigateur
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Créer le contexte audio
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connecter le micro
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.isMonitoring = true;
      console.log('✅ VAD démarré - Surveillance du volume micro');
      
      // Démarrer l'analyse en boucle
      this.analyzeVolume();
      
    } catch (error) {
      console.error('❌ Erreur démarrage VAD:', error);
    }
  }
  
  /**
   * Arrête la surveillance
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isMonitoring = false;
    this.consecutiveFrames = 0;
    console.log('🛑 VAD arrêté');
  }
  
  /**
   * Analyse le volume du micro en continu
   */
  private analyzeVolume = (): void => {
    if (!this.isMonitoring || !this.analyser) return;
    
    // Obtenir les données audio
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculer le volume moyen
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const volume = Math.round(average);
    
    // Détecter la voix
    if (volume > this.volumeThreshold) {
      this.consecutiveFrames++;
      
      if (this.consecutiveFrames >= this.requiredFrames) {
        console.log(`🎤 VOIX DÉTECTÉE ! (volume: ${volume})`);
        
        // Callback : Interrompre l'app
        if (this.onVoiceDetected) {
          this.onVoiceDetected();
        }
        
        // Reset pour éviter les déclenchements multiples
        this.consecutiveFrames = 0;
      }
    } else {
      this.consecutiveFrames = 0;
    }
    
    // Continuer l'analyse
    this.animationFrameId = requestAnimationFrame(this.analyzeVolume);
  };
  
  /**
   * Ajuste le seuil de sensibilité
   */
  setSensitivity(threshold: number): void {
    this.volumeThreshold = threshold;
    console.log(`🎚️ Sensibilité VAD: ${threshold}`);
  }
  
  /**
   * Obtient le volume actuel du micro (pour debug)
   */
  getCurrentVolume(): number {
    if (!this.analyser) return 0;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    
    return Math.round(average);
  }
}

// Instance singleton
export const voiceActivityDetector = new VoiceActivityDetector();
