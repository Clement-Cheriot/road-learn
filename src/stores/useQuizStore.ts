/**
 * Store Zustand pour la gestion de l'état du quiz
 */

import { create } from 'zustand';
import type { Question, QuizSession, UserAnswer } from '@/types/quiz.types';

interface QuizStore {
  // État de la session
  currentSession: QuizSession | null;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  answers: UserAnswer[];
  timeRemaining: number;
  isAnswering: boolean;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;

  // Actions
  startSession: (session: QuizSession) => void;
  setCurrentQuestion: (question: Question) => void;
  submitAnswer: (answer: UserAnswer) => void;
  nextQuestion: () => void;
  setTimeRemaining: (time: number) => void;
  setShowFeedback: (show: boolean) => void;
  endSession: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  currentSession: null,
  currentQuestion: null,
  currentQuestionIndex: 0,
  answers: [],
  timeRemaining: 30,
  isAnswering: false,
  showFeedback: false,
  lastAnswerCorrect: null,

  startSession: (session) => {
    set({
      currentSession: session,
      currentQuestion: session.questions[0] || null,
      currentQuestionIndex: 0,
      answers: [],
      timeRemaining: session.questions[0]?.timeLimit || 30,
      isAnswering: true,
      showFeedback: false,
      lastAnswerCorrect: null,
    });
  },

  setCurrentQuestion: (question) => {
    set({
      currentQuestion: question,
      timeRemaining: question.timeLimit,
      showFeedback: false,
      isAnswering: true,
    });
  },

  submitAnswer: (answer) => {
    const { answers, currentSession } = get();
    
    set({
      answers: [...answers, answer],
      isAnswering: false,
      showFeedback: true,
      lastAnswerCorrect: answer.isCorrect,
    });

    // Mettre à jour le score de la session
    if (currentSession && answer.isCorrect) {
      set({
        currentSession: {
          ...currentSession,
          score: currentSession.score + (get().currentQuestion?.points || 0),
        },
      });
    }
  },

  nextQuestion: () => {
    const { currentSession, currentQuestionIndex } = get();
    
    if (!currentSession) return;

    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < currentSession.questions.length) {
      const nextQuestion = currentSession.questions[nextIndex];
      set({
        currentQuestionIndex: nextIndex,
        currentQuestion: nextQuestion,
        timeRemaining: nextQuestion.timeLimit,
        isAnswering: true,
        showFeedback: false,
        lastAnswerCorrect: null,
      });
    } else {
      // Fin du quiz
      set({
        currentSession: {
          ...currentSession,
          isComplete: true,
        },
        isAnswering: false,
      });
    }
  },

  setTimeRemaining: (time) => {
    set({ timeRemaining: time });
  },

  setShowFeedback: (show) => {
    set({ showFeedback: show });
  },

  endSession: () => {
    const { currentSession } = get();
    if (currentSession) {
      set({
        currentSession: {
          ...currentSession,
          isComplete: true,
        },
        isAnswering: false,
      });
    }
  },

  resetQuiz: () => {
    set({
      currentSession: null,
      currentQuestion: null,
      currentQuestionIndex: 0,
      answers: [],
      timeRemaining: 30,
      isAnswering: false,
      showFeedback: false,
      lastAnswerCorrect: null,
    });
  },
}));
