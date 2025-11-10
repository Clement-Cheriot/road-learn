/**
 * Page Quiz - Mode vocal hands-free
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Award,
  Volume2,
  VolumeX,
  SkipForward,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuizStore } from '@/stores/useQuizStore';
import { useUserStore } from '@/stores/useUserStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { createSpeechService } from '@/services/speech/SpeechServiceFactory';
import { addVoiceLog } from '@/components/VoiceDebugPanel'; // ⬅️ AJOUTÉ
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
  const { progress } = useUserStore();

  // States
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isReadingQuestion, setIsReadingQuestion] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const audioServiceRef = useRef(createAudioService());
  const speechServiceRef = useRef(createSpeechService());
  const cancelReadingRef = useRef(false);
  const autoAdvanceTimerRef = useRef<any>(null);
  const currentQuestionRef = useRef<Question | null>(null);
  const selectedAnswerRef = useRef<string | null>(null); // ⬅️ AJOUTER
  const handleAnswerRef = useRef<(answer: string) => void>(); // ⬅️ AJOUTER
  const handleNextQuestionRef = useRef<() => void>(); // ⬅️ AJOUTER
  const handleGoHomeRef = useRef<() => void>(); // ⬅️ AJOUTER

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
      console.log('Category:', category, 'Level:', level);

      // Charger les questions
      const storage = createStorageService();
      let questions: Question[] = [];

      if (category === 'mixte') {
        console.log('📚 Loading mixed questions...');
        const allQuestions = await storage.getQuestions();
        questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
      } else {
        console.log(`📚 Loading questions for ${category}, level ${level}...`);
        questions = await storage.getQuestionsByCategory(
          category as Exclude<Category, 'mixte'>,
          parseInt(level || '1') as Level
        );
      }

      console.log(`✅ Loaded ${questions.length} questions`);

      if (questions.length === 0) {
        console.error('❌ No questions found');
        navigate('/');
        return;
      }

      setQuizQuestions(questions);

      // Créer et démarrer la session
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
      console.log('✅ Quiz session started');

      // Vérifier disponibilité audio
      const audioAvailable = await audioServiceRef.current.isAvailable();
      setAudioEnabled(audioAvailable);
      console.log('🔊 Audio available:', audioAvailable);

      // Initialiser reconnaissance vocale
      try {
        console.log('🎤 Initializing speech recognition...');

        // FORCER l'arrêt complet avant de démarrer
        console.log('🛑 Forcing complete stop of any existing recognition...');
        try {
          await speechServiceRef.current.stopListening();
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (e) {
          console.log('No recognition to stop');
        }

        // Vérifier disponibilité
        const speechAvailable = await speechServiceRef.current.isAvailable();
        console.log('🎤 Speech recognition available:', speechAvailable);

        if (speechAvailable) {
          // ⬇️ HANDLER DYNAMIQUE pour reconnaissance vocale
          speechServiceRef.current.onResult((result) => {
            if (!result.isFinal) return;

            const transcript = result.transcript.toLowerCase().trim();
            console.log('🎤 Quiz voice input:', transcript);
            addVoiceLog('heard', transcript);

            console.log(
              '🔍 Current question:',
              currentQuestionRef.current?.question
            );
            console.log('🔍 Selected answer:', selectedAnswer);
            console.log(
              '🔍 Current question options:',
              currentQuestionRef.current?.options.map((o) => o.text)
            );

            // ⬇️ Chercher une commande correspondante (dynamique)
            const currentCommands = generateVoiceCommands();
            console.log('🔍 Generated commands count:', currentCommands.length);
            console.log(
              '🔍 Command keywords:',
              currentCommands.map((c) => c.keywords).flat()
            );

            const matchedCommand = currentCommands.find((cmd) =>
              cmd.keywords.some((keyword) =>
                transcript.includes(keyword.toLowerCase())
              )
            );

            if (matchedCommand) {
              console.log('✅ Quiz command matched!');
              addVoiceLog('action', `Action: ${transcript}`);
              matchedCommand.action();
            } else {
              console.log('⚠️ No quiz command matched:', transcript);
              addVoiceLog('heard', `Pas de commande: ${transcript}`);
            }
          });

          await speechServiceRef.current.startListening({ language: 'fr-FR' });
          console.log('✅ Speech recognition started');
        }
      } catch (error) {
        console.error('❌ Error starting speech recognition:', error);
      }

      setIsLoading(false);
      console.log('✅ === QUIZ INITIALIZATION END ===\n');
    } catch (error) {
      console.error('❌ Error initializing quiz:', error);
      navigate('/');
    }
  };

  // ⬇️ FONCTION pour générer les commandes dynamiquement
  const generateVoiceCommands = () => {
    const commands = [
      {
        keywords: [
          'suivante',
          'suivant',
          'next',
          'passe',
          'skip',
          'question suivante',
        ],
        action: () => {
          console.log('🎤 === VOICE COMMAND: NEXT QUESTION ===');
          if (selectedAnswerRef.current) {
            handleNextQuestionRef.current?.();
          }
        },
      },
      {
        keywords: ['retour', 'retour menu', 'menu', 'accueil', 'home'],
        action: () => {
          console.log('🎤 === VOICE COMMAND: GO HOME ===');
          handleGoHomeRef.current?.();
        },
      },
    ];

    // ⬇️ Ajouter les réponses de la question actuelle
    const question = currentQuestionRef.current; // ⬅️ Utiliser la ref
    if (question && !selectedAnswerRef.current) {
      console.log(
        '🎯 Generating answer commands for:',
        question.options.map((o) => o.text)
      );
      question.options.forEach((option) => {
        commands.push({
          keywords: [option.text.toLowerCase()],
          action: () => {
            console.log(`🎤 === VOICE COMMAND: ANSWER ${option.text} ===`);
            handleAnswerRef.current?.(option.text);
          },
        });
      });
    }

    return commands;
  };

  const cleanup = async () => {
    console.log('🧹 Cleaning up quiz...');
    cancelReadingRef.current = true;

    // Annuler le timer d'auto-advance
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    try {
      await audioServiceRef.current.stopSpeaking();
      await speechServiceRef.current.stopListening();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const speakQuestion = async () => {
    if (!currentQuestion || !audioEnabled) return;

    try {
      console.log('🔊 === SPEAK QUESTION START ===');

      // STOP complet avant de commencer
      console.log('🛑 Stopping any previous speech...');
      cancelReadingRef.current = true;
      await audioServiceRef.current.stopSpeaking();
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log('🔊 Starting new question speech');
      setIsReadingQuestion(true);
      cancelReadingRef.current = false;

      // Question
      if (cancelReadingRef.current) {
        console.log('⚠️ Reading cancelled (question)');
        return;
      }
      console.log('📣 Speaking question:', currentQuestion.question);
      await audioServiceRef.current.speak(currentQuestion.question, {
        rate: 0.75,
      });

      // Pause
      if (cancelReadingRef.current) {
        console.log('⚠️ Reading cancelled (pause)');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Options
      console.log('📣 Speaking options...');
      for (const option of currentQuestion.options) {
        if (cancelReadingRef.current) {
          console.log('⚠️ Reading cancelled (option)');
          return;
        }
        const textToSpeak = option.text;
        console.log('📣 Speaking option:', textToSpeak);
        await audioServiceRef.current.speak(textToSpeak, { rate: 0.75 });
        if (cancelReadingRef.current) {
          console.log('⚠️ Reading cancelled (between options)');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      // Démarrer le timer
      setIsReadingQuestion(false);
      setTimerStarted(true);
      console.log('✅ === SPEAK QUESTION END ===');
    } catch (error) {
      console.error('❌ Erreur lecture question:', error);
      setIsReadingQuestion(false);
      setTimerStarted(true);
    }
  };

  const handleNextQuestion = async () => {
    console.log('\n🎯 === HANDLE NEXT QUESTION START ===');

    // Annuler l'auto-advance timer
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // STOP complet avant de changer de question
    console.log('🛑 Cancelling current reading...');
    cancelReadingRef.current = true;
    setIsReadingQuestion(true);
    setTimerStarted(false);

    // Arrêter l'audio
    console.log('🛑 Stopping audio service...');
    await audioServiceRef.current.stopSpeaking();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // CRITIQUE : Arrêter et redémarrer la reconnaissance pour reset le buffer
    console.log('🔄 Restarting speech recognition to clear buffer...');
    try {
      await speechServiceRef.current.stopListening();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await speechServiceRef.current.startListening({ language: 'fr-FR' });
      console.log('✅ Speech recognition restarted successfully');
    } catch (error) {
      console.error('❌ Error restarting speech recognition:', error);
    }

    const nextIndex = currentQuestionIndex + 1;
    console.log(
      `📊 Current index: ${currentQuestionIndex}, Next: ${nextIndex}, Total: ${quizQuestions.length}`
    );

    if (nextIndex >= quizQuestions.length) {
      // Quiz terminé
      console.log('🏁 Quiz completed!');
      await audioServiceRef.current.speak('Quiz terminé ! Bravo !');
      setTimeout(() => {
        endSession();
        navigate('/results');
      }, 2000);
      return;
    }

    console.log('➡️ Moving to next question...');
    setCurrentQuestionIndex(nextIndex);
    setSelectedAnswer(null);
    setTimeLeft(30);

    // ⬇️ NE PAS appeler speakQuestion ici, le useEffect le fera
    console.log('✅ === HANDLE NEXT QUESTION END (useEffect will speak) ===\n');
  };

  // Mettre à jour la ref
  useEffect(() => {
    handleNextQuestionRef.current = handleNextQuestion;
  });

  const handleAnswer = async (answer: string) => {
    if (selectedAnswerRef.current || !currentQuestionRef.current) return;

    const currentQuestion = currentQuestionRef.current;

    console.log('\n💬 === HANDLE ANSWER START ===');
    console.log('Selected answer:', answer);
    console.log(
      'Correct answer:',
      currentQuestion.options.find((o) => o.isCorrect)?.text
    );

    // Annuler l'auto-advance timer s'il existe
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // Stop audio pendant traitement réponse
    console.log('🛑 Stopping audio before feedback...');
    cancelReadingRef.current = true;
    await audioServiceRef.current.stopSpeaking();
    await new Promise((resolve) => setTimeout(resolve, 200));

    setTimerStarted(false);
    setSelectedAnswer(answer);

    const correctOption = currentQuestion.options.find((o) => o.isCorrect);
    const correct =
      answer.toLowerCase().trim() === correctOption?.text.toLowerCase().trim();
    const points = correct ? currentQuestion.points || 20 : 0;

    console.log(
      `Result: ${correct ? '✅ Correct' : '❌ Incorrect'}, Points: ${points}`
    );

    submitAnswer({
      questionId: currentQuestion.id,
      selectedAnswer: answer,
      isCorrect: correct,
      timeSpent: (currentQuestion.timeLimit - timeLeft) * 1000,
    });

    // Feedback audio
    console.log('📣 Speaking feedback...');
    if (correct) {
      await audioServiceRef.current.speak('Bravo ! Bonne réponse.', {
        rate: 0.75,
      });
    } else {
      await audioServiceRef.current.speak(
        `Incorrect. La bonne réponse était ${correctOption?.text}`,
        { rate: 0.75 }
      );
    }

    // Explication si elle existe
    if (currentQuestion.explanation) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await audioServiceRef.current.speak(currentQuestion.explanation, {
        rate: 0.75,
      });
    }

    // Annoncer "Question suivante"
    await new Promise((resolve) => setTimeout(resolve, 500));
    await audioServiceRef.current.speak('Question suivante', { rate: 0.75 });

    console.log('✅ === HANDLE ANSWER END ===\n');

    // Auto-avancer après 500ms
    console.log('⏱️ Auto-advance scheduled in 0.5s...');
    autoAdvanceTimerRef.current = setTimeout(() => {
      console.log('⏱️ Auto-advance triggered');
      handleNextQuestionRef.current?.();
    }, 500);
  };

  // Mettre à jour la ref
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  });

  const handleTimeUp = async () => {
    if (selectedAnswer) return;

    console.log('⏰ TIME UP!');

    // Annuler l'auto-advance timer s'il existe
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setTimerStarted(false);
    setSelectedAnswer('timeout');

    if (!currentQuestion) return;

    submitAnswer({
      questionId: currentQuestion.id,
      selectedAnswer: '',
      isCorrect: false,
      timeSpent: currentQuestion.timeLimit * 1000,
    });

    const correctOption = currentQuestion.options.find((o) => o.isCorrect);

    if (audioEnabled) {
      await audioServiceRef.current.speak(
        `Temps écoulé ! La bonne réponse était ${correctOption?.text}`,
        { rate: 0.75 }
      );

      // Explication
      if (currentQuestion.explanation) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await audioServiceRef.current.speak(currentQuestion.explanation, {
          rate: 0.75,
        });
      }

      // Annoncer "Question suivante"
      await new Promise((resolve) => setTimeout(resolve, 500));
      await audioServiceRef.current.speak('Question suivante', { rate: 0.75 });
    }

    // Auto-avancer après 500ms
    autoAdvanceTimerRef.current = setTimeout(() => {
      handleNextQuestionRef.current?.();
    }, 500);
  };

  const handleGoHome = async () => {
    console.log('🏠 Going back to home...');
    await cleanup();
    resetQuiz();
    navigate('/');
  };

  // Mettre à jour la ref
  useEffect(() => {
    handleGoHomeRef.current = handleGoHome;
  });

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (!audioEnabled) {
      speakQuestion();
    } else {
      cancelReadingRef.current = true;
      audioServiceRef.current.stopSpeaking();
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

  const quizProgress =
    ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

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
            {selectedAnswer && (
              <Button variant="ghost" size="sm" onClick={handleNextQuestion}>
                <SkipForward className="mr-2 h-4 w-4" />
                Suivante
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={toggleAudio}>
              {audioEnabled ? (
                <Volume2 className="h-4 w-4 text-success" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
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
