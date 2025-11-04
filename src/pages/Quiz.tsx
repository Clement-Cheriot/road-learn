/**
 * Page Quiz - Moteur de jeu principal
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, Volume2, VolumeX, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuizStore } from '@/stores/useQuizStore';
import { useUserStore } from '@/stores/useUserStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
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
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());

  useEffect(() => {
    if (category) {
      initializeQuiz(category);
    }
  }, [category]);

  useEffect(() => {
    if (currentSession?.isComplete) {
      navigate('/results');
    }
  }, [currentSession?.isComplete]);

  useEffect(() => {
    if (!showFeedback && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }

    if (timeRemaining === 0 && !showFeedback) {
      handleTimeout();
    }
  }, [timeRemaining, showFeedback]);

  useEffect(() => {
    if (currentQuestion && audioEnabled) {
      speakQuestion();
    }
  }, [currentQuestion]);

  const initializeQuiz = async (cat: Category) => {
    try {
      const storage = createStorageService();
      const questions = await storage.getQuestionsByCategory(cat);
      
      // Sélectionner 5 questions aléatoires
      const selectedQuestions = questions
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

    const audio = createAudioService();
    try {
      await audio.speak(currentQuestion.question);
      
      // Lire les options après une pause
      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (const option of currentQuestion.options) {
        await audio.speak(`Option ${option.id}: ${option.text}`);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
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
      const audio = createAudioService();
      await audio.speak(option.isCorrect ? 'Bravo ! Bonne réponse.' : 'Pas tout à fait.');
      
      if (currentQuestion.explanation) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await audio.speak(currentQuestion.explanation);
      }
    }

    // Mettre à jour les stats utilisateur
    if (category && progress) {
      updateCategoryStats(category, option.isCorrect);
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
      const audio = createAudioService();
      await audio.speak('Temps écoulé !');
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionId(null);
    setStartTime(new Date());
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
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1}/{currentSession.questions.length}
            </span>
            <Progress value={progressPercentage} className="w-32" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 /> : <VolumeX />}
          </Button>
        </div>

        {/* Timer */}
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={`h-5 w-5 ${timeRemaining < 10 ? 'text-destructive' : 'text-primary'}`} />
              <span className="font-mono text-2xl font-bold">{timeRemaining}s</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-xl font-bold text-primary">{currentSession.score}</p>
            </div>
          </div>
          <Progress 
            value={timePercentage} 
            className={`mt-2 ${timeRemaining < 10 ? 'bg-destructive/20' : ''}`}
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
