import { useEffect, useRef } from 'react';
import { createSpeechService } from '@/services/speech/SpeechServiceFactory';
import type { ISpeechService } from '@/services/speech/SpeechService.interface';
import { addVoiceLog } from '@/components/VoiceDebugPanel';

interface VoiceCommand {
  keywords: string[];
  action: () => void | Promise<void>;
}

// ⬇️ SINGLETON global
let globalSpeechService: ISpeechService | null = null;
let isGlobalListening = false;

export function useVoiceCommands(
  commands: VoiceCommand[],
  enabled: boolean = true
) {
  const commandsRef = useRef(commands);
  const hasStartedRef = useRef(false); // ⬅️ AJOUTER : éviter redémarrages

  // Mettre à jour les commandes sans re-démarrer
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    if (!enabled || commands.length === 0) {
      console.log('⚠️ useVoiceCommands: disabled or no commands');
      return;
    }

    // ⬇️ PROTECTION : démarrer une seule fois par instance
    if (hasStartedRef.current) {
      console.log('⚠️ useVoiceCommands: already started, skipping');
      return;
    }

    // ⬇️ Créer le service une seule fois
    if (!globalSpeechService) {
      console.log('🎤 Creating global speech service');
      globalSpeechService = createSpeechService();
    }

    const startListening = async () => {
      if (isGlobalListening) {
        console.log('⚠️ Speech already listening globally');
        hasStartedRef.current = true; // ⬅️ Marquer comme démarré
        return;
      }

      try {
        console.log('🎤 Starting global listening...');

        globalSpeechService!.onResult((result) => {
          if (!result.isFinal) return;

          const transcript = result.transcript.toLowerCase().trim();
          console.log('🎤 Voice input:', transcript);
          addVoiceLog('heard', transcript);

          // Chercher une commande correspondante
          const matchedCommand = commandsRef.current.find((cmd) =>
            cmd.keywords.some((keyword) =>
              transcript.includes(keyword.toLowerCase())
            )
          );

          if (matchedCommand) {
            console.log('✅ Command matched:', matchedCommand.keywords[0]); // ⬅️ LOGGER la commande
            addVoiceLog('action', `Commande: ${transcript}`);
            matchedCommand.action();
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
            }, 1000); // ⬅️ 1 seconde de délai
          } else {
            // ⬇️ AJOUTER : Logger quand aucune commande ne correspond
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
        hasStartedRef.current = true; // ⬅️ Marquer comme démarré
        console.log('✅ Global listening started');
      } catch (error) {
        console.error('❌ Error starting listening:', error);
        hasStartedRef.current = true; // ⬅️ Même en cas d'erreur
      }
    };

    startListening();

    // Cleanup : NE PAS arrêter, juste marquer comme inactif
    return () => {
      console.log('🧹 useVoiceCommands cleanup (keeping service alive)');
      hasStartedRef.current = false; // ⬅️ Reset pour permettre redémarrage
    };
  }, [enabled]); // ⬅️ ENLEVER 'commands' des dépendances !
}
