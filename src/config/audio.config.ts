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
      ". Excellent !",
      ". Parfait !",
      ". Bravo !",
      ". Bien joué !",
      ". Impressionnant !",
      ". C'est ça !",
      ". Tout à fait !",
      ". Magnifique !",
      ". Superbe !",
      ". Vous assurez !",
    ],
    
    // Variations pour réponses incorrectes
    // Note: ". Pas" avec point avant pour éviter bug Kokoro qui tronque le P
    incorrect: [
      ". C'était :",
      ". Non, la réponse était :",
      ". Raté ! C'était :",
      ". Dommage ! La bonne réponse :",
      ", Pas cette fois ! C'était :",
      ". Non ! La réponse correcte :",
    ],
    
    timeUp: "Temps, écoulé !",
    
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
  'Quiz': 'Quise',
  'quiz': 'quise',
  '. Quiz terminé !': '. Quise terminé !',
  'm/s': 'mètre par seconde',
  'km/h': 'kilomètre heure',
  'kg': 'kilogramme',
  
  // Abréviations
  'J.C.': 'Jésus Christ',
  'J.-C.': 'Jésus Christ',
  'av. J.-C.': 'avant Jésus Christ',
  'apr. J.-C.': 'après Jésus Christ',
  
  // Workarounds bugs Kokoro (troncation fin de mot)
  'commencé': 'démarré',
  'Commencé': 'Démarré',  'française': 'françaize',
  'Française': 'Françaize',
  'chanteuse': 'chanteuzze',
  'Chanteuse': 'Chanteuz',
  'danseuse': 'danseuzze',
  'Danseuse': 'Danseuz',
  "l'Australie est": "l'Australie, est",
  "pays est": "pays, est",
  
  // Chiffres romains (bug eSpeak dit "dix-huit romain" etc.)
  'Ier': 'premier',
  'IIe': 'deuxième',
  'IIIe': 'troisième',
  'IVe': 'quatrième',
  'Ve': 'cinquième',
  'VIe': 'sixième',
  'VIIe': 'septième',
  'VIIIe': 'huitième',
  'IXe': 'neuvième',
  'Xe': 'dixième',
  'XIe': 'onzième',
  'XIIe': 'douzième',
  'XIIIe': 'treizième',
  'XIVe': 'quatorzième',
  'XVe': 'quinzième',
  'XVIe': 'seizième',
  'XVIIe': 'dix-septième',
  'XVIIIe': 'dix-huitième',
  'XIXe': 'dix-neuvième',
  'XXe': 'vingtième',
  'XXIe': 'vingt-et-unième',
  // Sans le "e" ordinal
  'XVIII': 'dix-huit',
  'XVII': 'dix-sept',
  'XVI': 'seize',
  'XV': 'quinze',
  'XIV': 'quatorze',
  'XIII': 'treize',
  'XII': 'douze',
  'XI': 'onze',
  'XIX': 'dix-neuf',
  'XXI': 'vingt-et-un',
  'XX': 'vingt',
  
  // Liaisons manquantes (cas spécifiques)
  'un oiseau': 'un noiseau',
  'un œuf': 'un neuf',
  'un homme': 'un nomme',
  'un animal': 'un nanimal',
  'un avion': 'un navion',
  'un arbre': 'un narbre',
  
  // Correction problème "R" coupé en début de mot (bug eSpeak)
  
  // Noms propres tech - Fondateurs/CEO
  'Elon Musk': 'Élone Meusc',
  'Musk': 'Meusc',
  'SpaceX': 'Spéss X',
  'Tesla': 'Tessla',
  'Jeff Bezos': 'Djeff Bézoss',
  'Bezos': 'Bézoss',
  'Steve Jobs': 'Stive Djobz',
  'Bill Gates': 'Bile Guéïtse',
  'Bill': 'Bile',
  'Mark Zuckerberg': 'Marc Zukeurbeurg',
  'Zuckerberg': 'Zukeurbeurg',
  'Mark': 'Marc',
  
  // Chanteurs/Artistes anglophones
  'Taylor Swift': 'Téïlor Sou-ifte',
  'Taylor': 'Téïlor',
  'Swift': 'Sou-ifte',
  
  // Acteurs/Célébrités anglophones
  'Robert Downey Jr': 'Robèr Dauné Junior',
  'Robert': 'Robèr',
  'Downey': 'Dauné',
  'Chris Hemsworth': 'Crisse Èmsweurse',
  'Hemsworth': 'Èmsweurse',
  'Chris Evans': 'Crisse Eva-nce',
  'Evans': 'Eva-nce',
  'Mark Ruffalo': 'Marc Reufalo',
  'Tony Stark': 'Toni Starc',
  'Tony': 'Toni',
  'Stark': 'Starc',
  'Iron Man': 'Aïronne Manne',
  'Bong Joon-ho': 'Bong-Djouno',
  'Joon-ho': 'Djouno',
  
  // Films/Séries anglophones
  'Joker': 'Djokeur',
  'Parasite': 'Parazite',
  'Once Upon a Time in Hollywood': 'Wouendce Aponne a Taillme ine Holiwoude',
  'Lady Gaga': 'Lédi Gaga',
  'Lady': 'Lédi',
  'Marvel': 'Marvelle',
  
  // Entreprises tech
  'Google': 'Gougeul',
  'Facebook': 'Féïcebouk',
  'Amazon': 'Amazone',
  'Apple': 'Apeul',
  'Microsoft': 'Maïkrosoft',
  'Twitter': 'Touiteur',
  'Netflix': 'Nétflixx',
  'YouTube': 'Youtoube',
  'LinkedIn': 'Linn-que-dinne',
  
  // Termes tech
  'iPhone': 'Aïphone',
  'iPad': 'Aïpadde',
  'MacBook': 'Mac bouk',
  'Windows': 'Ouinndoze',
  'Linux': 'Lineuxe',
  
  // Artistes anglophones (exemples)
  'Beyoncé': 'Biyonssé',
  'Madonna': 'Madona',
  'Michael Jackson': 'Maïkeul Djaksone',
  'Beatles': 'les Biteulle',
  'Rolling Stones': 'les Rolinne Stonne',
  'Queen': 'Kouine',
  'Elvis Presley': 'Elvis Prézlé',
  
  // Sports
  'football': 'foutebole',
  'Football': 'Foutebole',
  
  // Nourriture
  'pizza': 'pidza',
  'Pizza': 'Pidza',
  
  // Marques courantes
  'Nike': 'Naïk',
  'Adidas': 'Adidasse',
  'Coca-Cola': 'Koka Kola',
  'McDonald': 'Mak Donald',
  
  // Lieux anglophones
  'New York': 'Niou-Yorque',
  'Los Angeles': 'Loss Andjélesse',
  'London': 'Leunndonne',
  'Hollywood': 'Holiwoude',
  'Vancouver': 'Vancouverre',
  'Melbourne': 'Melbor-neu',
  'Harvard': 'Harvar-de',
};

/**
 * Applique la prononciation phonétique française aux mots anglais
 */
export function applyPhoneticPronunciation(text: string): string {
  let result = text;
  
  // Remplacer chaque mot par sa version phonétique
  // Utilise \b (word boundary) pour éviter les remplacements partiels
  // Ex: "Stive" ne doit pas matcher "Ve" → "cinquième"
  for (const [original, phonetic] of Object.entries(PHONETIC_REPLACEMENTS)) {
    // Si le pattern contient un espace, pas de word boundary (ex: "un oiseau")
    // Sinon, utiliser \b pour matcher le mot complet
    const pattern = original.includes(' ') 
      ? original 
      : `\\b${original}\\b`;
    const regex = new RegExp(pattern, 'gi');
    result = result.replace(regex, phonetic);
  }
  
  return result;
}
