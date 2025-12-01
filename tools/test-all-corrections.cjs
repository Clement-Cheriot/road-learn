#!/usr/bin/env node
/**
 * 🔍 Test toutes les corrections phonétiques
 * Vérifie que chaque correction produit des phonèmes français valides
 */

const { execSync } = require('child_process');

// Couleurs
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function getPhonemes(text) {
  try {
    return execSync(`espeak-ng -v fr -q --ipa "${text.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();
  } catch (e) {
    return '[ERREUR]';
  }
}

function hasProblems(phonemes) {
  // Détecte les marqueurs anglais
  if (phonemes.includes('(en)')) return 'ANGLAIS';
  if (phonemes.includes('ʌ')) return 'VOYELLE_EN';
  if (phonemes.includes('θ') || phonemes.includes('ð')) return 'TH_ANGLAIS';
  // Diphtongues anglaises
  if (/aɪ|eɪ|ɔɪ|aʊ|əʊ|ɪə|eə|ʊə/.test(phonemes)) return 'DIPHTONGUE_EN';
  return null;
}

// Charger les corrections depuis le fichier
const fs = require('fs');
const configPath = './src/config/audio.config.ts';
const content = fs.readFileSync(configPath, 'utf-8');

// Extraire les paires clé/valeur
const regex = /'([^']+)':\s*'([^']+)'/g;
const corrections = [];
let match;
while ((match = regex.exec(content)) !== null) {
  corrections.push({ original: match[1], corrected: match[2] });
}

console.log(`\n${c.cyan}━━━ TEST DE ${corrections.length} CORRECTIONS ━━━${c.reset}\n`);

let errors = 0;
let warnings = 0;

for (const { original, corrected } of corrections) {
  const phonOrig = getPhonemes(original);
  const phonCorr = getPhonemes(corrected);
  
  const probOrig = hasProblems(phonOrig);
  const probCorr = hasProblems(phonCorr);
  
  // La correction devrait améliorer, pas empirer
  if (probCorr && !probOrig) {
    console.log(`${c.red}❌ PIRE${c.reset} "${original}" → "${corrected}"`);
    console.log(`   Original: ${phonOrig}`);
    console.log(`   Corrigé:  ${phonCorr} [${probCorr}]`);
    errors++;
  } else if (probCorr) {
    console.log(`${c.yellow}⚠ RESTE${c.reset} "${original}" → "${corrected}"`);
    console.log(`   Corrigé: ${phonCorr} [${probCorr}]`);
    warnings++;
  } else if (probOrig) {
    console.log(`${c.green}✓ FIXÉ${c.reset} "${original}" → "${corrected}"`);
  }
  // Sinon c'est OK, on n'affiche rien
}

console.log(`\n${c.cyan}━━━ RÉSUMÉ ━━━${c.reset}`);
console.log(`Total: ${corrections.length} corrections`);
console.log(`${c.green}OK: ${corrections.length - errors - warnings}${c.reset}`);
console.log(`${c.yellow}Warnings: ${warnings}${c.reset}`);
console.log(`${c.red}Erreurs: ${errors}${c.reset}`);

// Test des collisions potentielles
console.log(`\n${c.cyan}━━━ TEST COLLISIONS ━━━${c.reset}\n`);

const testCases = [
  'Steve Jobs',
  'Stive Djobz', 
  'Louis XIV',
  'François Ier',
  'un oiseau vole',
  'Quiz Mixte',
  'Taylor Swift chante',
];

for (const text of testCases) {
  // Simuler applyPhoneticPronunciation avec word boundaries
  let result = text;
  for (const { original, corrected } of corrections) {
    // Si le pattern contient un espace, pas de word boundary
    const pattern = original.includes(' ') 
      ? original 
      : `\\b${original}\\b`;
    const regex = new RegExp(pattern, 'gi');
    result = result.replace(regex, corrected);
  }
  
  const phonResult = getPhonemes(result);
  const prob = hasProblems(phonResult);
  
  const status = prob ? `${c.yellow}⚠${c.reset}` : `${c.green}✓${c.reset}`;
  console.log(`${status} "${text}"`);
  console.log(`   → "${result}"`);
  console.log(`   → ${c.magenta}${phonResult}${c.reset}`);
  if (prob) console.log(`   [${prob}]`);
  console.log();
}
