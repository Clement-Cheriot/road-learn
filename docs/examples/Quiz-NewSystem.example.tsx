/**
 * Exemple d'utilisation du nouveau système dans Quiz.tsx
 * Mode "Attendre la fin" avec signal talkie-walkie
 */

import { audioSignalService } from '@/services/audio/AudioSignalService';

const Quiz = () => {
  const audioService = createAudioService();
  
  // Initialiser au démarrage
  useEffect(() => {
    audioService.initialize?.();
  }, []);
  
  /**
   * Lire une question en mode "Attendre la fin"
   */
  const speakQuestion = async (question: string, options: string[]) => {
    try {
      // 1. Lire la question (voix rapide)
      await audioService.speak(question, { rate: 1.3 });
      
      // 2. Petite pause
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 3. Lire les options
      for (let i = 0; i < options.length; i++) {
        const optionText = `Option ${String.fromCharCode(65 + i)}: ${options[i]}`;
        await audioService.speak(optionText, { rate: 1.2 });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // 4. Invitation à répondre
      await audioService.speak("À vous !", { rate: 1.0, pitch: 1.1 });
      
      // 5. 📻 SIGNAL TALKIE-WALKIE
      await audioSignalService.playTalkieBeep();
      
      // 6. SILENCE - Attente de la réponse
      console.log('🎤 En attente de la réponse...');
      
      // Optionnel : Démarrer un timer de 30 secondes
      startAnswerTimeout(30);
      
    } catch (error) {
      console.error('Erreur lecture question:', error);
    }
  };
  
  /**
   * Handler de réponse vocale
   */
  const handleVoiceAnswer = async (answer: string) => {
    // Jouer le signal de fin
    await audioSignalService.playTalkieEndBeep();
    
    // Traiter la réponse
    const isCorrect = checkAnswer(answer);
    
    if (isCorrect) {
      await audioSignalService.playConfirmationBeep();
      await audioService.speak("Correct !", { rate: 1.2 });
    } else {
      await audioSignalService.playErrorBeep();
      await audioService.speak("Incorrect.", { rate: 1.1 });
      await audioService.speak(`La bonne réponse était: ${correctAnswer}`, { rate: 1.2 });
    }
    
    // Pause puis question suivante
    await new Promise(resolve => setTimeout(resolve, 1000));
    nextQuestion();
  };
  
  /**
   * Timer de timeout si pas de réponse
   */
  const startAnswerTimeout = (seconds: number) => {
    const timeoutId = setTimeout(async () => {
      await audioService.speak("Temps écoulé !", { rate: 1.2 });
      await audioSignalService.playErrorBeep();
      nextQuestion();
    }, seconds * 1000);
    
    // Sauvegarder l'ID pour pouvoir l'annuler
    setAnswerTimeoutId(timeoutId);
  };
  
  // ... reste du code
};
