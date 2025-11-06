/**
 * Page Quiz - Moteur de jeu principal
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, Volume2, VolumeX, Check, X, Home, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuizStore } from '@/stores/useQuizStore';
import { useUserStore } from '@/stores/useUserStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useTimerSounds } from '@/hooks/useTimerSounds';
import type { Category, Question, QuizSession, UserAnswer, Level } from '@/types/quiz.types';

const Quiz = () => {
  const { category, level } = useParams<{ category: Category; level: string }>();
  const quizLevel = (level ? parseInt(level) : 1) as Level;
  const navigate = useNavigate();
  
  const {
    currentSession,
    currentQuestion,
    currentQuestionIndex,
    timeRemaining,
    showFeedback,
    lastAnswerCorrect,
    startSession,
    submitAnswer,
    nextQuestion,
    setTimeRemaining,
  } = useQuizStore();

  const { progress, updateXP, updateCategoryStats } = useUserStore();
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isReadingQuestion, setIsReadingQuestion] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const audioServiceRef = useState(() => createAudioService())[0];
  const audioContextRef = useRef<AudioContext | null>(null);
  const cancelReadingRef = useRef<boolean>(false);

  // Initialiser AudioContext pour les sons de feedback
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
  }, []);

  useEffect(() => {
    if (category) {
      initializeQuiz(category);
    }
  }, [category]);

  useEffect(() => {
    if (currentSession?.isComplete) {
      audioServiceRef.stopSpeaking().catch(() => {});
      navigate('/results');
    }
  }, [currentSession?.isComplete]);

  // Arrêter l'audio lors du démontage et retour au menu
  useEffect(() => {
    return () => {
      audioServiceRef.stopSpeaking().catch(() => {});
      cancelReadingRef.current = false;
    };
  }, []);

  // Démarrer le timer uniquement après la lecture de la question
  useEffect(() => {
    if (!showFeedback && timeRemaining > 0 && timerStarted && !isReadingQuestion) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }

    if (timeRemaining === 0 && !showFeedback && timerStarted) {
      handleTimeout();
    }
  }, [timeRemaining, showFeedback, timerStarted, isReadingQuestion]);

  useEffect(() => {
    if (currentQuestion && audioEnabled) {
      setTimerStarted(false); // Arrêter le timer pendant la lecture
      setIsReadingQuestion(true);
      setQuestionStartTime(Date.now()); // Timestamp pour le scoring
      speakQuestion();
    } else if (currentQuestion && !audioEnabled) {
      // Si pas d'audio, démarrer le timer immédiatement
      setTimerStarted(true);
      setIsReadingQuestion(false);
      setQuestionStartTime(Date.now()); // Timestamp pour le scoring
    }
  }, [currentQuestion, audioEnabled]);

  // Sons du timer
  useTimerSounds(timeRemaining, timerStarted && !showFeedback);

  // Commandes vocales
  const voiceCommands = useMemo(() => {
    const commands: Array<{ keywords: string[]; action: () => void | Promise<void> }> = [];

    // Commandes globales toujours actives
    commands.push({ keywords: ['retour', 'menu', 'accueil', 'retour menu'], action: async () => {
      cancelReadingRef.current = true;
      await audioServiceRef.stopSpeaking();
      navigate('/');
    } });
    commands.push({
      keywords: ['stop lecture', 'arrête la lecture', 'silence', 'stop'],
      action: async () => {
        cancelReadingRef.current = true;
        await audioServiceRef.stopSpeaking();
        // Si on arrêtait la lecture de la question, démarrer le timer
        if (isReadingQuestion && !showFeedback) {
          setIsReadingQuestion(false);
          setTimerStarted(true);
        }
      },
    });
    commands.push({
      keywords: ['répète', 'répéter', 'redis', 'encore', 'répète la question'],
      action: async () => {
        cancelReadingRef.current = true;
        await audioServiceRef.stopSpeaking();
        setIsReadingQuestion(true);
        setTimerStarted(false);
        setQuestionStartTime(Date.now()); // Reset timestamp pour le scoring
        await speakQuestion();
      },
    });

    // Suivant - toujours prioritaire, même pendant le feedback
    commands.push({
      keywords: ['suivant', 'suivante', 'continue', 'continuer', 'next', 'passe'],
      action: async () => {
        cancelReadingRef.current = true;
        await audioServiceRef.stopSpeaking();
        if (showFeedback) return handleNextQuestion();
        if (isReadingQuestion) {
          // Arrêter la lecture et démarrer le timer
          setIsReadingQuestion(false);
          setTimerStarted(true);
        }
      },
    });

    // Réponses disponibles même pendant la lecture de la question
    if (currentQuestion && !showFeedback) {
      currentQuestion.options.forEach((option) => {
        const optionTextLower = option.text.toLowerCase().trim();
        const keywords = [
          optionTextLower, // Texte complet de l'option (priorité)
          ...optionTextLower.split(' ').filter(w => w.length > 3), // Mots significatifs
        ];

        // Ajouter les variantes phonétiques si disponibles
        if (option.phoneticKeywords) {
          keywords.push(...option.phoneticKeywords);
        }
        
        // Ajouter variantes numériques pour les chiffres
        const numberWords: Record<string, string> = {
          'un': '1', 'une': '1',
          'deux': '2',
          'trois': '3',
          'quatre': '4',
          'cinq': '5',
          'six': '6',
          'sept': '7',
          'huit': '8',
          'neuf': '9',
          'dix': '10'
        };
        
        // Si l'option est un chiffre, ajouter sa version en lettres
        if (numberWords[option.id.toLowerCase()]) {
          keywords.push(option.id.toLowerCase());
        }
        // Si le texte contient un chiffre écrit, ajouter le chiffre
        Object.entries(numberWords).forEach(([word, number]) => {
          if (optionTextLower.includes(word) || option.id === number) {
            keywords.push(word);
          }
        });
        
        commands.push({ keywords, action: async () => {
          // Interrompre l'audio avant de répondre
          cancelReadingRef.current = true;
          await audioServiceRef.stopSpeaking();
          handleAnswer(option.id);
        }});
      });
    }

    return commands;
  }, [currentQuestion, showFeedback, isReadingQuestion]);

  const { isListening } = useVoiceCommands(voiceCommands, voiceEnabled);

  const initializeQuiz = async (cat: Category) => {
    try {
      // Réinitialiser le quiz avant de démarrer
      useQuizStore.getState().resetQuiz();
      
      const storage = createStorageService();
      let allQuestions: Question[] = [];

      // Si catégorie "mixte", charger toutes les questions
      if (cat === 'mixte') {
        const categories: Exclude<Category, 'mixte'>[] = [
          'arts-litterature',
          'divertissement',
          'sport',
          'histoire-politique',
          'geographie-economie',
          'gastronomie',
          'sciences-technologie',
          'sociales',
          'people',
        ];
        for (const category of categories) {
          const questions = await storage.getQuestionsByCategory(category);
          allQuestions = [...allQuestions, ...questions];
        }
      } else {
        allQuestions = await storage.getQuestionsByCategory(cat);
      }
      
      // Filtrer temporairement les questions avec symboles chimiques (sci_002)
      allQuestions = allQuestions.filter(q => q.id !== 'sci_002');
      
      // Sélectionner 5 questions aléatoires
      const selectedQuestions = allQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      const session: QuizSession = {
        id: `session_${Date.now()}`,
        category: cat,
        level: quizLevel,
        startedAt: new Date(),
        questions: selectedQuestions,
        currentQuestionIndex: 0,
        score: 0,
        maxScore: selectedQuestions.reduce((sum, q) => sum + q.points, 0),
        isComplete: false,
      };

      startSession(session);
      setStartTime(new Date());
    } catch (error) {
      console.error('Erreur chargement quiz:', error);
    }
  };

  const speakQuestion = async () => {
    if (!currentQuestion) return;

    try {
      // Réinitialiser le flag d'annulation
      cancelReadingRef.current = false;
      
      // Arrêter toute lecture en cours
      await audioServiceRef.stopSpeaking();
      
      await audioServiceRef.speak(currentQuestion.question);
      
      // Vérifier si annulé
      if (cancelReadingRef.current) {
        setIsReadingQuestion(false);
        setTimerStarted(true);
        return;
      }
      
      // Lire les options après une pause
      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (const option of currentQuestion.options) {
        // Vérifier si annulé avant chaque option
        if (cancelReadingRef.current) {
          setIsReadingQuestion(false);
          setTimerStarted(true);
          return;
        }
        
        // Utiliser phoneticText si disponible pour épeler les symboles
        const textToSpeak = option.phoneticText || option.text;
        await audioServiceRef.speak(textToSpeak);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      // Démarrer le timer APRÈS la lecture complète
      setIsReadingQuestion(false);
      setTimerStarted(true);
    } catch (error) {
      // Ignorer les erreurs "canceled" (interruption volontaire)
      if (error instanceof Error && !error.message.includes('canceled')) {
        console.error('Erreur lecture audio:', error);
      }
      // Démarrer le timer même en cas d'interruption
      setIsReadingQuestion(false);
      setTimerStarted(true);
    }
  };

  const calculateScore = (timeElapsed: number, basePoints: number, timeLimit: number): number => {
    const multiplier = timeElapsed <= 5000 ? 3 : 
                      timeElapsed <= (timeLimit - 5) * 1000 ? 2 : 1;
    return basePoints * multiplier;
  };

  const handleAnswer = async (optionId: string) => {
    if (!currentQuestion || showFeedback) return;

    setSelectedOptionId(optionId);
    const option = currentQuestion.options.find(o => o.id === optionId);
    if (!option) return;

    const timeElapsed = Date.now() - questionStartTime;
    const basePoints = currentQuestion.points;
    const earnedPoints = option.isCorrect ? calculateScore(timeElapsed, basePoints, currentQuestion.timeLimit) : 0;

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
      isCorrect: option.isCorrect,
      timeSpent: timeElapsed,
      answeredAt: new Date(),
    };

    submitAnswer(answer);

    // Son de réussite/échec
    playFeedbackSound(option.isCorrect);

    // Mettre à jour le score avec le multiplicateur
    if (option.isCorrect) {
      useQuizStore.setState(state => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          score: state.currentSession.score + earnedPoints
        } : null
      }));
    }

    // Feedback audio
    if (audioEnabled) {
      try {
        await audioServiceRef.speak(option.isCorrect ? 'Bonne réponse.' : 'Mauvaise réponse.');
        
        // Pause après "bonne/mauvaise réponse" avant l'explication
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (currentQuestion.explanation) {
          await audioServiceRef.speak(currentQuestion.explanation);
        }
        
        // Annoncer et passer automatiquement à la question suivante
        await new Promise(resolve => setTimeout(resolve, 1000));
        await audioServiceRef.speak('Question suivante');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        handleNextQuestion();
      } catch (error) {
        // Ignorer les erreurs d'interruption
        if (error instanceof Error && !error.message.includes('canceled')) {
          console.error('Erreur feedback audio:', error);
        }
      }
    }

    // Mettre à jour les stats utilisateur
    if (currentQuestion && progress) {
      const questionCategory = currentQuestion.category as Category;
      updateCategoryStats(questionCategory, option.isCorrect, quizLevel);
      if (option.isCorrect) {
        updateXP(earnedPoints);
      }
    }
  };

  const handleTimeout = async () => {
    if (!currentQuestion) return;

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: '',
      isCorrect: false,
      timeSpent: currentQuestion.timeLimit * 1000,
      answeredAt: new Date(),
    };

    submitAnswer(answer);

    if (audioEnabled) {
      try {
        await audioServiceRef.speak('Temps écoulé');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Trouver et annoncer la bonne réponse
        const correctOption = currentQuestion.options.find(opt => opt.isCorrect);
        if (correctOption) {
          await audioServiceRef.speak(`La bonne réponse était ${correctOption.phoneticText || correctOption.text}`);
        }
        
        // Lire l'explication
        if (currentQuestion.explanation) {
          await new Promise(resolve => setTimeout(resolve, 800));
          await audioServiceRef.speak(currentQuestion.explanation);
        }
        
        // Annoncer et passer automatiquement à la question suivante
        await new Promise(resolve => setTimeout(resolve, 1000));
        await audioServiceRef.speak('Question suivante');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        handleNextQuestion();
      } catch (error) {
        console.error('Erreur lors de la lecture du timeout:', error);
        handleNextQuestion();
      }
    } else {
      // Si pas d'audio, passer quand même à la question suivante
      setTimeout(() => handleNextQuestion(), 2000);
    }
  };

  const playFeedbackSound = (isCorrect: boolean) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (isCorrect) {
      // Son de succès (mélodie montante)
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // Do
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // Mi
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // Sol
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else {
      // Son d'échec (note descendante)
      oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // Sol
      oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.15); // Fa
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  const handleNextQuestion = async () => {
    // 1. D'abord annuler toute lecture en cours
    cancelReadingRef.current = true;
    
    // 2. Attendre que l'audio soit vraiment stoppé
    await audioServiceRef.stopSpeaking();
    
    // 3. Petit délai pour s'assurer que tout est nettoyé
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 4. Réinitialiser tous les états à zéro
    setSelectedOptionId(null);
    setStartTime(new Date());
    setQuestionStartTime(Date.now());
    setTimerStarted(false);
    setIsReadingQuestion(false);
    cancelReadingRef.current = false;
    
    // 5. Passer à la question suivante (déclenchera le useEffect qui relancera la lecture)
    nextQuestion();
  };

  if (!currentSession || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement du quiz...</p>
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex + 1) / currentSession.questions.length) * 100;
  const timePercentage = (timeRemaining / currentQuestion.timeLimit) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { audioServiceRef.stopSpeaking().catch(() => {}); navigate('/'); }}
              className="mr-2"
            >
              <Home className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1}/{currentSession.questions.length}
            </span>
            <Progress value={progressPercentage} className="w-32" />
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={isListening ? 'text-success' : ''}
            >
              {voiceEnabled && isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? <Volume2 /> : <VolumeX />}
            </Button>
          </div>
        </div>

        {/* Timer */}
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={`h-5 w-5 ${timeRemaining <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              <span className={`font-mono text-2xl font-bold ${timeRemaining <= 5 ? 'text-destructive' : ''}`}>
                {isReadingQuestion ? '⏸️' : `${timeRemaining}s`}
              </span>
              {isReadingQuestion && (
                <span className="text-xs text-muted-foreground ml-2">Lecture en cours...</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-xl font-bold text-primary">{currentSession.score}</p>
            </div>
          </div>
          <Progress 
            value={isReadingQuestion ? 100 : timePercentage} 
            className={`mt-2 ${timeRemaining <= 5 ? 'bg-destructive/20' : ''}`}
          />
        </Card>

        {/* Question */}
        <Card className="mb-6 p-8 text-center shadow-lg">
          <div className="mb-4">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {currentQuestion.type.toUpperCase()}
            </span>
            <span className="ml-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {currentQuestion.points} pts
            </span>
          </div>
          <h2 className="text-2xl font-bold md:text-3xl">
            {currentQuestion.question}
          </h2>
        </Card>

        {/* Options */}
        <div className="mb-6 grid gap-4 grid-cols-2">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const showCorrect = showFeedback && option.isCorrect;
            const showWrong = showFeedback && isSelected && !option.isCorrect;

            return (
              <Button
                key={option.id}
                variant={showCorrect ? 'default' : showWrong ? 'destructive' : 'outline'}
                size="lg"
                className={`h-auto min-h-[80px] whitespace-normal p-6 text-lg transition-all ${
                  showCorrect ? 'bg-gradient-success shadow-success' : ''
                } ${showWrong ? 'opacity-50' : ''}`}
                onClick={() => handleAnswer(option.id)}
                disabled={showFeedback}
              >
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex-1 text-left">{option.text}</span>
                  {showCorrect && <Check className="h-6 w-6 shrink-0" />}
                  {showWrong && <X className="h-6 w-6 shrink-0" />}
                </div>
              </Button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <Card className={`mb-6 p-6 ${lastAnswerCorrect ? 'border-success' : 'border-destructive'}`}>
            <div className="mb-4 text-center">
              <p className={`text-xl font-bold ${lastAnswerCorrect ? 'text-success' : 'text-destructive'}`}>
                {lastAnswerCorrect ? '✅ Bravo !' : '❌ Pas tout à fait'}
              </p>
            </div>
            {currentQuestion.explanation && (
              <p className="text-center text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            )}
            <Button
              variant="default"
              size="lg"
              className="mt-6 w-full"
              onClick={handleNextQuestion}
            >
              Question suivante
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Quiz;
