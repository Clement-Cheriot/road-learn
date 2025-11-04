/**
 * Types TypeScript pour le système de quiz
 */

export type QuestionType = 'duo' | 'carre' | 'cash';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Category = 'histoire' | 'geographie' | 'sciences';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  category: Category;
  difficulty: Difficulty;
  question: string;
  options: QuestionOption[];
  explanation?: string;
  points: number;
  timeLimit: number; // en secondes
}

export interface QuizSession {
  id: string;
  category: Category;
  startedAt: Date;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  maxScore: number;
  isComplete: boolean;
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSpent: number; // en millisecondes
  answeredAt: Date;
}

export interface QuizResult {
  sessionId: string;
  category: Category;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  maxScore: number;
  accuracy: number; // pourcentage
  averageTime: number; // temps moyen par question
  completedAt: Date;
}

export interface UserProgress {
  userId: string;
  level: number;
  xp: number;
  totalQuizzes: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  streak: number;
  lastPlayedAt: Date;
  categoryStats: Record<Category, CategoryStats>;
}

export interface CategoryStats {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  bestStreak: number;
}
