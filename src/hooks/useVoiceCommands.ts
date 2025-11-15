import { useEffect, useRef } from 'react';
import { createSpeechService } from '@/services/speech/SpeechServiceFactory';
import type { ISpeechService } from '@/services/speech/SpeechService.interface';
import { addVoiceLog } from '@/components/VoiceDebugPanel';

interface VoiceCommand {
  keywords: string[];
  action: () => void | Promise<void>;
}

// Singleton global
let globalSpeechService: ISpeechService | null = null;
let isGlobalListening = false;

export function useVoiceCommands(
  commands: VoiceCommand[],
  enabled: boolean = true
) {
  const commandsRef = useRef(commands);
  const hasStartedRef = useRef(false);

  // Mettre à jour les commandes sans re-démarrer
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    if (!enabled || commands.length === 0) {
      console.log('⚠️ useVoiceCommands: disabled or no commands');
      return;
    }

    // Protection : démarrer une seule fois par instance
    if (hasStartedRef.current) {
      console.log('⚠️ useVoiceCommands: already started, skipping');
      return;
    }

    // Créer le service une seule fois
    if (!globalSpeechService) {
      console.log('🎤 Creating global speech service');
      globalSpeechService = createSpeechService();
    }

    const startListening = async () => {
      if (isGlobalListening) {
        console.log('⚠️ Speech already listening globally');
        hasStartedRef.current = true;
        return;
      }

      try {
        console.log('🎤 Starting global listening...');

        globalSpeechService!.onResult((result) => {
          if (!result.isFinal) return;

          const transcript = result.transcript.toLowerCase().trim();
          console.log('🎤 Transcrit:', transcript);
          addVoiceLog('heard', transcript);

          // Chercher une commande correspondante
          const matchedCommand = commandsRef.current.find((cmd) =>
            cmd.keywords.some((keyword) =>
              transcript.includes(keyword.toLowerCase())
            )
          );

          if (matchedCommand) {
            console.log('✅ Command matched:', matchedCommand.keywords[0]);
            addVoiceLog('action', `Commande: ${transcript}`);
            matchedCommand.action();

            // Redémarrage différé pour permettre la navigation
            setTimeout(async () => {
              console.log('🔄 Delayed restart to allow navigation');
              try {
                await globalSpeechService!.stopListening();
                await globalSpeechService!.startListening({
                  language: 'fr-FR',
                });
              } catch (e) {
                console.error('Error restarting:', e);
              }
            }, 1000);
          } else {
            console.log('⚠️ No command matched');
            addVoiceLog('heard', `Pas de commande: ${transcript}`);
          }
        });

        globalSpeechService!.onError((error) => {
          console.error('❌ Speech error:', error);
          addVoiceLog('error', error.message);
        });

        await globalSpeechService!.startListening({ language: 'fr-FR' });
        isGlobalListening = true;
        hasStartedRef.current = true;
        console.log('✅ Global listening started');
      } catch (error) {
        console.error('❌ Error starting listening:', error);
        hasStartedRef.current = true;
      }
    };

    startListening();

    // Cleanup : NE PAS arrêter, juste marquer comme inactif
    return () => {
      console.log('🧹 useVoiceCommands cleanup (keeping service alive)');
      hasStartedRef.current = false;
    };
  }, [enabled]);

  // Fonction pour désactiver/activer manuellement le micro (mode talkie-walkie)
  const toggleListening = async (shouldListen: boolean) => {
    if (!globalSpeechService) return;

    try {
      if (shouldListen && !isGlobalListening) {
        console.log('🎤 Activation manuelle du micro');
        await globalSpeechService.startListening({ language: 'fr-FR' });
        isGlobalListening = true;
      } else if (!shouldListen && isGlobalListening) {
        console.log('🔇 Désactivation manuelle du micro');
        await globalSpeechService.stopListening();
        isGlobalListening = false;
      }
    } catch (error) {
      console.error('❌ Erreur toggle listening:', error);
    }
  };

  return { toggleListening };
}
