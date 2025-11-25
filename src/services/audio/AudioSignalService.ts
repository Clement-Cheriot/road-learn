/**
 * Service pour générer des signaux audio
 * Beep talkie-walkie pour indiquer "à vous de parler"
 */

export class AudioSignalService {
  private audioContext: AudioContext | null = null;
  
  /**
   * Initialise le contexte audio
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }
  
  /**
   * Joue un beep simple
   */
  async playBeep(frequency = 800, duration = 200): Promise<void> {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
    
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }
  
  /**
   * Joue le son de talkie-walkie "À vous !"
   * Deux beeps : un montant, un descendant
   */
  async playTalkieBeep(): Promise<void> {
    // Premier beep montant (Press-to-Talk ON)
    await this.playBeep(600, 100);
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.playBeep(800, 100);
    
    console.log('📻 Signal talkie-walkie joué');
  }
  
  /**
   * Joue le son de fin de message talkie-walkie
   * Deux beeps : un descendant
   */
  async playTalkieEndBeep(): Promise<void> {
    // Beep descendant (Press-to-Talk OFF)
    await this.playBeep(800, 100);
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.playBeep(600, 150);
    
    console.log('📻 Signal fin talkie-walkie joué');
  }
  
  /**
   * Joue un triple beep de confirmation
   */
  async playConfirmationBeep(): Promise<void> {
    await this.playBeep(1000, 80);
    await new Promise(resolve => setTimeout(resolve, 80));
    await this.playBeep(1000, 80);
    await new Promise(resolve => setTimeout(resolve, 80));
    await this.playBeep(1200, 120);
  }
  
  /**
   * Joue un beep d'erreur
   */
  async playErrorBeep(): Promise<void> {
    await this.playBeep(400, 200);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.playBeep(300, 300);
  }
}

export const audioSignalService = new AudioSignalService();
