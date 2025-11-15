import { EchoCancellation } from 'capacitor-echo-cancellation';
import { Capacitor } from '@capacitor/core';

export class AudioSessionService {
  static async configureEchoCancellation(): Promise<void> {
    const platform = Capacitor.getPlatform();

    console.log(`🔊 Configuration AEC sur ${platform}...`);

    if (platform === 'web') {
      console.log('⚠️ AEC non disponible sur web');
      return;
    }

    try {
      const result = await EchoCancellation.configure();
      console.log('✅ AEC configuré avec succès:', result);

      const status = await EchoCancellation.getStatus();
      console.log('📊 Statut AEC:', status);
    } catch (error) {
      console.error('❌ Erreur configuration AEC:', error);
      console.warn("⚠️ L'app continuera sans AEC, l'écho peut être présent");
    }
  }
}
