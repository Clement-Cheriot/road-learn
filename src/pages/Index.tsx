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
        await storage.saveUserProgress(userProgress);
      }
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
      histoire: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      geographie: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
      sciences: { questionsAnswered: 0, correctAnswers: 0, accuracy: 0, bestStreak: 0 },
    },
  });

  const startQuiz = async (category: Category) => {
    if (audioEnabled) {
      const audio = createAudioService();
      await audio.speak(`Démarrage du quiz ${getCategoryLabel(category)}`);
    }
    navigate(`/quiz/${category}`);
  };

  const getCategoryLabel = (category: Category): string => {
    const labels = {
      histoire: 'Histoire',
      geographie: 'Géographie',
      sciences: 'Sciences',
      mixte: 'Mixte',
    };
    return labels[category];
  };

  const getCategoryEmoji = (category: Category): string => {
    const emojis = {
      histoire: '🏛️',
      geographie: '🌍',
      sciences: '🔬',
      mixte: '🎲',
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="rounded-2xl bg-gradient-primary p-4 shadow-primary">
              <Brain className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mb-2 bg-gradient-hero bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            QuizMaster
          </h1>
          <p className="text-muted-foreground">
            Apprends en t'amusant, partout et sans connexion
          </p>
        </header>

        {/* Profil utilisateur */}
        {progress && (
          <Card className="mb-6 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Niveau</p>
                <p className="text-3xl font-bold text-primary">{progress.level}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">XP</p>
                <p className="text-2xl font-bold">{progress.xp}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Précision</p>
                <p className="text-2xl font-bold text-success">
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
        <div className="mb-6 flex items-center justify-center gap-2">
          <Volume2 className={`h-5 w-5 ${audioEnabled ? 'text-success' : 'text-muted-foreground'}`} />
          <span className="text-sm text-muted-foreground">
            {audioEnabled ? 'Audio activé' : 'Audio désactivé'}
          </span>
        </div>

        {/* Quiz Mixte */}
        <div className="mb-8">
          <Card
            className="group cursor-pointer overflow-hidden transition-all hover:scale-105 hover:shadow-primary bg-gradient-primary"
            onClick={() => startQuiz('mixte')}
          >
            <div className="p-6 text-center text-white">
              <div className="mb-4 text-6xl">🎲</div>
              <h3 className="mb-2 text-2xl font-bold">Quiz Mixte</h3>
              <p className="mb-4 text-sm opacity-90">
                Toutes les catégories mélangées pour un défi complet !
              </p>
              <Button variant="secondary" className="w-full">
                <Mic className="mr-2 h-4 w-4" />
                Commencer le quiz mixte
              </Button>
            </div>
          </Card>
        </div>

        {/* Catégories */}
        <h2 className="mb-4 text-center text-xl font-bold">Ou choisis une catégorie</h2>
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {(['histoire', 'geographie', 'sciences'] as const).map((category) => (
            <Card
              key={category}
              className="group cursor-pointer overflow-hidden transition-all hover:scale-105 hover:shadow-primary"
              onClick={() => startQuiz(category)}
            >
              <div className="p-6 text-center">
                <div className="mb-4 text-6xl">{getCategoryEmoji(category)}</div>
                <h3 className="mb-2 text-xl font-bold">{getCategoryLabel(category)}</h3>
                {progress && (
                  <div className="text-sm text-muted-foreground">
                    <p>{progress.categoryStats[category].questionsAnswered} questions</p>
                    <p className="text-success">
                      {Math.round(progress.categoryStats[category].accuracy)}% réussite
                    </p>
                  </div>
                )}
                <Button variant="default" className="mt-4 w-full">
                  <Mic className="mr-2 h-4 w-4" />
                  Commencer
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions secondaires */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/scores')}
          >
            <Trophy className="mr-2 h-5 w-5" />
            Mes scores
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-5 w-5" />
            Paramètres
          </Button>
        </div>

        {/* Info plateforme */}
        <div className="mt-8 rounded-lg bg-card p-4 text-center text-sm text-muted-foreground">
          <p>
            🌐 Version Web (POC) • Architecture native-ready
          </p>
          <p className="mt-1 text-xs">
            Migration Capacitor préparée pour iOS/Android natif
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
