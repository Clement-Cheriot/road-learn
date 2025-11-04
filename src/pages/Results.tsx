/**
 * Page Résultats - Récapitulatif du quiz
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Home, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuizStore } from '@/stores/useQuizStore';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import type { QuizResult } from '@/types/quiz.types';

const Results = () => {
  const navigate = useNavigate();
  const { currentSession, answers, resetQuiz } = useQuizStore();

  useEffect(() => {
    if (!currentSession?.isComplete) {
      navigate('/');
      return;
    }

    saveResults();
  }, []);

  const saveResults = async () => {
    if (!currentSession) return;

    const result: QuizResult = {
      sessionId: currentSession.id,
      category: currentSession.category,
      totalQuestions: currentSession.questions.length,
      correctAnswers: answers.filter(a => a.isCorrect).length,
      score: currentSession.score,
      maxScore: currentSession.maxScore,
      accuracy: (answers.filter(a => a.isCorrect).length / currentSession.questions.length) * 100,
      averageTime: answers.reduce((sum, a) => sum + a.timeSpent, 0) / answers.length,
      completedAt: new Date(),
    };

    try {
      const storage = createStorageService();
      await storage.saveQuizResult(result);
    } catch (error) {
      console.error('Erreur sauvegarde résultats:', error);
    }
  };

  const handlePlayAgain = () => {
    resetQuiz();
    navigate('/');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Trophy Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-gradient-success p-6 shadow-success">
            <Trophy className="h-16 w-16 text-success-foreground" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Quiz terminé !</h1>
          <p className="text-xl text-muted-foreground">
            Catégorie: {currentSession.category}
          </p>
        </div>

        {/* Score principal */}
        <Card className="mb-6 p-8 text-center shadow-lg">
          <div className="mb-6">
            <p className="mb-2 text-sm text-muted-foreground">Score final</p>
            <p className="bg-gradient-primary bg-clip-text text-6xl font-bold text-transparent">
              {currentSession.score}
            </p>
            <p className="mt-2 text-muted-foreground">
              sur {currentSession.maxScore} points ({scorePercentage}%)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Bonnes réponses</p>
              <p className="text-3xl font-bold text-success">
                {correctAnswers}/{currentSession.questions.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Précision</p>
              <p className="text-3xl font-bold text-primary">{accuracy}%</p>
            </div>
          </div>
        </Card>

        {/* Statistiques détaillées */}
        <Card className="mb-6 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Statistiques
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temps moyen par question</span>
              <span className="font-medium">
                {Math.round(answers.reduce((sum, a) => sum + a.timeSpent, 0) / answers.length / 1000)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questions répondues</span>
              <span className="font-medium">{answers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taux de réussite</span>
              <span className={`font-medium ${accuracy >= 70 ? 'text-success' : 'text-warning'}`}>
                {accuracy >= 80 ? '⭐ Excellent' : accuracy >= 60 ? '👍 Bien' : '📈 À améliorer'}
              </span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handlePlayAgain}
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Rejouer
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleHome}
          >
            <Home className="mr-2 h-5 w-5" />
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
