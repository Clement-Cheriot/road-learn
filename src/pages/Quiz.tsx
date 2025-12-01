/**
 * Quiz - Pipeline audio avec pré-génération parallèle
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Award, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuizStore } from '@/stores/useQuizStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { audioManager } from '@/services/AudioManager';
import { getRandomMessage, AUDIO_CONFIG, applyPhoneticPronunciation } from '@/config/audio.config';
import type { Question, Category, Level, QuizSession } from '@/types/quiz.types';

// Helpers hors composant
const keyQ = (i: number) => `q${i}_q`;
const keyO = (qi: number, oi: number) => `q${qi}_o${oi}`;
const keyOk = (i: number) => `q${i}_ok`;
const keyKo = (i: number) => `q${i}_ko`;
const keyExp = (i: number) => `q${i}_exp`;
const keyNext = () => `next`;

const Quiz = () => {
  const navigate = useNavigate();
  const { category, level } = useParams<{ category: string; level: string }>();
  const { currentSession, startSession, submitAnswer, endSession, resetQuiz } = useQuizStore();

  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentQuestionRef = useRef<Question | null>(null);
  const selectedAnswerRef = useRef<string | null>(null);
  const cancelTokenRef = useRef(0);
  const generatingRef = useRef<Set<string>>(new Set());
  const quizStartTimeRef = useRef(0);
  const voiceDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');

  const currentQuestion = quizQuestions[currentQuestionIndex];

  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);

  // ===== INIT =====
  useEffect(() => {
    audioManager.stopListening();
    
    const gen = (cacheKey: string | undefined, text: string | undefined) => {
      if (!cacheKey || !text) return;
      if (generatingRef.current.has(cacheKey)) return;
      generatingRef.current.add(cacheKey);
      audioManager.pregenerate(text, cacheKey);
    };

    const buildSeg = (q: Question, qi: number) => {
      const questionText = applyPhoneticPronunciation(q.question);
      const options = q.options.map((opt, i) => ({
        key: keyO(qi, i),
        text: `Réponse ${String.fromCharCode(65 + i)}. ${applyPhoneticPronunciation(opt.text)}`
      }));
      const correctIdx = q.options.findIndex(o => o.isCorrect);
      const correctLetter = String.fromCharCode(65 + correctIdx);
      const correctText = applyPhoneticPronunciation(q.options[correctIdx]?.text || '');
      return {
        question: { key: keyQ(qi), text: questionText },
        options,
        feedbackOk: { key: keyOk(qi), text: getRandomMessage(AUDIO_CONFIG.messages.correct) },
        feedbackKo: { key: keyKo(qi), text: `${getRandomMessage(AUDIO_CONFIG.messages.incorrect)} ${correctLetter}, ${correctText}` },
        explanation: q.explanation ? { key: keyExp(qi), text: applyPhoneticPronunciation(q.explanation) } : null,
        next: { key: keyNext(), text: 'Question suivante' }
      };
    };

    const quickLoad = async () => {
      quizStartTimeRef.current = performance.now();
      await audioManager.resetTimer();
      try {
        const storage = createStorageService();
        let questions: Question[] = [];

        // Mapping niveau → difficulty
        const levelToDifficulty: Record<number, string> = {
          1: 'easy',
          2: 'medium',
          3: 'hard',
          4: 'hard',
          5: 'hard',
        };
        const targetDifficulty = levelToDifficulty[parseInt(level || '1')];

        if (category === 'mixte') {
          const all = await storage.getQuestions();
          // Filtrer par difficulty pour mixte aussi
          const filtered = all.filter(q => q.difficulty === targetDifficulty);
          questions = filtered.sort(() => Math.random() - 0.5).slice(0, 10);
        } else {
          const categoryQuestions = await storage.getQuestionsByCategory(
            category as Exclude<Category, 'mixte'>
          );
          // Filtrer par difficulty
          questions = categoryQuestions
            .filter(q => q.difficulty === targetDifficulty)
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
        }

        if (questions.length === 0) { navigate('/'); return; }

        // PRÉ-GÉNÉRER Q1 IMMÉDIATEMENT
        const seg = buildSeg(questions[0], 0);
        gen(seg.question.key, seg.question.text);
        gen(seg.options[0].key, seg.options[0].text);
        gen(seg.options[1].key, seg.options[1].text);
        gen(seg.options[2]?.key, seg.options[2]?.text);
        gen(seg.options[3]?.key, seg.options[3]?.text);

        // ATTENDRE que la question soit prête (max 3s)
        const waitStart = Date.now();
        while (Date.now() - waitStart < 3000) {
          if (await audioManager.isCached(seg.question.key)) break;
          await new Promise(r => setTimeout(r, 50));
        }

        setQuizQuestions(questions);
        
        const session: QuizSession = {
          id: `quiz_${Date.now()}`,
          category: category as Category,
          level: parseInt(level || '1') as Level,
          questions,
          startedAt: new Date(),
          score: 0,
          maxScore: questions.reduce((sum, q) => sum + (q.points || 20), 0),
          isComplete: false,
        };
        startSession(session);
        setIsLoading(false);
      } catch {
        navigate('/');
      }
    };
    
    quickLoad();
    
    return () => {
      cancelTokenRef.current++;
      audioManager.stopSpeaking();
      audioManager.stopListening();
      audioManager.clearCache();
      audioManager.startListening();
    };
  }, [category, level, navigate, startSession]);

  // ===== TIMER =====
  useEffect(() => {
    if (!timerStarted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimeUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted, timeLeft]);

  // ===== PLAY SEQUENCE =====
  useEffect(() => {
    if (currentQuestion && !isLoading) {
      playQuestionSequence();
    }
  }, [currentQuestionIndex, isLoading]);

  // Helpers
  const gen = (cacheKey: string | undefined, text: string | undefined) => {
    if (!cacheKey || !text) return;
    if (generatingRef.current.has(cacheKey)) return;
    generatingRef.current.add(cacheKey);
    audioManager.pregenerate(text, cacheKey);
  };

  const buildSegments = (q: Question, qi: number) => {
    const questionText = applyPhoneticPronunciation(q.question);
    const options = q.options.map((opt, i) => ({
      key: keyO(qi, i),
      text: `Réponse ${String.fromCharCode(65 + i)}. ${applyPhoneticPronunciation(opt.text)}`
    }));
    const correctIdx = q.options.findIndex(o => o.isCorrect);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    const correctText = applyPhoneticPronunciation(q.options[correctIdx]?.text || '');
    return {
      question: { key: keyQ(qi), text: questionText },
      options,
      feedbackOk: { key: keyOk(qi), text: getRandomMessage(AUDIO_CONFIG.messages.correct) },
      feedbackKo: { key: keyKo(qi), text: `${getRandomMessage(AUDIO_CONFIG.messages.incorrect)} ${correctLetter}, ${correctText}` },
      explanation: q.explanation ? { key: keyExp(qi), text: applyPhoneticPronunciation(q.explanation) } : null,
      next: { key: keyNext(), text: 'Question suivante' }
    };
  };

  const playOrFallback = async (cacheKey: string, text: string, token: number): Promise<boolean> => {
    if (cancelTokenRef.current !== token) return false;
    const played = await audioManager.speakCached(cacheKey);
    if (played) return true;
    if (cancelTokenRef.current !== token) return false;
    await audioManager.speak(text, { rate: 0.9 });
    return cancelTokenRef.current === token;
  };

  const playQuestionSequence = async () => {
    if (!currentQuestion) return;
    const myToken = cancelTokenRef.current;
    const qi = currentQuestionIndex;
    const seg = buildSegments(currentQuestion, qi);

    try {
      // Générer feedbacks pendant lecture question
      gen(seg.feedbackOk.key, seg.feedbackOk.text);
      gen(seg.feedbackKo.key, seg.feedbackKo.text);
      
      if (!await playOrFallback(seg.question.key, seg.question.text, myToken)) return;

      for (let i = 0; i < seg.options.length; i++) {
        if (cancelTokenRef.current !== myToken) return;
        
        const opt = seg.options[i];
        
        if (i === 0 && seg.explanation) {
          gen(seg.explanation.key, seg.explanation.text);
          gen(seg.next.key, seg.next.text);
        }
        if (i === 1 && quizQuestions[qi + 1]) {
          const nextSeg = buildSegments(quizQuestions[qi + 1], qi + 1);
          gen(nextSeg.question.key, nextSeg.question.text);
          gen(nextSeg.options[0].key, nextSeg.options[0].text);
        }
        if (i === 2 && quizQuestions[qi + 1]) {
          const nextSeg = buildSegments(quizQuestions[qi + 1], qi + 1);
          gen(nextSeg.options[1].key, nextSeg.options[1].text);
          gen(nextSeg.options[2]?.key, nextSeg.options[2]?.text);
        }
        if (i === 3 && quizQuestions[qi + 1]) {
          const nextSeg = buildSegments(quizQuestions[qi + 1], qi + 1);
          gen(nextSeg.options[3]?.key, nextSeg.options[3]?.text);
        }

        if (!await playOrFallback(opt.key, opt.text, myToken)) return;
      }

      if (cancelTokenRef.current !== myToken) return;

      await new Promise(r => setTimeout(r, 200));
      audioManager.onSpeech(handleVoiceInput);
      await audioManager.startListening();
      setTimerStarted(true);
    } catch {}
  };

  const handleAnswer = async (answer: string, questionAtClick?: Question) => {
    const jsTime = ((performance.now() - quizStartTimeRef.current) / 1000).toFixed(1);
    const q = questionAtClick || currentQuestionRef.current;
    if (selectedAnswerRef.current || !q) return;

    // Log réponse utilisateur avec temps JS
    audioManager.logEvent(`🎯 ANSWER "${answer.substring(0, 20)}" (js=${jsTime}s)`);

    cancelTokenRef.current++;
    const myToken = cancelTokenRef.current;
    const qi = currentQuestionIndex;
    
    setTimerStarted(false);
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    setSelectedAnswer(answer);

    const correctOpt = q.options.find(o => o.isCorrect);
    const isCorrect = answer.toLowerCase().trim() === correctOpt?.text.toLowerCase().trim();

    submitAnswer({
      questionId: q.id,
      selectedAnswer: answer,
      isCorrect,
      timeSpent: (q.timeLimit - timeLeft) * 1000,
    });

    if (cancelTokenRef.current !== myToken) return;

    const seg = buildSegments(q, qi);

    if (quizQuestions[qi + 1]) {
      const nextSeg = buildSegments(quizQuestions[qi + 1], qi + 1);
      gen(nextSeg.feedbackOk.key, nextSeg.feedbackOk.text);
      gen(nextSeg.feedbackKo.key, nextSeg.feedbackKo.text);
    }

    const fbKey = isCorrect ? seg.feedbackOk.key : seg.feedbackKo.key;
    const fbText = isCorrect ? seg.feedbackOk.text : seg.feedbackKo.text;
    if (!await playOrFallback(fbKey, fbText, myToken)) return;

    if (seg.explanation) {
      if (!await playOrFallback(seg.explanation.key, seg.explanation.text, myToken)) return;
    }

    // Ne pas dire "question suivante" si c'est la dernière
    const isLastQuestion = qi + 1 >= quizQuestions.length;
    if (!isLastQuestion) {
      if (!await playOrFallback(seg.next.key, seg.next.text, myToken)) return;
    }

    handleNextQuestion();
  };

  const handleNextQuestion = async () => {
    cancelTokenRef.current++;
    // Annuler le debounce en cours
    if (voiceDebounceRef.current) {
      clearTimeout(voiceDebounceRef.current);
      voiceDebounceRef.current = null;
    }
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= quizQuestions.length) {
      // Adapter le message selon le score
      const correctCount = answers.filter(a => a.isCorrect).length;
      const accuracy = Math.round((correctCount / quizQuestions.length) * 100);
      
      let endMessage = '. Quise terminé !';
      if (accuracy >= 80) {
        endMessage = '. Quise terminé ! Excellent travail !';
      } else if (accuracy >= 60) {
        endMessage = '. Quise terminé ! Bien joué !';
      } else if (accuracy >= 40) {
        endMessage = '. Quise terminé ! Pas mal, tu peux faire mieux !';
      } else if (accuracy > 0) {
        endMessage = '. Quise terminé ! Continue de t entrainer !';
      } else {
        endMessage = '. Quise terminé ! Ne lâche pas, réessaye !';
      }
      
      await audioManager.speak(endMessage);
      endSession();
      navigate('/results');
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setSelectedAnswer(null);
    setTimeLeft(30);
    setTimerStarted(false);
  };

  const handleTimeUp = async () => {
    if (selectedAnswer) return;
    cancelTokenRef.current++;
    const myToken = cancelTokenRef.current;
    const qi = currentQuestionIndex;
    const q = currentQuestion;
    
    setTimerStarted(false);
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    setSelectedAnswer('timeout');

    if (!q) return;

    submitAnswer({
      questionId: q.id,
      selectedAnswer: '',
      isCorrect: false,
      timeSpent: q.timeLimit * 1000,
    });

    if (cancelTokenRef.current !== myToken) return;

    const seg = buildSegments(q, qi);
    const correctIdx = q.options.findIndex(o => o.isCorrect);
    const correctLetter = String.fromCharCode(65 + correctIdx);
    const correctText = applyPhoneticPronunciation(q.options[correctIdx]?.text || '');
    
    await audioManager.speak(`Temps écoulé ! La bonne réponse était ${correctLetter}, ${correctText}`, { rate: 0.9 });
    if (cancelTokenRef.current !== myToken) return;

    if (seg.explanation) {
      if (!await playOrFallback(seg.explanation.key, seg.explanation.text, myToken)) return;
    }

    // Ne pas dire "question suivante" si c'est la dernière
    const isLastQuestion = qi + 1 >= quizQuestions.length;
    if (!isLastQuestion) {
      await audioManager.speak('Question suivante', { rate: 0.9 });
      if (cancelTokenRef.current !== myToken) return;
    }

    handleNextQuestion();
  };

  const handleGoHome = async () => {
    cancelTokenRef.current++;
    await audioManager.stopSpeaking();
    await audioManager.stopListening();
    resetQuiz();
    navigate('/');
  };

  // Wrapper debounce pour laisser l'utilisateur finir de parler
  const handleVoiceInput = (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    
    // Ignorer les transcripts trop courts
    if (text.length < 3) return;
    
    // Stocker le dernier transcript
    lastTranscriptRef.current = text;
    
    // Annuler le précédent timeout
    if (voiceDebounceRef.current) {
      clearTimeout(voiceDebounceRef.current);
    }
    
    // Commandes immédiates (pas de debounce)
    if (text.includes('retour') || text.includes('menu')) {
      handleGoHome();
      return;
    }
    
    if (text.includes('suivant') || text.includes('next')) {
      if (selectedAnswerRef.current) handleNextQuestion();
      return;
    }
    
    // Debounce pour les réponses (attendre 800ms après le dernier mot)
    voiceDebounceRef.current = setTimeout(() => {
      processVoiceAnswer(lastTranscriptRef.current);
    }, 800);
  };

  const processVoiceAnswer = (text: string) => {

    if (!selectedAnswerRef.current && currentQuestionRef.current) {
      const letterMap: Record<string, number> = {
        'a': 0, 'alpha': 0, 'ah': 0,
        'b': 1, 'bé': 1, 'beta': 1, 'bê': 1,
        'c': 2, 'cé': 2, 'sé': 2, 'cê': 2, 'se': 2,
        'd': 3, 'dé': 3, 'delta': 3, 'dê': 3
      };

      const firstWord = text.split(/\s+/)[0];
      const letterIndex = letterMap[firstWord];
      const q = currentQuestionRef.current;

      if (letterIndex !== undefined && q.options[letterIndex]) {
        handleAnswer(q.options[letterIndex].text, q);
        return;
      }
      
      // Normaliser le texte pour le matching
      const normalizeForMatch = (str: string): string => {
        return str
          .toLowerCase()
          .replace(/jr\.?$/i, 'junior')
          .replace(/dr\.?\s/i, 'docteur ')
          .replace(/mr\.?\s/i, 'monsieur ')
          .replace(/mrs\.?\s/i, 'madame ')
          .replace(/st\.?\s/i, 'saint ')
          // Supprimer les préfixes communs
          .replace(/traité\s+(de\s+)?/gi, '')
          .replace(/accord\s+(de\s+)?/gi, '')
          .replace(/bataille\s+(de\s+)?/gi, '')
          .replace(/guerre\s+(de\s+)?/gi, '')
          .replace(/révolution\s+(de\s+)?/gi, '')
          .replace(/siège\s+(de\s+)?/gi, '')
          .replace(/conférence\s+(de\s+)?/gi, '')
          // Supprimer articles (avec word boundary)
          .replace(/\bla\s+/gi, '')
          .replace(/\ble\s+/gi, '')
          .replace(/\bles\s+/gi, '')
          .replace(/\bun\s+/gi, '')
          .replace(/\bune\s+/gi, '')
          .replace(/\bl'/gi, '')
          .replace(/\bd'/gi, '')
          .replace(/[''\u2019]/g, "'")  // Apostrophes
          .replace(/[\-–—]/g, ' ')  // Tirets
          .replace(/\s+/g, ' ')  // Espaces multiples
          .trim();
      };

      const normalizedTranscript = normalizeForMatch(text);
      
      // Extraire les mots distinctifs de chaque option
      // Un mot distinctif est un mot qui n'apparaît que dans cette option
      const getDistinctiveWords = (optionIndex: number): string[] => {
        const option = q.options[optionIndex];
        const optionWords = normalizeForMatch(option.text).split(/\s+/).filter(w => w.length > 2);
        
        // Mots présents dans les autres options
        const otherWords = new Set<string>();
        q.options.forEach((opt, idx) => {
          if (idx !== optionIndex) {
            normalizeForMatch(opt.text).split(/\s+/).forEach(w => {
              if (w.length > 2) otherWords.add(w);
            });
          }
        });
        
        // Retourner les mots qui ne sont pas dans les autres options
        return optionWords.filter(w => !otherWords.has(w));
      };

      // Chercher une correspondance via les mots distinctifs
      const matchedIndex = q.options.findIndex((_, idx) => {
        const distinctiveWords = getDistinctiveWords(idx);
        // Si au moins un mot distinctif est dans le transcript
        return distinctiveWords.some(word => 
          normalizedTranscript.includes(word) || 
          normalizedTranscript.split(/\s+/).some(tw => 
            tw.includes(word) || word.includes(tw)
          )
        );
      });
      
      if (matchedIndex !== -1) {
        handleAnswer(q.options[matchedIndex].text, q);
      }
    }
  };

  // ===== RENDER =====
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const quizProgress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
  const { isListening } = audioManager.getState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8 pt-16">
      <div className="mx-auto max-w-3xl">
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
                  <span className="text-muted-foreground">Lecture...</span>
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

        <Card className="mb-4 p-6">
          <h2 className="mb-6 text-center text-xl font-bold leading-tight">
            {currentQuestion.question}
          </h2>

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
                      ? isCorrect ? 'default' : isSelected ? 'destructive' : 'outline'
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
                  {showResult && isSelected && !isCorrect && <span className="ml-2">✗</span>}
                </Button>
              );
            })}
          </div>
        </Card>

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
