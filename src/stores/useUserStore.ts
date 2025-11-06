/**
 * Store Zustand pour la gestion de l'utilisateur
 */

import { create } from 'zustand';
import type { UserProgress, Category, Level } from '@/types/quiz.types';

interface UserStore {
  progress: UserProgress | null;
  isLoading: boolean;

  setProgress: (progress: UserProgress) => void;
  updateXP: (xp: number) => void;
  updateStreak: (days: number) => void;
  updateCategoryStats: (category: Category, correct: boolean, level: Level) => void;
  unlockLevel: (category: Exclude<Category, 'mixte'>, level: Level) => void;
  setPremium: (hasPremium: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  progress: null,
  isLoading: false,

  setProgress: (progress) => {
    set({ progress });
  },

  updateXP: (xp) => {
    const { progress } = get();
    if (!progress) return;

    const newXP = progress.xp + xp;
    const newLevel = Math.floor(newXP / 100) + 1; // 100 XP par niveau

    set({
      progress: {
        ...progress,
        xp: newXP,
        level: newLevel,
      },
    });
  },

  updateStreak: (days) => {
    const { progress } = get();
    if (!progress) return;

    set({
      progress: {
        ...progress,
        streak: days,
      },
    });
  },

  updateCategoryStats: (category, correct, level) => {
    const { progress } = get();
    if (!progress) return;

    // Ne pas mettre à jour les stats pour "mixte" car ce n'est pas une vraie catégorie
    if (category === 'mixte') {
      set({
        progress: {
          ...progress,
          totalQuestions: progress.totalQuestions + 1,
          totalCorrectAnswers: correct 
            ? progress.totalCorrectAnswers + 1 
            : progress.totalCorrectAnswers,
          lastPlayedAt: new Date(),
        },
      });
      return;
    }

    const categoryStats = progress.categoryStats[category];
    const newCorrectAnswers = correct 
      ? categoryStats.correctAnswers + 1 
      : categoryStats.correctAnswers;
    const newTotal = categoryStats.questionsAnswered + 1;
    const newAccuracy = (newCorrectAnswers / newTotal) * 100;

    set({
      progress: {
        ...progress,
        totalQuestions: progress.totalQuestions + 1,
        totalCorrectAnswers: correct 
          ? progress.totalCorrectAnswers + 1 
          : progress.totalCorrectAnswers,
        categoryStats: {
          ...progress.categoryStats,
          [category]: {
            ...categoryStats,
            questionsAnswered: newTotal,
            correctAnswers: newCorrectAnswers,
            accuracy: newAccuracy,
          },
        },
        lastPlayedAt: new Date(),
      },
    });
  },

  unlockLevel: (category, level) => {
    const { progress } = get();
    if (!progress) return;

    const currentUnlocked = progress.unlockedLevels[category];
    if (!currentUnlocked.includes(level)) {
      set({
        progress: {
          ...progress,
          unlockedLevels: {
            ...progress.unlockedLevels,
            [category]: [...currentUnlocked, level].sort(),
          },
        },
      });
    }
  },

  setPremium: (hasPremium) => {
    const { progress } = get();
    if (!progress) return;

    set({
      progress: {
        ...progress,
        hasPremium,
      },
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  reset: () => {
    set({ progress: null, isLoading: false });
  },
}));
