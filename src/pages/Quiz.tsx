/**
 * Page Quiz - Mode vocal hands-free avec AudioManager centralisé
 * 
 * CHANGEMENTS :
 * - Système de cancellation pour éviter les flux audio parallèles
 * - Boutons fonctionnent correctement (coupent la voix)
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Award,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuizStore } from '@/stores/useQuizStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { audioManager } from '@/services/AudioManager';
import { getRandomMessage, AUDIO_CONFIG, applyPhoneticPronunciation } from '@/config/audio.config';
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
  
  // ⬇️ NOUVEAU : Flag de cancellation pour arrêter les séquences audio
  const cancelTokenRef = useRef<number>(0);

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
    console.log('🎮 Quiz: Taking control of audio...');
    
    const stopGlobalListening = async () => {
      try {
        await audioManager.stopListening();
        console.log('🛑 Global listening stopped');
      } catch (error) {
        console.error('❌ Error stopping global listening:', error);
      }
    };

    stopGlobalListening();
    initializeQuiz();

    return () => {
      console.log('🧹 Quiz cleanup...');
      cancelTokenRef.current++; // Annuler toutes les séquences
      cleanup();
      audioManager.startListening();
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

      const storage = createStorageService();
      let questions: Question[] = [];

      if (category === 'mixte') {
        console.log('📚 Loading mixed questions...');
        const allQuestions = await storage.getQuestions();
        questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
        console.log('✅ Loaded', questions.length, 'questions');
      } else {
        questions = await storage.getQuestionsByCategory(
          category as Exclude<Category, 'mixte'>,
          parseInt(level || '1') as Level
        );
      }

      if (questions.length === 0) {
        console.error('❌ No questions found');
        navigate('/');
        return;
      }

      setQuizQuestions(questions);

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
      
      setIsLoading(false);

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

    // Capturer le token actuel
    const myToken = cancelTokenRef.current;

    try {
      console.log('🔊 === SPEAK QUESTION START ===');
      
      // Question
      const questionText = applyPhoneticPronunciation(currentQuestion.question);
      
      if (cancelTokenRef.current !== myToken) return;
      await audioManager.speak(questionText, { rate: 0.85 });
      
      if (cancelTokenRef.current !== myToken) return;
      await new Promise(r => setTimeout(r, 600));

      // Options - TOUT EN UN SEUL BLOC pour éviter les appels multiples
      if (cancelTokenRef.current !== myToken) return;
      
      const optionsText = currentQuestion.options
        .map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const optionText = applyPhoneticPronunciation(opt.text);
          return `Réponse ${letter}. ${optionText}`;
        })
        .join('. ... '); // Pause entre options
      
      console.log('📣 Speaking all options in one block');
      await audioManager.speak(optionsText, { rate: 0.9 });

      if (cancelTokenRef.current !== myToken) return;

      // Démarrer le STT
      console.log('🎮 Starting STT after speaking question...');
      await new Promise(r => setTimeout(r, 400));
      
      if (cancelTokenRef.current !== myToken) return;
      
      audioManager.onSpeech((transcript) => {
        handleVoiceCommand(transcript);
      });
      
      await audioManager.startListening();
      setTimerStarted(true);
      
      console.log('✅ === SPEAK QUESTION END ===');
    } catch (error) {
      console.error('❌ Error speaking question:', error);
    }
  };

  const handleAnswer = async (answer: string, questionAtClick?: Question) => {
    // Utiliser la question passée en paramètre OU le ref
    const question = questionAtClick || currentQuestionRef.current;
    
    if (selectedAnswerRef.current || !question) return;

    console.log('✅ ANSWER SELECTED:', answer, 'for question:', question.question.substring(0, 30));

    // CRITIQUE : Annuler toutes les séquences en cours + stopper audio
    cancelTokenRef.current++;
    const myToken = cancelTokenRef.current;
    
    setTimerStarted(false);
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    
    setSelectedAnswer(answer);

    const correctOption = question.options.find(o => o.isCorrect);
    const correct = answer.toLowerCase().trim() === correctOption?.text.toLowerCase().trim();
    
    console.log('🎯 Correct answer:', correctOption?.text, '| User answer:', answer, '| Is correct:', correct);

    submitAnswer({
      questionId: question.id,
      selectedAnswer: answer,
      isCorrect: correct,
      timeSpent: (question.timeLimit - timeLeft) * 1000,
    });

    // Feedback EN UN SEUL BLOC
    if (cancelTokenRef.current !== myToken) return;
    
    let feedbackText: string;
    if (correct) {
      feedbackText = getRandomMessage(AUDIO_CONFIG.messages.correct);
    } else {
      // Le message incorrect contient déjà "C'était :" ou "La réponse était :"
      const incorrectMsg = getRandomMessage(AUDIO_CONFIG.messages.incorrect);
      const correctIndex = question.options.findIndex(o => o.isCorrect);
      const correctLetter = String.fromCharCode(65 + correctIndex);
      const correctText = applyPhoneticPronunciation(correctOption?.text || '');
      // Format: "Raté ! C'était : A, Madonna"
      feedbackText = `${incorrectMsg} ${correctLetter}, ${correctText}`;
    }
    
    // Ajouter l'explication si présente
    if (question.explanation) {
      const explanationText = applyPhoneticPronunciation(question.explanation);
      feedbackText += `. ${explanationText}`;
    }
    
    // Ajouter "Question suivante" à la fin
    feedbackText += `. ... Question suivante.`;
    
    await audioManager.speak(feedbackText, { rate: 0.9 });

    if (cancelTokenRef.current !== myToken) return;

    // Auto-advance après que le feedback soit terminé
    handleNextQuestion();
  };

  const handleNextQuestion = async () => {
    // ⬇️ Annuler les séquences précédentes
    cancelTokenRef.current++;
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= quizQuestions.length) {
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
    setTimerStarted(false);
  };

  const handleTimeUp = async () => {
    if (selectedAnswer) return;

    console.log('⏱️ TIME UP');

    cancelTokenRef.current++;
    const myToken = cancelTokenRef.current;
    
    setTimerStarted(false);
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    
    setSelectedAnswer('timeout');

    if (!currentQuestion) return;

    submitAnswer({
      questionId: currentQuestion.id,
      selectedAnswer: '',
      isCorrect: false,
      timeSpent: currentQuestion.timeLimit * 1000,
    });

    if (cancelTokenRef.current !== myToken) return;

    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const correctIndex = currentQuestion.options.findIndex(o => o.isCorrect);
    const correctLetter = String.fromCharCode(65 + correctIndex);
    const correctText = applyPhoneticPronunciation(correctOption?.text || '');

    // Feedback en un seul bloc
    let feedbackText = `Temps écoulé ! La bonne réponse était ${correctLetter}, ${correctText}`;
    
    if (currentQuestion.explanation) {
      const explanationText = applyPhoneticPronunciation(currentQuestion.explanation);
      feedbackText += `. ${explanationText}`;
    }
    
    feedbackText += `. ... Question suivante.`;

    await audioManager.speak(feedbackText, { rate: 0.9 });

    if (cancelTokenRef.current !== myToken) return;

    handleNextQuestion();
  };

  const handleGoHome = async () => {
    cancelTokenRef.current++;
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
    console.log('🎤 Quiz heard:', text);
    
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

    if (!selectedAnswer && currentQuestion) {
      const letterMap: Record<string, number> = {
        'a': 0, 'alpha': 0, 'ah': 0,
        'b': 1, 'bé': 1, 'beta': 1, 'bê': 1,
        'c': 2, 'cé': 2, 'sé': 2, 'cê': 2, 'se': 2,
        'd': 3, 'dé': 3, 'delta': 3, 'dê': 3
      };

      const firstWord = text.split(/\s+/)[0];
      const letterIndex = letterMap[firstWord];

      if (letterIndex !== undefined && currentQuestion.options[letterIndex]) {
        console.log(`✅ Letter detected: ${firstWord} → Option ${letterIndex}`);
        handleAnswer(currentQuestion.options[letterIndex].text, currentQuestion);
        return;
      }
      
      const matchedOption = currentQuestion.options.find(opt => {
        const optionText = opt.text.toLowerCase();
        return text.includes(optionText);
      });
      
      if (matchedOption) {
        console.log('✅ Answer detected:', matchedOption.text);
        handleAnswer(matchedOption.text, currentQuestion);
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
                  onClick={() => !selectedAnswer && handleAnswer(option.text, currentQuestion)}
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
