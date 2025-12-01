/**
 * GlobalVoiceController - Commandes vocales globales via AudioManager
 * Gère l'écoute sur les pages non-quiz
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
  const hasInitializedRef = useRef(false);
  const isQuizPageRef = useRef(false);

  useEffect(() => {
    isQuizPageRef.current = location.pathname.includes('/quiz/');
  }, [location.pathname]);

  useEffect(() => {
    if (!audioMode) return;
    if (isQuizPageRef.current) return;
    if (hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;

    const init = async () => {
      try {
        await audioManager.initialize();
        
        await audioManager.speak(
          applyPhoneticPronunciation("Mode Audio activé ! Commencez le Quiz Mixte ou dites une catégorie pour démarrer. C'est parti !")
        );

        const handleVoiceCommand = (transcript: string) => {
          const text = transcript.toLowerCase().trim();

          if (text.includes('retour') || text.includes('menu') || text.includes('accueil')) {
            navigate('/');
            return;
          }

          if (text.includes('stop') || text.includes('silence') || text.includes('arrête')) {
            audioManager.stopSpeaking();
            return;
          }

          if (text.includes('mixte') || text.includes('mix') || text.includes('commencer le quiz')) {
            audioManager.stopSpeaking();
            navigate('/quiz/mixte/1');
            return;
          }

          if (text.includes('histoire')) {
            audioManager.stopSpeaking();
            navigate('/level/histoire-politique');
            return;
          }

          if (text.includes('géographie') || text.includes('geographie')) {
            audioManager.stopSpeaking();
            navigate('/level/geographie-economie');
            return;
          }

          if (text.includes('sciences')) {
            audioManager.stopSpeaking();
            navigate('/level/sciences-technologie');
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
      if (isQuizPageRef.current) {
        audioManager.stopListening();
        hasInitializedRef.current = false;
      }
    };
  }, [audioMode]);

  return null;
};

export default GlobalVoiceController;
