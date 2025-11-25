/**
 * Page de sélection de niveau pour une catégorie
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Star, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUserStore } from '@/stores/useUserStore';
import { audioManager } from '@/services/AudioManager';
import type { Category, Level } from '@/types/quiz.types';

const LevelSelect = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { progress } = useUserStore();
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    // AudioManager est déjà initialisé par GlobalVoiceController
    setAudioEnabled(true);
  }, []);

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      'arts-litterature': 'Arts & Littérature',
      divertissement: 'Divertissement',
      sport: 'Sport',
      'histoire-politique': 'Histoire & Politique',
      'geographie-economie': 'Géographie & Économie',
      gastronomie: 'Gastronomie',
      'sciences-technologie': 'Sciences & Technologie',
      sociales: 'Sociales',
      people: 'People',
    };
    return labels[cat] || cat;
  };

  const getCategoryEmoji = (cat: string): string => {
    const emojis: Record<string, string> = {
      'arts-litterature': '🎨',
      divertissement: '🎬',
      sport: '⚽',
      'histoire-politique': '🏛️',
      'geographie-economie': '🌍',
      gastronomie: '🍽️',
      'sciences-technologie': '🔬',
      sociales: '👥',
      people: '⭐',
    };
    return emojis[cat] || '❓';
  };

  const isLevelUnlocked = (level: Level): boolean => {
    if (!progress || !category) return false;
    if (category === 'mixte') return true;
    return (
      progress.unlockedLevels[category as Exclude<Category, 'mixte'>]?.includes(
        level
      ) || false
    );
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
      // ⬇️ UTILISER LE REF
      await audioServiceRef.current.speak(`Démarrage du niveau ${level}`);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8 pt-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-3"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>

          <div className="text-center">
            <div className="mb-3 text-5xl">{getCategoryEmoji(category)}</div>
            <h1 className="mb-2 text-2xl font-bold">
              {getCategoryLabel(category)}
            </h1>
            <p className="text-sm text-muted-foreground">Choisis ton niveau</p>
          </div>
        </div>

        {/* Niveaux */}
        <div className="grid gap-3">
          {([1, 2, 3, 4, 5] as Level[]).map((level) => {
            const unlocked = isLevelUnlocked(level);
            const isPremium = isLevelPremium(level);
            const canPlay = canPlayLevel(level);

            return (
              <Card
                key={level}
                className={`group overflow-hidden transition-all ${
                  canPlay
                    ? 'cursor-pointer active:scale-95 hover:shadow-primary'
                    : 'opacity-60'
                }`}
                onClick={() => canPlay && startLevel(level)}
              >
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-xl font-bold">Niveau {level}</h3>
                        {isPremium && (
                          <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-xs text-white">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-primary">
                        {getLevelDifficulty(level)}
                      </p>
                    </div>

                    {!unlocked ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : !canPlay ? (
                      <Lock className="h-5 w-5 text-warning" />
                    ) : (
                      <Star className="h-5 w-5 text-success" />
                    )}
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">
                    {getLevelDescription(level)}
                  </p>

                  {progress && category !== 'mixte' && (
                    <div className="mb-3 rounded-lg bg-muted/50 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Progression
                        </span>
                        <span className="font-bold text-primary">
                          {progress.categoryStats[
                            category as Exclude<Category, 'mixte'>
                          ]?.accuracy.toFixed(0)}
                          %
                        </span>
                      </div>
                    </div>
                  )}

                  {canPlay ? (
                    <Button variant="default" size="sm" className="w-full">
                      <Trophy className="mr-2 h-3 w-3" />
                      Commencer
                    </Button>
                  ) : !unlocked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      <Lock className="mr-2 h-3 w-3" />
                      Verrouillé
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Ouvrir achat premium');
                      }}
                    >
                      <Lock className="mr-2 h-3 w-3" />
                      Débloquer
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Premium */}
        {!progress?.hasPremium && (
          <Card className="mt-6 border-primary/20 bg-gradient-primary/10 p-4">
            <div className="text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />
              <h3 className="mb-2 text-lg font-bold">
                Débloquez tous les niveaux !
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Niveaux 3, 4 et 5 avec Premium
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
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
