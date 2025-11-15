/**
 * GlobalVoiceController - Commandes vocales globales via AudioManager
 * 
 * BUILD 4 :
 * - Un seul useEffect pour tout gérer
 * - Écoute démarrée APRÈS le message de bienvenue
 * - Callback enregistré une seule fois
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { audioManager } from '@/services/AudioManager';

/**
 * Contrôleur vocal global
 * - Active l'écoute micro en mode Audio
 * - Commandes globales: démarrer un quiz, retour menu
 * - S'auto-désactive dans les pages qui gèrent leur propre audio (Quiz)
 */
const GlobalVoiceController = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audioMode = useSettingsStore((s) => s.audioMode);
  const hasInitializedRef = useRef(false);

  // ⬇️ UN SEUL useEffect pour tout gérer
  useEffect(() => {
    if (!audioMode) return;

    // Désactiver sur la page Quiz (elle gère son propre audio)
    const isOnQuizPage = location.pathname.includes('/quiz/');
    if (isOnQuizPage) {
      console.log('🚨 Quiz actif, GlobalVoiceController désactivé');
      return;
    }

    // Initialisation unique
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const init = async () => {
      try {
        await audioManager.initialize();
        
        // ⬇️ 1. PARLER D'ABORD (pendant que STT est OFF)
        await audioManager.speak(
          "Mode Audio activé ! Commencez le Quiz Mixte ou dites une catégorie pour démarrer. C'est parti !"
        );

        // ⬇️ 2. DÉFINIR LE CALLBACK (une seule fois)
        const handleVoiceCommand = (transcript: string) => {
          const text = transcript.toLowerCase().trim();
          console.log('🎤 GlobalVoice heard:', text);

          // Commande: Retour menu
          if (text.includes('retour') || text.includes('menu') || text.includes('accueil')) {
            console.log('✅ Command: Retour menu');
            navigate('/');
            return;
          }

          // Commande: Stop lecture
          if (text.includes('stop') || text.includes('silence') || text.includes('arrête')) {
            console.log('✅ Command: Stop lecture');
            audioManager.stopSpeaking();
            return;
          }

          // Commande: Quiz Mixte
          if (text.includes('mixte') || text.includes('mix') || text.includes('commencer le quiz')) {
            console.log('✅ Command: Quiz Mixte');
            navigate('/quiz/mixte/1');
            return;
          }

          // Commande: Histoire
          if (text.includes('histoire')) {
            console.log('✅ Command: Quiz Histoire');
            navigate('/level/histoire-politique');
            return;
          }

          // Commande: Géographie
          if (text.includes('géographie') || text.includes('geographie')) {
            console.log('✅ Command: Quiz Géographie');
            navigate('/level/geographie-economie');
            return;
          }

          // Commande: Sciences
          if (text.includes('sciences')) {
            console.log('✅ Command: Quiz Sciences');
            navigate('/level/sciences-technologie');
            return;
          }
        };

        audioManager.onSpeech(handleVoiceCommand);

        // ⬇️ 3. DÉMARRER L'ÉCOUTE (après avoir parlé)
        await audioManager.startListening();

        console.log('✅ GlobalVoiceController initialized via AudioManager');
      } catch (error) {
        console.error('❌ GlobalVoiceController init error:', error);
      }
    };

    init();

    // Cleanup
    return () => {
      console.log('🧹 GlobalVoiceController cleanup');
      audioManager.stopListening();
      hasInitializedRef.current = false;
    };
  }, [audioMode, navigate, location.pathname]);

  return null;
};

export default GlobalVoiceController;
