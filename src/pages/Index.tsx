/**
 * Page d'accueil - Hub principal du quiz
 */

import { useEffect, useState } from 'react';
import { Mic, Brain, Trophy, Settings, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { useUserStore } from '@/stores/useUserStore';
import questionsData from '@/data/questions.json';
import type { Category, UserProgress } from '@/types/quiz.types';

const Index = () => {
  const navigate = useNavigate();
  const { progress, setProgress } = useUserStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialiser le stockage
      const storage = createStorageService();
      await storage.init();

      // Charger les questions en IndexedDB (première fois uniquement)
      const existingQuestions = await storage.getQuestions();
      if (existingQuestions.length === 0) {
        await storage.saveQuestions(questionsData as any);
        console.log('✅ Questions chargées dans IndexedDB');
      }

      // Charger ou créer la progression utilisateur
      let userProgress = await storage.getUserProgress();
      if (!userProgress) {
        userProgress = createDefaultProgress();
      } else {
        // Migrer les anciennes données pour inclure les nouvelles catégories
        userProgress = migrateProgress(userProgress);
      }
      await storage.saveUserProgress(userProgress);
      setProgress(userProgress);

      // Vérifier disponibilité audio
      const audio = createAudioService();
      const available = await audio.isAvailable();
      setAudioEnabled(available);

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
      'divertissement': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'sport': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'histoire-politique': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'geographie-economie': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'gastronomie': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'sciences-technologie': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'sociales': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      'people': { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
    },
    unlockedLevels: {
      'arts-litterature': [1, 2, 3, 4, 5],
      'divertissement': [1, 2, 3, 4, 5],
      'sport': [1, 2, 3, 4, 5],
      'histoire-politique': [1, 2, 3, 4, 5],
      'geographie-economie': [1, 2, 3, 4, 5],
      'gastronomie': [1, 2, 3, 4, 5],
      'sciences-technologie': [1, 2, 3, 4, 5],
      'sociales': [1, 2, 3, 4, 5],
      'people': [1, 2, 3, 4, 5],
    },
    hasPremium: true, // Pour les tests, tout est débloqué
  });

  const migrateProgress = (oldProgress: UserProgress): UserProgress => {
    const defaultProgress = createDefaultProgress();
    
    return {
      ...oldProgress,
      categoryStats: {
        ...defaultProgress.categoryStats,
        ...oldProgress.categoryStats,
      },
      unlockedLevels: {
        ...defaultProgress.unlockedLevels,
        ...(oldProgress.unlockedLevels || {}),
      },
      hasPremium: oldProgress.hasPremium ?? true, // Pour les tests
    };
  };

  const selectCategory = (category: Category) => {
    if (category === 'mixte') {
      navigate(`/quiz/${category}/1`);
    } else {
      navigate(`/level/${category}`);
    }
  };

  const getCategoryLabel = (category: Category): string => {
    const labels: Record<Category, string> = {
      'arts-litterature': 'Arts & Littérature',
      'divertissement': 'Divertissement',
      'sport': 'Sport',
      'histoire-politique': 'Histoire & Politique',
      'geographie-economie': 'Géographie & Économie',
      'gastronomie': 'Gastronomie',
      'sciences-technologie': 'Sciences & Technologie',
      'sociales': 'Sociales',
      'people': 'People',
      'mixte': 'Quiz Mixte',
    };
    return labels[category];
  };

  const getCategoryEmoji = (category: Category): string => {
    const emojis: Record<Category, string> = {
      'arts-litterature': '🎨',
      'divertissement': '🎬',
      'sport': '⚽',
      'histoire-politique': '🏛️',
      'geographie-economie': '🌍',
      'gastronomie': '🍽️',
      'sciences-technologie': '🔬',
      'sociales': '👥',
      'people': '⭐',
      'mixte': '🎲',
    };
    return emojis[category];
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center">
          <Brain className="mx-auto h-16 w-16 animate-pulse text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="rounded-xl bg-gradient-primary p-3 shadow-primary">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mb-2 bg-gradient-hero bg-clip-text text-3xl font-bold text-transparent md:text-5xl">
            QuizMaster
          </h1>
          <p className="text-sm text-muted-foreground">
            Apprends en t'amusant
          </p>
        </header>

        {/* Profil utilisateur */}
        {progress && (
          <Card className="mb-4 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Niveau</p>
                <p className="text-2xl font-bold text-primary">{progress.level}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">XP</p>
                <p className="text-xl font-bold">{progress.xp}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Précision</p>
                <p className="text-xl font-bold text-success">
                  {progress.totalQuestions > 0
                    ? Math.round((progress.totalCorrectAnswers / progress.totalQuestions) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Contrôle audio */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <Volume2 className={`h-4 w-4 ${audioEnabled ? 'text-success' : 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">
            {audioEnabled ? 'Audio activé' : 'Audio désactivé'}
          </span>
        </div>

        {/* Quiz Mixte */}
        <div className="mb-6">
          <Card
            className="group cursor-pointer overflow-hidden transition-all active:scale-95 bg-gradient-primary"
            onClick={() => selectCategory('mixte')}
          >
            <div className="p-5 text-center text-white">
              <div className="mb-3 text-5xl">🎲</div>
              <h3 className="mb-2 text-xl font-bold">Quiz Mixte</h3>
              <p className="mb-4 text-xs opacity-90">
                Toutes les catégories mélangées !
              </p>
              <Button variant="secondary" className="w-full">
                <Mic className="mr-2 h-4 w-4" />
                Commencer
              </Button>
            </div>
          </Card>
        </div>

        {/* Catégories */}
        <h2 className="mb-3 text-center text-lg font-bold">Ou choisis une catégorie</h2>
        <div className="mb-6 grid gap-3 grid-cols-2 md:grid-cols-3">
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
            <Card
              key={category}
              className="group cursor-pointer overflow-hidden transition-all active:scale-95 hover:shadow-primary"
              onClick={() => selectCategory(category)}
            >
              <div className="p-4 text-center">
                <div className="mb-2 text-4xl">{getCategoryEmoji(category)}</div>
                <h3 className="mb-2 text-sm font-bold leading-tight">{getCategoryLabel(category)}</h3>
                {progress && (
                  <div className="text-xs text-muted-foreground mb-3">
                    <p>{progress.categoryStats[category].questionsAnswered} questions</p>
                    <p className="text-success">
                      {Math.round(progress.categoryStats[category].accuracy)}%
                    </p>
                  </div>
                )}
                <Button variant="default" size="sm" className="w-full text-xs">
                  <Mic className="mr-1 h-3 w-3" />
                  Niveaux
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions secondaires */}
        <div className="grid gap-3 grid-cols-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/scores')}
          >
            <Trophy className="mr-2 h-4 w-4" />
            <span className="text-sm">Scores</span>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span className="text-sm">Réglages</span>
          </Button>
        </div>

        {/* Info plateforme */}
        <div className="mt-6 rounded-lg bg-card p-3 text-center text-xs text-muted-foreground">
          <p>
            🌐 Version Web (POC)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
