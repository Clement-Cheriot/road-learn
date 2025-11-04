# QuizMaster - Application de Quiz Audio-First

Application de quiz-learning gamifiée conçue pour l'apprentissage en mobilité (voiture, sport, tâches ménagères). Architecture web-to-native permettant une migration Capacitor vers iOS/Android sans refonte.

## 🎯 Vision

**Duolingo meets Apple Podcasts** : micro-learning 100% audio, offline-first, optimisé pour la conduite.

## ✨ Fonctionnalités POC

- ✅ **3 catégories** : Histoire, Géographie, Sciences
- ✅ **3 types de questions** : Duo (2 options), Carré (4 options), Cash (4 options chronométrées)
- ✅ **Audio-first** : Text-to-Speech lit questions et réponses
- ✅ **Offline complet** : IndexedDB (100 questions embarquées)
- ✅ **Système de progression** : XP, niveaux, statistiques par catégorie
- ✅ **Timer 30s** par question
- ✅ **Feedback audio** : explications après chaque réponse
- ✅ **Historique scores** : sauvegarde locale des résultats
- ✅ **Responsive** : mobile-first design

## 🏗️ Architecture Technique

### Stack Web (Phase 1 - Actuelle)

- **React 18** + **TypeScript 5** (strict mode)
- **Vite** (build rapide)
- **Tailwind CSS** + **shadcn/ui** (design system)
- **Zustand** (state management)
- **React Router** (navigation)
- **IndexedDB** (stockage offline massif)
- **Web Speech API** (TTS dev uniquement)

### Stack Native (Phase 2 - Migration Capacitor)

- **@capacitor/core** (bridge React → natif)
- **@capacitor/ios** + **@capacitor/android**
- **@capacitor-community/text-to-speech** (TTS 100% offline)
- **@capacitor-community/speech-recognition** (STT natif)
- **@capacitor/haptics** (vibrations)
- **@capacitor/local-notifications** (rappels)

### Pattern d'Abstraction : Services

```typescript
// Interface commune
export interface IAudioService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stopSpeaking(): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// Implémentation web (dev)
class WebAudioService implements IAudioService { ... }

// Implémentation native (prod)
class NativeAudioService implements IAudioService { ... }

// Factory : switch automatique
const audio = createAudioService(); // Web ou Native selon plateforme
```

**Avantages** :
- ✅ Code composant inchangé lors migration
- ✅ Tests rapides en web
- ✅ Production native sans refonte

## 📂 Structure Projet

```
src/
├── services/                  # 🎯 Abstraction web/natif
│   ├── audio/
│   │   ├── AudioService.interface.ts
│   │   ├── WebAudioService.ts         # Web Speech API (dev)
│   │   ├── NativeAudioService.ts      # Capacitor TTS (prod)
│   │   └── AudioServiceFactory.ts
│   ├── storage/
│   │   ├── StorageService.interface.ts
│   │   ├── IndexedDBService.ts
│   │   └── StorageServiceFactory.ts
│   └── platform/
│       └── PlatformDetector.ts        # Détecte web vs iOS vs Android
│
├── stores/                    # Zustand stores
│   ├── useQuizStore.ts
│   └── useUserStore.ts
│
├── pages/                     # Pages React Router
│   ├── Index.tsx              # Home (sélection catégorie)
│   ├── Quiz.tsx               # Moteur de jeu
│   ├── Results.tsx            # Récapitulatif
│   ├── Scores.tsx             # Historique
│   └── Settings.tsx
│
├── types/
│   └── quiz.types.ts          # Types TypeScript stricts
│
├── config/
│   └── audio.config.ts        # Config TTS (mode voiture)
│
└── data/
    └── questions.json         # 15 questions POC
```

## 🚀 Installation & Développement

### Prérequis

- **Node.js 18+**
- **npm** ou **yarn**

### Setup Local

```bash
# 1. Cloner le projet
git clone <REPO_URL>
cd <PROJECT_NAME>

# 2. Installer dépendances
npm install

# 3. Lancer dev server
npm run dev
```

→ Ouvrir [http://localhost:8080](http://localhost:8080)

### Build Production

```bash
npm run build
```

→ Dossier `dist/` généré

## 📱 Migration Native (Capacitor)

### Installation Capacitor

```bash
# 1. Installer Capacitor
npm install @capacitor/core @capacitor/cli

# 2. Initialiser
npx cap init

# 3. Ajouter plateformes
npx cap add ios      # macOS uniquement
npx cap add android
```

### Plugins Natifs

```bash
npm install @capacitor-community/text-to-speech
npm install @capacitor-community/speech-recognition
npm install @capacitor/haptics
npm install @capacitor/local-notifications

npx cap sync
```

### Activer Services Natifs

**1. Décommenter PlatformDetector :**

```typescript
// src/services/platform/PlatformDetector.ts
import { Capacitor } from '@capacitor/core'; // ✅ Décommenter

export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform(); // ✅ Décommenter
};
```

**2. Décommenter NativeAudioService :**

```typescript
// src/services/audio/NativeAudioService.ts
import { TextToSpeech } from '@capacitor-community/text-to-speech'; // ✅ Décommenter

async speak(text: string, options?: TTSOptions): Promise<void> {
  await TextToSpeech.speak({ ... }); // ✅ Décommenter
}
```

### Build & Run

**iOS :**
```bash
npm run build
npx cap sync ios
npx cap open ios  # Ouvre Xcode
```

**Android :**
```bash
npm run build
npx cap sync android
npx cap open android  # Ouvre Android Studio
```

## 📖 Documentation Complète

- **[ARCHITECTURE.md](ARCHITECTURE.md)** : Architecture détaillée, patterns, services
- **[MIGRATION.md](MIGRATION.md)** : Guide complet migration Capacitor (iOS/Android)

## 🎨 Design System

### Couleurs

- **Primary** : Cyan énergique (`--primary`)
- **Accent** : Orange gamification (`--accent`)
- **Success** : Vert validation (`--success`)
- **Destructive** : Rouge erreur (`--destructive`)

### Principe

**Jamais de couleurs directes** → Toujours via tokens sémantiques

```typescript
// ❌ INTERDIT
<Button className="text-white bg-blue-500">

// ✅ CORRECT
<Button variant="primary">
```

## 💾 Stockage Offline

- **IndexedDB** : 50 MB - plusieurs GB (vs 5-10 MB localStorage)
- **Questions** : 2-3 MB (2000 questions en JSON)
- **Profil utilisateur** : ~100-500 KB
- **Total** : ~5-10 MB

**Synchronisation** : Upload progression quand online, fetch nouvelles questions

## 🔊 Audio : Web vs Natif

### Web Speech API (dev actuel)

- ✅ Développement rapide
- ❌ **Nécessite internet** (pas offline)
- ❌ Pas d'audio en arrière-plan
- ❌ Limité sur iOS Safari

### Capacitor TTS (prod natif)

- ✅ **100% offline** (voix système embarquées)
- ✅ Voix naturelles (Siri iOS, Google Android)
- ✅ Audio en arrière-plan (mode voiture)
- ✅ Performance optimale

## 🚗 Mode Voiture

Configuration TTS optimisée :

```typescript
carMode: {
  rate: 0.75,                  // Plus lent (bruit ambiant)
  pauseAfterQuestion: 2000,    // 2s pause avant options
  pauseBetweenOptions: 1000,   // 1s entre options
  repeatOnError: true,         // Répéter si incompris
}
```

## 🧪 Tests

```bash
# Linter
npm run lint

# Type checking
npm run type-check

# Tests unitaires (à configurer)
npm run test
```

## 📝 Roadmap Fonctionnalités

### POC (✅ Actuel)
- [x] 3 catégories, 100 questions
- [x] Audio TTS web
- [x] Offline IndexedDB
- [x] Système progression basique

### V1.0 (🎯 Migration native)
- [ ] TTS natif offline
- [ ] Speech Recognition (réponses vocales)
- [ ] Audio en arrière-plan
- [ ] Notifications locales (streaks)

### V2.0 (🔮 Future)
- [ ] Système de comptes (auth)
- [ ] Abonnement premium (Stripe)
- [ ] Leaderboards
- [ ] Défis entre amis
- [ ] CMS admin (gestion contenu)
- [ ] Analytics détaillées

## 🆘 Dépannage

### "Module not found: IndexedDB"
→ Vérifier `src/services/storage/IndexedDBService.ts` importé correctement

### TTS ne parle pas
→ Vérifier permissions microphone (Chrome demande autorisation)

### Build erreur Capacitor
→ Vérifier `capacitor.config.ts` : `webDir: 'dist'`

### iOS : "No development team"
→ Xcode > Signing & Capabilities > Team > Sélectionner compte Apple

## 📚 Ressources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Lovable Docs](https://docs.lovable.dev/)

## 📄 Licence

Propriétaire - Tous droits réservés

## 🤝 Contribution

Projet en développement actif. Contributions bienvenues après migration Capacitor.

---

**🎉 Construit avec [Lovable](https://lovable.dev) - From idea to app, in minutes**
