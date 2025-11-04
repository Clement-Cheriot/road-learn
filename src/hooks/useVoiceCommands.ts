/**
 * Hook personnalisé pour les commandes vocales
 */

import { useEffect, useState } from 'react';
import { createSpeechService } from '@/services/speech/SpeechServiceFactory';
import { addVoiceLog } from '@/components/VoiceDebugPanel';

interface VoiceCommand {
  keywords: string[];
  action: () => void | Promise<void>;
}

export const useVoiceCommands = (commands: VoiceCommand[], enabled: boolean = true) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');

  useEffect(() => {
    if (!enabled) return;

    const speechService = createSpeechService();

    const startListening = async () => {
      try {
        const available = await speechService.isAvailable();
        if (!available) {
          console.log('Reconnaissance vocale non disponible');
          return;
        }

        speechService.onResult((result) => {
          if (!result.isFinal) return;

          const transcript = result.transcript.toLowerCase();
          console.log('🎤 Commande vocale détectée:', transcript);
          setLastCommand(transcript);
          addVoiceLog('heard', `"${transcript}"`);

          // Chercher une commande correspondante
          let matched = false;
          for (const command of commands) {
            if (command.keywords.some(keyword => transcript.includes(keyword))) {
              console.log('✅ Commande exécutée:', command.keywords[0]);
              addVoiceLog('action', `Exécution: ${command.keywords[0]}`);
              matched = true;
              // Gérer les fonctions async et sync
              const result = command.action();
              if (result instanceof Promise) {
                result.catch(err => {
                  console.error('Erreur commande vocale:', err);
                  addVoiceLog('error', `Erreur: ${err.message}`);
                });
              }
              break;
            }
          }
          if (!matched) {
            addVoiceLog('heard', `Aucune commande trouvée`);
          }
        });

        speechService.onError((error) => {
          console.error('Erreur reconnaissance vocale:', error);
          setIsListening(false);
        });

        await speechService.startListening({
          language: 'fr-FR',
          continuous: true,
          interimResults: false,
        });

        setIsListening(true);
      } catch (error) {
        console.error('Erreur initialisation reconnaissance vocale:', error);
      }
    };

    startListening();

    return () => {
      speechService.stopListening();
      setIsListening(false);
    };
  }, [commands, enabled]);

  return { isListening, lastCommand };
};
