/**
 * Service pour gérer les voix iOS
 * Liste les voix disponibles et sélectionne la meilleure voix française
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';

export interface VoiceInfo {
  name: string;
  language: string;
  quality: 'enhanced' | 'premium' | 'standard';
  gender?: 'male' | 'female';
}

export class VoiceManager {
  private availableVoices: any[] = [];
  private selectedVoiceIndex: number = 0;
  private isInitialized: boolean = false;
  
  /**
   * Liste toutes les voix disponibles et trouve les voix françaises
   */
  async initialize(): Promise<void> {
    // Ne pas re-initialiser si déjà fait (garde la voix sélectionnée)
    if (this.isInitialized) {
      console.log('⚠️ VoiceManager already initialized, keeping current voice:', this.availableVoices[this.selectedVoiceIndex]?.name);
      return;
    }
    
    try {
      const result = await TextToSpeech.getSupportedVoices();
      this.availableVoices = result.voices || [];
      
      console.log('🎤 Voix disponibles:', this.availableVoices.length);
      
      // Filtrer et afficher les voix françaises
      const frenchVoices = this.availableVoices.filter((v: any) => 
        v.lang?.toLowerCase().startsWith('fr')
      );
      
      console.log('🇫🇷 Voix françaises trouvées:', frenchVoices.length);
      // Logs détaillés uniquement en mode debug
      if (false) { // Désactivé pour optimiser le démarrage
        frenchVoices.forEach((v: any, index: number) => {
          console.log(`  [${index}] ${v.name} (${v.lang})`);
        });
      }
      
      // Sélectionner la meilleure voix française (seulement au premier init)
      this.selectBestFrenchVoice(frenchVoices);
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Erreur listage voix:', error);
    }
  }
  
  /**
   * Sélectionne la meilleure voix française disponible
   * Priorité : Enhanced > Premium > Standard
   */
  private selectBestFrenchVoice(frenchVoices: any[]): void {
    if (frenchVoices.length === 0) {
      console.warn('⚠️ Aucune voix française trouvée, utilisation de la voix par défaut');
      return;
    }
    
    // Voix premium iOS (Siri voices) - Qualité maximale
    const premiumVoices = [
      'Thomas',  // Voix masculine française de haute qualité
      'Amelie',  // Voix féminine française
      'Daniel',  // Autre voix masculine
    ];
    
    // Chercher d'abord les voix premium
    for (const voiceName of premiumVoices) {
      const voiceIndex = this.availableVoices.findIndex((v: any) => 
        v.name === voiceName && v.lang?.toLowerCase().startsWith('fr')
      );
      
      if (voiceIndex !== -1) {
        this.selectedVoiceIndex = voiceIndex;
        console.log(`✅ Voix premium sélectionnée: ${voiceName} (index: ${voiceIndex})`);
        return;
      }
    }
    
    // Sinon, prendre la première voix française
    const firstFrenchIndex = this.availableVoices.findIndex((v: any) => 
      v.lang?.toLowerCase().startsWith('fr')
    );
    
    if (firstFrenchIndex !== -1) {
      this.selectedVoiceIndex = firstFrenchIndex;
      console.log(`✅ Voix française sélectionnée: ${this.availableVoices[firstFrenchIndex].name} (index: ${firstFrenchIndex})`);
    }
  }
  
  /**
   * Retourne l'index de la voix sélectionnée
   */
  getSelectedVoiceIndex(): number {
    return this.selectedVoiceIndex;
  }
  
  /**
   * Retourne les informations de la voix sélectionnée
   */
  getSelectedVoiceInfo(): any {
    return this.availableVoices[this.selectedVoiceIndex];
  }
  
  /**
   * Permet de changer manuellement de voix
   */
  setVoiceByIndex(index: number): void {
    console.log(`🔄 setVoiceByIndex called with index: ${index}`);
    console.log(`   Current index: ${this.selectedVoiceIndex}`);
    console.log(`   Total voices: ${this.availableVoices.length}`);
    
    if (index >= 0 && index < this.availableVoices.length) {
      this.selectedVoiceIndex = index;
      console.log(`✅ Voice changed to index ${index}: ${this.availableVoices[index]?.name}`);
    } else {
      console.error(`❌ Invalid index ${index}. Must be between 0 and ${this.availableVoices.length - 1}`);
    }
  }
  
  /**
   * Permet de changer de voix par nom
   */
  setVoiceByName(name: string): boolean {
    const index = this.availableVoices.findIndex((v: any) => v.name === name);
    if (index !== -1) {
      this.selectedVoiceIndex = index;
      console.log(`🔄 Voix changée: ${name}`);
      return true;
    }
    console.warn(`⚠️ Voix "${name}" non trouvée`);
    return false;
  }
  /**
   * Retourne toutes les voix disponibles
   */
  getAllVoices(): any[] {
    return this.availableVoices;
  }
  
  /**
   * Retourne toutes les voix françaises
   */
  getFrenchVoices(): any[] {
    return this.availableVoices.filter((v: any) => 
      v.lang?.toLowerCase().startsWith('fr')
    );
  }
}

export const voiceManager = new VoiceManager();
