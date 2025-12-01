/**
 * GlobalVoiceController - Commandes vocales globales via AudioManager
 * Gère l'écoute sur les pages non-quiz (Index uniquement)
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { audioManager } from '@/services/AudioManager';
import { applyPhoneticPronunciation } from '@/config/audio.config';

const GlobalVoiceController = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audioMode = useSettingsStore((s) => s.audioMode);
  const isListeningRef = useRef(false);

  // Déterminer si on est sur la page d'accueil
  const isHomePage = location.pathname === '/';

  // Reset quand on quitte l'accueil
  useEffect(() => {
    if (!isHomePage) {
      isListeningRef.current = false;
    }
  }, [isHomePage]);

  useEffect(() => {
    // Ne rien faire si mode audio désactivé ou pas sur l'accueil
    if (!audioMode || !isHomePage) {
      return;
    }

    // Éviter de réinitialiser si déjà en écoute
    if (isListeningRef.current) {
      return;
    }
    isListeningRef.current = true;

    const init = async () => {
      try {
        await audioManager.initialize();
        
        await audioManager.speak(
          applyPhoneticPronunciation(". Mode Audio activé ! Dites une catégorie ou Quiz Mixte pour démarrer.")
        );

        const handleVoiceCommand = (transcript: string) => {
          const text = transcript.toLowerCase().trim();

          if (text.includes('stop') || text.includes('silence') || text.includes('arrête')) {
            audioManager.stopSpeaking();
            return;
          }

          if (text.includes('mixte') || text.includes('mix') || text.includes('commencer')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/mixte');
            return;
          }

          // Toutes les catégories
          if (text.includes('art') || text.includes('littérature') || text.includes('litterature')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/arts-litterature');
            return;
          }

          if (text.includes('divertissement') || text.includes('cinéma') || text.includes('cinema') || text.includes('film')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/divertissement');
            return;
          }

          if (text.includes('sport') || text.includes('foot')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/sport');
            return;
          }

          if (text.includes('histoire') || text.includes('politique')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/histoire-politique');
            return;
          }

          if (text.includes('géographie') || text.includes('geographie') || text.includes('économie') || text.includes('economie')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/geographie-economie');
            return;
          }

          if (text.includes('gastronomie') || text.includes('cuisine') || text.includes('nourriture')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/gastronomie');
            return;
          }

          if (text.includes('science') || text.includes('technologie') || text.includes('tech')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/sciences-technologie');
            return;
          }

          if (text.includes('social') || text.includes('société') || text.includes('societe')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/sociales');
            return;
          }

          if (text.includes('people') || text.includes('célébrité') || text.includes('celebrite') || text.includes('star')) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate('/level/people');
            return;
          }
        };

        audioManager.onSpeech(handleVoiceCommand);
        await audioManager.startListening();
      } catch (error) {
        console.error('❌ GlobalVoiceController error:', error);
      }
    };

    init();

    return () => {
      audioManager.stopListening();
      isListeningRef.current = false;
    };
  }, [audioMode, isHomePage, navigate]);

  return null;
};

export default GlobalVoiceController;
