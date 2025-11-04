/**
 * Interface commune pour les services de stockage
 * Implémentations : IndexedDBService (web) / CapacitorStorageService (natif)
 */

import type { Question, QuizResult, UserProgress } from '@/types/quiz.types';

export interface IStorageService {
  /**
   * Initialise le service de stockage
   */
  init(): Promise<void>;

  /**
   * Questions
   */
  saveQuestions(questions: Question[]): Promise<void>;
  getQuestions(): Promise<Question[]>;
  getQuestionsByCategory(category: string): Promise<Question[]>;
  getQuestionById(id: string): Promise<Question | null>;

  /**
   * Progression utilisateur
   */
  saveUserProgress(progress: UserProgress): Promise<void>;
  getUserProgress(): Promise<UserProgress | null>;

  /**
   * Résultats de quiz
   */
  saveQuizResult(result: QuizResult): Promise<void>;
  getQuizResults(limit?: number): Promise<QuizResult[]>;

  /**
   * Settings
   */
  saveSetting(key: string, value: any): Promise<void>;
  getSetting(key: string): Promise<any>;

  /**
   * Utilitaires
   */
  clear(): Promise<void>;
  getStorageSize(): Promise<number>;
}
