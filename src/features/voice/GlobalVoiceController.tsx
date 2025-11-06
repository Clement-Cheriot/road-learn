import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { requestMicrophonePermission } from '@/services/audio/MicrophonePermission';

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

  // Demande de permission microphone et annonce vocale
  useEffect(() => {
    const announce = async () => {
      if (!audioMode || hasAnnouncedRef.current) return;
      hasAnnouncedRef.current = true;
      
      // Demander la permission microphone avant tout
      const micGranted = await requestMicrophonePermission();
      if (!micGranted) {
        console.error('❌ Permission microphone refusée - mode audio désactivé');
        return;
      }

      try {
        await audioServiceRef.current.speak("Mode Audio activé. Commencer le Quiz Mixte ou dites une catégorie pour commencer. Dites 'retour menu' à tout moment.");
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
    if (!audioMode) return [] as { keywords: string[]; action: () => void | Promise<void> }[];

    const startMixte = () => navigate('/quiz/mixte/1');
    const startHist = () => navigate('/level/histoire-politique');
    const startGeo = () => navigate('/level/geographie-economie');
    const startSci = () => navigate('/level/sciences-technologie');

    const cmds: Array<{ keywords: string[]; action: () => void | Promise<void> }> = [
      { keywords: ['retour', 'menu', 'accueil', 'retour menu'], action: () => navigate('/') },
      { keywords: ['commencer le quiz mixte', 'quiz mixte', 'commencer mixte', 'lancer mixte', 'démarrer mixte', 'mixte'], action: startMixte },
      { keywords: ['commencer histoire', 'quiz histoire', 'histoire'], action: startHist },
      { keywords: ['commencer géographie', 'quiz géographie', 'géographie', 'geographie'], action: startGeo },
      { keywords: ['commencer sciences', 'quiz sciences', 'sciences'], action: startSci },
      {
        keywords: ['stop lecture', 'arrête la lecture', 'stop', 'silence'],
        action: async () => {
          try { await audioServiceRef.current.stopSpeaking(); } catch {}
        },
      },
    ];

    return cmds;
  }, [audioMode, navigate]);

  useVoiceCommands(commands, audioMode);

  return null;
};

export default GlobalVoiceController;
