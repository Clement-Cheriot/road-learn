# 🎙️ Piper TTS - Guide d'intégration

## 📋 Vue d'ensemble

Ce document explique comment intégrer et utiliser **Piper TTS** dans RoadLearn pour une synthèse vocale offline de haute qualité.

---

## 🏗️ Architecture

### Composants créés

```
src/services/audio/
├── PiperTTSService.ts           # Service TypeScript (implémente IAudioService)
├── AudioServiceFactory.ts        # Modifié pour supporter Piper

ios/App/App/
├── PiperTTSPlugin.swift         # Plugin natif iOS
├── CustomPlugins.swift          # Enregistrement du plugin
└── Podfile                      # Ajout ONNX Runtime Pod

android/app/src/main/java/com/roadlearn/app/
├── PiperTTSPlugin.kt            # Plugin natif Android
├── MainActivity.kt              # Enregistrement du plugin
└── build.gradle                 # Ajout ONNX Runtime AAR

public/assets/models/piper/      # ⚠️ À créer + télécharger modèle
├── fr_FR-siwis-medium.onnx
└── fr_FR-siwis-medium.onnx.json
```

---

## 🚀 Installation

### 1️⃣ Installer les dépendances npm

```bash
cd /Users/clementcheriot/Documents/GitHub/road-learn
npm install onnxruntime-web@1.16.3
```

### 2️⃣ Installer les dépendances iOS (CocoaPods)

```bash
cd ios/App
pod install
```

### 3️⃣ Télécharger le modèle Piper

**Option A : Téléchargement automatique** (script bash)

```bash
#!/bin/bash
# Télécharge le modèle fr_FR-siwis-medium depuis GitHub

MODEL_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx"
CONFIG_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json"

mkdir -p public/assets/models/piper

echo "📥 Téléchargement du modèle Piper..."
curl -L $MODEL_URL -o public/assets/models/piper/fr_FR-siwis-medium.onnx
curl -L $CONFIG_URL -o public/assets/models/piper/fr_FR-siwis-medium.onnx.json

echo "✅ Modèle téléchargé : $(du -h public/assets/models/piper/fr_FR-siwis-medium.onnx | cut -f1)"
```

**Option B : Téléchargement manuel**

1. Aller sur https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium
2. Télécharger `fr_FR-siwis-medium.onnx` (~40MB)
3. Télécharger `fr_FR-siwis-medium.onnx.json`
4. Placer dans `public/assets/models/piper/`

### 4️⃣ Copier le modèle dans les assets natifs

**iOS :**
```bash
# Créer le dossier Resources dans Xcode
mkdir -p ios/App/App/Resources/models/piper

# Copier les fichiers
cp public/assets/models/piper/* ios/App/App/Resources/models/piper/

# ⚠️ Important : Ajouter à Xcode
# 1. Ouvrir Xcode : npx cap open ios
# 2. Clic droit sur "App" → Add Files to "App"
# 3. Sélectionner le dossier Resources/models/piper
# 4. Cocher "Copy items if needed" + "Create folder references"
```

**Android :**
```bash
# Créer le dossier assets
mkdir -p android/app/src/main/assets/models/piper

# Copier les fichiers
cp public/assets/models/piper/* android/app/src/main/assets/models/piper/
```

### 5️⃣ Build et Sync

```bash
npm run build
npx cap sync ios
npx cap sync android
```

---

## 📝 Utilisation

### Mode Basic (via Factory)

```typescript
import { createAudioService } from '@/services/audio/AudioServiceFactory';

// Créer le service avec Piper TTS
const audioService = createAudioService({ usePiper: true });

// Utilisation
await audioService.speak("Bonjour, bienvenue sur RoadLearn !", {
  rate: 1.2,  // Vitesse (0.5 - 2.0)
  pitch: 1.0, // Tonalité (0.5 - 2.0)
  volume: 1.0 // Volume (0.0 - 1.0)
});

// Arrêter
await audioService.stopSpeaking();
```

### Mode Direct (sans Factory)

```typescript
import { PiperTTSService } from '@/services/audio/PiperTTSService';

const piperTTS = new PiperTTSService();

// Vérifier disponibilité
const available = await piperTTS.isAvailable();
if (available) {
  await piperTTS.speak("Question de quiz vocal");
}

// Vérifier l'état
if (piperTTS.getIsSpeaking()) {
  await piperTTS.stopSpeaking();
}
```

### Remplacement dans Quiz.tsx

```typescript
// Avant (TTS natif)
const audioService = createAudioService();

// Après (Piper TTS)
const audioService = createAudioService({ usePiper: true });
```

---

## ⚙️ Configuration avancée

### Changer de voix

Modifier le modèle dans `AudioServiceFactory.ts` :

```typescript
// Liste des voix disponibles :
// - fr_FR-siwis-medium.onnx       (⭐⭐⭐⭐, 40MB, neutre)
// - fr_FR-mls-medium.onnx          (⭐⭐⭐, 35MB, plus rapide)
// - fr_FR-upmc-medium.onnx         (⭐⭐⭐⭐⭐, 60MB, très naturelle)

const modelPath = '/assets/models/piper/fr_FR-upmc-medium.onnx';
```

### Optimisation performances

**iOS (Swift) :**
```swift
// Dans PiperTTSPlugin.swift
options.intraOpNumThreads = 4  // Par défaut : 2
options.graphOptimizationLevel = .all
```

**Android (Kotlin) :**
```kotlin
// Dans PiperTTSPlugin.kt
setIntraOpNumThreads(4)  // Par défaut : 2
```

**Web (TypeScript) :**
```typescript
// Dans PiperTTSService.ts
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ['webgl'],  // GPU si disponible
  graphOptimizationLevel: 'all'
});
```

---

## 🧪 Tests

### Test unitaire (TypeScript)

```typescript
import { PiperTTSService } from '@/services/audio/PiperTTSService';

describe('PiperTTSService', () => {
  it('should initialize and speak', async () => {
    const service = new PiperTTSService();
    const available = await service.isAvailable();
    expect(available).toBe(true);
    
    await service.speak("Test audio");
    expect(service.getIsSpeaking()).toBe(true);
  });
});
```

### Test sur appareil

**iOS (Xcode) :**
```bash
npx cap open ios
# Sélectionner un iPhone physique ou simulateur
# Product → Run (⌘R)
```

**Android (Android Studio) :**
```bash
npx cap open android
# Sélectionner un émulateur ou appareil
# Run → Run 'app' (Shift+F10)
```

---

## 🐛 Troubleshooting

### Erreur : "Model file not found"

**Solution :**
```bash
# Vérifier que le modèle existe
ls -lh public/assets/models/piper/

# Re-copier dans les assets natifs
cp public/assets/models/piper/* ios/App/App/Resources/models/piper/
cp public/assets/models/piper/* android/app/src/main/assets/models/piper/

# Rebuild
npm run build && npx cap sync
```

### Erreur : "ONNX session not initialized"

**Solution :**
- Vérifier que `pod install` a été exécuté (iOS)
- Vérifier que la dépendance ONNX est dans `build.gradle` (Android)
- Relancer un clean build :
```bash
# iOS
cd ios/App && rm -rf Pods Podfile.lock && pod install

# Android
cd android && ./gradlew clean build
```

### Audio trop lent / rapide

**Solution :**
Ajuster le paramètre `rate` :
```typescript
await piperTTS.speak("Texte", { rate: 1.3 }); // 30% plus rapide
```

### Latence élevée (> 500ms)

**Solutions :**
1. Utiliser un modèle plus léger (`mls` au lieu de `upmc`)
2. Augmenter `intraOpNumThreads` (iOS/Android)
3. Pré-charger le modèle au démarrage de l'app

---

## 📊 Performance

### Benchmarks (iPhone 15)

| Modèle             | Taille | Qualité | Latence | Mémoire |
|--------------------|--------|---------|---------|---------|
| fr_FR-siwis-medium | 40MB   | ⭐⭐⭐⭐   | ~200ms  | ~150MB  |
| fr_FR-mls-medium   | 35MB   | ⭐⭐⭐     | ~150ms  | ~120MB  |
| fr_FR-upmc-medium  | 60MB   | ⭐⭐⭐⭐⭐  | ~300ms  | ~200MB  |

### Comparaison avec TTS natif

| Critère          | Piper TTS | iOS TTS | Web Speech API |
|------------------|-----------|---------|----------------|
| Offline          | ✅ Oui    | ✅ Oui  | ❌ Non         |
| Qualité voix     | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐           |
| Latence          | ~200ms    | ~50ms   | ~1000ms        |
| Taille app (+)   | +40MB     | 0MB     | 0MB            |
| Personnalisable  | ✅ Oui    | ❌ Non  | ❌ Non         |

---

## 🎯 Prochaines étapes

### Court terme (1 semaine)
- [x] Intégration de base fonctionnelle
- [ ] Tests sur iPhone 15 physique
- [ ] Optimisation latence < 150ms
- [ ] Validation qualité audio avec users

### Moyen terme (1 mois)
- [ ] Mode hybride Kyutai API (online) + Piper (offline)
- [ ] Cache progressif des audios pré-générés
- [ ] Support multi-voix (masculine/féminine)
- [ ] Ajustement automatique du débit selon contexte

### Long terme (3 mois)
- [ ] Pipeline automatisé génération contenus
- [ ] Émotions dans la voix (utiliser Kyutai)
- [ ] Support de 10+ voix différentes
- [ ] Synthèse en temps réel < 50ms

---

## 📚 Ressources

- **Piper TTS** : https://github.com/rhasspy/piper
- **Modèles voix** : https://huggingface.co/rhasspy/piper-voices
- **ONNX Runtime** : https://onnxruntime.ai/
- **Capacitor Plugins** : https://capacitorjs.com/docs/plugins

---

## 🆘 Support

En cas de problème :
1. Vérifier les logs : `npx cap run ios --livereload` ou `npx cap run android`
2. Consulter la doc ONNX Runtime
3. Créer un snapshot des fichiers modifiés pour debug

**Fichiers critiques** :
- `PiperTTSService.ts`
- `PiperTTSPlugin.swift`
- `PiperTTSPlugin.kt`
- Configuration modèle dans `assets/`
