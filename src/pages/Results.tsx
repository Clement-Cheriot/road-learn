/**
 * Page Résultats - Récapitulatif du quiz
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Home, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuizStore } from '@/stores/useQuizStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { audioManager } from '@/services/AudioManager';
import type { QuizResult } from '@/types/quiz.types';

const Results = () => {
  const navigate = useNavigate();
  const { currentSession, answers, resetQuiz } = useQuizStore();
  const hasInitVoiceRef = useRef(false);

  useEffect(() => {
    if (!currentSession?.isComplete) {
      navigate('/');
      return;
    }

    saveResults();
  }, []);

  // Commandes vocales
  useEffect(() => {
    if (!currentSession?.isComplete || hasInitVoiceRef.current) return;
    hasInitVoiceRef.current = true;

    const initVoice = async () => {
      await new Promise(r => setTimeout(r, 500)); // Attendre fin annonce

      const handleVoiceCommand = (transcript: string) => {
        const text = transcript.toLowerCase().trim();

        if (text.includes('rejouer') || text.includes('recommencer') || text.includes('encore')) {
          audioManager.stopListening();
          handlePlayAgain();
          return;
        }

        if (text.includes('retour') || text.includes('accueil') || text.includes('menu') || text.includes('maison')) {
          audioManager.stopListening();
          handleHome();
          return;
        }
      };

      audioManager.onSpeech(handleVoiceCommand);
      await audioManager.startListening();
    };

    initVoice();

    return () => {
      audioManager.stopListening();
      hasInitVoiceRef.current = false;
    };
  }, [currentSession]);

  const saveResults = async () => {
    if (!currentSession) return;

    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalCount = currentSession.questions.length;

    const result: QuizResult = {
      sessionId: currentSession.id,
      category: currentSession.category,
      level: currentSession.level,
      totalQuestions: totalCount,
      correctAnswers: correctCount,
      score: currentSession.score,
      maxScore: currentSession.maxScore,
      accuracy: (correctCount / totalCount) * 100,
      averageTime: answers.reduce((sum, a) => sum + a.timeSpent, 0) / answers.length,
      completedAt: new Date(),
    };

    try {
      const storage = createStorageService();
      await storage.saveQuizResult(result);

      // Mettre à jour les stats utilisateur
      const userProgress = await storage.getUserProgress();
      if (userProgress && currentSession.category !== 'mixte') {
        const cat = currentSession.category as Exclude<typeof currentSession.category, 'mixte'>;
        const oldStats = userProgress.categoryStats[cat] || {
          questionsAnswered: 0,
          correctAnswers: 0,
          accuracy: 0,
          bestStreak: 0,
        };
        
        const newQuestionsAnswered = oldStats.questionsAnswered + totalCount;
        const newCorrectAnswers = oldStats.correctAnswers + correctCount;
        const newAccuracy = newQuestionsAnswered > 0 
          ? (newCorrectAnswers / newQuestionsAnswered) * 100 
          : 0;

        userProgress.categoryStats[cat] = {
          ...oldStats,
          questionsAnswered: newQuestionsAnswered,
          correctAnswers: newCorrectAnswers,
          accuracy: newAccuracy,
        };

        userProgress.totalQuizzes += 1;
        userProgress.totalQuestions += totalCount;
        userProgress.totalCorrectAnswers += correctCount;
        userProgress.lastPlayedAt = new Date();

        await storage.saveUserProgress(userProgress);
      }
    } catch (error) {
      console.error('Erreur sauvegarde résultats:', error);
    }
  };

  const handlePlayAgain = () => {
    const cat = currentSession?.category;
    const lvl = currentSession?.level;
    resetQuiz();
    // Relancer le même quiz
    if (cat && lvl) {
      navigate(`/quiz/${cat}/${lvl}`);
    } else {
      navigate('/');
    }
  };

  const handleHome = () => {
    resetQuiz();
    navigate('/');
  };

  if (!currentSession) {
    return null;
  }

  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const accuracy = Math.round((correctAnswers / currentSession.questions.length) * 100);
  const scorePercentage = Math.round((currentSession.score / currentSession.maxScore) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8 pt-16">
      <div className="mx-auto max-w-2xl">
        {/* Trophy Header */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-block rounded-full bg-gradient-success p-4 shadow-success">
            <Trophy className="h-12 w-12 text-success-foreground" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Quiz terminé !</h1>
          <p className="text-sm text-muted-foreground">
            Catégorie: {currentSession.category}
          </p>
        </div>

        {/* Score principal */}
        <Card className="mb-4 p-6 text-center shadow-lg">
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted-foreground">Score final</p>
            <p className="bg-gradient-primary bg-clip-text text-5xl font-bold text-transparent">
              {currentSession.score}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              sur {currentSession.maxScore} points ({scorePercentage}%)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Bonnes réponses</p>
              <p className="text-2xl font-bold text-success">
                {correctAnswers}/{currentSession.questions.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Précision</p>
              <p className="text-2xl font-bold text-primary">{accuracy}%</p>
            </div>
          </div>
        </Card>

        {/* Statistiques détaillées */}
        <Card className="mb-4 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            Statistiques
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Temps moyen</span>
              <span className="font-medium">
                {Math.round(answers.reduce((sum, a) => sum + a.timeSpent, 0) / answers.length / 1000)}s
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Questions</span>
              <span className="font-medium">{answers.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Résultat</span>
              <span className={`font-medium ${accuracy >= 70 ? 'text-success' : 'text-warning'}`}>
                {accuracy >= 80 ? '⭐ Excellent' : accuracy >= 60 ? '👍 Bien' : '📈 À améliorer'}
              </span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="grid gap-3 grid-cols-2">
          <Button
            variant="default"
            className="w-full"
            onClick={handlePlayAgain}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            <span className="text-sm">Rejouer</span>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleHome}
          >
            <Home className="mr-2 h-4 w-4" />
            <span className="text-sm">Accueil</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
