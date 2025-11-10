import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { requestMicrophonePermission } from '@/services/audio/MicrophonePermission';

// ⬇️ SINGLETON pour éviter multiple démarrages
let globalVoiceControllerInitialized = false;

/**
 * Contrôleur vocal global
 * - Active l'écoute micro en mode Audio
 * - Commandes globales: démarrer un quiz, retour menu, stop lecture
 */
const GlobalVoiceController = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audioMode = useSettingsStore((s) => s.audioMode);
  const hasAnnouncedRef = useRef(false);
  const audioServiceRef = useRef(createAudioService());

  // ⬇️ PROTECTION : un seul GlobalVoiceController à la fois
  useEffect(() => {
    if (globalVoiceControllerInitialized) {
      console.log('⚠️ GlobalVoiceController already initialized, skipping');
      return;
    }
    globalVoiceControllerInitialized = true;
    console.log('✅ GlobalVoiceController initialized');

    return () => {
      console.log('🧹 GlobalVoiceController cleanup');
      globalVoiceControllerInitialized = false;
    };
  }, []);

  // Demande de permission microphone et annonce vocale
  useEffect(() => {
    const announce = async () => {
      if (!audioMode || hasAnnouncedRef.current) return;
      hasAnnouncedRef.current = true;

      // Demander la permission microphone avant tout
      const micGranted = await requestMicrophonePermission();
      if (!micGranted) {
        console.error(
          '❌ Permission microphone refusée - mode audio désactivé'
        );
        return;
      }

      try {
        await audioServiceRef.current.speak(
          "Mode Audio activé. Commencer le Quiz Mixte ou dites une catégorie pour commencer. Dites 'retour menu' à tout moment."
        );
      } catch {}
    };
    announce();
  }, [audioMode]);

  // Nettoyage à la destruction
  useEffect(() => {
    return () => {
      audioServiceRef.current.stopSpeaking().catch(() => {});
    };
  }, []);

  const commands = useMemo(() => {
    if (!audioMode) return [];

    const isOnQuizPage = location.pathname.includes('/quiz/');

    const startMixte = () => {
      console.log('🚀 === STARTING QUIZ MIXTE ===');
      console.log('Navigating to: /quiz/mixte/1');
      console.log('Current location before:', window.location.pathname);
      navigate('/quiz/mixte/1');
      console.log('Navigate called');
      setTimeout(() => {
        console.log('Current location after 500ms:', window.location.pathname);
      }, 500);
      setTimeout(() => {
        console.log('Current location after 1000ms:', window.location.pathname);
      }, 1000);
    };
    const startHist = () => navigate('/level/histoire-politique');
    const startGeo = () => navigate('/level/geographie-economie');
    const startSci = () => navigate('/level/sciences-technologie');

    const cmds = [
      {
        keywords: ['retour', 'menu', 'accueil', 'retour menu'],
        action: () => navigate('/'),
      },
      {
        keywords: ['stop lecture', 'arrête la lecture', 'stop', 'silence'],
        action: async () => {
          try {
            await audioServiceRef.current.stopSpeaking();
          } catch {}
        },
      },
    ];

    // ⬇️ N'ajouter les commandes de navigation QUE si on n'est pas sur la page Quiz
    if (!isOnQuizPage) {
      cmds.push(
        {
          keywords: [
            'commencer le quiz mixte',
            'quiz mixte',
            'quizz mixte',
            'commencer mixte',
            'lancer mixte',
            'démarrer mixte',
            'mixte',
            'mix',
          ],
          action: startMixte,
        },
        {
          keywords: ['commencer histoire', 'quiz histoire', 'histoire'],
          action: startHist,
        },
        {
          keywords: [
            'commencer géographie',
            'quiz géographie',
            'géographie',
            'geographie',
          ],
          action: startGeo,
        },
        {
          keywords: ['commencer sciences', 'quiz sciences', 'sciences'],
          action: startSci,
        }
      );
    }

    return cmds;
  }, [audioMode, navigate, location.pathname]);

  useVoiceCommands(commands, audioMode);

  return null;
};

export default GlobalVoiceController;
