=== MODE FILESYSTEM + CONTROL MAC ===

## 🎯 Philosophie
Claude modifie directement les fichiers et compile en autonomie.

## ✅ WORKFLOW STANDARD

```bash
# Build + sync iOS
cd ~/Documents/Github/road-learn && npm run build && npx cap sync ios

# Test phonétique
node tools/phonetic-tester.cjs "texte"
node tools/phonetic-tester.cjs --batch "mot1" "mot2"
node tools/test-all-corrections.cjs
```

## 📁 FICHIERS CLÉS

### Audio/TTS
- `src/config/audio.config.ts` - Corrections phonétiques (~110)
- `src/services/AudioManager.ts` - Singleton TTS
- `ios/App/App/SherpaOnnxTTS.swift` - Plugin natif

### Pages
- `src/pages/Index.tsx` - Hub principal (À REFAIRE)
- `src/pages/Quiz.tsx` - Moteur quiz vocal
- `src/pages/LevelSelect.tsx` - Sélection niveaux
- `src/pages/VoiceSettings.tsx` - Lab Prosodie

### Outils
- `tools/phonetic-tester.cjs` - Test phonèmes eSpeak
- `tools/test-all-corrections.cjs` - Validation corrections

## 🔒 RÈGLES

- Modif < 10 lignes : appliquer direct + compiler
- Toujours `npm run build && npx cap sync ios` après modifs
- Backup git avant gros refactoring

## 📊 COMMUNICATION

Format réponses :
```
📝 Modification : [fichier]
[description courte]

🔨 Build...
✅ OK / ❌ Erreur: [détails]
```

Tokens restants à chaque réponse.
