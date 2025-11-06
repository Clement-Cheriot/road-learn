/**
 * Page de sélection de niveau pour une catégorie
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Star, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUserStore } from '@/stores/useUserStore';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import type { Category, Level } from '@/types/quiz.types';

const LevelSelect = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { progress } = useUserStore();
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    checkAudio();
  }, []);

  const checkAudio = async () => {
    const audio = createAudioService();
    const available = await audio.isAvailable();
    setAudioEnabled(available);
  };

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      'arts-litterature': 'Arts & Littérature',
      'divertissement': 'Divertissement',
      'sport': 'Sport',
      'histoire-politique': 'Histoire & Politique',
      'geographie-economie': 'Géographie & Économie',
      'gastronomie': 'Gastronomie',
      'sciences-technologie': 'Sciences & Technologie',
      'sociales': 'Sociales',
      'people': 'People',
    };
    return labels[cat] || cat;
  };

  const getCategoryEmoji = (cat: string): string => {
    const emojis: Record<string, string> = {
      'arts-litterature': '🎨',
      'divertissement': '🎬',
      'sport': '⚽',
      'histoire-politique': '🏛️',
      'geographie-economie': '🌍',
      'gastronomie': '🍽️',
      'sciences-technologie': '🔬',
      'sociales': '👥',
      'people': '⭐',
    };
    return emojis[cat] || '❓';
  };

  const isLevelUnlocked = (level: Level): boolean => {
    if (!progress || !category) return false;
    if (category === 'mixte') return true;
    return progress.unlockedLevels[category as Exclude<Category, 'mixte'>]?.includes(level) || false;
  };

  const isLevelPremium = (level: Level): boolean => {
    return level >= 3;
  };

  const canPlayLevel = (level: Level): boolean => {
    const unlocked = isLevelUnlocked(level);
    const isPremium = isLevelPremium(level);
    
    if (!isPremium) return unlocked;
    return unlocked && (progress?.hasPremium || false);
  };

  const startLevel = async (level: Level) => {
    if (!canPlayLevel(level)) return;

    if (audioEnabled) {
      const audio = createAudioService();
      await audio.speak(`Démarrage du niveau ${level}`);
    }
    navigate(`/quiz/${category}/${level}`);
  };

  const getLevelDifficulty = (level: Level): string => {
    const difficulties: Record<Level, string> = {
      1: 'Facile',
      2: 'Moyen',
      3: 'Difficile',
      4: 'Expert',
      5: 'Maître',
    };
    return difficulties[level];
  };

  const getLevelDescription = (level: Level): string => {
    const descriptions: Record<Level, string> = {
      1: 'Idéal pour débuter et apprendre les bases',
      2: 'Questions intermédiaires pour progresser',
      3: 'Défi relevé pour les connaisseurs',
      4: 'Questions pointues pour les experts',
      5: 'Le niveau ultime des maîtres',
    };
    return descriptions[level];
  };

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <div className="text-center">
            <div className="mb-4 text-6xl">{getCategoryEmoji(category)}</div>
            <h1 className="mb-2 text-4xl font-bold">
              {getCategoryLabel(category)}
            </h1>
            <p className="text-muted-foreground">
              Choisis ton niveau de difficulté
            </p>
          </div>
        </div>

        {/* Niveaux */}
        <div className="grid gap-4 md:grid-cols-2">
          {([1, 2, 3, 4, 5] as Level[]).map((level) => {
            const unlocked = isLevelUnlocked(level);
            const isPremium = isLevelPremium(level);
            const canPlay = canPlayLevel(level);

            return (
              <Card
                key={level}
                className={`group overflow-hidden transition-all ${
                  canPlay
                    ? 'cursor-pointer hover:scale-105 hover:shadow-primary'
                    : 'opacity-60'
                }`}
                onClick={() => canPlay && startLevel(level)}
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-2xl font-bold">Niveau {level}</h3>
                        {isPremium && (
                          <span className="rounded-full bg-gradient-primary px-2 py-1 text-xs text-white">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-primary">
                        {getLevelDifficulty(level)}
                      </p>
                    </div>
                    
                    {!unlocked ? (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    ) : !canPlay ? (
                      <Lock className="h-6 w-6 text-warning" />
                    ) : (
                      <Star className="h-6 w-6 text-success" />
                    )}
                  </div>

                  <p className="mb-4 text-sm text-muted-foreground">
                    {getLevelDescription(level)}
                  </p>

                  {progress && category !== 'mixte' && (
                    <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-bold text-primary">
                          {progress.categoryStats[category as Exclude<Category, 'mixte'>]?.accuracy.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {canPlay ? (
                    <Button variant="default" className="w-full">
                      <Trophy className="mr-2 h-4 w-4" />
                      Commencer
                    </Button>
                  ) : !unlocked ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      Niveau verrouillé
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Ouvrir la page d'achat premium
                        console.log('Ouvrir achat premium');
                      }}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Débloquer Premium
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Premium */}
        {!progress?.hasPremium && (
          <Card className="mt-8 border-primary/20 bg-gradient-primary/10 p-6">
            <div className="text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-bold">Débloquez tous les niveaux !</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Accédez aux niveaux 3, 4 et 5 de toutes les catégories avec Premium
              </p>
              <Button
                variant="default"
                onClick={() => {
                  // TODO: Implémenter l'achat premium
                  console.log('Ouvrir achat premium');
                }}
              >
                Obtenir Premium
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LevelSelect;
