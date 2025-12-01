/**
 * Store Zustand pour la gestion de l'utilisateur
 * Avec persistance automatique dans IndexedDB
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProgress, Category, Level } from '@/types/quiz.types';
import { createStorageService } from '@/services/storage/StorageServiceFactory';

interface UserStore {
  progress: UserProgress | null;
  isLoading: boolean;
  isHydrated: boolean;

  setProgress: (progress: UserProgress) => void;
  updateXP: (xp: number) => void;
  updateStreak: (days: number) => void;
  updateCategoryStats: (category: Category, correct: boolean, level: Level) => void;
  unlockLevel: (category: Exclude<Category, 'mixte'>, level: Level) => void;
  setPremium: (hasPremium: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

// Storage personnalisé pour IndexedDB
const indexedDBStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const storage = createStorageService();
      const progress = await storage.getUserProgress();
      if (progress) {
        return JSON.stringify({ state: { progress, isLoading: false, isHydrated: true } });
      }
      return null;
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.progress) {
        const storage = createStorageService();
        await storage.saveUserProgress(parsed.state.progress);
      }
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    // On ne supprime pas vraiment, juste reset
  },
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      progress: null,
      isLoading: false,
      isHydrated: false,

      loadFromStorage: async () => {
        try {
          const storage = createStorageService();
          const progress = await storage.getUserProgress();
          if (progress) {
            set({ progress, isHydrated: true });
          } else {
            // Créer un progress par défaut
            const defaultProgress: UserProgress = {
              id: 'user_1',
              level: 1,
              xp: 0,
              streak: 0,
              totalQuizzes: 0,
              totalQuestions: 0,
              totalCorrectAnswers: 0,
              hasPremium: false,
              unlockedLevels: {
                'arts-litterature': [1, 2],
                'divertissement': [1, 2],
                'sport': [1, 2],
                'histoire-politique': [1, 2],
                'geographie-economie': [1, 2],
                'gastronomie': [1, 2],
                'sciences-technologie': [1, 2],
                'sociales': [1, 2],
                'people': [1, 2],
              },
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
              createdAt: new Date(),
              lastPlayedAt: new Date(),
            };
            await storage.saveUserProgress(defaultProgress);
            set({ progress: defaultProgress, isHydrated: true });
          }
        } catch (error) {
          console.error('Error loading progress:', error);
          set({ isHydrated: true });
        }
      },

      saveToStorage: async () => {
        const { progress } = get();
        if (progress) {
          try {
            const storage = createStorageService();
            await storage.saveUserProgress(progress);
          } catch (error) {
            console.error('Error saving progress:', error);
          }
        }
      },

      setProgress: (progress) => {
        set({ progress });
        get().saveToStorage();
      },

      updateXP: (xp) => {
        const { progress } = get();
        if (!progress) return;

        const newXP = progress.xp + xp;
        const newLevel = Math.floor(newXP / 500) + 1; // 500 XP par niveau

        set({
          progress: {
            ...progress,
            xp: newXP,
            level: newLevel,
          },
        });
        get().saveToStorage();
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
        get().saveToStorage();
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
          get().saveToStorage();
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
        get().saveToStorage();
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
          get().saveToStorage();
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
        get().saveToStorage();
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      reset: () => {
        set({ progress: null, isLoading: false });
      },
    }),
    {
      name: 'user-progress',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ progress: state.progress }),
    }
  )
);
