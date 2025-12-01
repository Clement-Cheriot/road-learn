#!/usr/bin/env node
/**
 * 🔊 RoadLearn Phonetic Tester
 * 
 * Outil CLI pour tester la phonétisation eSpeak-ng (utilisé par Kokoro TTS)
 * 
 * Usage:
 *   node tools/phonetic-tester.js "Texte à tester"
 *   node tools/phonetic-tester.js --file questions.json
 *   node tools/phonetic-tester.js --compare "SpaceX" "Spéss X"
 *   node tools/phonetic-tester.js --batch "mot1" "mot2" "mot3"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Couleurs ANSI pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Obtient les phonèmes IPA via eSpeak-ng
 */
function getPhonemes(text, lang = 'fr') {
  try {
    const result = execSync(`espeak-ng -v ${lang} -q --ipa "${text.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.trim();
  } catch (error) {
    return `[ERREUR: ${error.message}]`;
  }
}

/**
 * Détecte les problèmes potentiels dans les phonèmes
 */
function analyzePhonemes(text, phonemes) {
  const issues = [];
  const textLower = text.toLowerCase();
  
  // Détection de switch de langue (en) ou (fr)
  const langSwitches = phonemes.match(/\((en|fr)\)/g) || [];
  if (langSwitches.includes('(en)')) {
    issues.push({
      type: 'LANG_SWITCH',
      severity: 'warning',
      message: `Mot détecté comme anglais par eSpeak`
    });
  }
  
  // Détection de phonèmes anglais typiques
  if (phonemes.includes('ʌ')) {
    issues.push({
      type: 'ENGLISH_VOWEL',
      severity: 'error',
      message: 'Voyelle anglaise /ʌ/ détectée (son "uh" anglais)'
    });
  }
  
  if (phonemes.includes('θ') || phonemes.includes('ð')) {
    issues.push({
      type: 'ENGLISH_TH',
      severity: 'error', 
      message: 'Son "th" anglais détecté (/θ/ ou /ð/)'
    });
  }
  
  // /w/ est un problème UNIQUEMENT si le mot est détecté comme anglais
  const hasNaturalW = /oi|ou|w/i.test(textLower);
  const isEnglish = phonemes.includes('(en)');
  if (phonemes.includes('w') && !hasNaturalW && isEnglish) {
    issues.push({
      type: 'ENGLISH_W',
      severity: 'warning',
      message: 'Son /w/ anglais détecté (pas de oi/ou/w dans le texte)'
    });
  }
  
  // Détection de diphtongues anglaises (mais pas /wa/ qui est français)
  const englishDiphthongs = ['aɪ', 'eɪ', 'ɔɪ', 'aʊ', 'əʊ', 'ɪə', 'eə', 'ʊə'];
  for (const diph of englishDiphthongs) {
    if (phonemes.includes(diph)) {
      issues.push({
        type: 'ENGLISH_DIPHTHONG',
        severity: 'warning',
        message: `Diphtongue anglaise /${diph}/ détectée`
      });
    }
  }
  
  return issues;
}

/**
 * Affiche un résultat formaté
 */
function printResult(text, phonemes, issues = []) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Texte:${colors.reset}    "${text}"`);
  console.log(`${colors.bright}Phonèmes:${colors.reset} ${colors.magenta}${phonemes}${colors.reset}`);
  
  if (issues.length > 0) {
    console.log(`${colors.bright}Problèmes:${colors.reset}`);
    for (const issue of issues) {
      const color = issue.severity === 'error' ? colors.red : colors.yellow;
      console.log(`  ${color}⚠ [${issue.type}]${colors.reset} ${issue.message}`);
    }
  } else {
    console.log(`${colors.green}✓ Aucun problème détecté${colors.reset}`);
  }
}

/**
 * Compare deux textes (original vs correction)
 */
function compareTexts(original, corrected) {
  const phonOrig = getPhonemes(original);
  const phonCorr = getPhonemes(corrected);
  
  console.log(`\n${colors.cyan}━━━ COMPARAISON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.red}Original:${colors.reset}  "${original}"`);
  console.log(`${colors.red}Phonèmes:${colors.reset}  ${phonOrig}`);
  console.log();
  console.log(`${colors.green}Corrigé:${colors.reset}   "${corrected}"`);
  console.log(`${colors.green}Phonèmes:${colors.reset}  ${phonCorr}`);
  
  // Analyse des deux
  const issuesOrig = analyzePhonemes(original, phonOrig);
  const issuesCorr = analyzePhonemes(corrected, phonCorr);
  
  if (issuesOrig.length > issuesCorr.length) {
    console.log(`\n${colors.green}✓ La correction améliore la prononciation!${colors.reset}`);
  } else if (issuesCorr.length > 0) {
    console.log(`\n${colors.yellow}⚠ La correction a encore des problèmes${colors.reset}`);
  }
}

/**
 * Teste un batch de mots
 */
function testBatch(words) {
  console.log(`\n${colors.cyan}━━━ BATCH TEST (${words.length} mots) ━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const results = [];
  for (const word of words) {
    const phonemes = getPhonemes(word);
    const issues = analyzePhonemes(word, phonemes);
    results.push({ word, phonemes, issues });
    
    const status = issues.length > 0 ? `${colors.red}⚠${colors.reset}` : `${colors.green}✓${colors.reset}`;
    console.log(`${status} "${word}" → ${colors.magenta}${phonemes}${colors.reset}`);
  }
  
  return results;
}

/**
 * Analyse un fichier JSON de questions
 */
function analyzeQuestionsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = JSON.parse(content);
  
  console.log(`\n${colors.cyan}━━━ ANALYSE DE ${questions.length} QUESTIONS ━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const problematicWords = new Map();
  
  for (const q of questions) {
    // Analyser la question
    const qPhonemes = getPhonemes(q.question);
    const qIssues = analyzePhonemes(q.question, qPhonemes);
    
    if (qIssues.length > 0) {
      // Extraire les mots problématiques
      const words = q.question.split(/\s+/);
      for (const word of words) {
        const wordPhonemes = getPhonemes(word);
        const wordIssues = analyzePhonemes(word, wordPhonemes);
        if (wordIssues.length > 0) {
          if (!problematicWords.has(word)) {
            problematicWords.set(word, { phonemes: wordPhonemes, count: 0, issues: wordIssues });
          }
          problematicWords.get(word).count++;
        }
      }
    }
  }
  
  // Afficher les mots problématiques triés par fréquence
  const sorted = [...problematicWords.entries()].sort((a, b) => b[1].count - a[1].count);
  
  console.log(`${colors.bright}Mots problématiques trouvés: ${sorted.length}${colors.reset}\n`);
  
  for (const [word, data] of sorted.slice(0, 50)) { // Top 50
    console.log(`${colors.yellow}${word}${colors.reset} (${data.count}x) → ${colors.magenta}${data.phonemes}${colors.reset}`);
  }
  
  return sorted;
}

/**
 * Génère des suggestions de corrections
 */
function suggestCorrections(word) {
  console.log(`\n${colors.cyan}━━━ SUGGESTIONS POUR "${word}" ━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const original = getPhonemes(word);
  console.log(`Original: ${word} → ${colors.magenta}${original}${colors.reset}\n`);
  
  // Générer des variantes
  const variants = [];
  
  // Variante avec accents
  variants.push(word.replace(/e/g, 'é'));
  variants.push(word.replace(/e/g, 'è'));
  variants.push(word.replace(/a/g, 'à'));
  variants.push(word.replace(/u/g, 'ou'));
  variants.push(word.replace(/i/g, 'y'));
  
  // Variantes phonétiques courantes anglais → français
  variants.push(word.replace(/x$/i, 'ks'));
  variants.push(word.replace(/th/gi, 'z'));
  variants.push(word.replace(/th/gi, 's'));
  variants.push(word.replace(/sh/gi, 'ch'));
  variants.push(word.replace(/ch/gi, 'tch'));
  variants.push(word + 'e'); // Ajouter e final
  
  // Dédupliquer
  const uniqueVariants = [...new Set(variants)].filter(v => v !== word);
  
  console.log(`${colors.bright}Variantes testées:${colors.reset}`);
  for (const variant of uniqueVariants) {
    const phonemes = getPhonemes(variant);
    const issues = analyzePhonemes(variant, phonemes);
    const status = issues.length === 0 ? colors.green + '✓' : colors.yellow + '?';
    console.log(`  ${status} "${variant}" → ${colors.magenta}${phonemes}${colors.reset}`);
  }
}

// === MAIN ===
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
${colors.cyan}🔊 RoadLearn Phonetic Tester${colors.reset}
${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

Usage:
  ${colors.green}node tools/phonetic-tester.js "Texte à tester"${colors.reset}
    Teste un texte et affiche les phonèmes IPA

  ${colors.green}node tools/phonetic-tester.js --compare "original" "corrigé"${colors.reset}
    Compare la phonétisation de deux textes

  ${colors.green}node tools/phonetic-tester.js --batch "mot1" "mot2" "mot3"${colors.reset}
    Teste plusieurs mots rapidement

  ${colors.green}node tools/phonetic-tester.js --suggest "mot"${colors.reset}
    Génère des suggestions de corrections pour un mot

  ${colors.green}node tools/phonetic-tester.js --file questions.json${colors.reset}
    Analyse un fichier de questions et trouve les mots problématiques

Exemples:
  node tools/phonetic-tester.js "SpaceX a été fondée par Elon Musk"
  node tools/phonetic-tester.js --compare "SpaceX" "Spéss X"
  node tools/phonetic-tester.js --suggest "Musk"
`);
  process.exit(0);
}

// Parse les arguments
if (args[0] === '--compare' && args.length >= 3) {
  compareTexts(args[1], args[2]);
} else if (args[0] === '--batch') {
  testBatch(args.slice(1));
} else if (args[0] === '--file' && args[1]) {
  analyzeQuestionsFile(args[1]);
} else if (args[0] === '--suggest' && args[1]) {
  suggestCorrections(args[1]);
} else {
  // Test simple
  const text = args.join(' ');
  const phonemes = getPhonemes(text);
  const issues = analyzePhonemes(text, phonemes);
  printResult(text, phonemes, issues);
}
