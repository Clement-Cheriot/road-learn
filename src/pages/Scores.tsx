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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8 pt-16">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-primary p-2 shadow-primary">
              <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mes Scores</h1>
              <p className="text-xs text-muted-foreground">Historique</p>
            </div>
          </div>
        </div>

        {/* Liste des résultats */}
        {results.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium text-muted-foreground">
              Aucun quiz terminé
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Lance ton premier quiz !
            </p>
            <Button
              variant="default"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/')}
            >
              Commencer
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <Card key={result.sessionId} className="p-4 transition-all active:scale-95">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">
                        {getCategoryLabel(result.category)}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        result.accuracy >= 80
                          ? 'bg-success/10 text-success'
                          : result.accuracy >= 60
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {Math.round(result.accuracy)}%
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(result.completedAt)}
                      </span>
                      <span>
                        {result.correctAnswers}/{result.totalQuestions} bonnes
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="mb-1 text-xs text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold text-primary">
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
