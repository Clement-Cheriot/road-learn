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

// Dispatcher global pour permettre plusieurs hooks simultanés sans conflit
let subscribers: Array<(transcript: string) => void> = [];
let errorSubscribers: Array<(error: Error) => void> = [];
let serviceInitialized = false;
let activeCount = 0;
let isServiceListening = false;

const ensureService = () => {
  const speechService = createSpeechService();
  if (!serviceInitialized) {
    speechService.onResult((result) => {
      if (!result.isFinal) return;
      const transcript = result.transcript.toLowerCase();
      addVoiceLog('heard', `"${transcript}"`);
      subscribers.forEach((fn) => {
        try { fn(transcript); } catch (e) { /* noop */ }
      });
    });
    speechService.onError((error) => {
      console.error('Erreur reconnaissance vocale:', error);
      errorSubscribers.forEach((fn) => fn(error));
      isServiceListening = false;
    });
    serviceInitialized = true;
  }
  return speechService;
};

const startGlobalListening = async () => {
  const speechService = ensureService();
  try {
    const available = await speechService.isAvailable();
    if (!available) {
      console.warn('Reconnaissance vocale non disponible');
      return false;
    }
    if (!speechService.isListening()) {
      await speechService.startListening({ language: 'fr-FR', continuous: true, interimResults: false });
    }
    isServiceListening = true;
    return true;
  } catch (e) {
    console.error('Erreur initialisation reconnaissance vocale:', e);
    isServiceListening = false;
    return false;
  }
};

const stopGlobalListeningIfIdle = async () => {
  const speechService = ensureService();
  if (activeCount <= 0 && speechService.isListening()) {
    await speechService.stopListening();
    isServiceListening = false;
  }
};

export const useVoiceCommands = (commands: VoiceCommand[], enabled: boolean = true) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');

  useEffect(() => {
    if (!enabled) return;

    const speechService = ensureService();

    // Abonné local: fait correspondre et exécute
    const subscriber = async (transcript: string) => {
      let matched = false;
      for (const command of commands) {
        if (command.keywords.some((keyword) => transcript.includes(keyword))) {
          addVoiceLog('action', `Exécution: ${command.keywords[0]}`);
          matched = true;
          setLastCommand(transcript);
          try {
            const res = command.action();
            if (res instanceof Promise) {
              await res;
            }
          } catch (err: any) {
            console.error('Erreur commande vocale:', err);
            addVoiceLog('error', `Erreur: ${err.message}`);
          }
          break;
        }
      }
      if (!matched) {
        // Ne log pas ici pour éviter le spam si plusieurs hooks
      }
    };

    subscribers.push(subscriber);
    activeCount += 1;

    // Démarrer globalement si nécessaire
    startGlobalListening().then((ok) => setIsListening(ok));

    return () => {
      subscribers = subscribers.filter((fn) => fn !== subscriber);
      activeCount -= 1;
      stopGlobalListeningIfIdle();
      setIsListening(false);
    };
  }, [commands, enabled]);

  return { isListening: isListening || isServiceListening, lastCommand };
};
