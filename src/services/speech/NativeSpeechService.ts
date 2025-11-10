/**
 * Service reconnaissance vocale native
 * Envoie uniquement les résultats FINAUX après détection de silence
 */

import type { ISpeechService, SpeechRecognitionOptions, SpeechRecognitionResult } from './SpeechService.interface';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export class NativeSpeechService implements ISpeechService {
  private listening: boolean = false;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: Error) => void;
  private listenerAdded: boolean = false;
  
  // Détection de fin de phrase
  private silenceTimer: any = null;
  private lastPartialTranscript: string = '';
  private lastFinalTranscript: string = '';
  private lastFinalTime: number = 0;

  async startListening(options?: SpeechRecognitionOptions): Promise<void> {
    try {
      console.log('🎤 START LISTENING called');
      
      // Arrêter proprement si déjà en cours
      if (this.listening) {
        console.log('⚠️ Already listening, stopping first');
        await this.stopListening();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Toujours arrêter avant de démarrer
      try {
        await SpeechRecognition.stop();
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) { 
        console.log('No active recognition to stop');
      }

      // Vérifier disponibilité
      const { available } = await SpeechRecognition.available();
      if (!available) {
        throw new Error('Speech Recognition not available on this device');
      }

      // Demander permissions
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== 'granted') {
        throw new Error('Speech Recognition permission denied');
      }

      // Nettoyer les anciens listeners
      try {
        await SpeechRecognition.removeAllListeners();
        this.listenerAdded = false;
      } catch (e) { 
        console.log('No listeners to remove');
      }

      // Ajouter le listener
      await SpeechRecognition.addListener('partialResults', (data: any) => {
        if (!this.resultCallback) return;
        if (!data.matches || data.matches.length === 0) return;
        
        const transcript = data.matches[0].toLowerCase().trim();
        if (!transcript || transcript.length < 2) return;
        
        console.log('🟡 Partial received:', transcript);
        
        // Sauvegarder le transcript actuel
        this.lastPartialTranscript = transcript;
        
        // Annuler le timer précédent
        if (this.silenceTimer) {
          console.log('⏱️ Timer cleared');
          clearTimeout(this.silenceTimer);
        }
        
        // Timer de silence : 1 seconde sans nouveau résultat = fin de phrase
        console.log('⏱️ New timer started (1000ms)');
        this.silenceTimer = setTimeout(() => {
          console.log('✅ SILENCE detected, sending final:', this.lastPartialTranscript);
          this.sendFinalResult(this.lastPartialTranscript);
        }, 1000);
      });

      this.listenerAdded = true;

      // Démarrer
      await new Promise(resolve => setTimeout(resolve, 100));
      await SpeechRecognition.start({
        language: 'fr-FR',
        maxResults: 5,
        prompt: '',
        partialResults: true,
        popup: false,
      });

      this.listening = true;
      console.log('✅ Recognition started - Buffer is CLEAN');
      
    } catch (error: any) {
      this.listening = false;
      const errorMsg = error?.message || 'Unknown error';
      console.error('❌ Recognition error:', errorMsg);
        if (errorMsg.includes('Ongoing') || errorMsg.includes('already')) {
    console.log('⚠️ Recognition already running, ignoring error');
    this.listening = true; // Considérer comme actif
    return; // ⬅️ Ne pas throw
  }
      if (this.errorCallback) {
        this.errorCallback(new Error(`Native speech error: ${errorMsg}`));
      }
      
      if (!errorMsg.includes('already')) {
        throw error;
      }
    }
  }

  private sendFinalResult(transcript: string): void {
    if (!this.resultCallback) return;
    if (!transcript) return;
    
    console.log('📤 Attempting to send final result:', transcript);
    
    // Éviter les doublons
    const now = Date.now();
    if (transcript === this.lastFinalTranscript && (now - this.lastFinalTime) < 2000) {
      console.log('❌ DUPLICATE blocked');
      return;
    }
    
    this.lastFinalTranscript = transcript;
    this.lastFinalTime = now;
    
    console.log('✅ SENDING FINAL RESULT:', transcript);
    
    // Envoyer le résultat FINAL
    this.resultCallback({
      transcript,
      confidence: 0.9,
      isFinal: true,
    });
    
    // Redémarrer pour nettoyer le buffer
    this.restartRecognition();
  }

  private async restartRecognition(): Promise<void> {
    console.log('🔄 Restarting recognition to clear buffer');
    try {
      // Arrêter
      await SpeechRecognition.stop();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reset variables
      this.lastPartialTranscript = '';
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      
      // Redémarrer si on était en écoute
      if (this.listening) {
        await SpeechRecognition.start({
          language: 'fr-FR',
          maxResults: 5,
          prompt: '',
          partialResults: true,
          popup: false,
        });
        console.log('✅ Recognition restarted - Buffer CLEAN');
      }
    } catch (error) {
      console.error('❌ Error restarting recognition:', error);
    }
  }

  async stopListening(): Promise<void> {
    try {
      console.log('🛑 STOP LISTENING called');
      
      // Nettoyer le timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      
      if (this.listening) {
        await SpeechRecognition.stop();
        this.listening = false;
        this.lastPartialTranscript = '';
        console.log('✅ Recognition stopped - Buffer cleared');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      this.listening = false;
      console.error('❌ Error stopping recognition:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { available } = await SpeechRecognition.available();
      return available;
    } catch (error) {
      return false;
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  isListening(): boolean {
    return this.listening;
  }
}