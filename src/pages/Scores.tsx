/**
 * Page Scores - Historique des résultats
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import type { QuizResult } from '@/types/quiz.types';

const Scores = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const storage = createStorageService();
      const loadedResults = await storage.getQuizResults(20);
      setResults(loadedResults);
    } catch (error) {
      console.error('Erreur chargement résultats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      histoire: 'Histoire',
      geographie: 'Géographie',
      sciences: 'Sciences',
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement des scores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-primary p-3 shadow-primary">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Mes Scores</h1>
              <p className="text-muted-foreground">Historique de tes quiz</p>
            </div>
          </div>
        </div>

        {/* Liste des résultats */}
        {results.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-20" />
            <p className="text-xl font-medium text-muted-foreground">
              Aucun quiz terminé
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Lance ton premier quiz pour voir tes résultats ici !
            </p>
            <Button
              variant="default"
              className="mt-6"
              onClick={() => navigate('/')}
            >
              Commencer un quiz
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.sessionId} className="p-6 transition-all hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {getCategoryLabel(result.category)}
                      </h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        result.accuracy >= 80
                          ? 'bg-success/10 text-success'
                          : result.accuracy >= 60
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {Math.round(result.accuracy)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(result.completedAt)}
                      </span>
                      <span>
                        {result.correctAnswers}/{result.totalQuestions} bonnes réponses
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-sm text-muted-foreground">Score</p>
                    <p className="text-3xl font-bold text-primary">
                      {result.score}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / {result.maxScore}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scores;
