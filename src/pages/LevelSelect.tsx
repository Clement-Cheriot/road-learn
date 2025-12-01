/**
 * Page de sélection de niveau pour une catégorie
 * Affiche le nombre de questions et le meilleur score par niveau
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUserStore } from '@/stores/useUserStore';
import { audioManager } from '@/services/AudioManager';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import type { Category, Level, Question, QuizResult } from '@/types/quiz.types';

// Mapping niveau → difficulty
const LEVEL_TO_DIFFICULTY: Record<Level, string> = {
  1: 'easy',
  2: 'medium',
  3: 'hard',
  4: 'hard',  // Expert = hard aussi pour l'instant
  5: 'hard',  // Maître = hard aussi
};

const LevelSelect = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { progress } = useUserStore();
  
  const [questionCounts, setQuestionCounts] = useState<Record<Level, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  });
  const [bestScores, setBestScores] = useState<Record<Level, number | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null
  });
  const hasSpokenRef = useRef(false);
  const progressRef = useRef(progress);
  const questionCountsRef = useRef(questionCounts);
  
  // Garder les refs à jour
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  
  useEffect(() => {
    questionCountsRef.current = questionCounts;
  }, [questionCounts]);

  useEffect(() => {
    loadStats();
  }, [category]);

  // Lecture vocale et écoute commandes - après chargement des stats
  useEffect(() => {
    if (!category || hasSpokenRef.current) return;
    
    // Attendre que les counts soient chargés
    const hasAnyQuestions = Object.values(questionCounts).some(c => c > 0);
    if (!hasAnyQuestions) return;
    
    hasSpokenRef.current = true;

    const checkCanPlay = (level: Level): boolean => {
      // Vérifier qu'il y a des questions pour ce niveau
      if (questionCountsRef.current[level] === 0) return false;
      // Pour mixte ou niveaux 1-2, c'est jouable
      if (category === 'mixte') return true;
      if (level < 3) return true;
      return progressRef.current?.hasPremium || false;
    };

    // Construire le message avec seulement les niveaux disponibles
    const availableLevels: string[] = [];
    if (questionCountsRef.current[1] > 0) availableLevels.push('Facile');
    if (questionCountsRef.current[2] > 0) availableLevels.push('Moyen');
    if (questionCountsRef.current[3] > 0) availableLevels.push('Difficile');
    if (questionCountsRef.current[4] > 0) availableLevels.push('Expert');
    if (questionCountsRef.current[5] > 0) availableLevels.push('Maître');

    const initVoice = async () => {
      await audioManager.stopSpeaking();
      
      const message = availableLevels.length > 0
        ? `. Choisis ton niveau : ${availableLevels.join(', ')}.`
        : '. Aucun niveau disponible pour cette catégorie.';
      
      await audioManager.speak(message);

      const handleVoiceCommand = (transcript: string) => {
        const text = transcript.toLowerCase().trim();

        if (text.includes('retour') || text.includes('menu') || text.includes('accueil')) {
          audioManager.stopSpeaking();
          audioManager.stopListening();
          navigate('/');
          return;
        }

        // Commandes de niveau - vérifier que le niveau a des questions
        if ((text.includes('facile') || text.includes('niveau 1') || text.includes('un')) && questionCountsRef.current[1] > 0) {
          if (checkCanPlay(1)) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate(`/quiz/${category}/1`);
          }
          return;
        }

        if ((text.includes('moyen') || text.includes('niveau 2') || text.includes('deux')) && questionCountsRef.current[2] > 0) {
          if (checkCanPlay(2)) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate(`/quiz/${category}/2`);
          }
          return;
        }

        if ((text.includes('difficile') || text.includes('niveau 3') || text.includes('trois')) && questionCountsRef.current[3] > 0) {
          if (checkCanPlay(3)) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate(`/quiz/${category}/3`);
          }
          return;
        }

        if ((text.includes('expert') || text.includes('niveau 4') || text.includes('quatre')) && questionCountsRef.current[4] > 0) {
          if (checkCanPlay(4)) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate(`/quiz/${category}/4`);
          }
          return;
        }

        if ((text.includes('maître') || text.includes('maitre') || text.includes('niveau 5') || text.includes('cinq')) && questionCountsRef.current[5] > 0) {
          if (checkCanPlay(5)) {
            audioManager.stopSpeaking();
            audioManager.stopListening();
            navigate(`/quiz/${category}/5`);
          }
          return;
        }
      };

      audioManager.onSpeech(handleVoiceCommand);
      await audioManager.startListening();
    };

    initVoice();

    return () => {
      audioManager.stopListening();
      hasSpokenRef.current = false;
    };
  }, [category, navigate, questionCounts]);

  const loadStats = async () => {
    if (!category) return;
    
    const storage = createStorageService();
    
    // Charger les questions pour compter par niveau
    const allQuestions = await storage.getQuestions();
    const counts: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    if (category === 'mixte') {
      // Pour mixte, compter toutes les questions par difficulty
      allQuestions.forEach(q => {
        if (q.difficulty === 'easy') counts[1]++;
        else if (q.difficulty === 'medium') counts[2]++;
        else if (q.difficulty === 'hard') {
          counts[3]++;
          counts[4]++;
          counts[5]++;
        }
      });
      // Diviser les hard entre les 3 niveaux
      const hardCount = counts[3];
      counts[3] = Math.floor(hardCount / 3);
      counts[4] = Math.floor(hardCount / 3);
      counts[5] = hardCount - counts[3] - counts[4];
    } else {
      // Pour une catégorie spécifique
      const categoryQuestions = allQuestions.filter(q => q.category === category);
      categoryQuestions.forEach(q => {
        if (q.difficulty === 'easy') counts[1]++;
        else if (q.difficulty === 'medium') counts[2]++;
        else if (q.difficulty === 'hard') {
          counts[3]++;
        }
      });
    }
    
    setQuestionCounts(counts);
    
    // Charger les meilleurs scores
    const results = await storage.getQuizResults(100);
    const best: Record<Level, number | null> = { 1: null, 2: null, 3: null, 4: null, 5: null };
    
    results.forEach(result => {
      if (result.category === category) {
        const level = (result as any).level as Level || 1;
        const accuracy = result.accuracy;
        if (best[level] === null || accuracy > best[level]!) {
          best[level] = Math.round(accuracy);
        }
      }
    });
    
    setBestScores(best);
  };

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
      mixte: 'Quiz Mixte',
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
      mixte: '🎲',
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
    // Pas de questions = pas jouable
    if (questionCounts[level] === 0) return false;
    
    const unlocked = isLevelUnlocked(level);
    const isPremium = isLevelPremium(level);
    if (!isPremium) return unlocked;
    return unlocked && (progress?.hasPremium || false);
  };

  // Tous les niveaux sont visibles (mais peuvent être grisés)
  const isLevelVisible = (level: Level): boolean => {
    return true; // Toujours affiché, grisé si pas de questions
  };

  // Niveau disponible = a des questions ET débloqué
  const isLevelAvailable = (level: Level): boolean => {
    return questionCounts[level] > 0;
  };

  const startLevel = async (level: Level) => {
    if (!canPlayLevel(level)) return;
    await audioManager.stopSpeaking();
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

  const getLevelColor = (level: Level): string => {
    const colors: Record<Level, string> = {
      1: 'text-green-400',
      2: 'text-blue-400',
      3: 'text-yellow-400',
      4: 'text-orange-400',
      5: 'text-red-400',
    };
    return colors[level];
  };

  // Convertir score en étoiles (1-3)
  const getStars = (score: number | null): string => {
    if (score === null) return '';
    if (score >= 80) return '⭐⭐⭐';
    if (score >= 60) return '⭐⭐';
    if (score >= 40) return '⭐';
    return '○';
  };

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-dark to-black p-4 pt-16">
      <div className="mx-auto max-w-md">
        
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-3 text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>

          <Card className="flex items-center gap-3 bg-gradient-to-br from-primary/80 to-primary p-4">
            <span className="text-4xl">{getCategoryEmoji(category)}</span>
            <div>
              <h1 className="text-xl font-bold text-white">
                {getCategoryLabel(category)}
              </h1>
              <p className="text-xs text-white/70">Choisis ton niveau</p>
            </div>
          </Card>
        </div>

        {/* Niveaux - Liste compacte (tous affichés, grisés si indisponibles) */}
        <Card className="mb-4 divide-y divide-white/10 bg-gradient-to-br from-primary/80 to-primary">
          {([1, 2, 3, 4, 5] as Level[]).map((level) => {
            const unlocked = isLevelUnlocked(level);
            const isPremium = isLevelPremium(level);
            const canPlay = canPlayLevel(level);
            const qCount = questionCounts[level];
            const best = bestScores[level];

            return (
              <div
                key={level}
                className={`flex items-center justify-between p-4 transition-colors ${
                  canPlay ? 'cursor-pointer active:bg-white/5' : 'opacity-50'
                }`}
                onClick={() => canPlay && startLevel(level)}
              >
                <div className="flex items-center gap-4">
                  {/* Numéro niveau */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    canPlay ? 'border-white bg-white/20' : 'border-white/30 bg-white/10'
                  }`}>
                    <span className={`text-lg font-bold ${canPlay ? 'text-white' : 'text-white/50'}`}>
                      {level}
                    </span>
                  </div>
                  
                  {/* Infos niveau */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${canPlay ? getLevelColor(level) : 'text-white/40'}`}>
                        {getLevelDifficulty(level)}
                      </span>
                      {isPremium && (
                        <Crown className="h-3 w-3 text-yellow-400" />
                      )}
                    </div>
                    <span className="text-xs text-white/70">
                      {qCount === 0 ? 'Pas de questions' : 
                       isPremium && !progress?.hasPremium ? 'Premium requis' :
                       `${qCount} questions`}
                    </span>
                  </div>
                </div>

                {/* Score / État */}
                <div className="flex items-center gap-2">
                  {best !== null && (
                    <div className="text-right">
                      <span className="text-sm">{getStars(best)}</span>
                      <p className="text-xs text-white/70">{best}%</p>
                    </div>
                  )}
                  {!unlocked ? (
                    <Lock className="h-5 w-5 text-white/50" />
                  ) : !canPlay ? (
                    <Lock className="h-5 w-5 text-yellow-400" />
                  ) : best === null ? (
                    <Star className="h-5 w-5 text-white/30" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </Card>

        {/* Info Premium */}
        {!progress?.hasPremium && (
          <Card className="border-yellow-400/30 bg-yellow-400/10 p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-400" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Premium</h3>
                <p className="text-xs text-muted-foreground">
                  Débloquez les niveaux 3, 4 et 5
                </p>
              </div>
              <Button size="sm" variant="default">
                Obtenir
              </Button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
};

export default LevelSelect;
