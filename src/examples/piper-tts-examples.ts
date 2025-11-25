/**
 * 🎙️ Exemple d'utilisation de Piper TTS
 * 
 * Ce fichier montre comment utiliser le service Piper TTS
 * dans différents contextes de RoadLearn.
 */

import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { PiperTTSService } from '@/services/audio/PiperTTSService';

// ===== EXEMPLE 1 : Utilisation via Factory (recommandé) =====

export async function exampleWithFactory() {
  // Créer le service avec Piper TTS activé
  const audioService = createAudioService({ usePiper: true });

  // Vérifier la disponibilité
  const isAvailable = await audioService.isAvailable();
  if (!isAvailable) {
    console.error('❌ Piper TTS non disponible');
    return;
  }

  // Lire une question de quiz
  await audioService.speak(
    "Quelle est la capitale de la France ?",
    {
      rate: 1.2,   // 20% plus rapide
      pitch: 1.0,  // Tonalité normale
      volume: 1.0  // Volume max
    }
  );

  console.log('✅ Question lue !');
}

// ===== EXEMPLE 2 : Utilisation directe (avancé) =====

export async function exampleDirect() {
  const piperTTS = new PiperTTSService();

  try {
    // Lire du texte
    await piperTTS.speak("Bienvenue sur RoadLearn !");

    // Vérifier si en cours de lecture
    if (piperTTS.getIsSpeaking()) {
      console.log('🔊 Lecture en cours...');
    }

    // Arrêter la lecture
    await piperTTS.stopSpeaking();
  } catch (error) {
    console.error('❌ Erreur TTS:', error);
  }
}

// ===== EXEMPLE 3 : Intégration dans Quiz.tsx =====

export function QuizPiperExample() {
  // Dans votre composant Quiz
  const [audioService] = useState(() => createAudioService({ usePiper: true }));

  const speakQuestion = async (question: string) => {
    try {
      await audioService.speak(question, {
        rate: 1.15, // Légèrement plus rapide pour les quiz
        volume: 1.0
      });
    } catch (error) {
      console.error('Erreur lecture question:', error);
      // Fallback : afficher visuellement
    }
  };

  return {
    speakQuestion,
    stopSpeaking: () => audioService.stopSpeaking()
  };
}

// ===== EXEMPLE 4 : Mode hybride (Piper offline + fallback natif) =====

export async function exampleHybrid() {
  // Essayer Piper d'abord
  let audioService = createAudioService({ usePiper: true });
  
  const piperAvailable = await audioService.isAvailable();
  
  if (!piperAvailable) {
    console.warn('⚠️ Piper non disponible, fallback TTS natif');
    audioService = createAudioService({ usePiper: false });
  }

  await audioService.speak("Test hybride");
}

// ===== EXEMPLE 5 : Gestion des erreurs =====

export async function exampleWithErrorHandling() {
  const audioService = createAudioService({ usePiper: true });

  try {
    await audioService.speak("Question de quiz");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Model file not found')) {
        console.error('❌ Modèle Piper non trouvé - exécuter ./scripts/download-piper-model.sh');
      } else if (error.message.includes('ONNX')) {
        console.error('❌ Erreur ONNX Runtime - vérifier les dépendances');
      } else {
        console.error('❌ Erreur inconnue:', error);
      }
    }

    // Fallback silencieux ou affichage visuel
    return false;
  }

  return true;
}

// ===== EXEMPLE 6 : Performance monitoring =====

export async function exampleWithMonitoring() {
  const audioService = createAudioService({ usePiper: true });
  
  const text = "Quelle année a été fondée la République Française ?";
  
  console.time('TTS Synthesis');
  await audioService.speak(text);
  console.timeEnd('TTS Synthesis');
  
  // Benchmark typique : 150-300ms pour une phrase courte
}

// ===== EXEMPLE 7 : Pré-chargement du modèle =====

export async function examplePreload() {
  // Charger le service au démarrage de l'app pour réduire la latence
  const audioService = createAudioService({ usePiper: true });
  
  // Initialiser en arrière-plan
  await audioService.isAvailable();
  
  console.log('✅ Modèle Piper pré-chargé');
  
  // Maintenant les appels à speak() seront plus rapides
  return audioService;
}

// ===== EXPORT POUR UTILISATION DANS L'APP =====

export const PiperExamples = {
  basic: exampleWithFactory,
  direct: exampleDirect,
  quiz: QuizPiperExample,
  hybrid: exampleHybrid,
  withErrors: exampleWithErrorHandling,
  monitoring: exampleWithMonitoring,
  preload: examplePreload
};
