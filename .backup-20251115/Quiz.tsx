/**
 * Page Quiz - Mode vocal hands-free avec AudioManager centralisé
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Award,
  Volume2,
  VolumeX,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuizStore } from '@/stores/useQuizStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { audioManager } from '@/services/AudioManager';
import { getRandomMessage, AUDIO_CONFIG } from '@/config/audio.config';
import type {
  Question,
  Category,
  Level,
  QuizSession,
} from '@/types/quiz.types';

const Quiz = () => {
  const navigate = useNavigate();
  const { category, level } = useParams<{ category: string; level: string }>();
  const { currentSession, startSession, submitAnswer, endSession, resetQuiz } =
    useQuizStore();

  // States
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const currentQuestionRef = useRef<Question | null>(null);
  const selectedAnswerRef = useRef<string | null>(null);

  const currentQuestion = quizQuestions[currentQuestionIndex];

  // Mettre à jour les refs
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);

  // Initialisation
  useEffect(() => {
    initializeQuiz();
    return () => {
      cleanup();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!timerStarted || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, timeLeft]);

  // Parler la question au changement
  useEffect(() => {
    if (currentQuestion && !isLoading) {
      speakQuestion();
    }
  }, [currentQuestionIndex, isLoading]);

  const initializeQuiz = async () => {
    try {
      console.log('🎮 === QUIZ INITIALIZATION START ===');

      // Charger les questions
      const storage = createStorageService();
      let questions: Question[] = [];

      if (category === 'mixte') {
        const allQuestions = await storage.getQuestions();
        questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
      } else {
        questions = await storage.getQuestionsByCategory(
          category as Exclude<Category, 'mixte'>,
          parseInt(level || '1') as Level
        );
      }

      if (questions.length === 0) {
        navigate('/');
        return;
      }

      setQuizQuestions(questions);

      // Créer session
      const session: QuizSession = {
        id: `quiz_${Date.now()}`,
        category: category as Category,
        level: parseInt(level || '1') as Level,
        questions: questions,
        startedAt: new Date(),
        score: 0,
        maxScore: questions.reduce((sum, q) => sum + (q.points || 20), 0),
        isComplete: false,
      };

      startSession(session);
      setIsLoading(false);

      // Démarrer l'écoute (AudioManager gère tout)
      await audioManager.startListening();

      // Handler commandes vocales
      audioManager.onSpeech((transcript) => {
        handleVoiceCommand(transcript);
      });

      console.log('✅ === QUIZ INITIALIZATION END ===');
    } catch (error) {
      console.error('❌ Error initializing quiz:', error);
      navigate('/');
    }
  };

  const speakQuestion = async () => {
    if (!currentQuestion) return;

    try {
      // AudioManager gère automatiquement pause/resume STT
      
      // Question
      await audioManager.speak(currentQuestion.question, { rate: 0.85 });
      await new Promise(r => setTimeout(r, 800));

      // Options
      await audioManager.speak('Voici les options', { rate: 0.9 });
      
      for (let i = 0; i < currentQuestion.options.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        await audioManager.speak(
          `Option ${String.fromCharCode(65 + i)}. ${currentQuestion.options[i].text}`,
          { rate: 0.85 }
        );
      }

      setTimerStarted(true);
      console.log('✅ Question read, STT automatically resumed');
    } catch (error) {
      console.error('❌ Error speaking question:', error);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (selectedAnswerRef.current || !currentQuestionRef.current) return;

    const question = currentQuestionRef.current;

    setTimerStarted(false);
    setSelectedAnswer(answer);

    const correctOption = question.options.find(o => o.isCorrect);
    const correct = answer.toLowerCase().trim() === correctOption?.text.toLowerCase().trim();

    submitAnswer({
      questionId: question.id,
      selectedAnswer: answer,
      isCorrect: correct,
      timeSpent: (question.timeLimit - timeLeft) * 1000,
    });

    // Feedback (AudioManager gère pause STT)
    if (correct) {
      const message = getRandomMessage(AUDIO_CONFIG.messages.correct);
      await audioManager.speak(message, { rate: 1.1 });
    } else {
      const message = getRandomMessage(AUDIO_CONFIG.messages.incorrect);
      await audioManager.speak(message, { rate: 0.9 });
      await new Promise(r => setTimeout(r, 300));
      await audioManager.speak(correctOption?.text || '', { rate: 0.85 });
    }

    // Explication
    if (question.explanation) {
      await new Promise(r => setTimeout(r, 500));
      await audioManager.speak(question.explanation, { rate: 0.85 });
    }

    // Annoncer "Question suivante"
    await new Promise(r => setTimeout(r, 500));
    await audioManager.speak('Question suivante', { rate: 0.85 });

    // Auto-advance
    setTimeout(() => {
      handleNextQuestion();
    }, 1000);
  };

  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= quizQuestions.length) {
      // Quiz terminé
      await audioManager.speak('Quiz terminé ! Bravo !');
      setTimeout(() => {
        endSession();
        navigate('/results');
      }, 2000);
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setSelectedAnswer(null);
    setTimeLeft(30);
  };

  const handleTimeUp = async () => {
    if (selectedAnswer) return;

    setTimerStarted(false);
    setSelectedAnswer('timeout');

    if (!currentQuestion) return;

    submitAnswer({
      questionId: currentQuestion.id,
      selectedAnswer: '',
      isCorrect: false,
      timeSpent: currentQuestion.timeLimit * 1000,
    });

    const correctOption = currentQuestion.options.find(o => o.isCorrect);

    await audioManager.speak(
      `Temps écoulé ! La bonne réponse était ${correctOption?.text}`,
      { rate: 0.85 }
    );

    if (currentQuestion.explanation) {
      await new Promise(r => setTimeout(r, 500));
      await audioManager.speak(currentQuestion.explanation, { rate: 0.85 });
    }

    await new Promise(r => setTimeout(r, 500));
    await audioManager.speak('Question suivante', { rate: 0.85 });

    setTimeout(() => {
      handleNextQuestion();
    }, 1000);
  };

  const handleGoHome = async () => {
    await cleanup();
    resetQuiz();
    navigate('/');
  };

  const cleanup = async () => {
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
  };

  const handleVoiceCommand = (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    
    // Commandes navigation
    if (text.includes('retour') || text.includes('menu')) {
      handleGoHome();
      return;
    }
    
    if (text.includes('suivant') || text.includes('next')) {
      if (selectedAnswer) {
        handleNextQuestion();
      }
      return;
    }

    // Réponses (si pas encore répondu)
    if (!selectedAnswer && currentQuestion) {
      const matchedOption = currentQuestion.options.find(opt =>
        text.includes(opt.text.toLowerCase())
      );
      
      if (matchedOption) {
        handleAnswer(matchedOption.text);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-lg text-muted-foreground">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const quizProgress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
  const { isListening } = audioManager.getState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8 pt-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleGoHome}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quitter
          </Button>

          <div className="flex items-center gap-2">
            {/* Indicateur micro */}
            <div className="flex items-center gap-2 text-sm">
              {isListening ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-muted-foreground">Écoute...</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">En lecture...</span>
                </>
              )}
            </div>

            {selectedAnswer && (
              <Button variant="ghost" size="sm" onClick={handleNextQuestion}>
                <SkipForward className="mr-2 h-4 w-4" />
                Suivante
              </Button>
            )}
          </div>
        </div>

        {/* Progression */}
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Question {currentQuestionIndex + 1} / {quizQuestions.length}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeLeft}s
              </span>
              <span className="flex items-center gap-1 text-primary">
                <Award className="h-3 w-3" />
                {currentSession?.score || 0}
              </span>
            </div>
          </div>
          <Progress value={quizProgress} className="h-2" />
        </Card>

        {/* Question */}
        <Card className="mb-4 p-6">
          <h2 className="mb-6 text-center text-xl font-bold leading-tight">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option.text;
              const isCorrect = option.isCorrect;
              const showResult = selectedAnswer !== null;

              return (
                <Button
                  key={index}
                  variant={
                    showResult
                      ? isCorrect
                        ? 'default'
                        : isSelected
                          ? 'destructive'
                          : 'outline'
                      : 'outline'
                  }
                  className={`h-auto min-h-[3rem] w-full justify-start px-4 py-3 text-left text-base ${
                    !showResult ? 'hover:border-primary hover:bg-primary/5' : ''
                  }`}
                  onClick={() => !selectedAnswer && handleAnswer(option.text)}
                  disabled={selectedAnswer !== null}
                >
                  <span className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold">
                    {['A', 'B', 'C', 'D'][index]}
                  </span>
                  <span className="flex-1">{option.text}</span>
                  {showResult && isCorrect && <span className="ml-2">✓</span>}
                  {showResult && isSelected && !isCorrect && (
                    <span className="ml-2">✗</span>
                  )}
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Explication */}
        {selectedAnswer && currentQuestion.explanation && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              💡 {currentQuestion.explanation}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Quiz;
