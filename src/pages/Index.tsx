/**
 * Page d'accueil - Hub principal du quiz
 * Design compact : tout visible sans scroll sur iPhone
 */

import { useEffect, useState } from 'react';
import { Brain, Trophy, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { audioManager } from '@/services/AudioManager';
import { useUserStore } from '@/stores/useUserStore';
import questionsData from '@/data/questions.json';
import type { Category, UserProgress } from '@/types/quiz.types';

const Index = () => {
  const navigate = useNavigate();
  const { progress, setProgress } = useUserStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const storage = createStorageService();
      await storage.init();

      const existingQuestions = await storage.getQuestions();
      const needsReload = existingQuestions.length === 0 || 
        !existingQuestions[0]?.options?.[0]?.hasOwnProperty('isCorrect');
      
      if (needsReload) {
        console.log('🔄 Reloading questions...');
        const transformedQuestions = questionsData.map((q: any) => {
          const correctOption = q.options.find((opt: any) => opt.isCorrect);
          return {
            ...q,
            correctAnswer: correctOption?.text || '',
            options: q.options.map((opt: any) => ({
              id: opt.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
              phoneticText: opt.phoneticText,
              phoneticKeywords: opt.phoneticKeywords,
            })),
          };
        });
        await storage.saveQuestions(transformedQuestions);
        console.log('✅ Questions chargées:', transformedQuestions.length);
      }

      let userProgress = await storage.getUserProgress();
      if (!userProgress) {
        userProgress = createDefaultProgress();
      } else {
        userProgress = migrateProgress(userProgress);
      }
      await storage.saveUserProgress(userProgress);
      setProgress(userProgress);
      setIsInitializing(false);
    } catch (error) {
      console.error('Erreur initialisation:', error);
      setIsInitializing(false);
    }
  };

  const createDefaultProgress = (): UserProgress => ({
    userId: 'user_default',
    level: 1,
    xp: 0,
    totalQuizzes: 0,
    totalCorrectAnswers: 0,
    totalQuestions: 0,
    streak: 0,
    lastPlayedAt: new Date(),
    categoryStats: {
      'arts-litterature': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      divertissement: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      sport: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'histoire-politique': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'geographie-economie': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      gastronomie: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'sciences-technologie': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      sociales: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      people: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
    },
    unlockedLevels: {
      'arts-litterature': [1, 2, 3, 4, 5],
      divertissement: [1, 2, 3, 4, 5],
      sport: [1, 2, 3, 4, 5],
      'histoire-politique': [1, 2, 3, 4, 5],
      'geographie-economie': [1, 2, 3, 4, 5],
      gastronomie: [1, 2, 3, 4, 5],
      'sciences-technologie': [1, 2, 3, 4, 5],
      sociales: [1, 2, 3, 4, 5],
      people: [1, 2, 3, 4, 5],
    },
    hasPremium: true,
  });

  const migrateProgress = (oldProgress: UserProgress): UserProgress => {
    const defaultProgress = createDefaultProgress();
    return {
      ...oldProgress,
      categoryStats: { ...defaultProgress.categoryStats, ...oldProgress.categoryStats },
      unlockedLevels: { ...defaultProgress.unlockedLevels, ...(oldProgress.unlockedLevels || {}) },
      hasPremium: oldProgress.hasPremium ?? true,
    };
  };

  const selectCategory = async (category: Category) => {
    await audioManager.stopSpeaking();
    // Toutes les catégories (y compris mixte) vont vers la page de sélection de niveau
    navigate(`/level/${category}`);
  };

  const getCategoryLabel = (category: Category): string => {
    const labels: Record<Category, string> = {
      'arts-litterature': 'Arts & Littérature',
      divertissement: 'Divertissement',
      sport: 'Sport',
      'histoire-politique': 'Histoire & Politique',
      'geographie-economie': 'Géographie & Économie',
      gastronomie: 'Gastronomie',
      'sciences-technologie': 'Sciences & Technologie',
      sociales: 'Sociales',
      people: 'People',
      mixte: 'Quiz Mixte',
    };
    return labels[category];
  };

  const getCategoryEmoji = (category: Category): string => {
    const emojis: Record<Category, string> = {
      'arts-litterature': '🎨',
      divertissement: '🎬',
      sport: '⚽',
      'histoire-politique': '🏛️',
      'geographie-economie': '🌍',
      gastronomie: '🍽️',
      'sciences-technologie': '🔬',
      sociales: '👥',
      people: '⭐',
      mixte: '🎲',
    };
    return emojis[category];
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-quiz-dark to-black">
        <div className="text-center">
          <Brain className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const accuracy = progress && progress.totalQuestions > 0
    ? Math.round((progress.totalCorrectAnswers / progress.totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-dark to-black p-4 pt-16">
      <div className="mx-auto max-w-md">
        
        {/* Header - Logo + Titre inline */}
        <header className="mb-4 flex items-center justify-center gap-3">
          <div className="rounded-lg bg-gradient-primary p-2">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">RoadLearn</h1>
        </header>

        {/* Stats compactes */}
        {progress && (
          <div className="mb-4 flex items-center justify-center gap-4 text-sm">
            <div className="text-center">
              <span className="text-muted-foreground">Niv.</span>
              <span className="ml-1 font-bold text-primary">{progress.level}</span>
            </div>
            <div className="h-4 w-px bg-quiz-border" />
            <div className="text-center">
              <span className="font-bold text-white">{progress.xp}</span>
              <span className="ml-1 text-muted-foreground">XP</span>
            </div>
            <div className="h-4 w-px bg-quiz-border" />
            <div className="text-center">
              <span className="font-bold text-green-400">{accuracy}%</span>
              <span className="ml-1 text-muted-foreground text-xs">réussite</span>
            </div>
          </div>
        )}

        {/* Quiz Mixte - Bouton principal */}
        <Card 
          className="mb-4 cursor-pointer border-primary/30 bg-gradient-primary transition-all active:scale-[0.98]"
          onClick={() => selectCategory('mixte')}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎲</span>
              <div>
                <h2 className="text-lg font-bold text-white">Quiz Mixte</h2>
                <p className="text-xs text-white/70">Toutes catégories</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70" />
          </div>
        </Card>

        {/* Catégories - Liste compacte */}
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Catégories
          </h2>
          <Card className="divide-y divide-white/10 bg-gradient-to-br from-primary/80 to-primary">
            {([
              'arts-litterature',
              'divertissement', 
              'sport',
              'histoire-politique',
              'geographie-economie',
              'gastronomie',
              'sciences-technologie',
              'sociales',
              'people',
            ] as const).map((category) => (
              <div
                key={category}
                className="flex cursor-pointer items-center justify-between p-3 transition-colors active:bg-white/5"
                onClick={() => selectCategory(category)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCategoryEmoji(category)}</span>
                  <span className="text-sm font-medium text-white">
                    {getCategoryLabel(category)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {progress && (
                    <span className="text-xs text-white/70">
                      {Math.round(progress.categoryStats[category]?.accuracy || 0)}%
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-white/70" />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Actions secondaires */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-quiz-border bg-quiz-card"
            onClick={() => navigate('/scores')}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Scores
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-quiz-border bg-quiz-card"
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Réglages
          </Button>
        </div>

      </div>
    </div>
  );
};

export default Index;
