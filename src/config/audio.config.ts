/**
 * Configuration audio optimisée pour apprentissage en mobilité
 * Ton jovial style jeu télévisé !
 */

export const AUDIO_CONFIG = {
  // Configuration TTS standard
  default: {
    language: 'fr-FR',
    rate: 0.85,
    pitch: 1.0,
    volume: 1.0,
  },

  // Configuration optimisée mode voiture
  carMode: {
    language: 'fr-FR',
    rate: 0.75,
    pitch: 1.0,
    volume: 1.0,
    pauseAfterQuestion: 2000,
    pauseBetweenOptions: 1000,
    repeatOnError: true,
    voice: 2,
  },

  // Voix natives par index (iOS)
  voiceOptions: {
    default: 0,
    clear: 1,
    warm: 2,
    deep: 3,
  },

  // Voix préférées par plateforme (iOS/Android natif)
  voices: {
    ios: 'Thomas',
    android: 'fr-FR-language',
  },

  // Timings vocaux
  timings: {
    questionPause: 800,
    optionPause: 400,
    optionLabelPause: 300,
    feedbackPause: 500,
  },

  // Messages audio standardisés - TON JOVIAL JEU TV !
  messages: {
    // Message bienvenue (sans "retour menu")
    welcome: "Mode Audio activé ! Commencez le Quiz Mixte ou dites une catégorie pour démarrer. C'est parti !",
    
    // Variations pour réponses correctes (tirage aléatoire)
    correct: [
      "Excellent !",
      "Parfait !",
      "Bravo !",
      "Bien joué !",
      "Impressionnant !",
      "C'est ça !",
      "Tout à fait !",
      "Magnifique !",
      "Superbe !",
      "Vous assurez !",
    ],
    
    // Variations pour réponses incorrectes (avec "C'était :" au lieu de "Presque")
    incorrect: [
      "C'était :",
      "Non, la réponse était :",
      "Raté ! C'était :",
      "Dommage ! La bonne réponse :",
      "Pas cette fois ! C'était :",
      "Non ! La réponse correcte :",
    ],
    
    timeUp: "Temps écoulé !",
    
    // Plus utilisés
    questionIntro: "",
    optionsIntro: "",
    
    // Messages talkie-walkie
    yourTurn: "À vous !",
    readyToAnswer: "Prêt ? Go !",
    listeningNow: "Je vous écoute !",
  },
} as const;

/**
 * Utilitaire pour sélectionner un message aléatoire dans un tableau
 */
export function getRandomMessage(messages: readonly string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Prononciation phonétique des mots anglais courants
 * 
 * STRATÉGIE pour les mots difficiles :
 * - Espacer les lettres : "S p a c e X"
 * - Phonétique française approximative
 * - Simplifier au maximum
 */
export const PHONETIC_REPLACEMENTS: Record<string, string> = {
  // Mots français mal prononcés
  'Quiz': 'Couize',
  'quiz': 'couize',
  'm/s': 'mètre par seconde',
  'km/h': 'kilomètre heure',
  'kg': 'kilogramme',
  
  // Correction problème "R" coupé en début de mot (bug eSpeak)
  'Réponse A': 'Option A',  // "R" est mal prononcé par eSpeak
  'Réponse B': 'Option B',
  'Réponse C': 'Option C',
  'Réponse D': 'Option D',
  
  // Noms propres tech
  'Elon Musk': 'Élone Meusk',
  'SpaceX': 'Spéss X',
  'Tesla': 'Tessla',
  'Steve Jobs': 'Stive Djobz',
  'Bill Gates': 'Bile Guéïtse',
  'Mark Zuckerberg': 'Mark Zoukeurbeurg',
  
  // Entreprises tech
  'Google': 'Gougeul',
  'Facebook': 'Fessebok',
  'Amazon': 'Amazone',
  'Apple': 'Apeul',
  'Microsoft': 'Maïkrosoft',
  'Twitter': 'Touiteur',
  'Netflix': 'Nétflixx',
  'YouTube': 'Youtoube',
  
  // Termes tech
  'iPhone': 'Aïe phone',
  'iPad': 'Aïe pad',
  'MacBook': 'Mac bouk',
  'Windows': 'Ouinndoze',
  'Linux': 'Lineuxe',
  
  // Artistes anglophones (exemples)
  'Beyoncé': 'Biyonssé',
  'Madonna': 'Madona',
  'Michael Jackson': 'Maïkeul Djaksone',
  'Beatles': 'les Biteulle',
  'Rolling Stones': 'les Roling Stone',
  'Queen': 'Kouine',
  'Elvis Presley': 'Elvis Prézlé',
  
  // Marques courantes
  'Nike': 'Naïk',
  'Adidas': 'Adidasse',
  'Coca-Cola': 'Koka Kola',
  'McDonald': 'Mak Donald',
  
  // Lieux anglophones
  'New York': 'Niou York',
  'Los Angeles': 'Loss Andjélesse',
  'London': 'Leunndonne',
  'Hollywood': 'Oliwoud',
};

/**
 * Applique la prononciation phonétique française aux mots anglais
 */
export function applyPhoneticPronunciation(text: string): string {
  let result = text;
  
  // Remplacer chaque mot par sa version phonétique
  for (const [original, phonetic] of Object.entries(PHONETIC_REPLACEMENTS)) {
    // Case-insensitive replacement
    const regex = new RegExp(original, 'gi');
    result = result.replace(regex, phonetic);
  }
  
  return result;
}
