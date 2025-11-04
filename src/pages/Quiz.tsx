/**
 * Page Quiz - Moteur de jeu principal
 */

import { useEffect, useState, useMemo } from 'react';
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
import type { Category, Question, QuizSession, UserAnswer } from '@/types/quiz.types';

const Quiz = () => {
  const { category } = useParams<{ category: Category }>();
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
  const [isReadingQuestion, setIsReadingQuestion] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const audioServiceRef = useState(() => createAudioService())[0];

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

  // Arrêter l'audio lors du démontage
  useEffect(() => {
    return () => {
      audioServiceRef.stopSpeaking().catch(() => {});
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
      speakQuestion();
    } else if (currentQuestion && !audioEnabled) {
      // Si pas d'audio, démarrer le timer immédiatement
      setTimerStarted(true);
      setIsReadingQuestion(false);
    }
  }, [currentQuestion, audioEnabled]);

  // Sons du timer
  useTimerSounds(timeRemaining, timerStarted && !showFeedback);

  // Commandes vocales
  const voiceCommands = useMemo(() => {
    const commands: Array<{ keywords: string[]; action: () => void | Promise<void> }> = [];

    // Commandes globales toujours actives
    commands.push({ keywords: ['retour', 'menu', 'accueil', 'retour menu'], action: () => {
      audioServiceRef.stopSpeaking().catch(() => {});
      navigate('/');
    } });
    commands.push({
      keywords: ['stop lecture', 'arrête la lecture', 'silence'],
      action: async () => {
        try { await audioServiceRef.stopSpeaking(); } catch {}
        // Si on arrêtait la lecture de la question, démarrer le timer
        if (isReadingQuestion && !showFeedback) {
          setIsReadingQuestion(false);
          setTimerStarted(true);
        }
      },
    });
    commands.push({
      keywords: ['répète', 'répéter', 'redis', 'encore'],
      action: async () => {
        try { await audioServiceRef.stopSpeaking(); } catch {}
        await speakQuestion();
      },
    });

    // Suivant
    commands.push({
      keywords: ['suivant', 'suivante', 'continue', 'continuer', 'next'],
      action: () => {
        audioServiceRef.stopSpeaking().catch(() => {});
        if (showFeedback) return handleNextQuestion();
        if (isReadingQuestion) {
          // Arrêter la lecture et démarrer le timer
          setIsReadingQuestion(false);
          setTimerStarted(true);
        }
      },
    });

    // Réponses lorsque la question est affichée et pas de feedback
    if (currentQuestion && !showFeedback && !isReadingQuestion) {
      currentQuestion.options.forEach((option) => {
        commands.push({ keywords: [option.id, `option ${option.id}`, `réponse ${option.id}`], action: () => handleAnswer(option.id) });
      });
    }

    return commands;
  }, [currentQuestion, showFeedback, isReadingQuestion]);

  const { isListening } = useVoiceCommands(voiceCommands, voiceEnabled);

  const initializeQuiz = async (cat: Category) => {
    try {
      const storage = createStorageService();
      let allQuestions: Question[] = [];

      // Si catégorie "mixte", charger toutes les questions
      if (cat === 'mixte') {
        const categories: Category[] = ['histoire', 'geographie', 'sciences'];
        for (const category of categories) {
          const questions = await storage.getQuestionsByCategory(category);
          allQuestions = [...allQuestions, ...questions];
        }
      } else {
        allQuestions = await storage.getQuestionsByCategory(cat);
      }
      
      // Sélectionner 5 questions aléatoires
      const selectedQuestions = allQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      const session: QuizSession = {
        id: `session_${Date.now()}`,
        category: cat,
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
      // Arrêter toute lecture en cours
      await audioServiceRef.stopSpeaking();
      
      await audioServiceRef.speak(currentQuestion.question);
      
      // Lire les options après une pause
      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (const option of currentQuestion.options) {
        await audioServiceRef.speak(`Option ${option.id}: ${option.text}`);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      // Démarrer le timer APRÈS la lecture complète
      setIsReadingQuestion(false);
      setTimerStarted(true);
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      // Démarrer le timer même en cas d'erreur
      setIsReadingQuestion(false);
      setTimerStarted(true);
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (!currentQuestion || showFeedback) return;

    setSelectedOptionId(optionId);
    const option = currentQuestion.options.find(o => o.id === optionId);
    if (!option) return;

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
      isCorrect: option.isCorrect,
      timeSpent: Date.now() - startTime.getTime(),
      answeredAt: new Date(),
    };

    submitAnswer(answer);

    // Feedback audio
    if (audioEnabled) {
      await audioServiceRef.speak(option.isCorrect ? 'Bravo ! Bonne réponse.' : 'Pas tout à fait.');
      
      if (currentQuestion.explanation) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await audioServiceRef.speak(currentQuestion.explanation);
      }
    }

    // Mettre à jour les stats utilisateur
    if (currentQuestion && progress) {
      const questionCategory = currentQuestion.category as Category;
      updateCategoryStats(questionCategory, option.isCorrect);
      if (option.isCorrect) {
        updateXP(currentQuestion.points);
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
      await audioServiceRef.speak('Temps écoulé !');
    }
  };

  const handleNextQuestion = () => {
    audioServiceRef.stopSpeaking().catch(() => {});
    setSelectedOptionId(null);
    setStartTime(new Date());
    setTimerStarted(false);
    setIsReadingQuestion(false);
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
              onClick={() => navigate('/')}
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
        <div className={`mb-6 grid gap-4 ${currentQuestion.type === 'duo' ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
