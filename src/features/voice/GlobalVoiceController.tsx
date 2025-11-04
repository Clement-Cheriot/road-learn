import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { createAudioService } from '@/services/audio/AudioServiceFactory';

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

  // Annonce vocale des commandes disponibles lors de l'activation du mode audio
  useEffect(() => {
    const announce = async () => {
      if (!audioMode || hasAnnouncedRef.current) return;
      hasAnnouncedRef.current = true;
      try {
        const audio = createAudioService();
        await audio.speak("Mode Audio activé. Dites: 'Commencer le quiz mixte', ou 'Histoire', 'Géographie', 'Sciences'. Dites 'retour menu' à tout moment.");
      } catch {}
    };
    announce();
  }, [audioMode]);

  const commands = useMemo(() => {
    if (!audioMode) return [] as { keywords: string[]; action: () => void | Promise<void> }[];

    const startMixte = () => navigate('/quiz/mixte');
    const startHist = () => navigate('/quiz/histoire');
    const startGeo = () => navigate('/quiz/geographie');
    const startSci = () => navigate('/quiz/sciences');

    const cmds: Array<{ keywords: string[]; action: () => void | Promise<void> }> = [
      { keywords: ['retour', 'menu', 'accueil', 'retour menu'], action: () => navigate('/') },
      { keywords: ['commencer le quiz mixte', 'quiz mixte', 'commencer mixte', 'lancer mixte', 'démarrer mixte', 'mixte'], action: startMixte },
      { keywords: ['commencer histoire', 'quiz histoire', 'histoire'], action: startHist },
      { keywords: ['commencer géographie', 'quiz géographie', 'géographie', 'geographie'], action: startGeo },
      { keywords: ['commencer sciences', 'quiz sciences', 'sciences'], action: startSci },
      {
        keywords: ['stop lecture', 'arrête la lecture', 'stop', 'silence'],
        action: async () => {
          const audio = createAudioService();
          try { await audio.stopSpeaking(); } catch {}
        },
      },
    ];

    return cmds;
  }, [audioMode, navigate]);

  useVoiceCommands(commands, audioMode);

  return null;
};

export default GlobalVoiceController;
