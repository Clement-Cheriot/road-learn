/**
 * Configuration audio optimisée pour apprentissage en mobilité
 */

export const AUDIO_CONFIG = {
  // Configuration TTS standard
  default: {
    language: 'fr-FR',
    rate: 0.85, // Légèrement plus lent pour compréhension
    pitch: 1.0,
    volume: 1.0,
  },

  // Configuration optimisée mode voiture
  carMode: {
    language: 'fr-FR',
    rate: 0.75, // Encore plus lent (conduite + bruit ambiant)
    pitch: 1.0,
    volume: 1.0,
    pauseAfterQuestion: 2000, // 2s pause après question
    pauseBetweenOptions: 1000, // 1s pause entre options
    repeatOnError: true, // Répéter si pas compris
  },

  // Voix préférées par plateforme (iOS/Android natif)
  voices: {
    ios: 'Thomas', // Voix masculine française iOS
    android: 'fr-FR-language', // Voix française Android
  },

  // Timings vocaux
  timings: {
    questionPause: 800, // Pause avant lecture question
    optionPause: 600, // Pause avant chaque option
    feedbackPause: 1200, // Pause avant feedback
  },

  // Messages audio standardisés
  messages: {
    welcome: "Bienvenue ! Prêt à apprendre ?",
    correct: "Bravo ! Bonne réponse.",
    incorrect: "Pas tout à fait. La bonne réponse était :",
    timeUp: "Temps écoulé !",
    questionIntro: "Question :",
    optionsIntro: "Voici les options :",
  },
} as const;
