# 🎯 RoadLearn - Architecture Documentation

## 1. Vue d'ensemble du projet

### Stack technique
- **Frontend** : React 18 + TypeScript + Vite
- **Styling** : Tailwind CSS + shadcn/ui
- **State Management** : Zustand (stores légers)
- **Routing** : React Router DOM
- **TTS** : Sherpa-ONNX + Kokoro French (ff_siwis, 24kHz)
- **STT** : Capacitor Speech Recognition
- **Stockage** : IndexedDB (offline-first)
- **Build** : Vite → Capacitor → iOS/Android

### Objectif principal
Application de quiz vocale "hands-free" pour apprentissage en conduisant. Mode "talkie-walkie" : TTS parle, puis micro s'active pour réponse vocale.

## 2. Architecture Audio (État actuel)

### Pipeline TTS
```
Texte → applyPhoneticPronunciation() → Kokoro TTS → Audio
```

### Composants clés
- **AudioManager** (`src/services/AudioManager.ts`) : Singleton centralisé, gère TTS Kokoro
- **GlobalVoiceController** (`src/features/voice/GlobalVoiceController.tsx`) : Navigation vocale globale
- **Quiz.tsx** (`src/pages/Quiz.tsx`) : Logique quiz + cycle vocal question/réponse

### Corrections phonétiques
- **Fichier** : `src/config/audio.config.ts`
- **Fonction** : `applyPhoneticPronunciation(text)` avec word boundaries
- **~110 corrections** : noms anglais, chiffres romains, liaisons, bugs Kokoro

### Outils de test phonétique
```bash
# Test simple
node tools/phonetic-tester.cjs "Elon Musk"

# Comparaison avant/après
node tools/phonetic-tester.cjs --compare "Musk" "Meusc"

# Batch test
node tools/phonetic-tester.cjs --batch "mot1" "mot2" "mot3"

# Analyse fichier questions
node tools/phonetic-tester.cjs --file src/data/questions.json

# Validation toutes corrections
node tools/test-all-corrections.cjs
```

### Lab Prosodie (VoiceSettings.tsx)
- Champ de saisie libre pour tester n'importe quel texte
- Affichage du texte phonétique envoyé au TTS
- Tests groupés par catégorie (corrections récentes, ponctuation, etc.)

## 3. Limitations Kokoro identifiées

| Problème | Workaround |
|----------|------------|
| Mots anglais mal prononcés | Corrections phonétiques françaises |
| Troncation consonnes finales | Padding lettres/ponctuation |
| "commencé" bug | Remplacé par "démarré" |
| Voix plate (pas d'émotion) | Aucun (limitation modèle) |
| SSML non supporté | Aucun (limitation Sherpa-ONNX) |

## 4. Arborescence projet

```
src/
├── services/
│   ├── AudioManager.ts          # Singleton TTS Kokoro
│   └── ...
├── pages/
│   ├── Index.tsx                # Hub principal (À REFAIRE - UI)
│   ├── Quiz.tsx                 # Moteur de jeu vocal
│   ├── LevelSelect.tsx          # Sélection niveaux
│   ├── VoiceSettings.tsx        # Lab Prosodie + tests
│   └── ...
├── features/voice/
│   └── GlobalVoiceController.tsx
├── config/
│   └── audio.config.ts          # Corrections phonétiques
├── hooks/
│   └── useVoiceCommands.ts
├── stores/
│   ├── useQuizStore.ts
│   ├── useUserStore.ts
│   └── useSettingsStore.ts
└── data/
    └── questions.json

tools/
├── phonetic-tester.cjs          # CLI test phonèmes eSpeak
└── test-all-corrections.cjs     # Validation corrections

ios/App/App/
├── SherpaOnnxTTS.swift          # Plugin TTS natif
└── kokoro-french-v1_0/          # Modèle Kokoro (61MB)
```

## 5. Commandes développement

```bash
# Build + sync iOS
npm run build && npx cap sync ios

# Ouvrir Xcode
npx cap open ios

# Test phonétique rapide
node tools/phonetic-tester.cjs "texte à tester"
```
